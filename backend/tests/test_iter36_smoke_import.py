"""Smoke test for fresh import — verify core endpoints work, no /api/api double prefix."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE_URL = BASE_URL.rstrip("/")

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data or "token" in data, data
    tok = data.get("access_token") or data.get("token")
    assert tok
    # role check
    user = data.get("user") or {}
    role = user.get("role") or data.get("role")
    assert role == "super_admin", f"Expected super_admin, got {role}"
    return tok


def test_public_settings():
    r = requests.get(f"{BASE_URL}/api/settings", timeout=20)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), dict)


def test_no_double_api_prefix():
    r = requests.get(f"{BASE_URL}/api/api/settings", timeout=20)
    assert r.status_code in (404, 405), f"Double prefix /api/api should 404, got {r.status_code}"


def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=20)
    assert r.status_code in (400, 401, 403), r.status_code


def test_login_returns_super_admin(token):
    assert isinstance(token, str) and len(token) > 10


def test_auth_gallery(token):
    r = requests.get(f"{BASE_URL}/api/gallery", headers={"Authorization": f"Bearer {token}"}, timeout=20)
    assert r.status_code == 200, r.text


def test_auth_users_or_master(token):
    headers = {"Authorization": f"Bearer {token}"}
    # try common endpoints
    tried = []
    for path in ["/api/users", "/api/master/accounts", "/api/accounts", "/api/auth/me"]:
        r = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=20)
        tried.append((path, r.status_code))
        if r.status_code == 200:
            return
    pytest.fail(f"No auth users-style endpoint returned 200: {tried}")


def test_dashboard_stats(token):
    headers = {"Authorization": f"Bearer {token}"}
    candidates = ["/api/dashboard/stats", "/api/dashboard", "/api/stats", "/api/dashboard/summary"]
    results = []
    for p in candidates:
        r = requests.get(f"{BASE_URL}{p}", headers=headers, timeout=20)
        results.append((p, r.status_code))
        if r.status_code == 200:
            return
    pytest.fail(f"No dashboard stats endpoint responded 200: {results}")


def test_ai_disabled_returns_clear_error(token):
    headers = {"Authorization": f"Bearer {token}"}
    # Try a known AI endpoint — just confirm it doesn't 500 crash
    r = requests.post(f"{BASE_URL}/api/ai/schoolgram/generate", headers=headers, json={"prompt": "hi"}, timeout=20)
    # Expected either 400 "Fitur AI belum aktif" or 404 if endpoint path differs; must not be 500
    assert r.status_code != 500, f"AI endpoint 500: {r.text}"
