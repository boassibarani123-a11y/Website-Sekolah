# Smoke tests for import of branch main27: auth, key GETs, user create + login
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "boassibarani123@gmail.com", "password": os.environ["ADMIN_PASSWORD"]}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["role"] == "super_admin"
    assert "password_hash" not in d["user"]
    return d["token"]


@pytest.fixture(scope="module")
def h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# Auth
def test_login_invalid():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nouser_x@example.com", "password": "bad"})
    assert r.status_code == 401


def test_me(h):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=h)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]


def test_me_unauth():
    assert requests.get(f"{BASE_URL}/api/auth/me").status_code in (401, 403)


# Key GET endpoints
@pytest.mark.parametrize("path", ["/api/settings", "/api/users", "/api/announcements",
                                  "/api/classes", "/api/gallery", "/api/face/students", "/api/subjects"])
def test_key_gets(h, path):
    r = requests.get(f"{BASE_URL}{path}", headers=h)
    assert r.status_code == 200, f"{path}: {r.status_code} {r.text[:200]}"
    assert "_id" not in r.text


# User creation (teacher + student) and login
@pytest.mark.parametrize("role,extra", [("guru", {}), ("siswa", {"phone": "081234567890", "kelas": "X"})])
def test_create_user_and_login(h, role, extra):
    email = f"test_{role}_{uuid.uuid4().hex[:6]}@example.com"
    pw = "Test12345a"
    r = requests.post(f"{BASE_URL}/api/users", headers=h,
                      json={"email": email, "password": pw, "name": f"TEST_{role}", "role": role, **extra})
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    try:
        assert r.json()["role"] == role
        g = requests.get(f"{BASE_URL}/api/users/{uid}", headers=h)
        assert g.status_code == 200 and g.json()["email"] == email
        lr = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pw})
        assert lr.status_code == 200, lr.text
        assert lr.json()["user"]["role"] == role
        me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {lr.json()['token']}"})
        assert me.status_code == 200
    finally:
        requests.delete(f"{BASE_URL}/api/users/{uid}", headers=h)


def test_student_requires_phone(h):
    r = requests.post(f"{BASE_URL}/api/users", headers=h,
                      json={"email": f"test_np_{uuid.uuid4().hex[:6]}@example.com", "password": "Test12345a",
                            "name": "TEST_np", "role": "siswa"})
    assert r.status_code == 400
