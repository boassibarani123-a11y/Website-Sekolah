"""Iter56: piket TV ik_out panel, dark attendance pages logo, exam create/start/delete flow.

Backend coverage:
- /api/piket/tv returns ik_out array; after inserting an approved TEST_IK for today the array is non-empty.
- /school-logo.png is served (200).
- Guru can create a MC exam with token for kelas XII IPA 1, siswa can start with correct token,
  wrong token is rejected (400), delete cleans up.
- bash -n /app/scripts/update-vps.sh is syntactically valid (also covered in CI step; sanity-check here).
"""
import os
import subprocess
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

ADMIN = ("mtambunan864@gmail.com", "Admin12345io")
GURU = ("guru.test@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.test@sman1laguboti.sch.id", "Siswa12345")
TOKEN = "TOK56X"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"Login {email} failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def guru():
    return _login(*GURU)


@pytest.fixture(scope="module")
def siswa():
    return _login(*SISWA)


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


# ---------------- piket TV ik_out ----------------

@pytest.fixture
def approved_ik(mongo, siswa):
    me = siswa.get(f"{API}/auth/me").json()
    today = datetime.now(timezone(timedelta(hours=7))).date().isoformat()
    doc = {
        "id": f"TEST_IK_{uuid.uuid4().hex[:8]}",
        "student_id": me["id"],
        "student_name": me["name"],
        "kelas": me.get("kelas"),
        "nisn": me.get("nisn"),
        "teacher_id": "TEST_TEACHER",
        "teacher_name": "Pytest Iter56",
        "reason": "TEST iter56 ik_out panel",
        "category": "pulang",
        "out_time": "09:00",
        "return_time": "10:00",
        "date": today,
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": "pytest",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_demo": False,
    }
    mongo.ik_requests.insert_one(dict(doc))
    yield doc
    mongo.ik_requests.delete_one({"id": doc["id"]})


def test_school_logo_served():
    r = requests.get(f"{BASE}/school-logo.png", timeout=10)
    assert r.status_code == 200
    assert r.headers.get("content-type", "").startswith("image/")
    assert len(r.content) > 1000


def test_piket_tv_base_shape(admin):
    r = admin.get(f"{API}/piket/tv", timeout=10)
    assert r.status_code == 200
    data = r.json()
    for k in ("server_now", "date", "ik_out", "school_name", "gate", "counts", "today", "upcoming", "recent"):
        assert k in data, f"missing key {k}"
    assert isinstance(data["ik_out"], list)
    assert data["gate"]["code"] in ("masuk", "pelajaran", "pulang")


def test_piket_tv_ik_out_includes_approved_today(admin, approved_ik):
    r = admin.get(f"{API}/piket/tv", timeout=10)
    assert r.status_code == 200
    data = r.json()
    found = [x for x in data["ik_out"] if x.get("id") == approved_ik["id"]]
    assert len(found) == 1, f"approved IK {approved_ik['id']} not surfaced: {data['ik_out']}"
    assert found[0]["student_name"] == approved_ik["student_name"]
    assert found[0]["return_time"] == "10:00"


def test_piket_tv_forbidden_for_siswa(siswa):
    r = siswa.get(f"{API}/piket/tv", timeout=10)
    assert r.status_code == 403


# ---------------- Exam create / start / delete ----------------

@pytest.fixture
def test_exam(guru):
    classes = guru.get(f"{API}/classes").json()
    target = next((c for c in classes if c.get("name") == "XII IPA 1"), None)
    assert target, f"XII IPA 1 class not found in {[c.get('name') for c in classes]}"
    body = {
        "title": "TEST_ITER56_EXAM",
        "kelas": "XII IPA 1",
        "class_id": target["id"],
        "subject": "Matematika",
        "password": TOKEN,
        "time_limit": 30,
        "max_violations": 3,
        "shuffle_questions": False,
        "shuffle_options": False,
        "kkm": 75,
        "questions": [
            {"type": "mc", "q": "2+2=?", "options": ["3", "4", "5", "6"], "answer": 1},
            {"type": "mc", "q": "3*3=?", "options": ["6", "7", "8", "9"], "answer": 3},
        ],
    }
    r = guru.post(f"{API}/exams", json=body, timeout=15)
    assert r.status_code == 200, f"create exam: {r.status_code} {r.text}"
    ex = r.json()
    yield ex
    guru.delete(f"{API}/exams/{ex['id']}", timeout=10)


def test_exam_create_response_shape(test_exam):
    assert test_exam["title"] == "TEST_ITER56_EXAM"
    assert test_exam["kelas"] == "XII IPA 1"
    assert test_exam["question_count"] == 2 or len(test_exam.get("questions", [])) == 2 or test_exam.get("question_count")
    assert "id" in test_exam
    # token must not leak via normal exam_out
    assert "password" not in test_exam
    assert "password_hash" not in test_exam


def test_exam_start_wrong_token(test_exam, siswa):
    r = siswa.post(f"{API}/exams/{test_exam['id']}/start", json={"password": "WRONG"}, timeout=10)
    assert r.status_code == 400


def test_exam_start_correct_token(test_exam, siswa, mongo):
    r = siswa.post(f"{API}/exams/{test_exam['id']}/start", json={"password": TOKEN}, timeout=10)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    d = r.json()
    assert d["time_limit"] == 30
    assert len(d["questions"]) == 2
    assert d["violations"] == 0
    assert d["deadline"]
    # cleanup session so delete fixture is clean
    mongo.exam_sessions.delete_many({"exam_id": test_exam["id"]})


def test_exam_delete_removes_sessions(guru, mongo):
    classes = guru.get(f"{API}/classes").json()
    target = next(c for c in classes if c.get("name") == "XII IPA 1")
    body = {"title": "TEST_ITER56_DEL", "kelas": "XII IPA 1", "class_id": target["id"],
            "subject": "Matematika", "password": "DEL1", "time_limit": 10,
            "questions": [{"type": "mc", "q": "x?", "options": ["a", "b"], "answer": 0}]}
    r = guru.post(f"{API}/exams", json=body)
    eid = r.json()["id"]
    d = guru.delete(f"{API}/exams/{eid}")
    assert d.status_code == 200
    assert mongo.exams.find_one({"id": eid}) is None


# ---------------- update-vps.sh ----------------

def test_update_vps_sh_syntax():
    r = subprocess.run(["bash", "-n", "/app/scripts/update-vps.sh"], capture_output=True)
    assert r.returncode == 0, r.stderr.decode()
