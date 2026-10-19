"""Live Classroom: schedule-driven video rooms on a self-hosted LiveKit SFU."""
import asyncio
import json
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from livekit import api as lk

from server import (app, db, get_current_user, assert_class_view, require_roles,
                    JWT_SECRET, JWT_ALGO, now_iso)

logger = logging.getLogger("live_class")
router = APIRouter()

WIB = timezone(timedelta(hours=7))
LIVE_DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
STUDENT_ROLES = ("siswa", "ketua_kelas", "ketua_osis")
REACTIONS = {"👍", "👏", "❤️", "😂", "😮", "🎉", "🙏", "🤔"}
EXTEND_STEP_MIN = 5
EXTEND_MAX_MIN = 30
TEACHER_LATE_MIN = 10
TICK_SECONDS = 1.0


def lk_cfg():
    return {
        "url": os.environ.get("LIVEKIT_URL", "").strip(),
        "api_url": os.environ.get("LIVEKIT_API_URL", "").strip(),
        "key": os.environ.get("LIVEKIT_API_KEY", "").strip(),
        "secret": os.environ.get("LIVEKIT_API_SECRET", "").strip(),
    }


def lk_server_ready() -> bool:
    c = lk_cfg()
    return bool(c["api_url"] and c["key"] and c["secret"])


class _LK:
    """Async context for the LiveKit server API (runs on our own server, keys never leave backend)."""
    async def __aenter__(self):
        c = lk_cfg()
        self.api = lk.LiveKitAPI(c["api_url"], c["key"], c["secret"])
        return self.api

    async def __aexit__(self, *exc):
        await self.api.aclose()


# ---------------- time helpers ----------------
def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat()


def parse_iso(s: str) -> datetime:
    return datetime.fromisoformat(s)


def hms_seconds(t: str) -> int:
    try:
        parts = [int(p) for p in str(t).split(":")]
        while len(parts) < 3:
            parts.append(0)
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    except Exception:
        return -1


def slot_dt(day_wib: datetime, t: str) -> datetime:
    base = day_wib.replace(hour=0, minute=0, second=0, microsecond=0)
    return (base + timedelta(seconds=hms_seconds(t))).astimezone(timezone.utc)


async def today_slots(class_id: str, now: datetime):
    nw = now.astimezone(WIB)
    rows = await db.timetable.find({"class_id": class_id, "day": LIVE_DAYS[nw.weekday()]}, {"_id": 0}).to_list(100)
    rows = [r for r in rows if 0 <= hms_seconds(r.get("start_time")) < hms_seconds(r.get("end_time"))]
    rows.sort(key=lambda r: hms_seconds(r["start_time"]))
    for r in rows:
        r["start_at"] = iso(slot_dt(nw, r["start_time"]))
        r["end_at"] = iso(slot_dt(nw, r["end_time"]))
    return rows


def pick_slot(slots, now: datetime):
    n = iso(now)
    cur = next((s for s in slots if s["start_at"] <= n < s["end_at"]), None)
    nxt = next((s for s in slots if s["start_at"] > n), None)
    return cur, nxt


def room_name(class_id: str, slot: dict) -> str:
    return f"kelas-{class_id[:8]}-{slot['id'][:8]}-{slot['start_at'][:10]}"


def public_session(s: Optional[dict]):
    if not s:
        return None
    keep = ("id", "class_id", "class_name", "timetable_id", "subject", "teacher_id", "teacher_name", "room",
            "start_at", "end_at", "ends_at", "status", "locked", "extended_minutes", "teacher_joined_at",
            "ended_at", "ended_reason")
    return {k: s.get(k) for k in keep}


async def ensure_session(klass: dict, slot: dict):
    """Idempotently open the live session for a timetable slot. Returns (session, created)."""
    name = room_name(klass["id"], slot)
    doc = {"id": str(uuid.uuid4()), "room": name, "class_id": klass["id"], "class_name": klass.get("name"),
           "timetable_id": slot["id"], "subject": slot.get("subject"), "teacher_id": slot.get("teacher_id"),
           "teacher_name": slot.get("teacher_name"), "start_at": slot["start_at"], "end_at": slot["end_at"],
           "ends_at": slot["end_at"], "status": "active", "locked": False, "extended_minutes": 0,
           "teacher_joined_at": None, "joined": [], "kicked": [], "created_at": now_iso()}
    res = await db.live_sessions.update_one({"room": name}, {"$setOnInsert": doc}, upsert=True)
    s = await db.live_sessions.find_one({"room": name}, {"_id": 0})
    return s, bool(res.upserted_id)


async def resolve_live(klass: dict, now: Optional[datetime] = None):
    """Active session for a class right now (extended sessions win), plus today's slots."""
    now = now or utcnow()
    slots = await today_slots(klass["id"], now)
    cur, nxt = pick_slot(slots, now)
    s = await db.live_sessions.find_one(
        {"class_id": klass["id"], "status": "active", "ends_at": {"$gt": iso(now)}}, {"_id": 0},
        sort=[("start_at", -1)])
    if not s and cur:
        s, _ = await ensure_session(klass, cur)
        if s["status"] != "active" and s.get("ended_reason") == "closed":
            await db.live_sessions.update_one({"id": s["id"]}, {"$set": {"status": "active", "ended_reason": None, "ended_at": None}})
            s = {**s, "status": "active", "ended_reason": None}
        if s["status"] != "active":
            s = None
    return s, cur, nxt, slots


def live_role(user: dict, klass: dict, session: Optional[dict]) -> Optional[str]:
    role = user.get("role")
    if role in STUDENT_ROLES:
        return "student" if user.get("kelas") == klass.get("name") else None
    if session and session.get("teacher_id") and session["teacher_id"] == user["id"]:
        return "host"
    if role in ("super_admin", "kepsek") or klass.get("homeroom_teacher_id") == user["id"]:
        return "monitor"
    return None


async def log_event(session_id: Optional[str], kind: str, user: Optional[dict] = None, **extra):
    doc = {"id": str(uuid.uuid4()), "session_id": session_id, "type": kind,
           "user_id": (user or {}).get("id"), "user_name": (user or {}).get("name"), "at": iso(utcnow()), **extra}
    await db.live_events.insert_one(doc)
    logger.info(f"[LIVE] {kind} session={session_id} user={(user or {}).get('name')} {extra or ''}")


# ---------------- on/off switch (global + per class) ----------------
LIVE_ADMINS = ("super_admin", "kepsek")
CLASS_MODES = ("follow", "on", "off")


async def global_enabled() -> bool:
    d = await db.live_settings.find_one({"id": "global"}, {"_id": 0})
    return True if not d else bool(d.get("enabled", True))


def class_open(klass: dict, glob: bool) -> bool:
    mode = klass.get("live_mode") or "follow"
    return glob if mode == "follow" else mode == "on"


async def live_open(klass: dict) -> bool:
    return class_open(klass, await global_enabled())


# ---------------- realtime hub ----------------
class LiveHub:
    def __init__(self):
        self.conns = {}  # class_id -> {ws: info}

    def add(self, cid, ws, info):
        self.conns.setdefault(cid, {})[ws] = info

    def remove(self, cid, ws):
        return self.conns.get(cid, {}).pop(ws, None)

    def members(self, cid):
        return list(self.conns.get(cid, {}).values())

    def in_room(self, cid, session_id):
        return [i for i in self.members(cid) if i.get("in_room") == session_id]

    def host_online(self, cid, session):
        return any(i["uid"] == session.get("teacher_id") for i in self.in_room(cid, session["id"]))

    async def send(self, cid, msg, uid=None):
        data = json.dumps(msg, default=str)
        for ws, info in list(self.conns.get(cid, {}).items()):
            if uid and info["uid"] != uid:
                continue
            try:
                await ws.send_text(data)
            except Exception:
                self.remove(cid, ws)


hub = LiveHub()


def roster(cid: str, s: Optional[dict]):
    if not s:
        return []
    seen = {}
    for i in hub.in_room(cid, s["id"]):
        seen[i["uid"]] = {"user_id": i["uid"], "name": i["name"], "role": i.get("live_role")}
    return list(seen.values())


async def state_payload(klass: dict, user: dict):
    now = utcnow()
    glob = await global_enabled()
    is_open = class_open(klass, glob)
    s, cur, nxt, slots = await resolve_live(klass, now) if is_open else (None, None, None, await today_slots(klass["id"], now))
    if not is_open:
        _, nxt = pick_slot(slots, now)
    role = live_role(user, klass, s)
    reason = None
    if not is_open:
        reason = "Kelas Live sedang ditutup oleh sekolah"
    elif not s:
        reason = "Tidak ada sesi live saat ini"
    elif not role:
        reason = "Anda bukan guru pengampu jadwal ini" if user.get("role") not in STUDENT_ROLES else "Anda bukan anggota kelas ini"
    elif user["id"] in (s.get("kicked") or []):
        reason = "Anda dikeluarkan dari sesi ini oleh guru"
    elif s.get("locked") and role == "student" and user["id"] not in (s.get("joined") or []):
        reason = "Ruang dikunci oleh guru"
    late = bool(s and not s.get("teacher_joined_at")
                and now >= parse_iso(s["start_at"]) + timedelta(minutes=TEACHER_LATE_MIN))
    return {
        "now": iso(now), "session": public_session(s), "my_role": role, "can_join": bool(s and role and not reason),
        "reason": reason, "teacher_online": bool(s and hub.host_online(klass["id"], s)), "teacher_late": late,
        "participants": len(roster(klass["id"], s)),
        "roster": roster(klass["id"], s),
        "next_slot": nxt and {k: nxt.get(k) for k in ("subject", "teacher_name", "start_time", "end_time", "start_at")},
        "schedule": [{k: x.get(k) for k in ("id", "subject", "teacher_name", "teacher_id", "start_time", "end_time", "start_at", "end_at", "room")} for x in slots],
        "media_available": bool(lk_cfg()["url"] and lk_server_ready()),
        "closed": not is_open, "global_enabled": glob, "class_mode": klass.get("live_mode") or "follow",
        "can_manage": user.get("role") in LIVE_ADMINS,
    }


# ---------------- schedule validation (validateSubjectScheduleSlot) ----------------
async def load_class(cid: str):
    k = await db.classes.find_one({"id": cid}, {"_id": 0})
    if not k:
        raise HTTPException(404, "Kelas tidak ditemukan")
    return k


async def validate_subject_schedule_slot(cid: str, user=Depends(get_current_user)):
    """Allow a user into the class live room only for the active timetable slot."""
    klass = await load_class(cid)
    if not await live_open(klass):
        raise HTTPException(403, "Kelas Live sedang ditutup oleh sekolah")
    s, _, nxt, _ = await resolve_live(klass)
    if not s:
        extra = f" Berikutnya: {nxt['subject']} pukul {nxt['start_time'][:5]}." if nxt else ""
        raise HTTPException(409, "Tidak ada jadwal live yang aktif saat ini." + extra)
    role = live_role(user, klass, s)
    if not role:
        if user.get("role") in STUDENT_ROLES:
            raise HTTPException(403, "Hanya siswa kelas ini yang dapat bergabung")
        raise HTTPException(403, f"Sesi ini milik guru {s.get('teacher_name') or 'pengampu'} ({s.get('subject')}). Anda tidak dijadwalkan pada jam ini.")
    if user["id"] in (s.get("kicked") or []):
        raise HTTPException(403, "Anda dikeluarkan dari sesi ini oleh guru")
    if s.get("locked") and role == "student" and user["id"] not in (s.get("joined") or []):
        raise HTTPException(423, "Ruang dikunci oleh guru")
    return {"klass": klass, "session": s, "role": role, "user": user}


async def require_host(sid: str, user=Depends(get_current_user)):
    s = await db.live_sessions.find_one({"id": sid}, {"_id": 0})
    if not s or s["status"] != "active" or s["ends_at"] <= iso(utcnow()):
        raise HTTPException(409, "Sesi tidak aktif")
    if s.get("teacher_id") != user["id"]:
        raise HTTPException(403, "Hanya guru pengampu jadwal aktif yang memiliki kontrol host")
    return s, user


# ---------------- REST ----------------
@router.get("/classes/{cid}/live/state")
async def live_state(cid: str, user=Depends(get_current_user)):
    klass = await load_class(cid)
    await assert_class_view(user, klass)
    return await state_payload(klass, user)


@router.post("/classes/{cid}/live-token")
async def live_token(ctx=Depends(validate_subject_schedule_slot)):
    klass, s, role, user = ctx["klass"], ctx["session"], ctx["role"], ctx["user"]
    await db.live_sessions.update_one({"id": s["id"]}, {"$addToSet": {"joined": user["id"]}})
    await log_event(s["id"], "token_issued", user, role=role)
    cfg = lk_cfg()
    token = None
    if lk_server_ready():
        sources = ["camera", "microphone"] + (["screen_share", "screen_share_audio"] if role == "host" else [])
        grants = lk.VideoGrants(room_join=True, room=s["room"], can_subscribe=True,
                                can_publish=role != "monitor", can_publish_data=role != "monitor",
                                can_publish_sources=sources if role != "monitor" else [])
        ttl = max(60, int((parse_iso(s["ends_at"]) - utcnow()).total_seconds()) + 300)
        token = (lk.AccessToken(cfg["key"], cfg["secret"]).with_identity(user["id"]).with_name(user["name"])
                 .with_metadata(json.dumps({"role": role, "photo": user.get("photo_url") or user.get("photo")}))
                 .with_grants(grants).with_ttl(timedelta(seconds=ttl)).to_jwt())
        try:
            async with _LK() as api:
                await api.room.create_room(lk.CreateRoomRequest(name=s["room"], empty_timeout=120, max_participants=80))
        except Exception as e:
            logger.warning(f"[LIVE] create_room gagal: {e}")
    return {"token": token, "url": cfg["url"] or None, "room": s["room"], "identity": user["id"], "role": role,
            "session": public_session(s), "media_available": bool(token and cfg["url"])}


_chat_last = {}


class ChatIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    announcement: bool = False


async def member_session(sid: str, user: dict):
    s = await db.live_sessions.find_one({"id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Sesi tidak ditemukan")
    klass = await load_class(s["class_id"])
    role = live_role(user, klass, s)
    if not role or user["id"] in (s.get("kicked") or []):
        raise HTTPException(403, "Anda bukan peserta sesi ini")
    return s, role


@router.get("/live/{sid}/chat")
async def live_chat_list(sid: str, user=Depends(get_current_user)):
    await member_session(sid, user)
    return await db.live_chat.find({"session_id": sid}, {"_id": 0}).sort("created_at", 1).to_list(500)


@router.post("/live/{sid}/chat")
async def live_chat_send(sid: str, body: ChatIn, user=Depends(get_current_user)):
    s, role = await member_session(sid, user)
    if s["status"] != "active":
        raise HTTPException(409, "Sesi sudah berakhir")
    if time.monotonic() - _chat_last.get(user["id"], 0) < 0.7:
        raise HTTPException(429, "Terlalu cepat, tunggu sebentar")
    _chat_last[user["id"]] = time.monotonic()
    msg = {"id": str(uuid.uuid4()), "session_id": sid, "user_id": user["id"], "name": user["name"], "role": role,
           "text": body.text.strip(), "announcement": bool(body.announcement and role == "host"), "created_at": now_iso()}
    await db.live_chat.insert_one(msg)
    msg.pop("_id", None)
    await hub.send(s["class_id"], {"type": "chat", "message": msg})
    return msg


async def lk_participants(room: str):
    if not lk_server_ready():
        return []
    try:
        async with _LK() as api:
            r = await api.room.list_participants(lk.ListParticipantsRequest(room=room))
            return list(r.participants)
    except Exception:
        return []


@router.post("/live/{sid}/mute-all")
async def live_mute_all(sid: str, ctx=Depends(require_host)):
    s, user = ctx
    muted = 0
    if lk_server_ready():
        try:
            async with _LK() as api:
                r = await api.room.list_participants(lk.ListParticipantsRequest(room=s["room"]))
                for p in r.participants:
                    if p.identity == user["id"]:
                        continue
                    for t in p.tracks:
                        if t.type == lk.TrackType.AUDIO and not t.muted:
                            await api.room.mute_published_track(lk.MuteRoomTrackRequest(
                                room=s["room"], identity=p.identity, track_sid=t.sid, muted=True))
                            muted += 1
        except Exception as e:
            logger.warning(f"[LIVE] mute-all gagal: {e}")
    await hub.send(s["class_id"], {"type": "mute_all", "session_id": sid, "by": user["name"]})
    await log_event(sid, "mute_all", user, tracks=muted)
    return {"ok": True, "muted_tracks": muted}


class LockIn(BaseModel):
    locked: bool


@router.post("/live/{sid}/lock")
async def live_lock(sid: str, body: LockIn, ctx=Depends(require_host)):
    s, user = ctx
    await db.live_sessions.update_one({"id": sid}, {"$set": {"locked": body.locked}})
    await hub.send(s["class_id"], {"type": "locked", "session_id": sid, "locked": body.locked})
    await log_event(sid, "lock" if body.locked else "unlock", user)
    return {"ok": True, "locked": body.locked}


@router.post("/live/{sid}/extend")
async def live_extend(sid: str, ctx=Depends(require_host)):
    s, user = ctx
    if s.get("extended_minutes", 0) >= EXTEND_MAX_MIN:
        raise HTTPException(409, f"Perpanjangan maksimal {EXTEND_MAX_MIN} menit")
    cur_end = parse_iso(s["ends_at"])
    want = cur_end + timedelta(minutes=EXTEND_STEP_MIN)
    slots = await today_slots(s["class_id"], cur_end)
    nxt = next((x for x in slots if x["start_at"] >= iso(cur_end) and x["id"] != s["timetable_id"]), None)
    if nxt and parse_iso(nxt["start_at"]) < want:
        want = parse_iso(nxt["start_at"])
    if want <= cur_end:
        raise HTTPException(409, f"Tidak bisa diperpanjang: {nxt['subject']} dimulai tepat pukul {nxt['start_time'][:5]}")
    added = int((want - cur_end).total_seconds() // 60) or 1
    await db.live_sessions.update_one({"id": sid}, {"$set": {"ends_at": iso(want)}, "$inc": {"extended_minutes": added}})
    await hub.send(s["class_id"], {"type": "extended", "session_id": sid, "ends_at": iso(want), "minutes": added})
    await log_event(sid, "extended", user, ends_at=iso(want), minutes=added)
    return {"ok": True, "ends_at": iso(want), "minutes": added}


class KickIn(BaseModel):
    identity: str


@router.post("/live/{sid}/kick")
async def live_kick(sid: str, body: KickIn, ctx=Depends(require_host)):
    s, user = ctx
    if body.identity == user["id"]:
        raise HTTPException(400, "Tidak dapat mengeluarkan diri sendiri")
    target = await db.users.find_one({"id": body.identity}, {"_id": 0, "id": 1, "name": 1})
    if not target:
        raise HTTPException(404, "Peserta tidak ditemukan")
    await db.live_sessions.update_one({"id": sid}, {"$addToSet": {"kicked": body.identity}})
    if lk_server_ready():
        try:
            async with _LK() as api:
                await api.room.remove_participant(lk.RoomParticipantIdentity(room=s["room"], identity=body.identity))
        except Exception:
            pass
    for i in hub.in_room(s["class_id"], sid):
        if i["uid"] == body.identity:
            i["in_room"] = None
            await close_attendance(sid, body.identity)
    await hub.send(s["class_id"], {"type": "kicked", "session_id": sid, "reason": "host"}, uid=body.identity)
    await hub.send(s["class_id"], {"type": "presence", "session_id": sid, "user_id": body.identity, "name": target["name"], "joined": False})
    await log_event(sid, "kicked", target, reason="host")
    return {"ok": True}


@router.post("/live/{sid}/end")
async def live_end(sid: str, ctx=Depends(require_host)):
    s, user = ctx
    await end_session(s, "host")
    return {"ok": True}


class SwitchIn(BaseModel):
    enabled: bool


class ModeIn(BaseModel):
    mode: str


async def close_sessions(class_ids=None):
    q = {"status": "active"}
    if class_ids is not None:
        q["class_id"] = {"$in": class_ids}
    async for s in db.live_sessions.find(q, {"_id": 0}):
        await end_session(s, "closed")


async def notify_switch(class_ids=None):
    for cid in (class_ids if class_ids is not None else list(hub.conns.keys())):
        await hub.send(cid, {"type": "live_switch"})


@router.get("/live/settings")
async def live_settings_get(user=Depends(require_roles(*LIVE_ADMINS))):
    d = await db.live_settings.find_one({"id": "global"}, {"_id": 0}) or {"enabled": True}
    classes = await db.classes.find({"live_mode": {"$in": ["on", "off"]}}, {"_id": 0, "id": 1, "name": 1, "live_mode": 1}).to_list(500)
    return {"enabled": d.get("enabled", True), "updated_by": d.get("updated_by"), "updated_at": d.get("updated_at"), "overrides": classes}


@router.put("/live/settings")
async def live_settings_put(body: SwitchIn, user=Depends(require_roles(*LIVE_ADMINS))):
    await db.live_settings.update_one({"id": "global"}, {"$set": {"id": "global", "enabled": body.enabled,
                                      "updated_by": user["name"], "updated_at": now_iso()}}, upsert=True)
    if not body.enabled:
        follow = [c["id"] for c in await db.classes.find({"live_mode": {"$ne": "on"}}, {"_id": 0, "id": 1}).to_list(5000)]
        await close_sessions(follow)
    await log_event(None, "live_enabled" if body.enabled else "live_disabled", user, scope="global")
    await notify_switch()
    return {"ok": True, "enabled": body.enabled}


@router.put("/classes/{cid}/live-mode")
async def live_mode_put(cid: str, body: ModeIn, user=Depends(require_roles(*LIVE_ADMINS))):
    if body.mode not in CLASS_MODES:
        raise HTTPException(400, "Mode tidak valid")
    klass = await load_class(cid)
    await db.classes.update_one({"id": cid}, {"$set": {"live_mode": body.mode}})
    klass["live_mode"] = body.mode
    if not await live_open(klass):
        await close_sessions([cid])
    await log_event(None, f"live_mode_{body.mode}", user, scope="class", class_id=cid)
    await notify_switch([cid])
    return {"ok": True, "mode": body.mode}


@router.get("/live/health")
async def live_health(user=Depends(require_roles(*LIVE_ADMINS))):
    cfg = lk_cfg()
    ok, err, t0 = False, None, time.monotonic()
    if lk_server_ready():
        try:
            async with _LK() as api:
                await api.room.list_rooms(lk.ListRoomsRequest())
            ok = True
        except Exception as e:
            err = str(e)[:200]
    return {"server_api": ok, "latency_ms": round((time.monotonic() - t0) * 1000), "public_url_set": bool(cfg["url"]),
            "error": err, "ws_clients": sum(len(v) for v in hub.conns.values()),
            "active_sessions": await db.live_sessions.count_documents({"status": "active"})}


@router.get("/live/{sid}/events")
async def live_events(sid: str, user=Depends(get_current_user)):
    s, role = await member_session(sid, user)
    if role == "student":
        raise HTTPException(403, "Forbidden")
    return await db.live_events.find({"session_id": sid}, {"_id": 0}).sort("at", 1).to_list(1000)


# ---------------- session lifecycle ----------------
async def end_session(s: dict, reason: str):
    res = await db.live_sessions.find_one_and_update(
        {"id": s["id"], "status": "active"},
        {"$set": {"status": "ended", "ended_at": iso(utcnow()), "ended_reason": reason}})
    if not res:
        return
    cid = s["class_id"]
    lk_ids = [p.identity for p in await lk_participants(s["room"])]
    if lk_server_ready():
        try:
            async with _LK() as api:
                await api.room.delete_room(lk.DeleteRoomRequest(room=s["room"]))
        except Exception as e:
            logger.warning(f"[LIVE] delete_room gagal: {e}")
    removed = {i["uid"]: i["name"] for i in hub.in_room(cid, s["id"])}
    for i in hub.in_room(cid, s["id"]):
        if i.get("live_role") == "student":
            await close_attendance(s["id"], i["uid"])
        i["in_room"] = None
    await hub.send(cid, {"type": "session_ended", "session_id": s["id"], "subject": s.get("subject"), "reason": reason})
    await log_event(s["id"], "session_ended", None, reason=reason, ws_kicked=list(removed.values()),
                    sfu_kicked=len(lk_ids))


async def scheduler_tick():
    now = utcnow()
    async for s in db.live_sessions.find({"status": "active", "ends_at": {"$lte": iso(now)}}, {"_id": 0}):
        await end_session(s, "schedule")
    nw = now.astimezone(WIB)
    glob = await global_enabled()
    class_ids = await db.timetable.distinct("class_id", {"day": LIVE_DAYS[nw.weekday()]})
    for cid in class_ids:
        klass = await db.classes.find_one({"id": cid}, {"_id": 0})
        if not klass or not class_open(klass, glob):
            continue
        cur, _ = pick_slot(await today_slots(cid, now), now)
        if not cur:
            continue
        if await db.live_sessions.find_one({"class_id": cid, "status": "active", "ends_at": {"$gt": iso(now)},
                                            "timetable_id": {"$ne": cur["id"]}}):
            continue
        s, created = await ensure_session(klass, cur)
        if created:
            await log_event(s["id"], "session_started", None, subject=s.get("subject"))
            await hub.send(cid, {"type": "session_started", "session": public_session(s)})


async def scheduler_loop():
    while True:
        started = time.monotonic()
        try:
            await scheduler_tick()
        except Exception as e:
            logger.exception(f"[LIVE] scheduler error: {e}")
        await asyncio.sleep(max(0.2, TICK_SECONDS - (time.monotonic() - started)))


_task = {}


@app.on_event("startup")
async def live_startup():
    await db.live_sessions.create_index("room", unique=True)
    await db.live_sessions.create_index([("class_id", 1), ("status", 1), ("ends_at", 1)])
    await db.live_chat.create_index([("session_id", 1), ("created_at", 1)])
    await db.live_events.create_index([("session_id", 1), ("at", 1)])
    await db.live_attendance.create_index([("session_id", 1), ("student_id", 1)], unique=True)
    await db.live_attendance.create_index([("class_id", 1), ("date", 1)])
    _task["loop"] = asyncio.create_task(scheduler_loop())


@app.on_event("shutdown")
async def live_shutdown():
    if _task.get("loop"):
        _task["loop"].cancel()


# ---------------- attendance from live ----------------
async def mark_attendance(s: dict, user: dict):
    now = iso(utcnow())
    await db.live_attendance.update_one(
        {"session_id": s["id"], "student_id": user["id"]},
        {"$setOnInsert": {"id": str(uuid.uuid4()), "session_id": s["id"], "class_id": s["class_id"],
                          "class_name": s.get("class_name"), "subject": s.get("subject"), "teacher_name": s.get("teacher_name"),
                          "date": parse_iso(s["start_at"]).astimezone(WIB).strftime("%Y-%m-%d"), "student_id": user["id"],
                          "student_name": user["name"], "status": "hadir", "first_join_at": now, "seconds": 0},
         "$set": {"last_join_at": now}, "$inc": {"joins": 1}}, upsert=True)


async def close_attendance(sid: str, uid: str):
    a = await db.live_attendance.find_one({"session_id": sid, "student_id": uid}, {"_id": 0})
    if not a or not a.get("last_join_at"):
        return
    secs = max(0, int((utcnow() - parse_iso(a["last_join_at"])).total_seconds()))
    await db.live_attendance.update_one({"id": a["id"]}, {"$inc": {"seconds": secs}, "$set": {"last_join_at": None, "last_leave_at": iso(utcnow())}})


async def enrolled_students(class_name: str):
    return await db.users.find({"role": {"$in": list(STUDENT_ROLES)}, "kelas": class_name},
                               {"_id": 0, "id": 1, "name": 1, "nis": 1}).sort("name", 1).to_list(1000)


@router.get("/classes/{cid}/live-attendance")
async def live_attendance(cid: str, date: Optional[str] = None, user=Depends(get_current_user)):
    if user.get("role") in STUDENT_ROLES:
        raise HTTPException(403, "Forbidden")
    klass = await load_class(cid)
    await assert_class_view(user, klass)
    date = date or utcnow().astimezone(WIB).strftime("%Y-%m-%d")
    students = await enrolled_students(klass["name"])
    try:
        d0 = datetime.strptime(date[:10], "%Y-%m-%d").replace(tzinfo=WIB)
    except ValueError:
        raise HTTPException(400, "Format tanggal YYYY-MM-DD")
    rng = {"$gte": iso(d0), "$lt": iso(d0 + timedelta(days=1))}
    sessions = await db.live_sessions.find({"class_id": cid, "start_at": rng}, {"_id": 0}).sort("start_at", 1).to_list(50)
    out = []
    for s in sessions:
        rows = {a["student_id"]: a for a in await db.live_attendance.find({"session_id": s["id"]}, {"_id": 0}).to_list(2000)}
        out.append({"session": public_session(s), "present": len(rows), "total": len(students), "students": [
            {"id": st["id"], "name": st["name"], "nis": st.get("nis"), "status": "hadir" if st["id"] in rows else "tidak_hadir",
             "first_join_at": rows.get(st["id"], {}).get("first_join_at"),
             "minutes": round((rows.get(st["id"], {}).get("seconds") or 0) / 60)} for st in students]})
    return {"date": date, "class_name": klass["name"], "sessions": out}


# ---------------- monitoring board (kepsek) ----------------
@router.get("/live/monitor")
async def live_monitor(user=Depends(require_roles(*LIVE_ADMINS))):
    now = utcnow()
    glob = await global_enabled()
    counts = {r["_id"]: r["n"] async for r in db.users.aggregate([
        {"$match": {"role": {"$in": list(STUDENT_ROLES)}}}, {"$group": {"_id": "$kelas", "n": {"$sum": 1}}}])}
    classes = await db.classes.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    rows = []
    for k in classes:
        opened = class_open(k, glob)
        s, _, nxt, _ = await resolve_live(k, now) if opened else (None, None, None, None)
        room = hub.in_room(k["id"], s["id"]) if s else []
        present = await db.live_attendance.count_documents({"session_id": s["id"]}) if s else 0
        rows.append({
            "class_id": k["id"], "class_name": k.get("name"), "open": opened, "mode": k.get("live_mode") or "follow",
            "session": public_session(s), "teacher_online": bool(s and hub.host_online(k["id"], s)),
            "teacher_late": bool(s and not s.get("teacher_joined_at") and now >= parse_iso(s["start_at"]) + timedelta(minutes=TEACHER_LATE_MIN)),
            "students_online": len({i["uid"] for i in room if i.get("live_role") == "student"}),
            "monitors_online": len({i["uid"] for i in room if i.get("live_role") == "monitor"}),
            "attended": present, "enrolled": counts.get(k.get("name"), 0),
            "next_slot": nxt and {"subject": nxt.get("subject"), "start_time": nxt.get("start_time"), "teacher_name": nxt.get("teacher_name")},
        })
    live = [r for r in rows if r["session"]]
    return {"now": iso(now), "global_enabled": glob, "classes": rows, "summary": {
        "classes": len(rows), "live": len(live), "teachers_online": sum(r["teacher_online"] for r in live),
        "teachers_late": sum(r["teacher_late"] for r in live), "students_online": sum(r["students_online"] for r in rows),
        "enrolled": sum(r["enrolled"] for r in rows)}}


# ---------------- WebSocket: schedule timeouts, presence, hands, reactions ----------------
async def ws_user(ws: WebSocket):
    token = ws.query_params.get("token") or ws.cookies.get("access_token", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None
    u = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not u or payload.get("tv", 0) != u.get("token_version", 0):
        return None
    return u


async def ws_join(cid: str, info: dict, user: dict, sid: str):
    klass = await load_class(cid)
    s = await db.live_sessions.find_one({"id": sid, "class_id": cid}, {"_id": 0})
    if not s or s["status"] != "active" or s["ends_at"] <= iso(utcnow()):
        return {"type": "error", "message": "Sesi tidak aktif"}
    role = live_role(user, klass, s)
    if not role or user["id"] in (s.get("kicked") or []) or user["id"] not in (s.get("joined") or []):
        return {"type": "error", "message": "Akses ditolak"}
    info["in_room"], info["live_role"] = sid, role
    await hub.send(cid, {"type": "presence", "session_id": sid, "user_id": user["id"], "name": user["name"], "role": role, "joined": True})
    if role == "host":
        first = not s.get("teacher_joined_at")
        if first:
            await db.live_sessions.update_one({"id": sid}, {"$set": {"teacher_joined_at": iso(utcnow())}})
        await hub.send(cid, {"type": "teacher_joined", "session_id": sid, "teacher_name": user["name"],
                             "subject": s.get("subject"), "first": first,
                             "message": f"{user['name']} telah bergabung di Kelas Live {s.get('subject')}"})
    if role == "student":
        await mark_attendance(s, user)
    await log_event(sid, "teacher_joined" if role == "host" else "joined", user, role=role)
    return None


async def ws_leave(cid: str, info: dict, user: dict):
    sid = info.get("in_room")
    if not sid:
        return
    info["in_room"] = None
    if info.get("live_role") == "student":
        await close_attendance(sid, user["id"])
    await hub.send(cid, {"type": "presence", "session_id": sid, "user_id": user["id"], "name": user["name"], "joined": False})
    if info.get("live_role") == "host" and not any(i["uid"] == user["id"] for i in hub.in_room(cid, sid)):
        await hub.send(cid, {"type": "teacher_left", "session_id": sid, "teacher_name": user["name"]})
    await log_event(sid, "left", user)


@app.websocket("/api/ws/live/{cid}")
async def ws_live(ws: WebSocket, cid: str):
    user = await ws_user(ws)
    klass = await db.classes.find_one({"id": cid}, {"_id": 0})
    if not user or not klass:
        await ws.close(code=1008)
        return
    try:
        await assert_class_view(user, klass)
    except HTTPException:
        if live_role(user, klass, None) is None:
            await ws.close(code=1008)
            return
    await ws.accept()
    info = {"uid": user["id"], "name": user["name"], "in_room": None}
    hub.add(cid, ws, info)
    await ws.send_text(json.dumps({"type": "state", "state": await state_payload(klass, user)}, default=str))
    last = 0.0
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            kind = msg.get("type")
            if kind in ("hand", "reaction"):
                if time.monotonic() - last < 0.4:
                    continue
                last = time.monotonic()
            if kind == "join":
                err = await ws_join(cid, info, user, str(msg.get("session_id", "")))
                if err:
                    await ws.send_text(json.dumps(err))
            elif kind == "leave":
                await ws_leave(cid, info, user)
            elif kind == "hand" and info.get("in_room"):
                await hub.send(cid, {"type": "hand", "session_id": info["in_room"], "user_id": user["id"],
                                     "name": user["name"], "raised": bool(msg.get("raised"))})
            elif kind == "reaction" and info.get("in_room") and msg.get("emoji") in REACTIONS:
                await hub.send(cid, {"type": "reaction", "session_id": info["in_room"], "user_id": user["id"],
                                     "name": user["name"], "emoji": msg["emoji"]})
            elif kind == "ping":
                await ws.send_text(json.dumps({"type": "state", "state": await state_payload(klass, user)}, default=str))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await ws_leave(cid, info, user)
        hub.remove(cid, ws)
