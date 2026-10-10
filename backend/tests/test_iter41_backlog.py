"""Iteration 41 backend tests — feedback, candidates, PPDB register, reports, gallery."""
import os, uuid, time, pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://website-sekolah-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"

_cache = {}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def siswa(admin_h):
    """Create a siswa for feedback/report tests."""
    tag = uuid.uuid4().hex[:6]
    email = f"test_siswa_{tag}@example.com"
    payload = {
        "email": email, "password": "Siswa12345", "name": f"TEST_Siswa_{tag}",
        "role": "siswa", "nisn": f"999{tag}", "kelas": "X-1", "phone": "081234567890",
    }
    r = requests.post(f"{API}/users", json=payload, headers=admin_h, timeout=20)
    assert r.status_code == 200, f"create siswa failed {r.status_code} {r.text}"
    sid = r.json()["id"]
    token = _login(email, "Siswa12345")
    _cache["siswa_id"] = sid
    _cache["siswa_token"] = token
    return {"id": sid, "email": email, "token": token,
            "h": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}}


@pytest.fixture(scope="session")
def guru_wali(admin_h):
    """Create a guru wali kelas X-1."""
    tag = uuid.uuid4().hex[:6]
    email = f"test_guru_{tag}@example.com"
    payload = {"email": email, "password": "Guru12345", "name": f"TEST_Guru_{tag}",
               "role": "guru", "kelas": "X-1", "nip": f"NIP{tag}"}
    r = requests.post(f"{API}/users", json=payload, headers=admin_h, timeout=20)
    assert r.status_code == 200, f"create guru failed {r.status_code} {r.text}"
    gid = r.json()["id"]
    token = _login(email, "Guru12345")
    return {"id": gid, "email": email, "token": token,
            "h": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}}


# ------------------------------- FEEDBACK ------------------------------- #
class TestFeedback:
    def test_submit_feedback_hides_author_id(self, siswa):
        r = requests.post(f"{API}/feedback", json={
            "category": "saran", "content": "TEST_Masukan dari siswa", "anonymous": False
        }, headers=siswa["h"], timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "author_id" not in data
        assert data["status"] == "baru"
        assert data["category"] == "saran"
        assert data["user_name"] != "Anonim"
        _cache["fid"] = data["id"]

    def test_submit_anonymous_feedback(self, siswa):
        r = requests.post(f"{API}/feedback", json={
            "category": "kritik", "content": "TEST_Anonim", "anonymous": True
        }, headers=siswa["h"], timeout=20)
        assert r.status_code == 200
        assert r.json()["user_name"] == "Anonim"
        assert "author_id" not in r.json()

    def test_feedback_mine(self, siswa):
        r = requests.get(f"{API}/feedback/mine", headers=siswa["h"], timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert any(it["id"] == _cache.get("fid") for it in items)
        for it in items:
            assert "author_id" not in it

    def test_feedback_list_requires_reviewer(self, siswa):
        r = requests.get(f"{API}/feedback", headers=siswa["h"], timeout=20)
        assert r.status_code in (401, 403)

    def test_feedback_admin_list(self, admin_h):
        r = requests.get(f"{API}/feedback", headers=admin_h, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert any(it["id"] == _cache.get("fid") for it in items)
        for it in items:
            assert "author_id" not in it

    def test_feedback_patch_reply_and_status(self, admin_h):
        fid = _cache["fid"]
        r = requests.patch(f"{API}/feedback/{fid}", json={
            "reply": "Terima kasih atas masukannya", "status": "selesai"
        }, headers=admin_h, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "selesai"
        assert d["reply"] == "Terima kasih atas masukannya"
        assert "author_id" not in d

    def test_feedback_patch_invalid_status(self, admin_h):
        fid = _cache["fid"]
        r = requests.patch(f"{API}/feedback/{fid}", json={"status": "bogus"},
                           headers=admin_h, timeout=20)
        assert r.status_code == 400

    def test_feedback_delete(self, admin_h, siswa):
        # create a disposable then delete it
        r = requests.post(f"{API}/feedback", json={
            "category": "laporan", "content": "TEST_todelete"}, headers=siswa["h"], timeout=20)
        fid = r.json()["id"]
        d = requests.delete(f"{API}/feedback/{fid}", headers=admin_h, timeout=20)
        assert d.status_code == 200
        d2 = requests.delete(f"{API}/feedback/{fid}", headers=admin_h, timeout=20)
        assert d2.status_code == 404


# ------------------------------- CANDIDATES / ELECTION ------------------------------- #
class TestCandidatesElection:
    def test_create_edit_delete_candidate(self, admin_h):
        r = requests.post(f"{API}/candidates", json={
            "name": "TEST_Cand", "position": "ketua",
            "vision": "Visi", "mission": "Misi"}, headers=admin_h, timeout=20)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        # edit
        r2 = requests.patch(f"{API}/candidates/{cid}", json={
            "name": "TEST_Cand_Edited", "position": "ketua",
            "vision": "V2", "mission": "M2"}, headers=admin_h, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST_Cand_Edited"
        # invalid position
        r3 = requests.patch(f"{API}/candidates/{cid}", json={
            "name": "x", "position": "anggota", "vision": "v", "mission": "m"
        }, headers=admin_h, timeout=20)
        assert r3.status_code == 400
        # delete
        d = requests.delete(f"{API}/candidates/{cid}", headers=admin_h, timeout=20)
        assert d.status_code == 200

    def test_vote_requires_open_status(self, admin_h, siswa):
        # ensure status closed
        requests.patch(f"{API}/election/status?status=belum", headers=admin_h, timeout=20)
        # create candidate
        r = requests.post(f"{API}/candidates", json={
            "name": "TEST_C2", "position": "ketua", "vision": "v", "mission": "m"
        }, headers=admin_h, timeout=20)
        cid = r.json()["id"]
        rv = requests.post(f"{API}/vote/{cid}", headers=siswa["h"], timeout=20)
        assert rv.status_code == 400  # not open
        # open
        requests.patch(f"{API}/election/status?status=berlangsung", headers=admin_h, timeout=20)
        rv2 = requests.post(f"{API}/vote/{cid}", headers=siswa["h"], timeout=20)
        assert rv2.status_code == 200
        # dup
        rv3 = requests.post(f"{API}/vote/{cid}", headers=siswa["h"], timeout=20)
        assert rv3.status_code == 400
        # close + cleanup
        requests.patch(f"{API}/election/status?status=belum", headers=admin_h, timeout=20)
        requests.delete(f"{API}/candidates/{cid}", headers=admin_h, timeout=20)


# ------------------------------- PPDB PUBLIC REGISTER ------------------------------- #
class TestPpdbRegister:
    def test_ppdb_register_public(self):
        payload = {
            "full_name": "TEST_Calon Siswa", "gender": "L",
            "address": "Jl. Test", "phone": "081200000001",
            "parent_name": "TEST_Ortu", "parent_phone": "081200000002",
            "parent_email": "testortu@example.com",
            "prev_school": "SMP Test", "nem_avg": 85.5,
        }
        r = requests.post(f"{API}/ppdb/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True and "id" in d
        _cache["ppdb_id"] = d["id"]

    def test_ppdb_admin_patch_reject_with_note(self, admin_h):
        pid = _cache["ppdb_id"]
        r = requests.patch(f"{API}/ppdb/{pid}?status=tidak_lolos&notes=TEST_catatan_tolak",
                           headers=admin_h, timeout=20)
        assert r.status_code == 200
        g = requests.get(f"{API}/ppdb/{pid}", headers=admin_h, timeout=20)
        assert g.status_code == 200
        assert g.json()["status"] == "tidak_lolos"
        assert g.json()["notes"] == "TEST_catatan_tolak"


# ------------------------------- REPORTS ------------------------------- #
class TestReports:
    def test_reports_summary_valid_semester(self, guru_wali):
        r = requests.get(f"{API}/reports-summary?semester=Ganjil 2026/2027",
                         headers=guru_wali["h"], timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["semester"] == "Ganjil 2026/2027"
        assert "items" in d
        # Our siswa (kelas X-1) should be included
        assert _cache["siswa_id"] in d["items"]
        it = d["items"][_cache["siswa_id"]]
        assert "completeness" in it

    def test_reports_summary_invalid_semester(self, guru_wali):
        r = requests.get(f"{API}/reports-summary?semester=Bogus 2026",
                         headers=guru_wali["h"], timeout=20)
        assert r.status_code == 400

    def test_get_report_valid(self, admin_h):
        sid = _cache["siswa_id"]
        r = requests.get(f"{API}/reports/{sid}?semester=Ganjil 2026/2027",
                         headers=admin_h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["semester"] == "Ganjil 2026/2027"
        assert d["student"]["id"] == sid
        assert "assignments" in d and "quizzes" in d and "attendance" in d

    def test_get_report_invalid_semester(self, admin_h):
        sid = _cache["siswa_id"]
        r = requests.get(f"{API}/reports/{sid}?semester=XXX", headers=admin_h, timeout=20)
        assert r.status_code == 400

    def test_wali_note_persistence(self, guru_wali, admin_h):
        sid = _cache["siswa_id"]
        payload = {"semester": "Ganjil 2026/2027", "note": "TEST_Catatan wali"}
        r = requests.put(f"{API}/reports/{sid}/note", json=payload,
                         headers=guru_wali["h"], timeout=20)
        assert r.status_code == 200, r.text
        # reload via GET report
        g = requests.get(f"{API}/reports/{sid}?semester=Ganjil 2026/2027",
                         headers=admin_h, timeout=30)
        assert g.status_code == 200
        note = g.json().get("note") or {}
        assert note.get("note") == "TEST_Catatan wali"

    def test_wali_note_invalid_semester(self, guru_wali):
        sid = _cache["siswa_id"]
        r = requests.put(f"{API}/reports/{sid}/note",
                         json={"semester": "BAD", "note": "x"},
                         headers=guru_wali["h"], timeout=20)
        assert r.status_code == 400


# ------------------------------- GALLERY ------------------------------- #
class TestGallery:
    def test_gallery_create_edit(self, admin_h):
        # super_admin not in allowed list -> try kepsek creation via admin? use admin (super_admin not allowed)
        # Need kepsek. Promote a user quickly: create a kepsek
        tag = uuid.uuid4().hex[:6]
        email = f"test_kepsek_{tag}@example.com"
        r = requests.post(f"{API}/users", json={
            "email": email, "password": "Kepsek12345", "name": f"TEST_Kepsek_{tag}",
            "role": "kepsek"}, headers=admin_h, timeout=20)
        assert r.status_code == 200, r.text
        token = _login(email, "Kepsek12345")
        kh = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"title": "TEST_Galeri", "description": "desc",
                   "category": "Prestasi", "level": "Kabupaten", "date": "2026-01-01"}
        cr = requests.post(f"{API}/gallery", json=payload, headers=kh, timeout=20)
        assert cr.status_code == 200, cr.text
        gid = cr.json()["id"]
        up = requests.patch(f"{API}/gallery/{gid}", json={**payload, "title": "TEST_Edited"},
                            headers=kh, timeout=20)
        assert up.status_code == 200
        assert up.json()["title"] == "TEST_Edited"
        # 404
        bad = requests.patch(f"{API}/gallery/does-not-exist", json=payload, headers=kh, timeout=20)
        assert bad.status_code == 404
        # cleanup
        requests.delete(f"{API}/gallery/{gid}", headers=kh, timeout=20)


# ------------------------------- REGRESSION SMOKE ------------------------------- #
class TestRegressionSmoke:
    @pytest.mark.parametrize("path", [
        "/users", "/classes", "/announcements", "/candidates", "/election/status",
        "/schoolgram/feed", "/events", "/ppdb", "/gallery", "/feedback",
    ])
    def test_admin_get(self, admin_h, path):
        r = requests.get(f"{API}{path}", headers=admin_h, timeout=20)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:120]}"
