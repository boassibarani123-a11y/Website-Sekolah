"""Iter 47 - fresh import smoke: login, user mgmt, barcode attendance, key pages (API side)."""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://website-sekolah-2.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("token")
    assert data["user"]["role"] == "super_admin"
    return data["token"]


@pytest.fixture(scope="module")
def h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Auth ----------
def test_login_invalid():
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=20)
    assert r.status_code in (400, 401)


def test_me(h):
    r = requests.get(f"{BASE}/api/auth/me", headers=h, timeout=20)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ---------- Users / Student creation ----------
@pytest.fixture(scope="module")
def student(h):
    nisn = "TEST" + uuid.uuid4().hex[:8]
    body = {
        "email": f"test_{nisn}@example.com",
        "password": "Student123!",
        "name": "TEST Student Iter47",
        "role": "siswa",
        "nisn": nisn,
        "kelas": "X-A",
        "phone": "081234567890",
    }
    r = requests.post(f"{BASE}/api/users", headers=h, json=body, timeout=30)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["nisn"] == nisn
    assert d["role"] == "siswa"
    yield d
    requests.delete(f"{BASE}/api/users/{d['id']}", headers=h, timeout=20)


def test_list_users(h, student):
    r = requests.get(f"{BASE}/api/users?role=siswa", headers=h, timeout=20)
    assert r.status_code == 200
    assert any(u["id"] == student["id"] for u in r.json())


# ---------- Attendance barcode scan ----------
def test_scan_barcode_missing_input(h):
    r = requests.post(f"{BASE}/api/attendance/scan", headers=h,
                      json={"method": "barcode", "status": "hadir"}, timeout=20)
    assert r.status_code == 400


def test_scan_barcode_unknown_nisn(h):
    r = requests.post(f"{BASE}/api/attendance/scan", headers=h,
                      json={"method": "barcode", "status": "hadir", "nisn": "DOESNOTEXIST999"}, timeout=20)
    assert r.status_code == 404


def test_scan_barcode_valid(h, student):
    r = requests.post(f"{BASE}/api/attendance/scan", headers=h,
                      json={"method": "barcode", "status": "hadir", "nisn": student["nisn"]}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["status"] == "hadir"
    # Duplicate same-status scan
    r2 = requests.post(f"{BASE}/api/attendance/scan", headers=h,
                       json={"method": "barcode", "status": "hadir", "nisn": student["nisn"]}, timeout=20)
    assert r2.status_code == 200
    assert r2.json().get("duplicate") is True


def test_attendance_list_contains_student(h, student):
    r = requests.get(f"{BASE}/api/attendance", headers=h, timeout=20)
    assert r.status_code == 200
    assert any(a["student_id"] == student["id"] for a in r.json())


def test_attendance_stats(h):
    r = requests.get(f"{BASE}/api/attendance/stats", headers=h, timeout=20)
    assert r.status_code == 200
    s = r.json()
    for k in ("hadir", "izin", "sakit", "alpa", "total_siswa"):
        assert k in s


# ---------- Key pages' backend endpoints (page load support) ----------
@pytest.mark.parametrize("path", [
    "/api/classes",
    "/api/announcements",
    "/api/exams",
    "/api/rapor",
    "/api/attendance/stations",
])
def test_key_endpoints_load(h, path):
    r = requests.get(f"{BASE}{path}", headers=h, timeout=25)
    # Must not 5xx; endpoint may or may not exist – 404 is reported, 500 is a bug.
    assert r.status_code < 500, f"{path} -> {r.status_code}: {r.text[:300]}"


# ---------- SMTP-off: forgot password should not 500 ----------
def test_forgot_password_no_smtp():
    r = requests.post(f"{BASE}/api/auth/forgot-password",
                      json={"email": ADMIN_EMAIL}, timeout=25)
    # Should return 2xx or 4xx but definitely NOT 500 regardless of SMTP config
    assert r.status_code < 500, f"forgot-password 500: {r.text[:300]}"
