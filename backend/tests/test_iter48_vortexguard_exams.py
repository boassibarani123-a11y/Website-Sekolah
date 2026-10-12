"""
VortexGuard v1.0 exam engine + device-binding tests.
Covers: siswa device binding/reset, exam CRUD + validation,
start/progress/attempt (allow_back on/off), essay pending + grading,
show_score=false, siswa 403 on staff endpoints.
"""
import os
import uuid
import time
import requests
import pytest

def _read_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env() or "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not available"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"

TEST_TAG = f"VG{uuid.uuid4().hex[:6]}"


# ---------- helpers ----------
def _login(email, password, device_id=None):
    s = requests.Session()
    body = {"email": email, "password": password}
    if device_id is not None:
        body["device_id"] = device_id
    r = s.post(f"{API}/auth/login", json=body, timeout=30)
    return s, r


@pytest.fixture(scope="module")
def admin():
    s, r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def seed(admin):
    """Create a TEST_ class + 2 TEST_ students. Yields {class, s1, s2}, cleans up."""
    cls_name = f"TEST_{TEST_TAG}_K"
    r = admin.post(f"{API}/classes", json={
        "name": cls_name, "subjects": ["TEST_MAPEL"], "description": "vg test"
    }, timeout=30)
    assert r.status_code in (200, 201), f"create class: {r.status_code} {r.text}"
    cls = r.json()

    def mk_student(sfx):
        email = f"test_{TEST_TAG}_{sfx}@example.com".lower()
        r = admin.post(f"{API}/users", json={
            "email": email, "password": "Testpass123", "name": f"TEST_{TEST_TAG}_{sfx}",
            "role": "siswa", "phone": "081234567890", "kelas": cls_name,
        }, timeout=30)
        assert r.status_code in (200, 201), f"create student: {r.status_code} {r.text}"
        u = r.json()
        return {"id": u["id"], "email": email, "password": "Testpass123"}

    s1 = mk_student("s1")
    s2 = mk_student("s2")
    data = {"class": cls, "s1": s1, "s2": s2, "exam_ids": []}
    yield data
    # cleanup
    for eid in data["exam_ids"]:
        try:
            admin.delete(f"{API}/exams/{eid}", timeout=15)
        except Exception:
            pass
    for u in (s1, s2):
        try:
            admin.delete(f"{API}/users/{u['id']}", timeout=15)
        except Exception:
            pass
    try:
        admin.delete(f"{API}/classes/{cls['id']}", timeout=15)
    except Exception:
        pass


# ---------- device-binding tests ----------
class TestDeviceBinding:
    def test_siswa_login_requires_device_id(self, seed):
        s, r = _login(seed["s1"]["email"], seed["s1"]["password"])  # no device_id
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_first_login_binds_and_same_device_ok(self, seed):
        did = f"devA-{TEST_TAG}"
        s, r = _login(seed["s1"]["email"], seed["s1"]["password"], device_id=did)
        assert r.status_code == 200, r.text
        # Re-login with same device must succeed
        _, r2 = _login(seed["s1"]["email"], seed["s1"]["password"], device_id=did)
        assert r2.status_code == 200, r2.text

    def test_different_device_rejected_403(self, seed):
        did_b = f"devB-{TEST_TAG}"
        _, r = _login(seed["s1"]["email"], seed["s1"]["password"], device_id=did_b)
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text}"

    def test_reset_device_allows_new_device_and_invalidates_old_token(self, seed, admin):
        # Login with original device, keep token/session
        did_a = f"devA-{TEST_TAG}"
        sA, rA = _login(seed["s1"]["email"], seed["s1"]["password"], device_id=did_a)
        assert rA.status_code == 200
        # verify auth works
        me = sA.get(f"{API}/auth/me", timeout=15)
        assert me.status_code == 200

        # Super admin resets device
        r = admin.post(f"{API}/users/{seed['s1']['id']}/reset-device", timeout=15)
        assert r.status_code == 200, r.text

        # Old session should now be 401 (token_version bumped)
        me2 = sA.get(f"{API}/auth/me", timeout=15)
        assert me2.status_code == 401, f"old token should be invalid, got {me2.status_code}"

        # New device can now login
        did_c = f"devC-{TEST_TAG}"
        _, rC = _login(seed["s1"]["email"], seed["s1"]["password"], device_id=did_c)
        assert rC.status_code == 200, rC.text


# ---------- exam CRUD + validation ----------
def _exam_payload(cls_name, cls_id, per_page=2, allow_back=True, show_score=True, essay=True):
    qs = [
        {"type": "pg", "q": "2+2?", "options": ["3", "4", "5"], "answer": 1, "points": 10},
        {"type": "pg", "q": "Capital of ID?", "options": ["Jkt", "Bdg", "Sby"], "answer": 0, "points": 10},
        {"type": "pg", "q": "Sky color?", "options": ["blue", "red"], "answer": 0, "points": 10},
    ]
    if essay:
        qs.append({"type": "essay", "q": "Explain photosynthesis",
                   "options": [], "answer": 0, "points": 20, "max_words": 100})
    return {
        "title": f"TEST_{TEST_TAG}_EXAM",
        "kelas": cls_name, "class_id": cls_id, "subject": "TEST_MAPEL",
        "password": "exam123",
        "time_limit": 30, "max_violations": 3,
        "description": "d", "instructions": "i",
        "rules": ["No cheating", "Submit on time"],
        "questions": qs,
        "per_page": per_page, "allow_back": allow_back,
        "shuffle_questions": False, "shuffle_options": False,
        "show_score": show_score, "show_review": True, "passing_grade": 70,
    }


class TestExamCRUDValidation:
    def test_create_exam_ok(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"])
        r = admin.post(f"{API}/exams", json=p, timeout=30)
        assert r.status_code in (200, 201), r.text
        ex = r.json()
        seed["exam_ids"].append(ex["id"])
        assert ex["title"] == p["title"]
        assert ex["per_page"] == 2
        assert ex["allow_back"] is True
        assert ex["question_count"] == 4
        assert ex["essay_count"] == 1
        assert ex["has_password"] is True
        assert "Submit on time" in ex["rules"]

    def test_validation_empty_question_text(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"])
        p["questions"][0]["q"] = "   "
        r = admin.post(f"{API}/exams", json=p, timeout=15)
        assert r.status_code == 400

    def test_validation_pg_less_than_2_options(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"])
        p["questions"][0]["options"] = ["only"]
        r = admin.post(f"{API}/exams", json=p, timeout=15)
        assert r.status_code == 400

    def test_validation_per_page_out_of_range(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"])
        p["per_page"] = 999
        r = admin.post(f"{API}/exams", json=p, timeout=15)
        assert r.status_code == 400

    def test_validation_end_before_start(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"])
        p["start_at"] = "2030-01-02T00:00:00Z"
        p["end_at"] = "2030-01-01T00:00:00Z"
        r = admin.post(f"{API}/exams", json=p, timeout=15)
        assert r.status_code == 400


# ---------- helpers for student flows ----------
def _student_session(seed, which="s1", device_suffix=""):
    did = f"dev-{TEST_TAG}-{which}{device_suffix}"
    # Ensure clean binding; reset first
    admin, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    admin.post(f"{API}/users/{seed[which]['id']}/reset-device", timeout=15)
    s, r = _login(seed[which]["email"], seed[which]["password"], device_id=did)
    assert r.status_code == 200, r.text
    return s


# ---------- allow_back true: full student + grading flow ----------
class TestExamStudentFlowAllowBack:
    @pytest.fixture(scope="class")
    def exam_id(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"], per_page=2, allow_back=True)
        r = admin.post(f"{API}/exams", json=p, timeout=30)
        assert r.status_code in (200, 201), r.text
        eid = r.json()["id"]
        seed["exam_ids"].append(eid)
        return eid

    def test_wrong_password_rejected(self, seed, exam_id):
        s = _student_session(seed, "s1")
        r = s.post(f"{API}/exams/{exam_id}/start", json={"password": "wrong"}, timeout=15)
        assert r.status_code == 400

    def test_start_progress_back_and_attempt_pending(self, seed, admin, exam_id):
        s = _student_session(seed, "s1")
        r = s.post(f"{API}/exams/{exam_id}/start", json={"password": "exam123"}, timeout=15)
        assert r.status_code == 200, r.text
        info = r.json()
        assert info["per_page"] == 2
        assert info["allow_back"] is True
        assert len(info["questions"]) == 4
        # move to page 1 with partial answers
        r = s.post(f"{API}/exams/{exam_id}/progress",
                   json={"page": 1, "answers": [1, 0, None, None]}, timeout=15)
        assert r.status_code == 200
        # go back to page 0 (allowed)
        r = s.post(f"{API}/exams/{exam_id}/progress",
                   json={"page": 0, "answers": [1, 0, None, None]}, timeout=15)
        assert r.status_code == 200
        # submit with essay
        r = s.post(f"{API}/exams/attempt",
                   json={"exam_id": exam_id,
                         "answers": [1, 0, 0, "The process by which plants make food."]},
                   timeout=15)
        assert r.status_code == 200, r.text
        res = r.json()
        assert res["status"] == "pending"
        assert res["answered"] == 4
        # staff attempts list
        r = admin.get(f"{API}/exams/{exam_id}/results", timeout=15)
        assert r.status_code == 200
        attempts = r.json()["attempts"]
        assert len(attempts) >= 1
        aid = next(a["id"] for a in attempts if a["student_id"] == seed["s1"]["id"])

        # detail
        r = admin.get(f"{API}/exams/{exam_id}/attempts/{aid}", timeout=15)
        assert r.status_code == 200
        det = r.json()
        # find essay response index
        essay_idx = next(i for i, rr in enumerate(det["attempt"]["responses"]) if rr["type"] == "essay")
        pg_idx = next(i for i, rr in enumerate(det["attempt"]["responses"]) if rr["type"] == "pg")

        # grade PG with points -> 400
        r = admin.patch(f"{API}/exams/{exam_id}/attempts/{aid}/grade",
                        json={"grades": [{"index": pg_idx, "points": 5}]}, timeout=15)
        assert r.status_code == 400

        # grade over max -> 400
        r = admin.patch(f"{API}/exams/{exam_id}/attempts/{aid}/grade",
                        json={"grades": [{"index": essay_idx, "points": 999}]}, timeout=15)
        assert r.status_code == 400

        # grade essay with valid points + comment -> status graded
        r = admin.patch(f"{API}/exams/{exam_id}/attempts/{aid}/grade",
                        json={"grades": [{"index": essay_idx, "points": 15, "comment": "ok"}]},
                        timeout=15)
        assert r.status_code == 200, r.text
        att = r.json()["attempt"]
        assert att["status"] == "graded"
        assert att["essay_score"] == 15
        # pg_score: all three pg correct (we answered 1,0,0 and shuffle off, answers 1,0,0)
        # Total should be pg + essay
        assert att["score"] == att["pg_score"] + att["essay_score"]

        # DELETE attempt resets
        r = admin.delete(f"{API}/exams/{exam_id}/attempts/{aid}", timeout=15)
        assert r.status_code == 200
        r = admin.get(f"{API}/exams/{exam_id}/attempts/{aid}", timeout=15)
        assert r.status_code == 404
        # student can now re-start
        s2 = _student_session(seed, "s1")
        r = s2.post(f"{API}/exams/{exam_id}/start", json={"password": "exam123"}, timeout=15)
        assert r.status_code == 200


# ---------- allow_back = false ----------
class TestExamStudentFlowNoBack:
    @pytest.fixture(scope="class")
    def exam_id(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"], per_page=2,
                          allow_back=False, essay=False)
        r = admin.post(f"{API}/exams", json=p, timeout=30)
        assert r.status_code in (200, 201), r.text
        eid = r.json()["id"]
        seed["exam_ids"].append(eid)
        return eid

    def test_cannot_go_back(self, seed, admin, exam_id):
        # fresh student (s2) — ensure not already submitted on another exam
        admin.delete(f"{API}/exams/{exam_id}/attempts/_dummy", timeout=5)  # noop
        s = _student_session(seed, "s2")
        r = s.post(f"{API}/exams/{exam_id}/start", json={"password": "exam123"}, timeout=15)
        assert r.status_code == 200
        # go to page 1
        r = s.post(f"{API}/exams/{exam_id}/progress",
                   json={"page": 1, "answers": [1, 0, None]}, timeout=15)
        assert r.status_code == 200
        assert r.json()["current_page"] == 1
        # try to go back
        r = s.post(f"{API}/exams/{exam_id}/progress",
                   json={"page": 0, "answers": [0, 0, None]}, timeout=15)
        assert r.status_code == 400

    def test_locked_answers_unchanged_at_submit(self, seed, admin):
        # New exam, new student state
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"], per_page=2,
                          allow_back=False, essay=False)
        p["title"] = f"TEST_{TEST_TAG}_NOBACK2"
        r = admin.post(f"{API}/exams", json=p, timeout=30)
        assert r.status_code in (200, 201)
        eid = r.json()["id"]
        seed["exam_ids"].append(eid)

        s = _student_session(seed, "s2")
        r = s.post(f"{API}/exams/{eid}/start", json={"password": "exam123"}, timeout=15)
        assert r.status_code == 200
        # On page 0, answer correctly for q0,q1 then advance to page 1
        r = s.post(f"{API}/exams/{eid}/progress",
                   json={"page": 1, "answers": [1, 0, None]}, timeout=15)
        assert r.status_code == 200
        # Try to submit with changed answers for locked positions (should be ignored)
        r = s.post(f"{API}/exams/attempt",
                   json={"exam_id": eid, "answers": [2, 2, 0]}, timeout=15)
        assert r.status_code == 200, r.text
        res = r.json()
        # 2 pg correct from locked + 1 pg correct from page 2 = full score
        # First two were 1,0 (locked, correct). Third we send 0 which is correct for q index 2
        assert res["status"] == "graded"
        # expected 3/3 PG correct = 30 points
        assert res["score"] == 30


# ---------- show_score=false ----------
class TestShowScoreHidden:
    def test_show_score_false_hides_score_from_student(self, seed, admin):
        # fresh student
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"], per_page=10,
                          allow_back=True, show_score=False, essay=False)
        p["title"] = f"TEST_{TEST_TAG}_HIDDEN"
        r = admin.post(f"{API}/exams", json=p, timeout=30)
        assert r.status_code in (200, 201)
        eid = r.json()["id"]
        seed["exam_ids"].append(eid)

        # Create a fresh student so no prior attempt exists
        new_email = f"test_{TEST_TAG}_s3@example.com".lower()
        r = admin.post(f"{API}/users", json={
            "email": new_email, "password": "Testpass123", "name": f"TEST_{TEST_TAG}_s3",
            "role": "siswa", "phone": "081234567890", "kelas": seed["class"]["name"],
        }, timeout=30)
        assert r.status_code in (200, 201), r.text
        s3_id = r.json()["id"]

        try:
            did = f"dev-{TEST_TAG}-s3"
            s3, lr = _login(new_email, "Testpass123", device_id=did)
            assert lr.status_code == 200
            r = s3.post(f"{API}/exams/{eid}/start", json={"password": "exam123"}, timeout=15)
            assert r.status_code == 200
            r = s3.post(f"{API}/exams/attempt",
                        json={"exam_id": eid, "answers": [1, 0, 0]}, timeout=15)
            assert r.status_code == 200
            res = r.json()
            assert res["show_score"] is False
            for k in ("score", "percent", "total"):
                assert k not in res, f"{k} leaked"
            # results endpoint
            r = s3.get(f"{API}/exams/{eid}/results", timeout=15)
            assert r.status_code == 200
            mine = r.json().get("mine") or {}
            for k in ("score", "percent", "total"):
                assert k not in mine, f"{k} leaked in results"
        finally:
            admin.delete(f"{API}/users/{s3_id}", timeout=15)


# ---------- siswa cannot call staff endpoints ----------
class TestSiswaForbiddenStaff:
    def test_siswa_cannot_grade(self, seed, admin):
        p = _exam_payload(seed["class"]["name"], seed["class"]["id"], per_page=10,
                          allow_back=True, essay=False)
        p["title"] = f"TEST_{TEST_TAG}_FORB"
        r = admin.post(f"{API}/exams", json=p, timeout=30)
        assert r.status_code in (200, 201)
        eid = r.json()["id"]
        seed["exam_ids"].append(eid)

        s = _student_session(seed, "s2")
        r = s.patch(f"{API}/exams/{eid}/attempts/anyaid/grade",
                    json={"grades": []}, timeout=15)
        assert r.status_code in (401, 403), r.status_code
        r = s.post(f"{API}/exams", json=p, timeout=15)
        assert r.status_code in (401, 403), r.status_code
