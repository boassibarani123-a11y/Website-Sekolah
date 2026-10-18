"""Iteration 47 - Vortex Guard (exam) backend tests.

Covers:
- auth login for admin/guru/siswa
- exam CRUD validation (schedule, MC options)
- siswa list exams (status/submitted/questions hidden)
- start exam (wrong token, upcoming/ended, success returns shuffled questions)
- autosave + violations
- attempt grading (MC auto, essay pending, duplicate attempt 409)
- teacher results (attempts, active sessions, summary) + grade essay patch
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sekolah-web-16.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
GURU = ("guru.vortex@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.vortex@sman1laguboti.sch.id", "Siswa12345")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["token"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tokens():
    return {"admin": _login(*ADMIN), "guru": _login(*GURU), "siswa": _login(*SISWA)}


# --- auth
def test_login_all_roles(tokens):
    for k, t in tokens.items():
        assert t and len(t) > 20
        r = requests.get(f"{API}/auth/me", headers=_hdr(t), timeout=15)
        assert r.status_code == 200, k
        assert r.json()["role"] in ("super_admin", "guru", "siswa")


def test_login_wrong_pw():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN[0], "password": "wrong"}, timeout=15)
    assert r.status_code == 401


# --- validation on create
def _mk_exam_payload(**over):
    data = {
        "title": f"TEST_Vortex_{uuid.uuid4().hex[:6]}",
        "kelas": "XII IPA 1",
        "subject": "Matematika",
        "password": "VG123",
        "time_limit": 30,
        "max_violations": 3,
        "shuffle_questions": True,
        "shuffle_options": True,
        "questions": [
            {"q": "2+2?", "type": "mc", "options": ["3", "4", "5", "6"], "answer": 1},
            {"q": "3+3?", "type": "mc", "options": ["5", "6", "7", "8"], "answer": 1},
            {"q": "Jelaskan apa itu bilangan prima.", "type": "essay", "options": [], "answer": 0},
        ],
    }
    data.update(over)
    return data


def test_create_exam_bad_schedule(tokens):
    body = _mk_exam_payload(start_at="2026-01-20T10:00:00Z", end_at="2026-01-20T09:00:00Z")
    r = requests.post(f"{API}/exams", headers=_hdr(tokens["guru"]), json=body, timeout=15)
    assert r.status_code == 400


def test_create_exam_mc_too_few_options(tokens):
    body = _mk_exam_payload(questions=[{"q": "x?", "type": "mc", "options": ["only"], "answer": 0}])
    r = requests.post(f"{API}/exams", headers=_hdr(tokens["guru"]), json=body, timeout=15)
    assert r.status_code == 400


# --- big fixture: fresh exam used across happy flow
@pytest.fixture(scope="module")
def fresh_exam(tokens):
    body = _mk_exam_payload()
    r = requests.post(f"{API}/exams", headers=_hdr(tokens["guru"]), json=body, timeout=20)
    assert r.status_code == 200, r.text
    ex = r.json()
    assert ex["question_count"] == 3
    assert ex["essay_count"] == 1
    assert ex.get("has_password") is True
    yield ex
    # teardown: delete exam
    requests.delete(f"{API}/exams/{ex['id']}", headers=_hdr(tokens["guru"]), timeout=15)


def test_siswa_list_hides_questions(tokens, fresh_exam):
    r = requests.get(f"{API}/exams", headers=_hdr(tokens["siswa"]), timeout=15)
    assert r.status_code == 200
    rows = r.json()
    me = next((e for e in rows if e["id"] == fresh_exam["id"]), None)
    assert me is not None, "siswa should see exam for own class"
    assert me.get("questions") == []
    assert me.get("status") in ("open", "upcoming", "ended")
    assert "submitted" in me


def test_start_wrong_token(tokens, fresh_exam):
    r = requests.post(f"{API}/exams/{fresh_exam['id']}/start",
                      headers=_hdr(tokens["siswa"]), json={"password": "WRONG"}, timeout=15)
    assert r.status_code == 400


def test_start_upcoming_forbidden(tokens):
    body = _mk_exam_payload(start_at="2099-01-01T00:00:00Z", end_at="2099-01-02T00:00:00Z")
    r = requests.post(f"{API}/exams", headers=_hdr(tokens["guru"]), json=body, timeout=15)
    assert r.status_code == 200
    eid = r.json()["id"]
    try:
        r = requests.post(f"{API}/exams/{eid}/start",
                          headers=_hdr(tokens["siswa"]), json={"password": "VG123"}, timeout=15)
        assert r.status_code == 403
    finally:
        requests.delete(f"{API}/exams/{eid}", headers=_hdr(tokens["guru"]), timeout=15)


def test_start_ended_forbidden(tokens):
    body = _mk_exam_payload(start_at="2020-01-01T00:00:00Z", end_at="2020-01-02T00:00:00Z")
    r = requests.post(f"{API}/exams", headers=_hdr(tokens["guru"]), json=body, timeout=15)
    assert r.status_code == 200
    eid = r.json()["id"]
    try:
        r = requests.post(f"{API}/exams/{eid}/start",
                          headers=_hdr(tokens["siswa"]), json={"password": "VG123"}, timeout=15)
        assert r.status_code == 403
    finally:
        requests.delete(f"{API}/exams/{eid}", headers=_hdr(tokens["guru"]), timeout=15)


# --- happy path full flow ties to fresh_exam
def test_full_flow(tokens, fresh_exam):
    eid = fresh_exam["id"]
    # start
    r = requests.post(f"{API}/exams/{eid}/start",
                      headers=_hdr(tokens["siswa"]), json={"password": "VG123"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["questions"]) == 3
    types = [q["type"] for q in data["questions"]]
    assert types.count("mc") == 2 and types.count("essay") == 1
    assert data["max_violations"] == 3
    assert isinstance(data["answers"], list) and len(data["answers"]) == 3

    # autosave
    answers = [None, None, "draft"]
    flags = [False, True, False]
    r = requests.post(f"{API}/exams/{eid}/autosave",
                      headers=_hdr(tokens["siswa"]), json={"answers": answers, "flags": flags}, timeout=15)
    assert r.status_code == 200 and r.json()["ok"] is True

    # resume via second start — should return saved answers/flags, no 409 (no attempt yet)
    r = requests.post(f"{API}/exams/{eid}/start",
                      headers=_hdr(tokens["siswa"]), json={"password": "VG123"}, timeout=15)
    assert r.status_code == 200
    d2 = r.json()
    assert d2["answers"][2] == "draft"
    assert d2["flags"][1] is True

    # violation
    r = requests.post(f"{API}/exams/{eid}/violation",
                      headers=_hdr(tokens["siswa"]), json={"reason": "tab-switch"}, timeout=15)
    assert r.status_code == 200
    v = r.json()
    assert v["violations"] == 1 and v["max_violations"] == 3 and v["exceeded"] is False

    # fetch questions for grading by mapping chosen-option-text -> we know MC answers both are "6"? No:
    # mc q1 answer index 1 -> "4"; mc q2 answer index 1 -> "6". Need to pick index in displayed (shuffled) order.
    # Use displayed options from d2 and find index of correct text.
    displayed = d2["questions"]
    submit_answers = []
    for i, q in enumerate(displayed):
        if q["type"] == "mc":
            # find original index. We know original options for q1 are ["3","4","5","6"] correct "4";
            # for q2 are ["5","6","7","8"] correct "6".
            correct_text = None
            if set(q["options"]) == set(["3", "4", "5", "6"]):
                correct_text = "4"
            elif set(q["options"]) == set(["5", "6", "7", "8"]):
                correct_text = "6"
            submit_answers.append(q["options"].index(correct_text))
        else:
            submit_answers.append("Bilangan prima adalah...")

    # attempt
    r = requests.post(f"{API}/exams/attempt",
                      headers=_hdr(tokens["siswa"]),
                      json={"exam_id": eid, "answers": submit_answers, "violations": 1}, timeout=15)
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["score"] == 2, a
    assert a["total"] == 3
    assert a["essay_pending"] is True

    # duplicate attempt
    r = requests.post(f"{API}/exams/attempt",
                      headers=_hdr(tokens["siswa"]),
                      json={"exam_id": eid, "answers": submit_answers}, timeout=15)
    assert r.status_code == 409

    # teacher results
    r = requests.get(f"{API}/exams/{eid}/results", headers=_hdr(tokens["guru"]), timeout=15)
    assert r.status_code == 200
    res = r.json()
    assert res["summary"]["count"] == 1
    assert res["summary"]["essay_pending"] == 1
    assert res["summary"]["total_violations"] >= 1
    aid = res["attempts"][0]["id"]
    # verify violation_log present on attempt
    assert any(v.get("reason") == "tab-switch" for v in res["attempts"][0].get("violation_log", []))
    # essay original q_idx = 2
    r = requests.patch(f"{API}/exams/{eid}/attempts/{aid}/grade",
                       headers=_hdr(tokens["guru"]), json={"essay_scores": {"2": 80}}, timeout=15)
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["essay_pending"] is False
    # score = mc_correct(2) + 80/100 = 2.8
    assert abs(g["score"] - 2.8) < 0.01
    # percent = 2.8/3 *100 ~ 93.33
    assert abs(g["percent"] - round(2.8 / 3 * 100, 2)) < 0.1

    # grade out of range rejected
    r = requests.patch(f"{API}/exams/{eid}/attempts/{aid}/grade",
                       headers=_hdr(tokens["guru"]), json={"essay_scores": {"2": 150}}, timeout=15)
    assert r.status_code == 400


def test_siswa_sees_submitted_true(tokens, fresh_exam):
    r = requests.get(f"{API}/exams", headers=_hdr(tokens["siswa"]), timeout=15)
    me = next((e for e in r.json() if e["id"] == fresh_exam["id"]), None)
    assert me and me.get("submitted") is True
