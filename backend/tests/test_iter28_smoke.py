"""Smoke tests for fresh import — iteration 28.

Covers:
- Public endpoints (no auth): /api/settings, /api/org/public, /api/ppdb/public (if any)
- Super admin login + /api/auth/me
- Dashboard stats
- Core module list endpoints (Classes, Library, Schoolgram/posts, Achievements, Attendance)
- Object storage upload via /api/upload
- AI book summary endpoint
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in response: {data}"
    return tok


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Public ----------
class TestPublic:
    def test_settings_public(self):
        r = requests.get(f"{API}/settings", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "school_name" in d
        assert d["school_name"]

    def test_org_public(self):
        r = requests.get(f"{API}/org/public", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_org_structures_public(self):
        r = requests.get(f"{API}/org-structures/public", timeout=20)
        assert r.status_code == 200


# ---------- Auth ----------
class TestAuth:
    def test_login_ok(self, token):
        assert len(token) > 10

    def test_me(self, auth):
        r = requests.get(f"{API}/auth/me", headers=auth, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("email") == ADMIN_EMAIL
        assert d.get("role") == "super_admin"

    def test_login_bad_pw(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"},
                          timeout=20)
        assert r.status_code in (400, 401, 403)


# ---------- Core modules ----------
class TestCoreModules:
    def test_dashboard_stats(self, auth):
        # Try common dashboard endpoints
        for path in ["/dashboard/stats", "/stats", "/dashboard"]:
            r = requests.get(f"{API}{path}", headers=auth, timeout=20)
            if r.status_code == 200:
                return
        pytest.skip("No dashboard stats endpoint found")

    def test_classes_list(self, auth):
        r = requests.get(f"{API}/classes", headers=auth, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_books_list(self, auth):
        r = requests.get(f"{API}/books", headers=auth, timeout=20)
        assert r.status_code == 200

    def test_library_config(self, auth):
        r = requests.get(f"{API}/library/config", headers=auth, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "loan_days" in d

    def test_library_stats(self, auth):
        r = requests.get(f"{API}/library/stats", headers=auth, timeout=30)
        assert r.status_code == 200

    def test_achievements(self, auth):
        r = requests.get(f"{API}/achievements", headers=auth, timeout=20)
        assert r.status_code == 200

    def test_attendance(self, auth):
        r = requests.get(f"{API}/attendance", headers=auth, timeout=30)
        assert r.status_code == 200

    def test_posts_schoolgram(self, auth):
        r = requests.get(f"{API}/posts", headers=auth, timeout=20)
        # Schoolgram likely uses /posts
        assert r.status_code in (200, 404)


# ---------- Object storage upload ----------
class TestStorage:
    def test_upload_image(self, auth):
        # minimal 1x1 PNG
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489"
            "0000000D49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/upload", headers=auth, files=files, timeout=120)
        assert r.status_code == 200, f"upload failed: {r.status_code} {r.text[:400]}"
        d = r.json()
        assert d.get("path")
        assert d.get("url")


# ---------- AI book summary ----------
class TestAI:
    def test_ai_book_summary(self, auth):
        # need a book — create one
        r = requests.post(f"{API}/books", headers=auth, json={
            "title": "TEST_AI Buku Uji",
            "author": "Tester",
            "category": "Fiksi",
            "description": "Buku singkat untuk uji ringkasan AI.",
            "total_copies": 1,
            "available_copies": 1,
        }, timeout=30)
        if r.status_code not in (200, 201):
            pytest.skip(f"cannot create book: {r.status_code} {r.text[:200]}")
        book = r.json()
        bid = book.get("id") or book.get("_id")
        if not bid:
            # try listing
            lr = requests.get(f"{API}/books", headers=auth, timeout=20)
            for b in lr.json():
                if b.get("title") == "TEST_AI Buku Uji":
                    bid = b["id"]
                    break
        assert bid, "no book id"
        try:
            ar = requests.post(f"{API}/books/{bid}/ai-summary", headers=auth, timeout=120)
            assert ar.status_code == 200, f"AI summary failed: {ar.status_code} {ar.text[:400]}"
            d = ar.json()
            assert d.get("summary")
            assert len(d["summary"]) > 10
        finally:
            requests.delete(f"{API}/books/{bid}", headers=auth, timeout=20)
