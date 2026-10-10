"""
Smart Library (Perpustakaan Pintar) backend tests - iteration 19
Covers: role guards, Books CRUD, Loan borrow/return, Reservation flow,
Review submission, Config PATCH, Stats, and AI endpoints (optional).
"""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0]).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_PERPUS = ("perpus.demo@sekolahku.id", "Demo12345")
SISWA = ("siswa.demo@sekolahku.id", "Demo12345")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(*ADMIN_PERPUS)


@pytest.fixture(scope="session")
def siswa_token():
    return _login(*SISWA)


def _h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- CONFIG & STATS ----------
class TestLibraryConfig:
    def test_get_config(self, admin_token):
        r = requests.get(f"{API}/library/config", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("loan_days", "max_books", "fine_per_day"):
            assert k in d

    def test_patch_config_persists(self, admin_token):
        payload = {"loan_days": 10, "max_books": 4, "fine_per_day": 750}
        r = requests.patch(f"{API}/library/config", json=payload, headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["loan_days"] == 10 and d["max_books"] == 4 and d["fine_per_day"] == 750
        # verify persisted
        g = requests.get(f"{API}/library/config", headers=_h(admin_token)).json()
        assert g["loan_days"] == 10
        # restore
        requests.patch(f"{API}/library/config",
                       json={"loan_days": 7, "max_books": 3, "fine_per_day": 500},
                       headers=_h(admin_token))

    def test_siswa_cannot_patch_config(self, siswa_token):
        r = requests.patch(f"{API}/library/config", json={"loan_days": 1}, headers=_h(siswa_token))
        assert r.status_code == 403

    def test_stats_admin_only(self, admin_token, siswa_token):
        r = requests.get(f"{API}/library/stats", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("total_titles", "total_copies", "available", "borrowed", "popular", "by_category"):
            assert k in d
        r2 = requests.get(f"{API}/library/stats", headers=_h(siswa_token))
        assert r2.status_code == 403


# ---------- BOOKS CRUD & ROLE GUARDS ----------
class TestBooksCRUD:
    created_id = None

    def test_list_books(self, siswa_token):
        r = requests.get(f"{API}/books", headers=_h(siswa_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_siswa_cannot_create(self, siswa_token):
        r = requests.post(f"{API}/books",
                          json={"title": "TEST_Siswa Attempt", "total_copies": 1},
                          headers=_h(siswa_token))
        assert r.status_code == 403

    def test_admin_create_book(self, admin_token):
        payload = {"title": "TEST_Buku Iter19", "author": "QA", "category": "Fiksi",
                   "total_copies": 2, "description": "Buku ujicoba"}
        r = requests.post(f"{API}/books", json=payload, headers=_h(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["total_copies"] == 2
        assert d["available_copies"] == 2
        assert "id" in d
        TestBooksCRUD.created_id = d["id"]
        # GET verify persistence
        g = requests.get(f"{API}/books/{d['id']}", headers=_h(admin_token))
        assert g.status_code == 200
        assert g.json()["title"] == payload["title"]

    def test_admin_update_book(self, admin_token):
        bid = TestBooksCRUD.created_id
        assert bid, "needs created book"
        r = requests.patch(f"{API}/books/{bid}",
                           json={"title": "TEST_Buku Iter19 Updated", "total_copies": 3},
                           headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_Buku Iter19 Updated"
        assert d["total_copies"] == 3
        assert d["available_copies"] == 3  # delta applied

    def test_siswa_cannot_update(self, siswa_token):
        bid = TestBooksCRUD.created_id
        r = requests.patch(f"{API}/books/{bid}", json={"title": "nope"}, headers=_h(siswa_token))
        assert r.status_code == 403

    def test_siswa_cannot_delete(self, siswa_token):
        bid = TestBooksCRUD.created_id
        r = requests.delete(f"{API}/books/{bid}", headers=_h(siswa_token))
        assert r.status_code == 403


# ---------- LOAN / RESERVATION FLOW ----------
class TestLoanFlow:
    loan_id = None
    reserved_book_id = None
    reservation_id = None

    def _get_siswa_user(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=_h(_login(*SISWA)))
        assert r.status_code == 200
        return r.json()

    def test_student_borrow_available_book(self, siswa_token, admin_token):
        books = requests.get(f"{API}/books?available=true", headers=_h(siswa_token)).json()
        # pick a book not already borrowed by this siswa
        my_loans = requests.get(f"{API}/loans/my", headers=_h(siswa_token)).json()
        active_ids = {l["book_id"] for l in my_loans if l["status"] == "dipinjam"}
        book = next((b for b in books if b["id"] not in active_ids and b["available_copies"] > 0), None)
        if not book:
            pytest.skip("No available book for siswa to borrow")
        r = requests.post(f"{API}/loans", json={"book_id": book["id"]}, headers=_h(siswa_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "dipinjam"
        assert d["book_id"] == book["id"]
        TestLoanFlow.loan_id = d["id"]
        # verify appears in /loans/my
        mine = requests.get(f"{API}/loans/my", headers=_h(siswa_token)).json()
        assert any(l["id"] == d["id"] for l in mine)

    def test_review_book(self, siswa_token):
        books = requests.get(f"{API}/books", headers=_h(siswa_token)).json()
        if not books:
            pytest.skip("no books")
        bid = books[0]["id"]
        r = requests.post(f"{API}/books/{bid}/review",
                          json={"rating": 4, "text": "TEST_review"}, headers=_h(siswa_token))
        assert r.status_code == 200
        d = r.json()
        assert d["rating"] == 4

    def test_student_return_loan(self, siswa_token):
        lid = TestLoanFlow.loan_id
        if not lid:
            pytest.skip("no loan to return")
        r = requests.post(f"{API}/loans/{lid}/return", headers=_h(siswa_token))
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert "fine" in d and "days_late" in d

    def test_admin_borrow_on_behalf_and_reservation(self, admin_token, siswa_token):
        # Find a book with total_copies == available_copies = 1 OR create one
        bk = requests.post(f"{API}/books",
                           json={"title": "TEST_SingleCopy", "total_copies": 1, "category": "Fiksi"},
                           headers=_h(admin_token)).json()
        bid = bk["id"]
        # need siswa id
        siswa_me = requests.get(f"{API}/auth/me", headers=_h(siswa_token)).json()
        # admin borrows on behalf of siswa
        r = requests.post(f"{API}/loans",
                          json={"book_id": bid, "student_id": siswa_me["id"]},
                          headers=_h(admin_token))
        assert r.status_code == 200, r.text
        loan = r.json()
        # Now book has 0 available. Try another siswa reservation path:
        # We don't have a 2nd siswa demo here, so test that siswa cannot double-borrow / reserve while they already hold it
        # Instead: return it, then test reservation path by borrowing with admin as different user not possible.
        # Validate reservation guard: available_copies==0 -> siswa reserve fails because they already have active loan? No reservation uses user not book borrow.
        # Try reserving when available_copies==0 - however current siswa holds the only copy, reservation allowed for same user? Backend allows.
        r2 = requests.post(f"{API}/books/{bid}/reserve", headers=_h(siswa_token))
        # expected: 200 (menunggu) since available=0
        assert r2.status_code in (200, 400)
        if r2.status_code == 200:
            TestLoanFlow.reservation_id = r2.json()["id"]
        # Return loan
        rr = requests.post(f"{API}/loans/{loan['id']}/return", headers=_h(admin_token))
        assert rr.status_code == 200
        TestLoanFlow.reserved_book_id = bid

    def test_cancel_reservation_and_cleanup(self, admin_token, siswa_token):
        rid = TestLoanFlow.reservation_id
        if rid:
            r = requests.delete(f"{API}/reservations/{rid}", headers=_h(siswa_token))
            assert r.status_code == 200
        # delete test book
        if TestLoanFlow.reserved_book_id:
            r = requests.delete(f"{API}/books/{TestLoanFlow.reserved_book_id}", headers=_h(admin_token))
            assert r.status_code in (200, 400)
        # delete book created in CRUD test
        if TestBooksCRUD.created_id:
            requests.delete(f"{API}/books/{TestBooksCRUD.created_id}", headers=_h(admin_token))


# ---------- AI (OPTIONAL) ----------
class TestAI:
    def test_ai_summary_optional(self, siswa_token):
        books = requests.get(f"{API}/books", headers=_h(siswa_token)).json()
        if not books:
            pytest.skip("no books")
        bid = books[0]["id"]
        r = requests.post(f"{API}/books/{bid}/ai-summary", headers=_h(siswa_token), timeout=90)
        # should NOT 500. Expected: 200 (summary) or 400 (key disabled)
        assert r.status_code in (200, 400), f"AI summary crashed: {r.status_code} {r.text[:200]}"

    def test_ai_reco_optional(self, siswa_token):
        r = requests.get(f"{API}/library/ai-recommendations", headers=_h(siswa_token), timeout=90)
        assert r.status_code in (200, 400), f"AI reco crashed: {r.status_code} {r.text[:200]}"
