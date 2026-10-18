"""Iter50: Vortex Guard token/export/live + Inventory rooms/stats/activity/lookup/return conditions."""
import os, io, time, uuid, pytest, requests, pymongo

def _env(key):
    for p in ("/app/frontend/.env", "/app/backend/.env"):
        try:
            for ln in open(p):
                if ln.startswith(key + "="):
                    return ln.split("=", 1)[1].strip().strip('"').strip("'")
        except FileNotFoundError:
            pass
    return os.environ.get(key, "")

BASE = _env("REACT_APP_BACKEND_URL").rstrip("/")
API = BASE + "/api"
ADMIN = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
GURU = ("guru.vortex@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.vortex@sman1laguboti.sch.id", "BaruSiswa123")

EXAM_ID = "0c849a79-2828-4309-826d-302e8771b0af"  # UH Matematika Bab 1 (Guru Vortex)
EXAM_TOKEN = "MAT123"
INV_001 = "0d7c1a7e-abcb-4183-9fc6-428460af38be"  # Proyektor Epson

def login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return s

@pytest.fixture(scope="module")
def admin(): return login(*ADMIN)
@pytest.fixture(scope="module")
def guru(): return login(*GURU)
@pytest.fixture(scope="module")
def siswa(): return login(*SISWA)

# -------------------- VORTEX GUARD --------------------

class TestVortexToken:
    def test_token_as_owner_guru(self, guru):
        r = guru.get(f"{API}/exams/{EXAM_ID}/token")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["token"] == EXAM_TOKEN
        assert d["kelas"] == "XII IPA 1"
        assert "server_now" in d and "status" in d

    def test_token_as_admin(self, admin):
        r = admin.get(f"{API}/exams/{EXAM_ID}/token")
        assert r.status_code == 200
        assert r.json()["token"] == EXAM_TOKEN

    def test_token_forbidden_for_unrelated_guru(self, admin):
        # Create a temp guru and verify 403
        pw = "TmpGuru123!"
        email = f"TEST_tmpguru_{uuid.uuid4().hex[:6]}@sman1laguboti.sch.id"
        r = admin.post(f"{API}/users", json={
            "name": "TEST Guru Lain", "email": email, "password": pw, "role": "guru",
            "nip": f"TEST{uuid.uuid4().hex[:8]}", "phone": "08123456789"})
        assert r.status_code in (200, 201), r.text
        uid = r.json()["id"]
        try:
            other = login(email, pw)
            rr = other.get(f"{API}/exams/{EXAM_ID}/token")
            assert rr.status_code == 403, f"expected 403, got {rr.status_code} {rr.text}"
        finally:
            admin.delete(f"{API}/users/{uid}")

    def test_token_forbidden_for_siswa(self, siswa):
        r = siswa.get(f"{API}/exams/{EXAM_ID}/token")
        assert r.status_code in (403, 401)


class TestVortexExport:
    def test_xlsx_owner(self, guru):
        r = guru.get(f"{API}/exams/{EXAM_ID}/export", params={"format": "xlsx"})
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_pdf_owner(self, guru):
        r = guru.get(f"{API}/exams/{EXAM_ID}/export", params={"format": "pdf"})
        assert r.status_code == 200
        assert "pdf" in r.headers.get("content-type", "")

    def test_bad_format(self, guru):
        r = guru.get(f"{API}/exams/{EXAM_ID}/export", params={"format": "csv"})
        assert r.status_code == 400

    def test_export_as_super_admin(self, admin):
        r = admin.get(f"{API}/exams/{EXAM_ID}/export?format=xlsx")
        assert r.status_code == 200

    def test_export_as_homeroom_of_other_exam(self, guru):
        # Admin-owned exams in XII IPA 1 should be exportable by Guru Vortex (wali kelas)
        other_exam_id = "3de5b66e-614c-4e17-95c9-ae3561661526"  # UAS by Boas
        r = guru.get(f"{API}/exams/{other_exam_id}/export?format=pdf")
        assert r.status_code == 200, f"wali kelas export should pass, got {r.status_code}: {r.text[:200]}"

    def test_export_forbidden_siswa(self, siswa):
        r = siswa.get(f"{API}/exams/{EXAM_ID}/export?format=xlsx")
        assert r.status_code in (401, 403)

    def test_export_forbidden_unrelated_guru(self, admin):
        pw = "TmpGuru123!"
        email = f"TEST_tmpguru2_{uuid.uuid4().hex[:6]}@sman1laguboti.sch.id"
        r = admin.post(f"{API}/users", json={
            "name": "TEST Guru Luar", "email": email, "password": pw, "role": "guru",
            "nip": f"TEST{uuid.uuid4().hex[:8]}", "phone": "08123456790"})
        assert r.status_code in (200, 201), r.text
        uid = r.json()["id"]
        try:
            other = login(email, pw)
            rr = other.get(f"{API}/exams/{EXAM_ID}/export?format=xlsx")
            assert rr.status_code == 403
        finally:
            admin.delete(f"{API}/users/{uid}")


class TestVortexList:
    def test_guru_sees_homeroom_exams(self, guru):
        r = guru.get(f"{API}/exams")
        assert r.status_code == 200
        exams = r.json()
        titles = {e["title"]: e for e in exams}
        assert "UH Matematika Bab 1" in titles
        # UAS exam by admin, Guru Vortex is wali kelas, so should see it with can_export=True, can_manage=False
        if "UAS" in titles:
            u = titles["UAS"]
            assert u.get("can_export") is True
            assert u.get("can_manage") is False


class TestVortexLive:
    @pytest.fixture(scope="class")
    def exam_run(self, siswa):
        """Have siswa start, violate, and later submit the exam."""
        # Clean previous attempt if present
        c = pymongo.MongoClient("mongodb://localhost:27017")
        db = c["test_database"]
        # Need user id first
        me = siswa.get(f"{API}/auth/me").json()
        db.exam_attempts.delete_many({"exam_id": EXAM_ID, "student_id": me["id"]})
        db.exam_sessions.delete_many({"exam_id": EXAM_ID, "student_id": me["id"]})
        r = siswa.post(f"{API}/exams/{EXAM_ID}/start", json={"password": EXAM_TOKEN})
        assert r.status_code == 200, r.text
        start = r.json()
        v = siswa.post(f"{API}/exams/{EXAM_ID}/violation", json={"reason": "test"})
        assert v.status_code == 200
        return {"start": start, "me": me, "db": db}

    def test_live_shows_mengerjakan_and_violation(self, guru, exam_run):
        r = guru.get(f"{API}/exams/{EXAM_ID}/live")
        assert r.status_code == 200
        d = r.json()
        me_id = exam_run["me"]["id"]
        tiles = {s["id"]: s for s in d["students"]}
        assert me_id in tiles, "siswa should appear in roster"
        tile = tiles[me_id]
        assert tile["state"] == "mengerjakan", tile
        assert tile["violations"] >= 1
        assert tile.get("remaining_seconds") is None or tile["remaining_seconds"] >= 0
        assert d["counts"]["mengerjakan"] >= 1

    def test_live_after_submit_selesai(self, guru, siswa, exam_run):
        # Submit with empty answers
        start = exam_run["start"]
        n = len(start.get("questions") or [])
        answers = [None] * n
        r = siswa.post(f"{API}/exams/attempt",
                       json={"exam_id": EXAM_ID, "answers": answers, "violations": 1, "auto_submitted": False})
        assert r.status_code == 200, r.text
        time.sleep(0.3)
        r2 = guru.get(f"{API}/exams/{EXAM_ID}/live")
        assert r2.status_code == 200
        me_id = exam_run["me"]["id"]
        tile = next(s for s in r2.json()["students"] if s["id"] == me_id)
        assert tile["state"] == "selesai"
        # cleanup for repeatability
        exam_run["db"].exam_attempts.delete_many({"exam_id": EXAM_ID, "student_id": me_id})
        exam_run["db"].exam_sessions.delete_many({"exam_id": EXAM_ID, "student_id": me_id})


# -------------------- INVENTORY --------------------

class TestInventoryRooms:
    def test_list_rooms(self, admin):
        r = admin.get(f"{API}/inventory-rooms")
        assert r.status_code == 200
        rooms = r.json()
        assert isinstance(rooms, list) and len(rooms) >= 3
        assert all("item_count" in rm and "units" in rm for rm in rooms)

    def test_siswa_cannot_create(self, siswa):
        r = siswa.post(f"{API}/inventory-rooms", json={"name": "TEST_X"})
        assert r.status_code in (401, 403)

    def test_full_crud_and_rename_propagates(self, admin):
        name = f"TEST_Room_{uuid.uuid4().hex[:6]}"
        r = admin.post(f"{API}/inventory-rooms", json={"name": name, "building": "A"})
        assert r.status_code in (200, 201), r.text
        rid = r.json()["id"]
        # Place a temporary inventory item in this room
        item = admin.post(f"{API}/inventory", json={
            "name": f"TEST_Item_{uuid.uuid4().hex[:5]}", "category": "Lainnya",
            "stock": 1, "location": name, "condition": "Baik"}).json()
        new_name = name + "_RN"
        rr = admin.patch(f"{API}/inventory-rooms/{rid}", json={"name": new_name})
        assert rr.status_code == 200
        # item location should now equal new_name
        got = admin.get(f"{API}/inventory-lookup/{item['id']}").json()
        assert got["location"] == new_name
        # cannot delete while items remain
        d1 = admin.delete(f"{API}/inventory-rooms/{rid}")
        assert d1.status_code == 400
        # delete item then room
        admin.delete(f"{API}/inventory/{item['id']}")
        d2 = admin.delete(f"{API}/inventory-rooms/{rid}")
        assert d2.status_code == 200


class TestInventoryStats:
    def test_stats_shape(self, admin):
        r = admin.get(f"{API}/inventory-stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("totals", "by_condition", "by_category", "by_room", "monthly", "top_items", "overdue_list"):
            assert k in d
        conds = {c["name"] for c in d["by_condition"]}
        assert "Hilang" in conds
        for k in ("items", "units", "available", "borrowed", "damaged_units", "lost_units", "rooms", "overdue"):
            assert k in d["totals"]


class TestInventoryActivity:
    def test_activity_requires_staff(self, siswa):
        r = siswa.get(f"{API}/inventory-activity")
        assert r.status_code in (401, 403)

    def test_activity_logs(self, admin):
        r = admin.get(f"{API}/inventory-activity?limit=20")
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)


class TestInventoryLookup:
    def test_by_code(self, admin):
        r = admin.get(f"{API}/inventory-lookup/INV-001")
        assert r.status_code == 200
        d = r.json()
        assert d["code"] == "INV-001"
        assert "outstanding" in d and "total" in d

    def test_by_inv_prefix(self, admin):
        r = admin.get(f"{API}/inventory-lookup/INV:INV-002")
        assert r.status_code == 200
        assert r.json()["code"] == "INV-002"

    def test_not_found(self, admin):
        r = admin.get(f"{API}/inventory-lookup/NOT_A_REAL_CODE_xyz")
        assert r.status_code == 404


class TestBorrowReturnConditions:
    """Rusak restores stock + increments damaged; Hilang does NOT restore + increments lost."""
    @pytest.fixture
    def fresh_item_and_loan(self, admin, siswa):
        # Create fresh item
        item = admin.post(f"{API}/inventory", json={
            "name": f"TEST_Loan_{uuid.uuid4().hex[:5]}", "category": "Lainnya",
            "stock": 10, "location": "Tanpa lokasi", "condition": "Baik"}).json()
        # Siswa requests borrow 2
        br = siswa.post(f"{API}/borrow", json={
            "item_id": item["id"], "quantity": 2, "purpose": "test",
            "return_date": "2099-12-31"}).json()
        # Admin approves
        a = admin.patch(f"{API}/borrow/{br['id']}", params={"status": "Disetujui"})
        assert a.status_code == 200, a.text
        return item, br

    def _get_item(self, admin, iid):
        return admin.get(f"{API}/inventory-lookup/{iid}").json()

    def test_return_rusak_restores_stock_and_damaged_inc(self, admin, fresh_item_and_loan):
        item, br = fresh_item_and_loan
        before = self._get_item(admin, item["id"])
        r = admin.patch(f"{API}/borrow/{br['id']}",
                        params={"status": "Dikembalikan", "return_condition": "Rusak"})
        assert r.status_code == 200, r.text
        after = self._get_item(admin, item["id"])
        assert after["stock"] == before["stock"] + 2
        assert int(after.get("damaged_units", 0)) == int(before.get("damaged_units", 0)) + 2
        admin.delete(f"{API}/inventory/{item['id']}")

    def test_return_hilang_does_not_restore_and_lost_inc(self, admin, fresh_item_and_loan):
        item, br = fresh_item_and_loan
        before = self._get_item(admin, item["id"])
        r = admin.patch(f"{API}/borrow/{br['id']}",
                        params={"status": "Dikembalikan", "return_condition": "Hilang"})
        assert r.status_code == 200, r.text
        after = self._get_item(admin, item["id"])
        assert after["stock"] == before["stock"], "Hilang must NOT restore stock"
        assert int(after.get("lost_units", 0)) == int(before.get("lost_units", 0)) + 2
        admin.delete(f"{API}/inventory/{item['id']}")

    def test_invalid_return_condition_400(self, admin, fresh_item_and_loan):
        item, br = fresh_item_and_loan
        r = admin.patch(f"{API}/borrow/{br['id']}",
                        params={"status": "Dikembalikan", "return_condition": "Jelek"})
        assert r.status_code == 400
        # cleanup: proper return then delete
        admin.patch(f"{API}/borrow/{br['id']}",
                    params={"status": "Dikembalikan", "return_condition": "Baik"})
        admin.delete(f"{API}/inventory/{item['id']}")
