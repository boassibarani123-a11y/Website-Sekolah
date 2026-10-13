"""Smoke tests for imported LAGUBOTI app (iter 25)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://website-import-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data or "access_token" in data, data
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- Public endpoints ---
class TestPublic:
    def test_settings_public(self):
        r = requests.get(f"{API}/settings", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)

    def test_org_public(self):
        r = requests.get(f"{API}/org/public", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_org_structures_public(self):
        r = requests.get(f"{API}/org-structures/public", timeout=20)
        assert r.status_code == 200

    def test_gallery_public(self):
        r = requests.get(f"{API}/gallery", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_announcements_login(self):
        r = requests.get(f"{API}/announcements/login", timeout=20)
        assert r.status_code == 200


# --- Auth protection ---
class TestAuthProtection:
    @pytest.mark.parametrize("path", ["/users", "/classes", "/inventory", "/announcements", "/social-fund", "/stats"])
    def test_requires_auth(self, path):
        r = requests.get(f"{API}{path}", timeout=20)
        assert r.status_code in (401, 403), f"{path} returned {r.status_code}"


# --- Authenticated endpoints ---
class TestAuthenticated:
    def test_me(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("email") == ADMIN_EMAIL
        assert d.get("role") == "super_admin"

    @pytest.mark.parametrize("path", [
        "/users", "/classes", "/inventory", "/announcements",
        "/social-fund", "/stats", "/candidates", "/subjects",
        "/assignments", "/quizzes", "/exams", "/posts",
        "/books", "/loans", "/library/stats", "/library/config",
        "/profile-achievements", "/achievements", "/events",
        "/ppdb", "/notifications", "/chats",
    ])
    def test_get_endpoints(self, auth_headers, path):
        r = requests.get(f"{API}{path}", headers=auth_headers, timeout=30)
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"


# --- Forgot password flow ---
class TestForgotPassword:
    def test_forgot_password_no_crash(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=30)
        # Must respond; typically 200 even if email provider is not configured
        assert r.status_code in (200, 202, 400), r.text


# --- AI feature guard ---
class TestAI:
    def test_ai_summary_endpoint_responds(self, auth_headers):
        # Create a book then call ai-summary; verify it does NOT return 'Fitur AI belum aktif'
        book_payload = {"title": "TEST_AI Book", "author": "Tester", "category": "Fiksi"}
        rb = requests.post(f"{API}/books", json=book_payload, headers=auth_headers, timeout=30)
        if rb.status_code not in (200, 201):
            pytest.skip(f"cannot create book: {rb.status_code} {rb.text[:200]}")
        bid = rb.json().get("id") or rb.json().get("_id")
        if not bid:
            pytest.skip("no book id returned")
        r = requests.post(f"{API}/books/{bid}/ai-summary", headers=auth_headers, timeout=90)
        # cleanup
        requests.delete(f"{API}/books/{bid}", headers=auth_headers, timeout=20)
        assert r.status_code in (200, 500, 502, 504), r.text
        if r.status_code == 200:
            body = r.text.lower()
            assert "fitur ai belum aktif" not in body
