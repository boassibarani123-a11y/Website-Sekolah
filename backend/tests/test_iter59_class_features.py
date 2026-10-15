"""
Iteration 59 — Class features:
 1) Student count fix on GET /api/classes/{cid}
 2) Materi stats (view_count, viewers, viewed, mark viewed)
 3) Agenda reminder cron (H-1 notification)
"""
import os
import uuid
import requests
import pytest
from datetime import datetime, timedelta, timezone

def _load_env():
    for p in ("/app/frontend/.env",):
        try:
            for line in open(p):
                if line.startswith("REACT_APP_BACKEND_URL"):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
        except FileNotFoundError:
            pass
    return os.environ.get("REACT_APP_BACKEND_URL", "")

BASE = _load_env().rstrip("/")
assert BASE, "REACT_APP_BACKEND_URL not set"
CID = "06ffd680-fae9-4658-8987-fe5d32ec50d3"
WIB = timezone(timedelta(hours=7))

SUPER = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
GURU = ("guru.test@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.test@sman1laguboti.sch.id", "Siswa12345")


def login(email, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def tokens():
    return {"super": login(*SUPER), "guru": login(*GURU), "siswa": login(*SISWA)}


# ---------------- 1) Student count ----------------
def test_class_student_count_matches_roster(tokens):
    r = requests.get(f"{BASE}/api/classes/{CID}", headers=H(tokens["guru"]), timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "student_count" in data
    # roster: fetch users in that class
    r2 = requests.get(f"{BASE}/api/users", headers=H(tokens["super"]), timeout=20)
    assert r2.status_code == 200
    name = data["name"]
    roster = [u for u in r2.json() if u.get("kelas") == name and u.get("role") in ("siswa", "ketua_kelas", "ketua_osis")]
    assert data["student_count"] == len(roster), f"stat {data['student_count']} vs roster {len(roster)}"
    assert data["student_count"] >= 1, "Expected at least 1 student (siswa.test) in XII IPA 1"


# ---------------- 2) Materi stats ----------------
@pytest.fixture(scope="module")
def material_id(tokens):
    # Create a material as the guru
    body = {"title": f"TEST_Materi_{uuid.uuid4().hex[:6]}", "description": "test", "subject": "Matematika"}
    r = requests.post(f"{BASE}/api/classes/{CID}/materials", headers=H(tokens["guru"]), json=body, timeout=20)
    assert r.status_code == 200, r.text
    mid = r.json()["id"]
    yield mid
    requests.delete(f"{BASE}/api/materials/{mid}", headers=H(tokens["guru"]), timeout=20)


def _find_material(rows, mid):
    for m in rows:
        if m["id"] == mid:
            return m
    return None


def test_materials_initial_stats(tokens, material_id):
    r = requests.get(f"{BASE}/api/classes/{CID}/materials", headers=H(tokens["guru"]), timeout=20)
    assert r.status_code == 200
    m = _find_material(r.json(), material_id)
    assert m is not None
    assert m["view_count"] == 0
    assert m["total_students"] >= 1
    assert "viewers" in m and m["viewers"] == []


def test_teacher_view_not_counted(tokens, material_id):
    r = requests.post(f"{BASE}/api/materials/{material_id}/view", headers=H(tokens["guru"]), timeout=20)
    assert r.status_code == 200
    assert r.json()["view_count"] == 0


def test_student_mark_viewed_and_idempotent(tokens, material_id):
    # First view
    r = requests.post(f"{BASE}/api/materials/{material_id}/view", headers=H(tokens["siswa"]), timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["view_count"] == 1
    # Second view - idempotent
    r2 = requests.post(f"{BASE}/api/materials/{material_id}/view", headers=H(tokens["siswa"]), timeout=20)
    assert r2.status_code == 200
    assert r2.json()["view_count"] == 1

    # Teacher sees viewers array
    r3 = requests.get(f"{BASE}/api/classes/{CID}/materials", headers=H(tokens["guru"]), timeout=20)
    m = _find_material(r3.json(), material_id)
    assert m["view_count"] == 1
    names = [v["name"] for v in m.get("viewers", [])]
    assert any("Siswa" in (n or "") or "siswa" in (n or "").lower() for n in names), names

    # Student sees "viewed": True (no viewers array visibility required)
    r4 = requests.get(f"{BASE}/api/classes/{CID}/materials", headers=H(tokens["siswa"]), timeout=20)
    assert r4.status_code == 200
    ms = _find_material(r4.json(), material_id)
    assert ms is not None
    assert ms.get("viewed") is True


# ---------------- 3) Agenda reminder cron ----------------
def _get_secret():
    for line in open("/app/backend/.env"):
        if line.startswith("WEBHOOK_CRON_SECRET"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def test_cron_auth_required():
    r = requests.post(f"{BASE}/api/cron/agenda-reminder", json={"run_id": "x"}, timeout=20)
    assert r.status_code == 401


def test_agenda_reminder_flow(tokens):
    secret = _get_secret()
    assert secret, "WEBHOOK_CRON_SECRET missing"
    # Create agenda for tomorrow (WIB)
    tomorrow = (datetime.now(WIB).date() + timedelta(days=1)).isoformat()
    title = f"TEST_Ujian_{uuid.uuid4().hex[:6]}"
    body = {"title": title, "date": tomorrow, "time": "08:00", "kind": "ujian"}
    r = requests.post(f"{BASE}/api/classes/{CID}/agenda", headers=H(tokens["guru"]), json=body, timeout=20)
    assert r.status_code == 200, r.text
    aid = r.json()["id"]
    try:
        # Count siswa notifications before
        rn0 = requests.get(f"{BASE}/api/notifications", headers=H(tokens["siswa"]), timeout=20)
        assert rn0.status_code == 200
        items0 = rn0.json().get("items", [])
        before = sum(1 for n in items0 if title in (n.get("title", "") + n.get("body", "")))

        # First cron call
        headers = {"Authorization": f"Bearer {secret}", "X-Webhook-Id": f"run_{uuid.uuid4().hex}"}
        rc = requests.post(f"{BASE}/api/cron/agenda-reminder", headers=headers, json={}, timeout=20)
        assert rc.status_code == 200, rc.text

        # wait for background task
        import time
        time.sleep(3)

        rn1 = requests.get(f"{BASE}/api/notifications", headers=H(tokens["siswa"]), timeout=20)
        notes = rn1.json().get("items", [])
        matching = [n for n in notes if title in (n.get("body", ""))]
        assert len(matching) >= 1, f"No reminder notification created. notes={notes[:3]}"
        reminder = matching[0]
        assert "Pengingat" in reminder.get("title", "")
        assert "Besok" in reminder.get("title", "")

        # Second cron call -> should NOT duplicate
        headers2 = {"Authorization": f"Bearer {secret}", "X-Webhook-Id": f"run_{uuid.uuid4().hex}"}
        rc2 = requests.post(f"{BASE}/api/cron/agenda-reminder", headers=headers2, json={}, timeout=20)
        assert rc2.status_code == 200
        time.sleep(3)
        rn2 = requests.get(f"{BASE}/api/notifications", headers=H(tokens["siswa"]), timeout=20)
        matching2 = [n for n in rn2.json().get("items", []) if title in (n.get("body", ""))]
        assert len(matching2) == len(matching), f"Duplicate reminders: {len(matching2)} vs {len(matching)}"
    finally:
        requests.delete(f"{BASE}/api/class-agenda/{aid}", headers=H(tokens["guru"]), timeout=20)


# ---------------- Regression: class detail essentials ----------------
def test_class_tabs_endpoints(tokens):
    tok = H(tokens["guru"])
    endpoints = [
        f"/api/classes/{CID}/materials",
        f"/api/classes/{CID}/agenda",
        f"/api/classes/{CID}/schedules",
        f"/api/classes/{CID}/tugas",
        f"/api/classes/{CID}/announcements",
    ]
    for ep in endpoints:
        r = requests.get(f"{BASE}{ep}", headers=tok, timeout=20)
        assert r.status_code in (200, 404), f"{ep} -> {r.status_code} {r.text[:200]}"
