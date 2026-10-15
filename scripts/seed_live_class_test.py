"""Seeder for Live Classroom schedule tests: short back-to-back slots (Matematika -> Sejarah).

Usage:
  python scripts/seed_live_class_test.py --slot 120 --lead 20     # seed
  python scripts/seed_live_class_test.py --cleanup                # remove all seeded data
"""
import argparse
import asyncio
import json
import os
import secrets
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")
WIB = timezone(timedelta(hours=7))
DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
TAG = {"is_live_test": True}


def _db():
    return AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


async def cleanup(db=None):
    db = db if db is not None else _db()
    cls = await db.classes.find(TAG, {"id": 1}).to_list(100)
    cids = [c["id"] for c in cls]
    sids = [s["id"] for s in await db.live_sessions.find({"class_id": {"$in": cids}}, {"id": 1}).to_list(1000)]
    await db.live_events.delete_many({"session_id": {"$in": sids}})
    await db.live_attendance.delete_many({"session_id": {"$in": sids}})
    await db.live_chat.delete_many({"session_id": {"$in": sids}})
    await db.live_sessions.delete_many({"class_id": {"$in": cids}})
    await db.timetable.delete_many(TAG)
    await db.users.delete_many(TAG)
    await db.classes.delete_many(TAG)


async def seed(slot_seconds=120, lead_seconds=20):
    db = _db()
    await cleanup(db)
    suffix = secrets.token_hex(3)
    pw = "Live-" + secrets.token_urlsafe(9)
    pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    class_name = f"LIVE-TEST {suffix.upper()}"
    cid = str(uuid.uuid4())

    def user(key, name, role, **extra):
        uid = str(uuid.uuid4())
        return {"id": uid, "email": f"live.{key}.{suffix}@livetest.sch.id", "password_hash": pw_hash, "name": name,
                "role": role, "is_demo": False, "qr_code": f"SEKOLAHKU-{uid}", "created_at": datetime.now(timezone.utc).isoformat(),
                **TAG, **extra}

    users = {
        "math": user("math", "Pak Budi (Matematika)", "guru", subjects=["Matematika"]),
        "history": user("history", "Bu Sari (Sejarah)", "guru", subjects=["Sejarah"]),
        "outsider": user("outsider", "Pak Joko (Biologi)", "guru", subjects=["Biologi"]),
        "student1": user("s1", "Andi Siswa", "siswa", kelas=class_name),
        "student2": user("s2", "Bunga Siswa", "siswa", kelas=class_name),
        "other_student": user("s3", "Cici Kelas Lain", "siswa", kelas="KELAS LAIN"),
    }
    await db.users.insert_many([dict(u) for u in users.values()])
    await db.classes.insert_one({"id": cid, "name": class_name, "description": "Kelas uji Live Classroom",
                                 "subjects": ["Matematika", "Sejarah", "Biologi"], "is_demo": False,
                                 "created_at": datetime.now(timezone.utc).isoformat(), **TAG})

    now = datetime.now(WIB).replace(microsecond=0)
    t0 = now + timedelta(seconds=lead_seconds)
    t1 = t0 + timedelta(seconds=slot_seconds)
    t2 = t1 + timedelta(seconds=slot_seconds)
    day = DAYS[now.weekday()]
    fmt = lambda d: d.strftime("%H:%M:%S")
    slots = [("Matematika", users["math"], t0, t1), ("Sejarah", users["history"], t1, t2)]
    for subj, t, a, b in slots:
        await db.timetable.insert_one({"id": str(uuid.uuid4()), "class_id": cid, "class_name": class_name, "day": day,
                                       "start_time": fmt(a), "end_time": fmt(b), "subject": subj, "teacher_id": t["id"],
                                       "teacher_name": t["name"], "room": "Live", "created_at": now.isoformat(), **TAG})
    return {"class_id": cid, "class_name": class_name, "password": pw, "day": day,
            "users": {k: {"id": v["id"], "email": v["email"], "name": v["name"]} for k, v in users.items()},
            "math": {"start": t0.isoformat(), "end": t1.isoformat()},
            "history": {"start": t1.isoformat(), "end": t2.isoformat()}}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", type=int, default=120, help="durasi tiap mapel (detik)")
    ap.add_argument("--lead", type=int, default=20, help="jeda sebelum mapel pertama dimulai (detik)")
    ap.add_argument("--cleanup", action="store_true")
    a = ap.parse_args()
    if a.cleanup:
        asyncio.run(cleanup())
        print("Data uji live dihapus")
        sys.exit(0)
    print(json.dumps(asyncio.run(seed(a.slot, a.lead)), indent=2))
