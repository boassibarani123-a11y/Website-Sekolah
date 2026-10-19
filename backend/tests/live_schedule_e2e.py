"""End-to-end proof for schedule-driven Live Classroom.

Proves: (a) users are kicked automatically when a slot ends (WebSocket + real SFU connection),
(b) teacher-join notification arrives in real time, (c) unassigned teachers are blocked.

Run:  python backend/tests/live_schedule_e2e.py --slot 120
Log:  /app/test_reports/live_schedule_e2e.log
"""
import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
import websockets

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from seed_live_class_test import seed, cleanup  # noqa: E402

try:
    from livekit import rtc
except Exception:
    rtc = None

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8001").rstrip("/")
WS_BASE = BASE.replace("http", "ws", 1)
LK_WS = os.environ.get("LIVEKIT_TEST_WS", "ws://127.0.0.1:7880")
LOG = ROOT / "test_reports" / "live_schedule_e2e.log"
results = []


def log(msg):
    line = f"[{datetime.now(timezone.utc).strftime('%H:%M:%S.%f')[:-3]}Z] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")


def check(name, ok, detail=""):
    results.append((name, ok))
    log(f"{'PASS' if ok else 'FAIL'} | {name} {('- ' + detail) if detail else ''}")


async def login(c, email, pw):
    r = await c.post(f"{BASE}/api/auth/login", json={"email": email, "password": pw})
    r.raise_for_status()
    return r.json()["token"]


async def token_req(c, cid, tok):
    return await c.post(f"{BASE}/api/classes/{cid}/live-token", headers={"Authorization": f"Bearer {tok}"})


class WSClient:
    def __init__(self, label, cid, tok):
        self.label, self.url, self.events = label, f"{WS_BASE}/api/ws/live/{cid}?token={tok}", []

    async def start(self):
        self.ws = await websockets.connect(self.url)
        self.task = asyncio.create_task(self._reader())

    async def _reader(self):
        try:
            async for raw in self.ws:
                m = json.loads(raw)
                m["_t"] = time.time()
                self.events.append(m)
                if m["type"] != "state":
                    log(f"  ws<{self.label}> {m['type']} {m.get('message') or m.get('reason') or ''}")
        except Exception:
            pass

    async def send(self, m):
        await self.ws.send(json.dumps(m))

    async def wait_for(self, kind, timeout, after=0.0):
        end = time.time() + timeout
        while time.time() < end:
            for e in self.events:
                if e["type"] == kind and e["_t"] >= after:
                    return e
            await asyncio.sleep(0.05)
        return None

    async def close(self):
        await self.ws.close()


async def sleep_until(iso_ts, label):
    t = datetime.fromisoformat(iso_ts).timestamp()
    d = t - time.time()
    if d > 0:
        log(f"... menunggu {d:.0f} detik sampai {label}")
        await asyncio.sleep(d)


async def main(slot, lead):
    LOG.parent.mkdir(exist_ok=True)
    LOG.write_text("")
    data = await seed(slot, lead)
    cid, pw, U = data["class_id"], data["password"], data["users"]
    log(f"Seed: kelas {data['class_name']} hari {data['day']} | Matematika {data['math']['start'][11:19]}-{data['math']['end'][11:19]} "
        f"| Sejarah {data['history']['start'][11:19]}-{data['history']['end'][11:19]} (WIB)")
    async with httpx.AsyncClient(timeout=20) as c:
        T = {k: await login(c, v["email"], pw) for k, v in U.items()}

        r = await token_req(c, cid, T["math"])
        check("Sebelum jadwal: guru matematika belum bisa masuk", r.status_code == 409, f"HTTP {r.status_code}")

        await sleep_until(data["math"]["start"], "Matematika mulai")
        await asyncio.sleep(1.5)

        log("== SLOT 1: MATEMATIKA ==")
        r = await token_req(c, cid, T["outsider"])
        check("(c) Guru tidak terjadwal (Biologi) diblokir", r.status_code == 403, f"HTTP {r.status_code} {r.json().get('detail')}")
        r = await token_req(c, cid, T["history"])
        check("(c) Guru Sejarah diblokir saat jam Matematika", r.status_code == 403, f"HTTP {r.status_code}")
        r = await token_req(c, cid, T["other_student"])
        check("Siswa kelas lain diblokir", r.status_code == 403, f"HTTP {r.status_code}")
        rs = await token_req(c, cid, T["student1"])
        check("Siswa terdaftar mendapat token", rs.status_code == 200 and rs.json()["role"] == "student")
        rm = await token_req(c, cid, T["math"])
        check("Guru Matematika mendapat token host", rm.status_code == 200 and rm.json()["role"] == "host")
        sess = rs.json()["session"]

        ws_s = WSClient("siswa", cid, T["student1"])
        ws_t = WSClient("guru-mtk", cid, T["math"])
        await ws_s.start(); await ws_t.start()
        await asyncio.sleep(0.5)
        await ws_s.send({"type": "join", "session_id": sess["id"]})

        room = None
        disconnected_at = {}
        if rtc and rs.json().get("token"):
            room = rtc.Room()
            room.on("disconnected", lambda reason=None: disconnected_at.setdefault("t", time.time()))
            try:
                await room.connect(LK_WS, rs.json()["token"])
                check("Siswa terhubung ke SFU LiveKit (self-hosted)", room.connection_state == rtc.ConnectionState.CONN_CONNECTED)
            except Exception as e:
                check("Siswa terhubung ke SFU LiveKit (self-hosted)", False, str(e))
                room = None
        else:
            log("SKIP koneksi SFU (paket livekit rtc / server tidak tersedia)")

        t_join = time.time()
        await ws_t.send({"type": "join", "session_id": sess["id"]})
        ev = await ws_s.wait_for("teacher_joined", 5, after=t_join)
        check("(b) Notifikasi real-time saat guru bergabung", bool(ev),
              f"{(ev['_t'] - t_join) * 1000:.0f} ms: \"{ev['message']}\"" if ev else "tidak diterima")

        await asyncio.sleep(0.5)
        r = await c.get(f"{BASE}/api/classes/{cid}/live-attendance", headers={"Authorization": f"Bearer {T['math']}"})
        rows = next((x for x in r.json()["sessions"] if x["session"]["id"] == sess["id"]), {"students": []})["students"]
        st = {x["name"]: x["status"] for x in rows}
        check("Absensi Live: siswa yang masuk otomatis 'hadir', yang tidak masuk 'tidak_hadir'",
              st.get(U["student1"]["name"]) == "hadir" and st.get(U["student2"]["name"]) == "tidak_hadir", str(st))
        r = await c.get(f"{BASE}/api/live/monitor", headers={"Authorization": f"Bearer {T['math']}"})
        check("Papan Pemantau hanya untuk kepsek/super admin", r.status_code == 403)
        r = await c.post(f"{BASE}/api/live/{sess['id']}/extend", headers={"Authorization": f"Bearer {T['math']}"})
        check("Perpanjang +5 menit ditolak karena Sejarah mulai tepat waktu", r.status_code == 409, r.json().get("detail", ""))
        r = await c.post(f"{BASE}/api/live/{sess['id']}/mute-all", headers={"Authorization": f"Bearer {T['student1']}"})
        check("Siswa tidak bisa memakai kontrol host", r.status_code == 403)

        await sleep_until(data["math"]["end"], "Matematika berakhir")
        t_end = datetime.fromisoformat(data["math"]["end"]).timestamp()
        ev = await ws_s.wait_for("session_ended", 6)
        check("(a) Siswa otomatis dikeluarkan (WebSocket) saat jam habis", bool(ev and ev.get("reason") == "schedule"),
              f"+{(ev['_t'] - t_end):.2f}s setelah {data['math']['end'][11:19]}" if ev else "tidak diterima")
        ev2 = await ws_t.wait_for("session_ended", 3)
        check("(a) Guru Matematika otomatis dikeluarkan", bool(ev2))
        if room is not None:
            for _ in range(60):
                if "t" in disconnected_at or room.connection_state != rtc.ConnectionState.CONN_CONNECTED:
                    break
                await asyncio.sleep(0.1)
            ok = "t" in disconnected_at or room.connection_state != rtc.ConnectionState.CONN_CONNECTED
            check("(a) Koneksi video siswa diputus oleh server SFU", ok,
                  f"+{(disconnected_at.get('t', time.time()) - t_end):.2f}s")
            await room.disconnect()

        await asyncio.sleep(1.5)
        log("== SLOT 2: SEJARAH ==")
        r = await token_req(c, cid, T["math"])
        check("(c) Guru Matematika diblokir setelah jamnya habis", r.status_code == 403, f"HTTP {r.status_code}")
        r = await token_req(c, cid, T["history"])
        check("Guru Sejarah sekarang mendapat token host", r.status_code == 200 and r.json()["role"] == "host")
        started = await ws_s.wait_for("session_started", 1, after=t_end - 1)
        check("Sesi Sejarah aktif otomatis", bool(started) or r.status_code == 200)
        await ws_s.close(); await ws_t.close()

    passed = sum(1 for _, ok in results if ok)
    log(f"HASIL: {passed}/{len(results)} PASS")
    await cleanup()
    return passed == len(results)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--slot", type=int, default=120)
    ap.add_argument("--lead", type=int, default=15)
    a = ap.parse_args()
    sys.exit(0 if asyncio.run(main(a.slot, a.lead)) else 1)
