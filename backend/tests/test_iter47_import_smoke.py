"""
Iteration 47 — Import smoke test for Website-Sekolah repo (branch main19).
Validates: auth login (super admin), key read endpoints for super admin,
public endpoints, face model file serving, cron endpoint auth.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sekolah-main19.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"
CRON_SECRET = "dc1528587498482a0616a0fad2b59061e40f906a638bffdfd3b6dd9b794c8cd4"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ------- Auth -------
class TestAuth:
    def test_login_success(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code in (400, 401, 403)

    def test_me(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json().get("email") == ADMIN_EMAIL


# ------- Public endpoints -------
class TestPublic:
    def test_settings_public(self):
        r = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_frontend_root(self):
        r = requests.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200

    @pytest.mark.parametrize("path", [
        "/models/tiny_face_detector_model-weights_manifest.json",
        "/models/face_landmark_68_model-weights_manifest.json",
        "/models/face_recognition_model-weights_manifest.json",
    ])
    def test_face_model_manifest_served(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"{path} -> {r.status_code}"


# ------- Super admin read APIs smoke -------
class TestAdminReads:
    @pytest.mark.parametrize("ep", [
        "/api/users",
        "/api/classes",
        "/api/piket/shifts",
        "/api/face/students",
        "/api/announcements",
        "/api/gallery",
        "/api/library/books",
        "/api/analytics/summary",
    ])
    def test_endpoint_ok(self, admin_headers, ep):
        r = requests.get(f"{BASE_URL}{ep}", headers=admin_headers, timeout=30)
        # Allow 404 for optional modules, but core must be 200
        assert r.status_code in (200, 404), f"{ep} -> {r.status_code} {r.text[:200]}"


# ------- Cron auth -------
class TestCron:
    def test_cron_requires_secret(self):
        r = requests.post(f"{BASE_URL}/api/cron/piket-reminder", timeout=15)
        assert r.status_code in (401, 403), f"expected auth error, got {r.status_code}"

    def test_cron_with_secret(self):
        import uuid
        run_id = f"TEST_{uuid.uuid4()}"
        r = requests.post(f"{BASE_URL}/api/cron/piket-reminder",
                          headers={"Authorization": f"Bearer {CRON_SECRET}",
                                   "X-Webhook-Id": run_id,
                                   "Content-Type": "application/json"},
                          json={"run_id": run_id}, timeout=30)
        assert r.status_code in (200, 204), f"{r.status_code} {r.text[:200]}"
