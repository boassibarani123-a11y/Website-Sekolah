"""Smoke test after fresh GitHub import (branch main14).
Covers: admin login, key GET endpoints, public PPDB & struktur endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://website-sekolah-1.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("user", {}).get("role") == "super_admin"
    return data["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# Admin-authenticated GET endpoints referenced by sidebar menus
ADMIN_ENDPOINTS = [
    "/api/users",
    "/api/teachers",
    "/api/attendance",
    "/api/schoolgram/posts",
    "/api/leaderboard",
    "/api/calendar",
    "/api/ppdb",
    "/api/organization",
    "/api/school/info",
    "/api/classes",
    "/api/announcements",
]


@pytest.mark.parametrize("path", ADMIN_ENDPOINTS)
def test_admin_get_endpoints(auth, path):
    r = requests.get(f"{BASE_URL}{path}", headers=auth, timeout=15)
    # Accept 200 primarily; 404 means endpoint not exposed (will report), 401/403 is a bug
    assert r.status_code != 500, f"{path} -> 500 server error: {r.text[:200]}"
    assert r.status_code in (200, 404), f"{path} -> {r.status_code}: {r.text[:200]}"


# Public endpoints
@pytest.mark.parametrize("path", ["/api/ppdb/public/info", "/api/organization", "/api/school/info"])
def test_public_endpoints(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=15)
    assert r.status_code in (200, 404), f"{path} -> {r.status_code}"


def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
    assert r.status_code in (400, 401)
