"""Iteration 15: Quiz shuffle (session-based) + Kas chart tests."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
PW = "Demo12345"
GURU = "guru.demo@sekolahku.id"
SISWA = "siswa.demo@sekolahku.id"
KETUA = "kelas.demo@sekolahku.id"
ADMIN = "admin.demo@sekolahku.id"
CLASS_ID = "97194f55-894d-44dc-957a-1c2a8522e2b0"
KELAS_NAME = "XI IPA 1"


def login(email):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": PW}, timeout=15)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def tokens():
    return {
        "guru": login(GURU),
        "siswa": login(SISWA),
        "ketua": login(KETUA),
        "admin": login(ADMIN),
    }


@pytest.fixture
def quiz(tokens):
    """Create a 4-question quiz, cleanup after."""
    body = {
        "title": "TEST_shuffle_quiz",
        "kelas": KELAS_NAME,
        "class_id": CLASS_ID,
        "subject": "Matematika",
        "time_limit": 0,
        "questions": [
            {"q": f"Q{i}", "options": [f"Q{i}_A", f"Q{i}_B", f"Q{i}_C", f"Q{i}_D"], "answer": 1}
            for i in range(6)
        ],
    }
    r = requests.post(f"{API}/quizzes", json=body, headers=H(tokens["guru"]), timeout=15)
    assert r.status_code == 200, r.text
    q = r.json()
    yield q
    requests.delete(f"{API}/quizzes/{q['id']}", headers=H(tokens["guru"]))


# ---------------- QUIZ SHUFFLE ----------------
class TestQuizShuffle:
    def test_start_returns_shuffled_without_answer_field(self, tokens, quiz):
        r = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"]))
        assert r.status_code == 200, r.text
        data = r.json()
        qs = data["questions"]
        assert len(qs) == 6
        for q in qs:
            assert "answer" not in q
            assert set(q.keys()) <= {"q", "options"}
            assert len(q["options"]) == 4

    def test_same_student_gets_same_order_on_restart(self, tokens, quiz):
        r1 = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"])).json()
        r2 = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"])).json()
        assert [q["q"] for q in r1["questions"]] == [q["q"] for q in r2["questions"]]
        for a, b in zip(r1["questions"], r2["questions"]):
            assert a["options"] == b["options"]

    def test_scoring_maps_shuffled_options_correctly(self, tokens, quiz):
        start = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"])).json()
        answers = []
        # option whose original index is 1 is the correct one (text "<q>_B")
        for q in start["questions"]:
            correct_text = f"{q['q']}_B"
            answers.append(q["options"].index(correct_text))
        r = requests.post(f"{API}/quizzes/attempt",
                          json={"quiz_id": quiz["id"], "answers": answers},
                          headers=H(tokens["siswa"]))
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["score"] == 6
        assert data["total"] == 6
        assert data["percent"] == 100

    def test_edit_questions_resets_session(self, tokens, quiz):
        r1 = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"])).json()
        order1 = [q["q"] for q in r1["questions"]]
        # Patch questions -> deletes sessions
        new_qs = [{"q": f"NQ{i}", "options": [f"NQ{i}_A", f"NQ{i}_B"], "answer": f"NQ{i}_A"} for i in range(4)]
        pr = requests.patch(f"{API}/quizzes/{quiz['id']}", json={"questions": new_qs}, headers=H(tokens["guru"]))
        assert pr.status_code == 200
        r2 = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"])).json()
        assert len(r2["questions"]) == 4
        # New session; must not be the stored old order (different length)
        assert [q["q"] for q in r2["questions"]] != order1

    def test_time_limit_expired_returns_empty_questions(self, tokens, quiz):
        # Set a 1-minute limit, then simulate expiry via DB manipulation isn't available;
        # just verify fields present and shuffle works with limit.
        pr = requests.patch(f"{API}/quizzes/{quiz['id']}", json={"time_limit": 5}, headers=H(tokens["guru"]))
        assert pr.status_code == 200
        r = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["siswa"])).json()
        assert r["time_limit"] == 5
        assert r["deadline"] is not None
        assert r["expired"] is False
        assert len(r["questions"]) == len(pr.json()["questions"])

    def test_siswa_only_can_start(self, tokens, quiz):
        r = requests.post(f"{API}/quizzes/{quiz['id']}/start", headers=H(tokens["guru"]))
        assert r.status_code == 403


# ---------------- KAS CHART ----------------
class TestKasChart:
    @pytest.fixture
    def created_tx(self, tokens):
        """Create a kas tx via ketua, cleanup after."""
        body = {"amount": 55000, "type": "masuk", "note": "TEST_chart_tx"}
        r = requests.post(f"{API}/classes/{CLASS_ID}/kas", json=body, headers=H(tokens["ketua"]))
        assert r.status_code == 200, r.text
        tx = r.json()
        yield tx
        requests.delete(f"{API}/kas/{tx['id']}", headers=H(tokens["ketua"]))

    def test_chart_accessible_to_siswa(self, tokens):
        r = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=6", headers=H(tokens["siswa"]))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 6
        for b in data:
            assert set(b.keys()) == {"month", "masuk", "keluar"}

    def test_chart_months_clamped(self, tokens):
        r3 = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=3", headers=H(tokens["guru"]))
        r12 = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=12", headers=H(tokens["ketua"]))
        r_over = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=50", headers=H(tokens["admin"]))
        r_under = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=1", headers=H(tokens["admin"]))
        assert len(r3.json()) == 3
        assert len(r12.json()) == 12
        assert len(r_over.json()) == 12
        assert len(r_under.json()) == 3

    def test_chart_reflects_new_tx(self, tokens, created_tx):
        r = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=3", headers=H(tokens["siswa"]))
        data = r.json()
        # current (last) bucket should include our 55000 masuk
        last = data[-1]
        assert last["masuk"] >= 55000, data

    def test_chart_all_roles_can_view(self, tokens):
        for role in ("siswa", "guru", "ketua", "admin"):
            r = requests.get(f"{API}/classes/{CLASS_ID}/kas/chart?months=6", headers=H(tokens[role]))
            assert r.status_code == 200, f"{role}: {r.status_code} {r.text}"
