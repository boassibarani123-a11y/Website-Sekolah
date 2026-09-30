"""Iteration 6 backend tests: auth, classes CRUD, assignments/submissions with attachments,
quizzes with subject, school info settings, upload endpoint, demo-accounts-removed."""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://github-school-setup.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

SUPER = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
GURU = {"email": "guru.test@sekolah.id", "password": "Guru12345"}
SISWA = {"email": "siswa.test@sekolah.id", "password": "Siswa12345"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s, r.json()["user"], tok


@pytest.fixture(scope="module")
def admin():
    return _login(SUPER)


@pytest.fixture(scope="module")
def guru():
    return _login(GURU)


@pytest.fixture(scope="module")
def siswa():
    return _login(SISWA)


# ---------- AUTH ----------
def test_super_admin_login():
    s, u, _ = _login(SUPER)
    assert u["role"] == "super_admin"


def test_demo_account_removed():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "siswa@sekolahku.id", "password": "Siswa@2026"}, timeout=30)
    assert r.status_code == 401


def test_guru_login(guru):
    s, u, _ = guru
    assert u["role"] == "guru"


def test_siswa_login(siswa):
    s, u, _ = siswa
    assert u["role"] == "siswa"
    assert u.get("kelas") == "XI IPA 1"


# ---------- CLASSES ----------
def test_list_classes_admin(admin):
    s, _, _ = admin
    r = s.get(f"{API}/classes")
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "XI IPA 1" in names


def test_list_classes_siswa_only_own(siswa):
    s, _, _ = siswa
    r = s.get(f"{API}/classes")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["name"] == "XI IPA 1"


CREATED_CLASS_ID = {"id": None}


def test_create_class_admin(admin):
    s, _, _ = admin
    name = f"TEST_XII_{uuid.uuid4().hex[:6]}"
    r = s.post(f"{API}/classes", json={"name": name, "subjects": ["Biologi", "Kimia"]})
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["name"] == name
    assert doc["subjects"] == ["Biologi", "Kimia"]
    CREATED_CLASS_ID["id"] = doc["id"]
    CREATED_CLASS_ID["name"] = name


def test_update_class(admin):
    s, _, _ = admin
    cid = CREATED_CLASS_ID["id"]
    assert cid
    r = s.patch(f"{API}/classes/{cid}", json={"subjects": ["Biologi", "Kimia", "Bahasa"]})
    assert r.status_code == 200
    assert "Bahasa" in r.json()["subjects"]


def test_siswa_cannot_create_class(siswa):
    s, _, _ = siswa
    r = s.post(f"{API}/classes", json={"name": "TEST_deny", "subjects": []})
    assert r.status_code == 403


def test_delete_class(admin):
    s, _, _ = admin
    cid = CREATED_CLASS_ID["id"]
    r = s.delete(f"{API}/classes/{cid}")
    assert r.status_code == 200


# ---------- ASSIGNMENTS w/ subject+attachments ----------
ASSIGN_ID = {"id": None}


def _get_xi_ipa1(session):
    r = session.get(f"{API}/classes")
    for c in r.json():
        if c["name"] == "XI IPA 1":
            return c
    return None


def test_upload_file(admin):
    s, _, _ = admin
    files = {"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
    r = s.post(f"{API}/upload", files=files)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "path" in j and "url" in j


def test_create_assignment_with_attachments(guru):
    s, _, _ = guru
    cls = _get_xi_ipa1(s)
    assert cls, "XI IPA 1 must exist"
    payload = {
        "title": f"TEST_Tugas_{uuid.uuid4().hex[:6]}",
        "description": "Kerjakan bab 1",
        "kelas": "XI IPA 1",
        "due_date": "2026-02-01",
        "subject": "Matematika",
        "class_id": cls["id"],
        "attachments": [{"url": "/api/files/x.pdf", "name": "soal.pdf", "type": "application/pdf"}],
    }
    r = s.post(f"{API}/assignments", json=payload)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["subject"] == "Matematika"
    assert doc["class_id"] == cls["id"]
    assert len(doc["attachments"]) == 1
    ASSIGN_ID["id"] = doc["id"]

    # verify via list with filter
    r2 = s.get(f"{API}/assignments", params={"class_id": cls["id"], "subject": "Matematika"})
    assert r2.status_code == 200
    assert any(a["id"] == doc["id"] for a in r2.json())


def test_siswa_submit_and_teacher_grade(siswa, guru):
    ss, _, _ = siswa
    aid = ASSIGN_ID["id"]
    assert aid
    payload = {
        "assignment_id": aid,
        "content": "Jawaban saya",
        "attachments": [{"url": "/api/files/y.pdf", "name": "jawaban.pdf", "type": "application/pdf"}],
    }
    r = ss.post(f"{API}/submissions", json=payload)
    assert r.status_code == 200

    gs, _, _ = guru
    r2 = gs.get(f"{API}/submissions", params={"assignment_id": aid})
    assert r2.status_code == 200
    subs = r2.json()
    assert len(subs) >= 1
    sub = subs[0]
    assert sub["content"] == "Jawaban saya"
    assert len(sub["attachments"]) == 1

    # grade
    sid = sub["id"]
    r3 = gs.patch(f"{API}/submissions/{sid}/grade", params={"grade": 85})
    assert r3.status_code == 200, r3.text
    r4 = gs.get(f"{API}/submissions", params={"assignment_id": aid})
    graded = [x for x in r4.json() if x["id"] == sid][0]
    assert graded["grade"] == 85


# ---------- QUIZZES ----------
def test_create_quiz_with_subject(guru, siswa):
    gs, _, _ = guru
    cls = _get_xi_ipa1(gs)
    payload = {
        "title": f"TEST_Quiz_{uuid.uuid4().hex[:6]}",
        "kelas": "XI IPA 1",
        "subject": "Fisika",
        "class_id": cls["id"],
        "questions": [{"q": "2+2?", "options": ["3", "4", "5"], "answer": 1}],
    }
    r = gs.post(f"{API}/quizzes", json=payload)
    assert r.status_code == 200, r.text
    qz = r.json()
    assert qz["subject"] == "Fisika"

    # siswa: answer key stripped
    ss, _, _ = siswa
    r2 = ss.get(f"{API}/quizzes", params={"class_id": cls["id"], "subject": "Fisika"})
    assert r2.status_code == 200
    stu_qz = [x for x in r2.json() if x["id"] == qz["id"]][0]
    for q in stu_qz["questions"]:
        assert "answer" not in q

    # attempt
    r3 = ss.post(f"{API}/quizzes/attempt", json={"quiz_id": qz["id"], "answers": [1]})
    assert r3.status_code == 200
    assert r3.json()["score"] == 1


# ---------- SCHOOL INFO SETTINGS ----------
def test_school_info_settings(admin):
    s, _, _ = admin
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    assert "about" in r.json()

    payload = {"about": "TEST about", "vision": "TEST vision",
               "mission": ["m1", "m2"], "principal_name": "Pak Test",
               "npsn": "12345678", "contact_email": "test@x.id"}
    r2 = s.patch(f"{API}/settings", json=payload)
    assert r2.status_code == 200, r2.text

    r3 = s.get(f"{API}/settings")
    d = r3.json()
    assert d["about"] == "TEST about"
    assert d["mission"] == ["m1", "m2"]
    assert d["principal_name"] == "Pak Test"


def test_siswa_cannot_edit_settings(siswa):
    s, _, _ = siswa
    r = s.patch(f"{API}/settings", json={"about": "hack"})
    assert r.status_code == 403


# ---------- USER CREATION any role ----------
def test_admin_creates_kepsek(admin):
    s, _, _ = admin
    email = f"test_kepsek_{uuid.uuid4().hex[:6]}@x.id"
    r = s.post(f"{API}/users", json={
        "email": email, "password": "Test12345", "name": "TEST Kepsek", "role": "kepsek"
    })
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "kepsek"
    # cleanup
    s.delete(f"{API}/users/{r.json()['id']}")
