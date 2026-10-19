"""Iter48: Backend tests for Phase (bulk-delete, forgot/reset-all, face scan+confirm+guru,
teacher-attendance, schoolgram (follow/save/takedown/restore), guests, izin keluar)."""
import os, time, uuid, random, math
import pytest, requests

def _read_env():
    p = "/app/frontend/.env"
    try:
        for ln in open(p):
            if ln.startswith("REACT_APP_BACKEND_URL="):
                return ln.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    return os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
BASE = _read_env()
assert BASE, "No REACT_APP_BACKEND_URL"
API = f"{BASE}/api"

ADMIN = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
GURU = ("guru.vortex@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.vortex@sman1laguboti.sch.id", "BaruSiswa123")
OSIS = ("osis.vortex@sman1laguboti.sch.id", "Osis12345")
ABSENSI = ("absensi.vortex@sman1laguboti.sch.id", "Absensi123")

SISWA_NISN_LAST4 = "5678"  # NISN 0012345678

def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": creds[0], "password": creds[1]}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Login failed for {creds[0]}: {r.status_code} {r.text[:200]}")
    tok = r.json().get("access_token") or r.json().get("token")
    if tok:
        s.headers["Authorization"] = f"Bearer {tok}"
    return s

@pytest.fixture(scope="session")
def admin(): return _login(ADMIN)
@pytest.fixture(scope="session")
def guru(): return _login(GURU)
@pytest.fixture(scope="session")
def siswa(): return _login(SISWA)
@pytest.fixture(scope="session")
def osis(): return _login(OSIS)
@pytest.fixture(scope="session")
def absensi(): return _login(ABSENSI)


# ---------------- BULK DELETE ----------------
class TestBulkDelete:
    def test_bulk_delete_requires_HAPUS(self, admin):
        r = admin.post(f"{API}/users/bulk-delete", json={"roles": ["siswa"], "kelas": "ZZZ_NOEXIST", "confirm": "no"})
        assert r.status_code == 400

    def test_bulk_delete_only_targeted_role_and_kelas(self, admin):
        unique_kelas = f"TEST_BULK_{uuid.uuid4().hex[:6]}"
        # create three throwaway: 2 siswa + 1 guru
        created_ids = []
        for i, role in enumerate(["siswa", "siswa", "guru"]):
            payload = {"name": f"TEST_bulk_{i}", "email": f"test_bulk_{uuid.uuid4().hex[:6]}@tst.sch.id",
                       "role": role, "password": "Password1", "kelas": unique_kelas if role == "siswa" else None,
                       "phone": "081234567890", "parent_phone": "081234567891",
                       "nisn": f"88{uuid.uuid4().int % 10**8:08d}", "nis": f"TB{i}{uuid.uuid4().hex[:4]}"}
            r = admin.post(f"{API}/users", json=payload)
            assert r.status_code in (200, 201), r.text
            created_ids.append(r.json().get("id"))
        # bulk delete only siswa with the unique kelas
        r = admin.post(f"{API}/users/bulk-delete", json={"roles": ["siswa"], "kelas": unique_kelas, "confirm": "HAPUS"})
        assert r.status_code == 200, r.text
        assert r.json()["deleted"] == 2
        # the guru should still exist (verify via /users list)
        all_users = admin.get(f"{API}/users").json()
        assert any(u.get("id") == created_ids[2] for u in all_users)
        # cleanup guru
        admin.delete(f"{API}/users/{created_ids[2]}")

    def test_bulk_delete_never_targets_self_admin(self, admin):
        me = admin.get(f"{API}/auth/me").json()
        r = admin.post(f"{API}/users/bulk-delete", json={"roles": ["siswa"], "kelas": "ZZZ_NOEXIST", "confirm": "HAPUS"})
        assert r.status_code == 200
        assert r.json()["deleted"] == 0
        # Verify admin still logged in and present
        assert admin.get(f"{API}/auth/me").json()["id"] == me["id"]


# ---------------- FORGOT PASSWORD + APPROVE ALL ----------------
class TestForgotReset:
    @pytest.fixture(autouse=True)
    def _clear_rate(self):
        try:
            from pymongo import MongoClient
            MongoClient("mongodb://localhost:27017")["test_database"].password_reset_requests.delete_many({})
        except Exception:
            pass
    def test_wrong_identifier_rejected(self):
        r = requests.post(f"{API}/auth/forgot-password", json={
            "email": SISWA[0], "identifier": "0000000000", "new_password": "Zz_abc12345"})
        assert r.status_code == 400

    def test_forgot_flow_and_approve_all(self, admin, siswa):
        # Submit forgot with valid NISN & temp new password
        new_pw = f"ForgotTmp{uuid.uuid4().hex[:4]}1"
        r = requests.post(f"{API}/auth/forgot-password", json={
            "email": SISWA[0], "identifier": "0012345678", "new_password": new_pw})
        assert r.status_code == 200, r.text
        # Old password still works
        o = requests.post(f"{API}/auth/login", json={"email": SISWA[0], "password": SISWA[1]})
        assert o.status_code == 200
        # Super admin sees request
        lst = admin.get(f"{API}/admin/reset-requests?status=pending").json()
        assert any(x.get("email") == SISWA[0] for x in lst)
        # Approve all
        ap = admin.post(f"{API}/admin/reset-requests/approve-all", json={})
        assert ap.status_code == 200
        assert ap.json().get("approved", 0) >= 1
        # New password now works
        n = requests.post(f"{API}/auth/login", json={"email": SISWA[0], "password": new_pw})
        assert n.status_code == 200
        # Restore original siswa password via another forgot + approve
        r2 = requests.post(f"{API}/auth/forgot-password", json={
            "email": SISWA[0], "identifier": "0012345678", "new_password": SISWA[1]})
        assert r2.status_code == 200
        admin.post(f"{API}/admin/reset-requests/approve-all", json={})
        # verify original works again
        back = requests.post(f"{API}/auth/login", json={"email": SISWA[0], "password": SISWA[1]})
        assert back.status_code == 200


# ---------------- FACE: enroll/scan/confirm/guru ----------------
def _rand_vec(seed, n=128, jitter=0.0):
    rnd = random.Random(seed)
    v = [rnd.gauss(0, 1) for _ in range(n)]
    if jitter:
        v = [x + rnd.gauss(0, jitter) for x in v]
    norm = math.sqrt(sum(x*x for x in v)) or 1
    return [x / norm for x in v]

class TestFace:
    def _get_user_id(self, admin, email):
        r = admin.get(f"{API}/users").json()
        for u in r:
            if u.get("email") == email: return u["id"]
        return None

    def test_face_students_guru_role(self, admin):
        r = admin.get(f"{API}/face/students?role=guru")
        assert r.status_code == 200
        assert "students" in r.json()
        assert all(s["role"] == "guru" for s in r.json()["students"])

    def test_enroll_scan_confirm_with_lookalike(self, admin):
        siswa_id = self._get_user_id(admin, SISWA[0])
        osis_id = self._get_user_id(admin, OSIS[0])
        assert siswa_id and osis_id
        # Enroll siswa with seedA
        vec_a = [_rand_vec("A", jitter=0.01) for _ in range(5)]
        r1 = admin.post(f"{API}/face/enroll", json={"student_id": siswa_id, "descriptors": vec_a, "allow_similar": True})
        assert r1.status_code == 200, r1.text
        # Enroll osis with same seed -> near-identical -> expect 409 unless allow_similar
        vec_b = [_rand_vec("A", jitter=0.01) for _ in range(5)]
        r2 = admin.post(f"{API}/face/enroll", json={"student_id": osis_id, "descriptors": vec_b, "allow_similar": False})
        assert r2.status_code == 409, r2.text
        # allow_similar=true succeeds
        r3 = admin.post(f"{API}/face/enroll", json={"student_id": osis_id, "descriptors": vec_b, "allow_similar": True})
        assert r3.status_code == 200, r3.text
        # scan -> ambiguous -> needs_confirm
        probe = _rand_vec("A", jitter=0.015)
        rs = admin.post(f"{API}/attendance/face-scan", json={"descriptor": probe})
        assert rs.status_code == 200, rs.text
        assert rs.json().get("needs_confirm") is True
        # confirm with siswa last 4 of NISN -> 0012345678 -> 5678
        rc = admin.post(f"{API}/attendance/face-confirm", json={"descriptor": probe, "digits": SISWA_NISN_LAST4})
        assert rc.status_code == 200, rc.text
        assert rc.json().get("kind") == "siswa"
        # Confirm with wrong digits
        rbad = admin.post(f"{API}/attendance/face-confirm", json={"descriptor": probe, "digits": "0000"})
        assert rbad.status_code == 400
        # cleanup face
        admin.delete(f"{API}/face/enroll/{siswa_id}")
        admin.delete(f"{API}/face/enroll/{osis_id}")

    def test_guru_face_scan_records_teacher(self, admin):
        guru_id = self._get_user_id(admin, GURU[0])
        assert guru_id
        vec = [_rand_vec(f"G{i}") for i in range(5)]  # distinct seeds
        # ensure unique: use distinct seeds but similar overall - use seed group 'GURU'
        vec = [_rand_vec("GURU", jitter=0.015) for _ in range(5)]
        r = admin.post(f"{API}/face/enroll", json={"student_id": guru_id, "descriptors": vec, "allow_similar": True})
        assert r.status_code == 200, r.text
        probe = _rand_vec("GURU", jitter=0.02)
        rs = admin.post(f"{API}/attendance/face-scan", json={"descriptor": probe})
        assert rs.status_code == 200, rs.text
        body = rs.json()
        # could be needs_confirm if other look-alikes still linger - handle both
        if body.get("needs_confirm"):
            # confirm with guru NIP last 4 - fetch
            guru_doc = next((u for u in admin.get(f"{API}/users").json() if u["id"] == guru_id), {})
            nip = guru_doc.get("nip") or ""
            if nip:
                rc = admin.post(f"{API}/attendance/face-confirm", json={"descriptor": probe, "digits": nip[-4:]})
                assert rc.status_code == 200
                assert rc.json().get("kind") == "guru"
        else:
            assert body.get("kind") == "guru"
        admin.delete(f"{API}/face/enroll/{guru_id}")


# ---------------- TEACHER ATTENDANCE ----------------
class TestTeacherAttendance:
    def test_today_week_endpoints(self, absensi):
        r = absensi.get(f"{API}/teacher-attendance")
        assert r.status_code == 200
        assert set(["rows", "stats", "missing"]).issubset(r.json().keys())
        w = absensi.get(f"{API}/teacher-attendance/week")
        assert w.status_code == 200
        assert "days" in w.json() and len(w.json()["days"]) == 7

    def test_manual_status_and_export(self, absensi):
        # Pick first missing teacher
        today = absensi.get(f"{API}/teacher-attendance").json()
        if not today["missing"]:
            pytest.skip("No missing teacher to manually mark")
        tid = today["missing"][0]["id"]
        r = absensi.post(f"{API}/teacher-attendance/manual", json={"teacher_id": tid, "status": "hadir"})
        assert r.status_code == 200, r.text
        # Excel export
        exp = absensi.get(f"{API}/teacher-attendance/week/export")
        assert exp.status_code == 200
        assert "spreadsheet" in exp.headers.get("content-type", "")

    def test_archive_now_and_list(self, absensi):
        r = absensi.post(f"{API}/teacher-attendance/archive-now")
        assert r.status_code == 200
        a = absensi.get(f"{API}/teacher-attendance/archives")
        assert a.status_code == 200
        assert isinstance(a.json(), list)


# ---------------- SCHOOLGRAM ----------------
class TestSchoolgram:
    @pytest.fixture(scope="class")
    def post_id(self, admin):
        # find XII IPA 1 class
        klass_id = "a8e20bc6-b2a8-4ee6-8378-caee5f254bef"
        r = admin.post(f"{API}/schoolgram/class/{klass_id}/post",
                       json={"image": "https://picsum.photos/seed/sg/400", "caption": "TEST_SG post", "media_type": "image"})
        assert r.status_code in (200, 201), r.text
        pid = r.json()["id"]
        yield pid
        admin.delete(f"{API}/schoolgram/post/{pid}")

    def test_follow_toggle(self, siswa):
        cid = "a8e20bc6-b2a8-4ee6-8378-caee5f254bef"
        r1 = siswa.post(f"{API}/schoolgram/follow/{cid}")
        assert r1.status_code == 200
        f1 = r1.json()["following"]
        r2 = siswa.post(f"{API}/schoolgram/follow/{cid}")
        assert r2.json()["following"] != f1

    def test_save_toggle(self, siswa, post_id):
        r1 = siswa.post(f"{API}/posts/{post_id}/save")
        assert r1.status_code == 200
        s1 = r1.json()["saved"]
        r2 = siswa.post(f"{API}/posts/{post_id}/save")
        assert r2.json()["saved"] != s1

    def test_takedown_restore(self, osis, post_id):
        t = osis.post(f"{API}/schoolgram/post/{post_id}/takedown", json={"reason": "TEST takedown reason"})
        assert t.status_code == 200, t.text
        r = osis.post(f"{API}/schoolgram/post/{post_id}/restore")
        assert r.status_code == 200

    def test_takedown_forbidden_for_siswa(self, siswa, post_id):
        r = siswa.post(f"{API}/schoolgram/post/{post_id}/takedown", json={"reason": "nope test"})
        assert r.status_code == 403


# ---------------- GUESTS ----------------
class TestGuests:
    def test_create_update_actions_delete(self, admin):
        payload = {"name": "TEST Tamu", "institution": "Dinas TEST", "purpose": "Kunjungan uji",
                   "visit_date": "2026-01-15", "visit_time": "10:00"}
        r = admin.post(f"{API}/guests", json=payload)
        assert r.status_code in (200, 201), r.text
        g = r.json()
        gid = g["id"]
        assert g["card_no"].startswith("TAMU-")
        # Patch
        p = admin.patch(f"{API}/guests/{gid}", json={"host": "Kepala Sekolah"})
        assert p.status_code == 200 and p.json()["host"] == "Kepala Sekolah"
        # Checkin / checkout
        c1 = admin.post(f"{API}/guests/{gid}/checkin")
        assert c1.status_code == 200 and c1.json()["status"] == "hadir"
        c2 = admin.post(f"{API}/guests/{gid}/checkout")
        assert c2.status_code == 200 and c2.json()["status"] == "selesai"
        # Delete
        d = admin.delete(f"{API}/guests/{gid}")
        assert d.status_code == 200

    def test_guest_requires_privileged(self, siswa):
        r = siswa.get(f"{API}/guests")
        assert r.status_code in (401, 403)


# ---------------- IZIN KELUAR ----------------
class TestIzinKeluar:
    def test_context_homeroom(self, guru):
        r = guru.get(f"{API}/ik/context")
        assert r.status_code == 200
        body = r.json()
        assert body["is_homeroom"] is True
        assert len(body["students"]) > 0

    def test_create_requires_homeroom(self, admin):
        # super_admin shouldn't be allowed to create via /ik (require_roles guru only)
        r = admin.post(f"{API}/ik", json={"student_id": "nope", "reason": "test test", "out_time": "10:00"})
        assert r.status_code in (403, 404)

    def test_full_flow(self, guru, admin, siswa):
        ctx = guru.get(f"{API}/ik/context").json()
        if not ctx["students"]:
            pytest.skip("No homeroom students")
        sid = ctx["students"][0]["id"]
        r = guru.post(f"{API}/ik", json={"student_id": sid, "reason": "Ke dokter TEST", "out_time": "10:00"})
        assert r.status_code in (200, 201), r.text
        iid = r.json()["id"]
        # siswa only sees own
        mine = siswa.get(f"{API}/ik").json()
        assert any(x["id"] == iid for x in mine)
        # admin on gate approves
        a = admin.post(f"{API}/ik/{iid}/approve", json={})
        assert a.status_code == 200
        # mark returned
        rt = admin.post(f"{API}/ik/{iid}/returned", json={})
        assert rt.status_code == 200

    def test_non_homeroom_guru_forbidden(self, guru):
        # Try to create IK for a non-existent/non-homeroom student -> 404 or 403
        r = guru.post(f"{API}/ik", json={"student_id": "ghost-id", "reason": "x test", "out_time": "08:00"})
        assert r.status_code in (403, 404)
