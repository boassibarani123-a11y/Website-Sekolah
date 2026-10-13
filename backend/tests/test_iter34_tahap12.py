"""Backend tests for Tahap 1 & 2 — iter34
Covers: auth super admin, points manage/edit/delete, PPDB super admin edit/delete + 403 for non-super,
attendance scan role guard, admin_absensi role creation, staff xlsx export, assignments complex form,
exports xlsx (attendance, ppdb)."""
import io
import os
import time
import uuid
import pytest
import requests

def _load_base_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env", "r") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")

BASE_URL = _load_base_url()
API = f"{BASE_URL}/api"
SUPER_EMAIL = "boassibarani123@gmail.com"
SUPER_PASS = "Boas12345io"
TS = int(time.time())


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def super_token():
    r = requests.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS}, timeout=30)
    assert r.status_code == 200, f"super admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def super_h(super_token):
    return {"Authorization": f"Bearer {super_token}"}


def _mk_user(h, role, extra=None):
    email = f"test_{role}_{TS}_{uuid.uuid4().hex[:4]}@test.com"
    body = {"email": email, "password": "Pass12345!", "name": f"TEST {role}", "role": role}
    if role == "siswa":
        body["phone"] = "081234567890"
        body["kelas"] = "X-IPA-1"
        body["nisn"] = f"NISN{uuid.uuid4().hex[:8].upper()}"
    if extra:
        body.update(extra)
    r = requests.post(f"{API}/users", json=body, headers=h, timeout=30)
    assert r.status_code in (200, 201), f"create {role} failed: {r.status_code} {r.text}"
    data = r.json()
    data["_password"] = body["password"]
    data["_email"] = email
    return data


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ---------------- Auth ----------------
def test_super_admin_login(super_token):
    assert isinstance(super_token, str) and len(super_token) > 10


def test_auth_me(super_h):
    r = requests.get(f"{API}/auth/me", headers=super_h, timeout=30)
    assert r.status_code == 200
    assert r.json().get("role") == "super_admin"


# ---------------- Points manage ----------------
def test_points_award_manage_edit_delete(super_h):
    siswa = _mk_user(super_h, "siswa")
    # Award
    r = requests.post(f"{API}/points", json={"user_id": siswa["id"], "points": 10,
                                              "reason": "TEST reason", "category": "prestasi"},
                      headers=super_h, timeout=30)
    assert r.status_code == 200, r.text
    pid = r.json().get("id")
    assert pid

    # List via /points/manage
    r = requests.get(f"{API}/points/manage", headers=super_h, timeout=30)
    assert r.status_code == 200
    rows = r.json()
    assert any(x.get("id") == pid for x in rows), "created point not listed in manage"

    # Patch
    r = requests.patch(f"{API}/points/{pid}",
                       json={"points": 25, "category": "akademik", "reason": "edited"},
                       headers=super_h, timeout=30)
    assert r.status_code == 200, r.text

    # Verify via /points/history
    r = requests.get(f"{API}/points/history/{siswa['id']}", headers=super_h, timeout=30)
    assert r.status_code == 200
    hist = r.json()["history"]
    rec = next((x for x in hist if x["id"] == pid), None)
    assert rec and rec["points"] == 25 and rec["category"] == "akademik" and rec["reason"] == "edited"

    # Delete
    r = requests.delete(f"{API}/points/{pid}", headers=super_h, timeout=30)
    assert r.status_code == 200
    # Verify gone
    r = requests.get(f"{API}/points/manage", headers=super_h, timeout=30)
    assert all(x.get("id") != pid for x in r.json())


# ---------------- PPDB ----------------
def _register_ppdb():
    body = {
        "full_name": f"TEST PPDB {TS}", "address": "Jl Test", "phone": "081234567890",
        "parent_name": "Ortu Test", "parent_phone": "081234567891",
        "parent_email": f"ortu_{TS}@test.com", "prev_school": "SMP Test",
        "nem_avg": 82.5, "jurusan_pilihan": "IPA", "gender": "L",
    }
    r = requests.post(f"{API}/ppdb/register", json=body, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_ppdb_super_admin_edit_delete_and_403_for_staff(super_h):
    pid = _register_ppdb()
    # Super edit via PUT
    r = requests.put(f"{API}/ppdb/{pid}", json={"full_name": "TEST PPDB edited", "nem_avg": 90.0, "status": "diterima"},
                     headers=super_h, timeout=30)
    assert r.status_code == 200, r.text
    r = requests.get(f"{API}/ppdb/{pid}", headers=super_h, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["full_name"] == "TEST PPDB edited"
    assert data["nem_avg"] == 90.0
    assert data["status"] == "diterima"

    # Create staff_tu user → should get 403 on PUT and DELETE
    staff = _mk_user(super_h, "staff_tu")
    staff_h = _login(staff["_email"], staff["_password"])
    r = requests.put(f"{API}/ppdb/{pid}", json={"full_name": "x"}, headers=staff_h, timeout=30)
    assert r.status_code == 403, f"staff_tu PUT should be 403, got {r.status_code}"
    r = requests.delete(f"{API}/ppdb/{pid}", headers=staff_h, timeout=30)
    assert r.status_code == 403, f"staff_tu DELETE should be 403, got {r.status_code}"

    # Super delete
    r = requests.delete(f"{API}/ppdb/{pid}", headers=super_h, timeout=30)
    assert r.status_code == 200
    r = requests.get(f"{API}/ppdb/{pid}", headers=super_h, timeout=30)
    assert r.status_code == 404


# ---------------- Attendance scan role guard ----------------
def test_attendance_scan_role_guard(super_h):
    siswa = _mk_user(super_h, "siswa")
    siswa_h = _login(siswa["_email"], siswa["_password"])
    # siswa forbidden
    r = requests.post(f"{API}/attendance/scan",
                      json={"nisn": siswa.get("nisn") or "123", "status": "hadir", "method": "manual"},
                      headers=siswa_h, timeout=30)
    assert r.status_code == 403, f"siswa must be 403, got {r.status_code} {r.text}"

    # admin_absensi allowed (should reach handler then succeed/404 depending on nisn)
    aa = _mk_user(super_h, "admin_absensi")
    aa_h = _login(aa["_email"], aa["_password"])
    r = requests.post(f"{API}/attendance/scan",
                      json={"nisn": siswa.get("nisn"), "status": "hadir", "method": "manual"},
                      headers=aa_h, timeout=30)
    assert r.status_code != 403, f"admin_absensi should be allowed, got 403: {r.text}"
    assert r.status_code in (200, 400, 404), r.text


# ---------------- Admin absensi role ----------------
def test_admin_absensi_create_and_login(super_h):
    aa = _mk_user(super_h, "admin_absensi")
    aa_h = _login(aa["_email"], aa["_password"])
    r = requests.get(f"{API}/auth/me", headers=aa_h, timeout=30)
    assert r.status_code == 200
    assert r.json()["role"] == "admin_absensi"


# ---------------- Staff xlsx export ----------------
def test_staff_export_xlsx(super_h):
    r = requests.get(f"{API}/users/staff/export/xlsx", headers=super_h, timeout=60)
    assert r.status_code == 200, r.text
    ct = r.headers.get("content-type", "")
    assert "spreadsheet" in ct or "xlsx" in ct or "octet-stream" in ct, ct
    assert len(r.content) > 100


# ---------------- Attendance / PPDB xlsx exports ----------------
def test_attendance_export(super_h):
    r = requests.get(f"{API}/attendance/export", headers=super_h, timeout=60)
    assert r.status_code == 200, r.text
    assert len(r.content) > 100


def test_ppdb_export_xlsx(super_h):
    r = requests.get(f"{API}/ppdb/export/xlsx", headers=super_h, timeout=60)
    assert r.status_code == 200, r.text
    assert len(r.content) > 100


# ---------------- Assignments complex form ----------------
def test_assignment_create_with_new_fields(super_h):
    # Guru
    guru = _mk_user(super_h, "guru", {"subjects": ["Matematika"]})
    body = {
        "title": f"TEST Tugas {TS}",
        "description": "deskripsi",
        "subject": "Matematika",
        "guru_id": guru["id"],
        "guru_name": guru["name"],
        "semester": "ganjil",
        "active": True,
        "link": "https://example.com/tugas",
        "due_date": "2026-02-01",
    }
    r = requests.post(f"{API}/assignments", json=body, headers=super_h, timeout=30)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["title"] == body["title"]
    assert created["subject"] == "Matematika"
    assert created["guru_id"] == guru["id"]
    assert created["guru_name"] == guru["name"]
    assert created["semester"] == "ganjil"
    assert created["active"] is True
    assert created["link"] == body["link"]

    # Verify list
    r = requests.get(f"{API}/assignments", headers=super_h, timeout=30)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert created["id"] in ids


# ---------------- Guru&Staff PATCH /api/users/{id} ----------------
def test_patch_user_update_subjects_nip(super_h):
    guru = _mk_user(super_h, "guru")
    r = requests.patch(f"{API}/users/{guru['id']}",
                       json={"nip": "19800101", "subjects": ["Fisika", "Kimia"]},
                       headers=super_h, timeout=30)
    assert r.status_code in (200, 204), r.text
    r = requests.get(f"{API}/users?role=guru", headers=super_h, timeout=30)
    assert r.status_code == 200
    g = next((u for u in r.json() if u["id"] == guru["id"]), None)
    assert g is not None
    assert g.get("nip") == "19800101"
    assert set(g.get("subjects") or []) == {"Fisika", "Kimia"}
