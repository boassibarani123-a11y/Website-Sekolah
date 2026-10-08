"""Iteration 9 tests: Inventory loan history (outstanding/total + history endpoint),
Photo-on-scan attendance, Teacher scope (guru manage own classes only)."""
import os
import time
import pytest
import requests


def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    for p in ("/app/frontend/.env",):
        try:
            for line in open(p):
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
        except FileNotFoundError:
            pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE = _load_url()
API = BASE + "/api"
TS = str(int(time.time()))


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_tok():
    return login("admin.demo@sekolahku.id", "Demo12345")


@pytest.fixture(scope="module")
def guru_tok():
    return login("guru.demo@sekolahku.id", "Demo12345")


@pytest.fixture(scope="module")
def siswa_tok():
    return login("siswa.demo@sekolahku.id", "Demo12345")


# ---------- INVENTORY: outstanding/total + history ----------
class TestInventoryLoanHistory:
    def test_outstanding_total_and_history(self, admin_tok, siswa_tok):
        # Create item with stock N=6
        r = requests.post(f"{API}/inventory", headers=H(admin_tok), json={
            "name": "TEST_iter9_item", "category": "TEST", "stock": 6, "condition": "Baik"
        })
        assert r.status_code == 200, r.text
        iid = r.json()["id"]

        # Initially outstanding=0, total=6
        r = requests.get(f"{API}/inventory", headers=H(admin_tok))
        assert r.status_code == 200
        item = next((x for x in r.json() if x["id"] == iid), None)
        assert item is not None
        assert item["stock"] == 6
        assert item.get("outstanding", 0) == 0
        assert item.get("total") == 6

        # Siswa borrow qty=2
        r = requests.post(f"{API}/borrow", headers=H(siswa_tok), json={
            "item_id": iid, "quantity": 2, "purpose": "TEST_iter9_purpose",
            "return_date": "2026-12-31",
        })
        assert r.status_code == 200, r.text
        bid = r.json()["id"]

        # Approve
        r = requests.patch(f"{API}/borrow/{bid}?status=Disetujui", headers=H(admin_tok))
        assert r.status_code == 200, r.text

        # Now inventory: stock=4, outstanding=2, total=6
        r = requests.get(f"{API}/inventory", headers=H(admin_tok))
        item = next(x for x in r.json() if x["id"] == iid)
        assert item["stock"] == 4, item
        assert item["outstanding"] == 2, item
        assert item["total"] == 6, item

        # History endpoint (staff/super_admin only)
        r = requests.get(f"{API}/inventory/{iid}/history", headers=H(admin_tok))
        assert r.status_code == 200, r.text
        hist = r.json()
        assert isinstance(hist, list) and len(hist) >= 1
        h0 = hist[0]
        for k in ("requester_name", "requester_role", "status", "purpose", "return_date", "created_at"):
            assert k in h0, f"missing key {k} in history entry: {h0}"
        assert h0["requester_role"] == "siswa"
        assert h0["requester_kelas"] == "XI IPA 1" or "IPA" in (h0.get("requester_kelas") or "")
        assert h0["requester_nisn"] == "0099887766"
        assert h0["status"] == "Disetujui"

        # Siswa should NOT be able to access history
        r = requests.get(f"{API}/inventory/{iid}/history", headers=H(siswa_tok))
        assert r.status_code == 403, r.status_code

        # Return -> stock=6, outstanding=0
        r = requests.patch(f"{API}/borrow/{bid}?status=Dikembalikan", headers=H(admin_tok))
        assert r.status_code == 200, r.text
        r = requests.get(f"{API}/inventory", headers=H(admin_tok))
        item = next(x for x in r.json() if x["id"] == iid)
        assert item["stock"] == 6
        assert item["outstanding"] == 0
        assert item["total"] == 6

        # Cleanup
        requests.delete(f"{API}/inventory/{iid}", headers=H(admin_tok))


# ---------- PHOTO ON SCAN ----------
class TestPhotoOnScan:
    def test_scan_persists_photo(self, admin_tok):
        photo_url = "https://example.com/proof_iter9.jpg"
        # scan via NISN with photo
        r = requests.post(f"{API}/attendance/scan", headers=H(admin_tok), json={
            "nisn": "0099887766", "status": "hadir", "photo": photo_url
        })
        assert r.status_code == 200, r.text
        body = r.json()
        # Response might be the attendance record itself
        # Fetch list and verify photo present on newest record for that siswa
        r = requests.get(f"{API}/attendance", headers=H(admin_tok))
        assert r.status_code == 200
        rows = r.json()
        # Find matching row with our photo
        matches = [x for x in rows if x.get("photo") == photo_url]
        assert matches, f"no attendance row with photo {photo_url} found; sample: {rows[:2]}"

    def test_scan_without_photo_ok(self, admin_tok):
        r = requests.post(f"{API}/attendance/scan", headers=H(admin_tok), json={
            "nisn": "0099887766", "status": "hadir"
        })
        assert r.status_code == 200, r.text


# ---------- TEACHER SCOPE ----------
class TestTeacherScope:
    def test_guru_owns_created_class_full_control(self, admin_tok, guru_tok):
        # Guru creates a class
        r = requests.post(f"{API}/classes", headers=H(guru_tok), json={
            "name": f"TEST_iter9_guru_owned_{TS}", "grade_level": "XII", "academic_year": "2025/2026"
        })
        assert r.status_code == 200, r.text
        cls = r.json()
        cid = cls["id"]
        assert cls.get("created_by"), f"created_by not stored: {cls}"

        # Guru CAN patch
        r = requests.patch(f"{API}/classes/{cid}", headers=H(guru_tok),
                           json={"name": f"TEST_iter9_guru_owned_{TS}_v2"})
        assert r.status_code == 200, r.text

        # Guru CAN add assignment
        r = requests.post(f"{API}/assignments", headers=H(guru_tok), json={
            "class_id": cid, "title": "TEST_iter9_tugas_own", "kelas": f"TEST_iter9_guru_owned_{TS}",
            "description": "x", "due_date": "2026-12-31"
        })
        assert r.status_code == 200, r.text
        aid = r.json()["id"]

        # Guru CAN add quiz
        r = requests.post(f"{API}/quizzes", headers=H(guru_tok), json={
            "class_id": cid, "title": "TEST_iter9_quiz_own", "kelas": f"TEST_iter9_guru_owned_{TS}",
            "questions": [{"question": "1+1?", "options": ["1", "2"], "correct_answer": 1}]
        })
        assert r.status_code == 200, r.text
        qid = r.json()["id"]

        # Cleanup
        requests.delete(f"{API}/assignments/{aid}", headers=H(guru_tok))
        requests.delete(f"{API}/quizzes/{qid}", headers=H(guru_tok))
        requests.delete(f"{API}/classes/{cid}", headers=H(guru_tok))

    def test_guru_cannot_manage_others_class(self, admin_tok, guru_tok):
        # Admin creates a class (not owned by guru; guru not homeroom)
        r = requests.post(f"{API}/classes", headers=H(admin_tok), json={
            "name": f"TEST_iter9_admin_owned_{TS}", "grade_level": "X", "academic_year": "2025/2026"
        })
        assert r.status_code == 200, r.text
        cid = r.json()["id"]

        # Guru PATCH -> 403
        r = requests.patch(f"{API}/classes/{cid}", headers=H(guru_tok), json={"name": "hack"})
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

        # Guru DELETE -> 403
        r = requests.delete(f"{API}/classes/{cid}", headers=H(guru_tok))
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

        # Guru add assignment -> 403
        r = requests.post(f"{API}/assignments", headers=H(guru_tok), json={
            "class_id": cid, "title": "hack", "kelas": f"TEST_iter9_admin_owned_{TS}", "description": "x", "due_date": "2026-12-31"
        })
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

        # Guru add quiz -> 403
        r = requests.post(f"{API}/quizzes", headers=H(guru_tok), json={
            "class_id": cid, "title": "hack", "kelas": f"TEST_iter9_admin_owned_{TS}",
            "questions": [{"question": "?", "options": ["a"], "correct_answer": 0}]
        })
        assert r.status_code == 403, f"expected 403 got {r.status_code}: {r.text}"

        # Admin cleanup
        requests.delete(f"{API}/classes/{cid}", headers=H(admin_tok))

    def test_super_admin_bypasses(self, admin_tok):
        # admin.demo is super_admin -> can PATCH any class
        r = requests.post(f"{API}/classes", headers=H(admin_tok), json={
            "name": f"TEST_iter9_admin_full_{TS}", "grade_level": "X", "academic_year": "2025/2026"
        })
        assert r.status_code == 200
        cid = r.json()["id"]
        r = requests.patch(f"{API}/classes/{cid}", headers=H(admin_tok), json={"name": f"TEST_iter9_admin_full_{TS}_v2"})
        assert r.status_code == 200
        requests.delete(f"{API}/classes/{cid}", headers=H(admin_tok))
