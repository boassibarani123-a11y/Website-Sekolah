"""Iteration 14 tests: Monthly kas recap, Quiz time-limit, Remove class password, Kas-reminder cron."""
import os
import time
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://edu-build-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
CID = "97194f55-894d-44dc-957a-1c2a8522e2b0"  # XI IPA 1
SECRET = None

PWD = "Demo12345"
USERS = {
    "admin": "admin.demo@sekolahku.id",
    "guru": "guru.demo@sekolahku.id",
    "siswa": "siswa.demo@sekolahku.id",
    "ketua": "kelas.demo@sekolahku.id",
}


def _secret():
    global SECRET
    if SECRET is None:
        with open("/app/backend/.env") as f:
            for line in f:
                if line.startswith("WEBHOOK_CRON_SECRET"):
                    SECRET = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    return SECRET


@pytest.fixture(scope="module")
def tokens():
    out = {}
    for key, email in USERS.items():
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": PWD}, timeout=20)
        assert r.status_code == 200, f"login {key}: {r.status_code} {r.text}"
        out[key] = r.json()["token"]
    return out


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Monthly kas recap ----------
class TestMonthlyKas:
    def test_siswa_forbidden(self, tokens):
        r = requests.get(f"{API}/classes/{CID}/kas/monthly", headers=H(tokens["siswa"]))
        assert r.status_code == 403

    def test_guru_forbidden(self, tokens):
        r = requests.get(f"{API}/classes/{CID}/kas/monthly", headers=H(tokens["guru"]))
        assert r.status_code == 403

    def test_bad_month(self, tokens):
        r = requests.get(f"{API}/classes/{CID}/kas/monthly?month=2026-99", headers=H(tokens["admin"]))
        assert r.status_code == 400

    def test_super_admin_ok(self, tokens):
        r = requests.get(f"{API}/classes/{CID}/kas/monthly?month=2026-01", headers=H(tokens["admin"]))
        assert r.status_code == 200
        data = r.json()
        assert data["month"] == "2026-01"
        assert isinstance(data["students"], list)
        assert isinstance(data["weeks"], list)
        assert len(data["weeks"]) >= 4
        if data["students"]:
            st = data["students"][0]
            assert "weeks" in st and len(st["weeks"]) == len(data["weeks"])
            for c in st["weeks"]:
                assert c["status"] in ("paid", "unpaid", "future")

    def test_ketua_kelas_ok(self, tokens):
        r = requests.get(f"{API}/classes/{CID}/kas/monthly", headers=H(tokens["ketua"]))
        assert r.status_code == 200


# ---------- Remove class password ----------
class TestRemovePassword:
    def test_guru_forbidden(self, tokens):
        r = requests.patch(f"{API}/classes/{CID}", json={"remove_password": True},
                           headers=H(tokens["guru"]))
        assert r.status_code == 403

    def test_super_admin_flow(self, tokens):
        # Set a password
        r = requests.patch(f"{API}/classes/{CID}", json={"password": "temp-pass-123"},
                           headers=H(tokens["admin"]))
        assert r.status_code == 200
        # List classes and verify has_password True
        rl = requests.get(f"{API}/classes", headers=H(tokens["admin"]))
        klass = next(c for c in rl.json() if c["id"] == CID)
        assert klass.get("has_password") is True
        # Remove password
        r2 = requests.patch(f"{API}/classes/{CID}", json={"remove_password": True},
                            headers=H(tokens["admin"]))
        assert r2.status_code == 200
        rl2 = requests.get(f"{API}/classes", headers=H(tokens["admin"]))
        klass2 = next(c for c in rl2.json() if c["id"] == CID)
        assert not klass2.get("has_password")


# ---------- Quiz time limit ----------
class TestQuizTimeLimit:
    @pytest.fixture
    def quiz_id(self, tokens):
        # create a quiz with 1-minute limit
        body = {
            "title": f"TEST_timed_{uuid.uuid4().hex[:6]}",
            "subject": "Matematika",
            "class_id": CID,
            "kelas": "XI IPA 1",
            "time_limit": 1,
            "questions": [{"q": "1+1?", "options": ["1", "2", "3", "4"], "answer": 1}],
        }
        r = requests.post(f"{API}/quizzes", json=body, headers=H(tokens["guru"]))
        assert r.status_code == 200, r.text
        qid = r.json()["id"]
        yield qid
        requests.delete(f"{API}/quizzes/{qid}", headers=H(tokens["guru"]))

    def test_validation_out_of_range(self, tokens):
        body = {"title": "TEST_bad", "subject": "X", "class_id": CID, "kelas": "XI IPA 1",
                "time_limit": 999, "questions": [{"q": "a", "options": ["a", "b"], "answer": 0}]}
        r = requests.post(f"{API}/quizzes", json=body, headers=H(tokens["guru"]))
        assert r.status_code == 400

    def test_attempt_without_start(self, tokens, quiz_id):
        r = requests.post(f"{API}/quizzes/attempt",
                          json={"quiz_id": quiz_id, "answers": [1]},
                          headers=H(tokens["siswa"]))
        assert r.status_code == 400
        assert "belum dimulai" in r.text.lower()

    def test_start_and_resume_same_deadline(self, tokens, quiz_id):
        r1 = requests.post(f"{API}/quizzes/{quiz_id}/start", headers=H(tokens["siswa"]))
        assert r1.status_code == 200
        d1 = r1.json()["deadline"]
        assert r1.json()["time_limit"] == 1
        time.sleep(1)
        r2 = requests.post(f"{API}/quizzes/{quiz_id}/start", headers=H(tokens["siswa"]))
        assert r2.status_code == 200
        assert r2.json()["deadline"] == d1  # resume, not reset

    def test_submit_before_deadline(self, tokens, quiz_id):
        requests.post(f"{API}/quizzes/{quiz_id}/start", headers=H(tokens["siswa"]))
        r = requests.post(f"{API}/quizzes/attempt",
                          json={"quiz_id": quiz_id, "answers": [1]},
                          headers=H(tokens["siswa"]))
        assert r.status_code == 200
        j = r.json()
        assert j["score"] == 1 and j["total"] == 1


# ---------- Cron kas reminder ----------
class TestCronKasReminder:
    def test_missing_auth(self):
        r = requests.post(f"{API}/cron/kas-reminder", json={"run_id": "x"})
        assert r.status_code == 401

    def test_wrong_auth(self):
        r = requests.post(f"{API}/cron/kas-reminder", json={"run_id": "x"},
                          headers={"Authorization": "Bearer wrong"})
        assert r.status_code == 401

    def test_missing_run_id(self):
        r = requests.post(f"{API}/cron/kas-reminder", json={},
                          headers={"Authorization": f"Bearer {_secret()}"})
        assert r.status_code == 400

    def test_ok_and_duplicate(self, tokens):
        run_id = f"TEST_{uuid.uuid4().hex}"
        hdr = {"Authorization": f"Bearer {_secret()}", "X-Webhook-Id": run_id}
        r1 = requests.post(f"{API}/cron/kas-reminder", json={}, headers=hdr)
        assert r1.status_code == 200
        assert r1.json().get("ok") is True
        assert not r1.json().get("duplicate")
        # duplicate
        r2 = requests.post(f"{API}/cron/kas-reminder", json={}, headers=hdr)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True

        # Give background task a moment; then check siswa notifications
        time.sleep(3)
        n = requests.get(f"{API}/notifications", headers=H(tokens["siswa"]))
        assert n.status_code == 200
        notes = n.json()
        items = notes if isinstance(notes, list) else notes.get("items", [])
        assert any("Pengingat Kas" in (it.get("title") or "") for it in items), \
            "Expected 'Pengingat Kas' notification for siswa.demo"
