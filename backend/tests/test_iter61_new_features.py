"""Iter61: Bank Soal, Exam Requests, Bulk Exam, Scan Delete, Me/Photo, Assignment, Upload video limit."""
import os
import io
import uuid
import pytest
import requests

def _load_base():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    return ln.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")

BASE = _load_base()
API = f"{BASE}/api"

ADMIN = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
PIKET = ("piket.test@sman1laguboti.sch.id", "Test12345")
KEPSEK = ("kepsek.test@sman1laguboti.sch.id", "Test12345")
GURU_TEST = ("guru.test@sman1laguboti.sch.id", "Test12345")


def login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw})
    if r.status_code != 200:
        return None
    tok = r.json().get("token") or r.cookies.get("access_token")
    s = requests.Session()
    s.cookies.update(r.cookies)
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="module")
def admin():
    s = login(*ADMIN)
    assert s, "Admin login failed"
    return s


@pytest.fixture(scope="module")
def piket():
    s = login(*PIKET)
    assert s, "Piket login failed"
    return s


@pytest.fixture(scope="module")
def guru(admin):
    s = login(*GURU_TEST)
    if s:
        return s
    # create guru.test
    r = admin.post(f"{API}/users", json={
        "email": GURU_TEST[0], "password": GURU_TEST[1], "name": "Guru Test",
        "role": "guru", "subjects": ["Matematika"],
    })
    assert r.status_code in (200, 400), r.text
    s = login(*GURU_TEST)
    assert s, "guru.test login failed after create"
    return s


# ========== Bank Soal ==========
class TestBankSoal:
    created_id = None

    def test_create(self, guru):
        r = guru.post(f"{API}/question-bank", json={
            "subject": "Matematika", "type": "mc", "q": "2+2=?",
            "options": ["3", "4", "5", "6"], "answer": 1, "level": "sedang", "category": "keduanya",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["q"] == "2+2=?"
        assert d["options"][d["answer"]] == "4"
        TestBankSoal.created_id = d["id"]

    def test_list(self, guru):
        r = guru.get(f"{API}/question-bank")
        assert r.status_code == 200
        data = r.json()
        items = data.get("items") if isinstance(data, dict) else data
        ids = [x["id"] for x in items]
        assert TestBankSoal.created_id in ids

    def test_update(self, guru):
        bid = TestBankSoal.created_id
        r = guru.patch(f"{API}/question-bank/{bid}", json={
            "subject": "Matematika", "type": "mc", "q": "2+3=?",
            "options": ["4", "5", "6"], "answer": 1, "level": "mudah", "category": "quiz",
        })
        assert r.status_code == 200, r.text
        assert r.json()["q"] == "2+3=?"

    def test_delete(self, guru):
        bid = TestBankSoal.created_id
        r = guru.delete(f"{API}/question-bank/{bid}")
        assert r.status_code == 200


# ========== Exam Request ==========
class TestExamRequest:
    rid = None
    exam_ids = []

    def _payload(self, class_ids):
        return {
            "exam_type": "UAS", "title": "TEST_UAS_IT61",
            "subject": "Matematika", "class_ids": class_ids,
            "questions": [{"q": "1+1=?", "options": ["1", "2", "3", "4"], "answer": 1, "type": "mc"}],
            "start_at": "2026-12-31T08:00:00+07:00",
            "end_at": "2026-12-31T10:00:00+07:00",
            "time_limit": 90, "kkm": 75,
        }

    def test_classes(self, admin):
        r = admin.get(f"{API}/classes")
        assert r.status_code == 200
        self.__class__.classes = [c for c in r.json() if c["name"] in ("X.1", "X.5")]
        assert len(self.__class__.classes) >= 1

    def test_create_submit(self, guru):
        cids = [c["id"] for c in self.__class__.classes[:1]]
        r = guru.post(f"{API}/exam-requests?submit=true", json=self._payload(cids))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "diajukan"
        TestExamRequest.rid = d["id"]

    def test_admin_sees(self, admin):
        r = admin.get(f"{API}/exam-requests?status=diajukan")
        assert r.status_code == 200
        assert any(x["id"] == TestExamRequest.rid for x in r.json())

    def test_approve(self, admin):
        r = admin.post(f"{API}/exam-requests/{TestExamRequest.rid}/approve", json={
            "password": "test123", "max_violations": 3,
        })
        assert r.status_code == 200, r.text
        assert r.json()["created"] >= 1

    def test_notification(self, guru):
        r = guru.get(f"{API}/notifications")
        assert r.status_code == 200
        # not strict - just verify endpoint works
        assert isinstance(r.json(), list) or isinstance(r.json(), dict)

    def test_reject_flow(self, guru, admin):
        cids = [c["id"] for c in self.__class__.classes[:1]]
        r = guru.post(f"{API}/exam-requests?submit=true", json=self._payload(cids))
        assert r.status_code == 200
        rid = r.json()["id"]
        r2 = admin.post(f"{API}/exam-requests/{rid}/reject", json={"note": "Ditolak untuk test"})
        assert r2.status_code == 200
        # cleanup
        guru.delete(f"{API}/exam-requests/{rid}")

    def test_cleanup_approved_exams(self, admin):
        r = admin.get(f"{API}/exams")
        if r.status_code == 200:
            for e in r.json():
                if e.get("title") == "TEST_UAS_IT61":
                    admin.delete(f"{API}/exams/{e['id']}")


# ========== Bulk Exam ==========
class TestBulkExam:
    def test_create_bulk(self, admin):
        r = admin.get(f"{API}/classes")
        cids = [c["id"] for c in r.json() if c["name"] in ("X.1", "X.5")]
        assert cids
        r = admin.post(f"{API}/exams/bulk", json={
            "exam_type": "UTS", "title": "TEST_BULK_IT61", "subject": "Matematika",
            "class_ids": cids,
            "questions": [{"q": "a?", "options": ["a", "b"], "answer": 0, "type": "mc"}],
            "password": "bulk123", "max_violations": 3, "kkm": 75,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["created"] == len(cids)
        for e in d["exams"]:
            assert e.get("shuffle_questions") is True
            assert e.get("shuffle_options") is True
            admin.delete(f"{API}/exams/{e['id']}")

    def test_guru_forbidden(self, guru):
        r = guru.post(f"{API}/exams/bulk", json={
            "exam_type": "Harian", "title": "X", "subject": "Mat",
            "class_ids": ["x"], "questions": [{"q": "?", "options": ["a", "b"], "answer": 0, "type": "mc"}],
            "password": "p",
        })
        assert r.status_code == 403


# ========== Scan Delete ==========
class TestScanDelete:
    def test_guru_forbidden_delete_all(self, guru):
        r = guru.delete(f"{API}/attendance/scan-today?kind=siswa")
        assert r.status_code == 403

    def test_piket_delete_all(self, piket):
        r = piket.delete(f"{API}/attendance/scan-today?kind=siswa")
        assert r.status_code == 200

    def test_admin_delete_all(self, admin):
        r = admin.delete(f"{API}/attendance/scan-today?kind=guru")
        assert r.status_code == 200

    def test_delete_invalid_record(self, admin):
        r = admin.delete(f"{API}/attendance/scan-record/non-existent-id?kind=siswa")
        assert r.status_code == 404


# ========== Photo ==========
class TestMyPhoto:
    def test_reject_external(self, piket):
        r = piket.patch(f"{API}/auth/me/photo", json={"photo": "https://external.com/foo.jpg"})
        assert r.status_code == 400

    def test_clear(self, piket):
        r = piket.patch(f"{API}/auth/me/photo", json={"photo": None})
        assert r.status_code == 200

    def test_set_from_upload(self, piket):
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff?"
            b"\x00\x05\xfe\x02\xfe\xa5\xd5P\x9e\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        r = piket.post(f"{API}/upload", files={"file": ("t.png", png, "image/png")})
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        full = f"{BASE}{url}"
        r2 = piket.patch(f"{API}/auth/me/photo", json={"photo": full})
        assert r2.status_code == 200, r2.text
        # cleanup
        piket.patch(f"{API}/auth/me/photo", json={"photo": None})


# ========== Assignment ==========
class TestAssignment:
    def test_set_homeroom_and_subjects(self, admin):
        # find kepsek user
        r = admin.get(f"{API}/users?role=kepsek")
        assert r.status_code == 200
        kepsek_users = [u for u in r.json() if u["email"] == KEPSEK[0]]
        assert kepsek_users, "kepsek.test not found"
        uid = kepsek_users[0]["id"]
        # get class X.5
        rc = admin.get(f"{API}/classes")
        x5 = next((c for c in rc.json() if c["name"] == "X.5"), None)
        assert x5, "class X.5 missing"
        r2 = admin.put(f"{API}/users/{uid}/assignment", json={
            "homeroom_class_id": x5["id"], "subjects": ["Matematika"],
        })
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d.get("teaching_duty") is True
        assert "Matematika" in d.get("subjects", [])

    def test_guru_forbidden(self, guru):
        r = guru.put(f"{API}/users/xxx/assignment", json={"subjects": []})
        assert r.status_code == 403


# ========== Upload Video Size Limit ==========
class TestVideoLimit:
    def test_small_video_ok(self, admin):
        # fake tiny mp4
        r = admin.post(f"{API}/upload", files={"file": ("t.mp4", b"\x00" * 1024, "video/mp4")})
        assert r.status_code == 200, r.text

    def test_over_limit_video(self, admin):
        big = b"\x00" * (31 * 1024 * 1024)
        r = admin.post(f"{API}/upload", files={"file": ("big.mp4", big, "video/mp4")})
        assert r.status_code == 400
        assert "Video maksimal 30MB" in r.text

    def test_range_request(self, admin):
        r = admin.post(f"{API}/upload", files={"file": ("rng.mp4", b"ABCDEFGHIJ" * 100, "video/mp4")})
        assert r.status_code == 200
        url = r.json()["url"]
        r2 = admin.get(f"{BASE}{url}", headers={"Range": "bytes=0-9"})
        assert r2.status_code == 206
        assert r2.headers.get("Content-Range", "").startswith("bytes 0-9/")


# ========== Classes includes X.5 (no students) ==========
class TestClassesListing:
    def test_x5_present(self, admin):
        r = admin.get(f"{API}/classes")
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "X.5" in names, f"X.5 not in classes list: {names}"
