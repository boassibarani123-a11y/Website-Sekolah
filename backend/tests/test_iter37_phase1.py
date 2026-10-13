"""Phase 1 enhancement tests: login error, is_active deactivation, user CRUD."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sekolah-import-run.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- LOGIN ----------
def test_login_wrong_credentials_returns_401():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-pass-xxx"})
    assert r.status_code == 401
    assert "detail" in r.json()


def test_login_correct_super_admin():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data and len(data["token"]) > 10
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "super_admin"


# ---------- USERS CRUD + is_active ----------
TEST_EMAIL = f"test_phase1_{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "TestPass123!"
_created_user_id = {"id": None}


def test_create_siswa_user(admin_headers):
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "TEST Phase1 Siswa",
        "role": "siswa",
        "kelas": "X-1",
        "phone": "081234567890",
        "nisn": "1234567890",
    }
    r = requests.post(f"{API}/users", json=payload, headers=admin_headers)
    assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == TEST_EMAIL
    assert data["role"] == "siswa"
    assert data.get("is_active") is True, "new user must have is_active=True"
    _created_user_id["id"] = data["id"]


def test_new_user_can_login():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200


def test_patch_user_deactivate(admin_headers):
    uid = _created_user_id["id"]
    assert uid
    r = requests.patch(f"{API}/users/{uid}", json={"is_active": False}, headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data.get("is_active") is False


def test_deactivated_user_cannot_login():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 403
    detail = r.json().get("detail", "").lower()
    assert "dinonaktifkan" in detail


def test_reactivate_user(admin_headers):
    uid = _created_user_id["id"]
    r = requests.patch(f"{API}/users/{uid}", json={"is_active": True}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json().get("is_active") is True


def test_reactivated_user_can_login():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200


def test_edit_user_name_and_password(admin_headers):
    uid = _created_user_id["id"]
    new_pass = "NewPass456!"
    r = requests.patch(f"{API}/users/{uid}", json={"name": "TEST Phase1 Renamed", "password": new_pass}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "TEST Phase1 Renamed"
    # verify new password works
    lr = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": new_pass})
    assert lr.status_code == 200


def test_delete_user(admin_headers):
    uid = _created_user_id["id"]
    r = requests.delete(f"{API}/users/{uid}", headers=admin_headers)
    assert r.status_code == 200
    # verify by trying login - should 401 (user gone)
    lr = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert lr.status_code == 401


# ---------- Dashboard stats quick smoke ----------
def test_dashboard_stats(admin_headers):
    r = requests.get(f"{API}/dashboard/stats", headers=admin_headers)
    assert r.status_code == 200


def test_announcements_endpoint(admin_headers):
    r = requests.get(f"{API}/announcements", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Admin cannot be locked out ----------
def test_super_admin_still_logs_in_at_end():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
