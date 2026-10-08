"""Iteration 8 tests: Inventory stock decrement/restore + borrower info,
Classes creation by guru, Attendance manual NISN scan."""
import os
import pytest
import requests

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v: return v.rstrip("/")
    for p in ("/app/frontend/.env", "/app/backend/.env"):
        try:
            for line in open(p):
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
        except FileNotFoundError:
            pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE = _load_url()
API = BASE + "/api"


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_tok():
    return login("admin.demo@sekolahku.id", "Demo12345")


@pytest.fixture(scope="module")
def guru_tok():
    return login("guru.demo@sekolahku.id", "Demo12345")


@pytest.fixture(scope="module")
def siswa_tok():
    return login("siswa.demo@sekolahku.id", "Demo12345")


def H(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# ---------- INVENTORY ----------
class TestInventoryStock:
    def test_full_borrow_flow(self, admin_tok, siswa_tok):
        # Create item
        r = requests.post(f"{API}/inventory", headers=H(admin_tok), json={
            "name": "TEST_iter8_item", "category": "TEST", "stock": 5, "condition": "Baik"
        })
        assert r.status_code == 200, r.text
        item = r.json(); iid = item["id"]
        assert item["stock"] == 5

        # Siswa creates borrow (qty=2)
        r = requests.post(f"{API}/borrow", headers=H(siswa_tok), json={
            "item_id": iid, "quantity": 2, "purpose": "test", "return_date": "2026-12-31"
        })
        assert r.status_code == 200, r.text
        br = r.json(); bid = br["id"]
        # Borrower info fields captured
        assert br["requester_role"] == "siswa"
        assert br["requester_nisn"] == "0099887766"
        assert br["requester_kelas"]  # not None
        assert br["requester_email"] == "siswa.demo@sekolahku.id"

        # Approve -> stock 5-2 = 3
        r = requests.patch(f"{API}/borrow/{bid}?status=Disetujui", headers=H(admin_tok))
        assert r.status_code == 200, r.text
        inv = requests.get(f"{API}/inventory", headers=H(admin_tok)).json()
        cur = next(i for i in inv if i["id"] == iid)
        assert cur["stock"] == 3, f"expected 3 got {cur['stock']}"

        # Return -> stock back to 5
        r = requests.patch(f"{API}/borrow/{bid}?status=Dikembalikan", headers=H(admin_tok))
        assert r.status_code == 200
        inv = requests.get(f"{API}/inventory", headers=H(admin_tok)).json()
        cur = next(i for i in inv if i["id"] == iid)
        assert cur["stock"] == 5

        # Cleanup
        requests.delete(f"{API}/inventory/{iid}", headers=H(admin_tok))

    def test_reject_after_approve_restores(self, admin_tok, siswa_tok):
        r = requests.post(f"{API}/inventory", headers=H(admin_tok), json={
            "name": "TEST_iter8_reject", "category": "TEST", "stock": 4, "condition": "Baik"})
        iid = r.json()["id"]
        br = requests.post(f"{API}/borrow", headers=H(siswa_tok), json={
            "item_id": iid, "quantity": 3, "purpose": "t", "return_date": "2026-12-31"}).json()
        bid = br["id"]
        requests.patch(f"{API}/borrow/{bid}?status=Disetujui", headers=H(admin_tok))
        # Now reject -> should restore stock
        r = requests.patch(f"{API}/borrow/{bid}?status=Ditolak", headers=H(admin_tok))
        assert r.status_code == 200
        inv = requests.get(f"{API}/inventory", headers=H(admin_tok)).json()
        cur = next(i for i in inv if i["id"] == iid)
        assert cur["stock"] == 4
        requests.delete(f"{API}/inventory/{iid}", headers=H(admin_tok))

    def test_over_borrow_rejected(self, admin_tok, siswa_tok):
        r = requests.post(f"{API}/inventory", headers=H(admin_tok), json={
            "name": "TEST_iter8_over", "category": "TEST", "stock": 2, "condition": "Baik"})
        iid = r.json()["id"]
        r = requests.post(f"{API}/borrow", headers=H(siswa_tok), json={
            "item_id": iid, "quantity": 5, "purpose": "t", "return_date": "2026-12-31"})
        assert r.status_code == 400
        assert "Stok tidak cukup" in r.text
        requests.delete(f"{API}/inventory/{iid}", headers=H(admin_tok))


# ---------- CLASSES role=guru ----------
class TestClassesGuru:
    def test_guru_can_create_class(self, guru_tok):
        r = requests.post(f"{API}/classes", headers=H(guru_tok), json={
            "name": "TEST_iter8_kelas_guru", "wali_kelas": "Guru Demo"})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        # Cleanup
        requests.delete(f"{API}/classes/{cid}", headers=H(guru_tok))

    def test_guru_can_create_assignment(self, guru_tok):
        r = requests.post(f"{API}/assignments", headers=H(guru_tok), json={
            "title": "TEST_iter8_tugas", "description": "d",
            "kelas": "XI IPA 1", "due_date": "2026-12-31"})
        assert r.status_code == 200, r.text

    def test_guru_can_create_quiz(self, guru_tok):
        r = requests.post(f"{API}/quizzes", headers=H(guru_tok), json={
            "title": "TEST_iter8_quiz", "kelas": "XI IPA 1",
            "questions": [{"q": "1+1?", "options": ["1", "2", "3"], "answer_index": 1}]})
        assert r.status_code == 200, r.text


# ---------- ATTENDANCE manual NISN ----------
class TestAttendanceNisn:
    def test_manual_nisn_scan(self, admin_tok):
        r = requests.post(f"{API}/attendance/scan", headers=H(admin_tok),
                          json={"nisn": "0099887766", "status": "hadir"})
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True
        assert "student" in j and j["student"].get("nisn") == "0099887766"

    def test_missing_both_returns_400(self, admin_tok):
        r = requests.post(f"{API}/attendance/scan", headers=H(admin_tok),
                          json={"status": "hadir"})
        assert r.status_code == 400

    def test_invalid_nisn_returns_404(self, admin_tok):
        r = requests.post(f"{API}/attendance/scan", headers=H(admin_tok),
                          json={"nisn": "9999999999", "status": "hadir"})
        assert r.status_code == 404
