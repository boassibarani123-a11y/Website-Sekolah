"""Iteration 43 — Gate attendance scanner (admin_absensi), WIB stats, concurrent-scan dedup,
station heartbeat/listing, and profile change-password flow."""
import os, time, asyncio
from datetime import datetime, timezone, timedelta
import pytest, requests, httpx

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"

SUPER = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
GATE_OP = {"email": "gate.op@test.id", "password": "Gate12345"}
GATE_SISWA = {"email": "gate.siswa@test.id", "password": "Siswa12345"}
NISN = "0077665544"


def _login(creds):
    r = requests.post(f"{BASE}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login {creds['email']}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def tok_super():
    return _login(SUPER)


@pytest.fixture(scope="module")
def tok_op():
    return _login(GATE_OP)


@pytest.fixture(scope="module")
def tok_siswa():
    return _login(GATE_SISWA)


@pytest.fixture(autouse=True)
def _wipe():
    # Clean today's gate siswa attendance between tests
    import pymongo
    cli = pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    cli["test_database"].attendance.delete_many({"student_name": "Gate Siswa"})
    yield


# ---------- WIB date ----------
def test_stats_date_is_wib(tok_op):
    r = requests.get(f"{BASE}/attendance/stats", headers=_h(tok_op), timeout=15)
    assert r.status_code == 200
    wib = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    assert r.json()["date"] == wib


# ---------- RBAC ----------
def test_siswa_cannot_scan(tok_siswa):
    r = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_siswa),
                      json={"nisn": NISN, "method": "barcode", "status": "hadir"}, timeout=15)
    assert r.status_code == 403


def test_admin_absensi_can_scan(tok_op):
    r = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                      json={"nisn": NISN, "method": "barcode", "status": "hadir",
                            "station_id": "stA", "station_name": "Gerbang Utama"}, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["student"]["name"] == "Gate Siswa"
    assert body["student"]["nisn"] == NISN
    assert not body.get("duplicate")


def test_scan_duplicate_second_call(tok_op):
    # first
    r1 = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                       json={"nisn": NISN, "method": "barcode", "status": "hadir",
                             "station_id": "stA", "station_name": "Gerbang Utama"}, timeout=15)
    assert r1.status_code == 200
    first_at = r1.json()["scanned_at"]
    # second (same status) => duplicate:true with original scanned_at
    r2 = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                       json={"nisn": NISN, "method": "barcode", "status": "hadir",
                             "station_id": "stB", "station_name": "Gerbang Belakang"}, timeout=15)
    assert r2.status_code == 200
    assert r2.json().get("duplicate") is True
    assert r2.json()["scanned_at"] == first_at


def test_unknown_nisn_404(tok_op):
    r = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                     json={"nisn": "99999", "method": "barcode", "status": "hadir",
                           "station_id": "stA", "station_name": "Gerbang Utama"}, timeout=15)
    assert r.status_code == 404


# ---------- Concurrency ----------
def test_concurrent_scans_single_record(tok_op):
    """5 parallel scans from different stations => exactly ONE attendance record for the day."""
    async def go():
        async with httpx.AsyncClient(timeout=15.0) as c:
            async def one(i):
                return await c.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                                    json={"nisn": NISN, "method": "barcode", "status": "hadir",
                                          "station_id": f"st{i}", "station_name": f"G{i}"})
            return await asyncio.gather(*[one(i) for i in range(5)])
    results = asyncio.run(go())
    assert all(r.status_code == 200 for r in results), [r.text for r in results]
    # Exactly one not-duplicate; four duplicates (or 'ok' with same scanned_at due to upsert)
    wib = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    r = requests.get(f"{BASE}/attendance?date={wib}", headers=_h(tok_op), timeout=15)
    rows = [x for x in r.json() if x["student_name"] == "Gate Siswa"]
    assert len(rows) == 1, f"expected 1 record, got {len(rows)}: {rows}"


# ---------- Status change via manual ----------
def test_status_change_updates_record(tok_op):
    # initial hadir
    r1 = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                       json={"nisn": NISN, "method": "barcode", "status": "hadir",
                             "station_id": "stA", "station_name": "Gerbang Utama"}, timeout=15)
    assert r1.status_code == 200
    # change to izin via manual
    r2 = requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                       json={"nisn": NISN, "method": "manual", "status": "izin",
                             "station_id": "stA", "station_name": "Gerbang Utama"}, timeout=15)
    assert r2.status_code == 200
    assert r2.json().get("updated") is True
    # verify persisted
    wib = (datetime.now(timezone.utc) + timedelta(hours=7)).date().isoformat()
    r = requests.get(f"{BASE}/attendance?date={wib}", headers=_h(tok_op), timeout=15)
    rows = [x for x in r.json() if x["student_name"] == "Gate Siswa"]
    assert rows and rows[0]["status"] == "izin"


# ---------- Stations ----------
def test_station_heartbeat_and_list(tok_op):
    sid1, sid2 = "stA-test-xyz", "stB-test-xyz"
    assert requests.post(f"{BASE}/attendance/stations/heartbeat", headers=_h(tok_op),
                        json={"station_id": sid1, "name": "Gerbang Utama"}, timeout=15).status_code == 200
    assert requests.post(f"{BASE}/attendance/stations/heartbeat", headers=_h(tok_op),
                        json={"station_id": sid2, "name": "Gerbang Belakang"}, timeout=15).status_code == 200
    # produce one scan from sid1
    requests.post(f"{BASE}/attendance/scan", headers=_h(tok_op),
                 json={"nisn": NISN, "method": "barcode", "status": "hadir",
                       "station_id": sid1, "station_name": "Gerbang Utama"}, timeout=15)
    r = requests.get(f"{BASE}/attendance/stations", headers=_h(tok_op), timeout=15)
    assert r.status_code == 200
    rows = r.json()
    by_id = {x["station_id"]: x for x in rows}
    assert sid1 in by_id and sid2 in by_id
    assert by_id[sid1]["online"] is True
    assert by_id[sid1]["scans_today"] >= 1
    assert by_id[sid2]["scans_today"] == 0


# ---------- Change password (siswa) ----------
def test_change_password_wrong_current():
    tok = _login(GATE_SISWA)
    r = requests.post(f"{BASE}/auth/change-password", headers=_h(tok),
                     json={"current_password": "WRONG123", "new_password": "NewPass123"}, timeout=15)
    assert r.status_code == 400


def test_change_password_weak_rejected():
    tok = _login(GATE_SISWA)
    r = requests.post(f"{BASE}/auth/change-password", headers=_h(tok),
                     json={"current_password": "Siswa12345", "new_password": "short"}, timeout=15)
    assert r.status_code in (400, 422)


def test_change_password_success_and_restore():
    """Change siswa password, verify new works + old fails, then restore for credentials file."""
    tok = _login(GATE_SISWA)
    new_pw = "SiswaNew987"
    r = requests.post(f"{BASE}/auth/change-password", headers=_h(tok),
                     json={"current_password": "Siswa12345", "new_password": new_pw}, timeout=15)
    assert r.status_code == 200, r.text

    # Old password must fail
    r_old = requests.post(f"{BASE}/auth/login", json={"email": GATE_SISWA["email"], "password": "Siswa12345"}, timeout=15)
    assert r_old.status_code == 401

    # New password works
    r_new = requests.post(f"{BASE}/auth/login", json={"email": GATE_SISWA["email"], "password": new_pw}, timeout=15)
    assert r_new.status_code == 200
    tok_new = r_new.json()["token"]

    # Restore to original
    r2 = requests.post(f"{BASE}/auth/change-password", headers=_h(tok_new),
                      json={"current_password": new_pw, "new_password": "Siswa12345"}, timeout=15)
    assert r2.status_code == 200, r2.text
    # confirm original restored
    r_restored = requests.post(f"{BASE}/auth/login", json=GATE_SISWA, timeout=15)
    assert r_restored.status_code == 200
