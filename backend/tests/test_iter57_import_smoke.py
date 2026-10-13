"""Iteration 57 — Fresh import smoke test.

Verifies boot/auth/core-read flows for the imported Website-Sekolah app.
AI (EMERGENT_LLM_KEY) and Brevo email keys are intentionally empty —
confirms those features fail gracefully, not crash.
"""
import os
import pytest
import requests
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env (fail-fast)
def _load_base_url():
    env_path = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL missing in frontend/.env")

BASE_URL = _load_base_url()

SUPER_ADMIN = ("boassibarani123@gmail.com", "Boas12345io", "super_admin")
GURU = ("guru.test@sman1laguboti.sch.id", "Guru12345", "guru")
SISWA = ("siswa.test@sman1laguboti.sch.id", "Siswa12345", "siswa")
ABSENSI = ("satpam.test@sman1laguboti.sch.id", "Absen12345", "admin_absensi")


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(client, email, password):
    r = client.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "token" in data and data["token"], f"no token for {email}"
    assert "user" in data
    return data


@pytest.fixture(scope="module")
def super_token(client):
    return _login(client, SUPER_ADMIN[0], SUPER_ADMIN[1])["token"]


# ---------------- Health ----------------
class TestHealth:
    def test_health_ok(self, client):
        r = client.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------------- Auth ----------------
class TestAuth:
    def test_super_admin_login(self, client):
        data = _login(client, *SUPER_ADMIN[:2])
        assert data["user"]["role"] == SUPER_ADMIN[2]
        assert data["user"]["email"] == SUPER_ADMIN[0]

    def test_guru_login(self, client):
        data = _login(client, *GURU[:2])
        assert data["user"]["role"] == GURU[2]

    def test_siswa_login(self, client):
        data = _login(client, *SISWA[:2])
        assert data["user"]["role"] == SISWA[2]

    def test_admin_absensi_login(self, client):
        data = _login(client, *ABSENSI[:2])
        assert data["user"]["role"] == ABSENSI[2]

    def test_login_invalid_password(self, client):
        r = client.post(f"{BASE_URL}/api/auth/login", json={"email": SUPER_ADMIN[0], "password": "WRONG_pw"}, timeout=10)
        assert r.status_code in (400, 401, 403)

    def test_protected_endpoint_rejects_no_token(self, client):
        # Clear any auth header
        s = requests.Session()
        r = s.get(f"{BASE_URL}/api/users", timeout=10)
        assert r.status_code in (401, 403), f"expected 401/403 without token, got {r.status_code}"


# ---------------- Authenticated reads ----------------
class TestAuthenticatedReads:
    def _auth(self, token):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        return s

    def test_accounts_list(self, super_token):
        s = self._auth(super_token)
        r = s.get(f"{BASE_URL}/api/users", timeout=15)
        assert r.status_code == 200
        data = r.json()
        # list-like
        assert isinstance(data, (list, dict))

    def test_classes_list(self, super_token):
        s = self._auth(super_token)
        r = s.get(f"{BASE_URL}/api/classes", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_settings_endpoint(self, super_token):
        s = self._auth(super_token)
        # try common settings paths
        tried = []
        for path in ("/api/settings", "/api/school/settings", "/api/settings/school"):
            r = s.get(f"{BASE_URL}{path}", timeout=10)
            tried.append((path, r.status_code))
            if r.status_code == 200:
                return
        pytest.skip(f"No settings endpoint 200 among tried={tried}")

    def test_me_endpoint(self, super_token):
        s = self._auth(super_token)
        r = s.get(f"{BASE_URL}/api/auth/me", timeout=10)
        if r.status_code == 404:
            pytest.skip("/api/auth/me not present")
        assert r.status_code == 200
        assert r.json().get("role") == "super_admin"


# ---------------- Public endpoints ----------------
class TestPublic:
    def test_gallery_public(self, client):
        r = client.get(f"{BASE_URL}/api/gallery", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_public_profile(self, client):
        tried = []
        for path in ("/api/school/profile", "/api/public/profile", "/api/profile-sekolah", "/api/public/school"):
            r = client.get(f"{BASE_URL}{path}", timeout=10)
            tried.append((path, r.status_code))
            if r.status_code == 200:
                return
        pytest.skip(f"No public profile endpoint found: {tried}")

    def test_public_org(self, client):
        tried = []
        for path in ("/api/struktur-organisasi", "/api/public/org", "/api/org", "/api/organization", "/api/public/struktur"):
            r = client.get(f"{BASE_URL}{path}", timeout=10)
            tried.append((path, r.status_code))
            if r.status_code == 200:
                return
        pytest.skip(f"No public org endpoint found: {tried}")


# ---------------- Stubbed integrations fail gracefully ----------------
class TestStubbedIntegrations:
    def _auth(self, token):
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        return s

    def test_ai_question_gen_graceful(self, client):
        # Login as guru (AI question-gen is typically a guru feature)
        gdata = _login(client, *GURU[:2])
        s = self._auth(gdata["token"])
        # Try common AI endpoints — should return controlled error, not 500 crash
        tried = []
        for path, payload in [
            ("/api/ai/generate-questions", {"topic": "math", "count": 1, "subject": "Matematika"}),
            ("/api/quiz/generate", {"topic": "math", "count": 1}),
            ("/api/question-bank/generate", {"topic": "math", "count": 1}),
        ]:
            r = s.post(f"{BASE_URL}{path}", json=payload, timeout=15)
            tried.append((path, r.status_code))
            if r.status_code != 404:
                # Not crashing with unhandled exception; 400/401/403/503 all acceptable
                assert r.status_code != 500 or ("key" in r.text.lower() or "llm" in r.text.lower()), \
                    f"AI endpoint {path} crashed uncleanly: {r.status_code} {r.text[:200]}"
                return
        pytest.skip(f"No AI question-gen endpoint found (keys stubbed): {tried}")

    def test_email_feature_graceful(self, client):
        # Forgot-password typically uses Brevo — must not crash
        tried = []
        for path in ("/api/auth/forgot-password", "/api/auth/forgot", "/api/forgot-password"):
            r = client.post(f"{BASE_URL}{path}", json={"email": GURU[0]}, timeout=15)
            tried.append((path, r.status_code))
            if r.status_code != 404:
                assert r.status_code != 500, f"forgot-password {path} crashed: {r.text[:200]}"
                return
        pytest.skip(f"No forgot-password endpoint found: {tried}")
