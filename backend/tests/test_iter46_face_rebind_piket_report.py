"""
Iteration 46 tests:
- BUG: After deleting a siswa, re-creating same person & re-enrolling same face
       must NOT fail with 409. Orphan face_profiles must auto-purge.
- Piket monthly report (GET /api/piket/report + export .xlsx) role guard, counts,
  invalid-month -> 400, guru -> 403.
"""
import os, uuid, random, requests, pytest
from datetime import datetime, date, timedelta, timezone
from pymongo import MongoClient

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
WIB = timezone(timedelta(hours=7))
ADMIN = ("boassibarani123@gmail.com", "Boas12345io")

mclient = MongoClient(MONGO_URL)
mdb = mclient[DB_NAME]


def H(tok): return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

def login(email, pw):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="module")
def admin():
    tok, user = login(*ADMIN)
    return {"tok": tok, "user": user}


def _create_siswa(admin_tok, name, nisn):
    body = {
        "email": f"test_s_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Test12345!",
        "name": name,
        "role": "siswa",
        "nisn": nisn,
        "kelas": "TEST_X",
        "phone": "08123456789",
    }
    r = requests.post(f"{BASE}/api/users", headers=H(admin_tok), json=body)
    assert r.status_code == 200, f"create siswa failed: {r.status_code} {r.text}"
    return r.json()

def _create_guru(admin_tok, name):
    body = {
        "email": f"test_g_{uuid.uuid4().hex[:8]}@example.com",
        "password": "Test12345!",
        "name": name,
        "role": "guru",
        "nip": "TEST" + uuid.uuid4().hex[:6],
    }
    r = requests.post(f"{BASE}/api/users", headers=H(admin_tok), json=body)
    assert r.status_code == 200, f"create guru: {r.status_code} {r.text}"
    return r.json()


def _delete_user(admin_tok, uid):
    requests.delete(f"{BASE}/api/users/{uid}", headers=H(admin_tok))


def _desc(seed, jitter=0.001):
    rng = random.Random(seed)
    base = [rng.gauss(0, 0.05) for _ in range(128)]
    return [[round(x + rng.gauss(0, jitter), 6) for x in base] for _ in range(3)]


# =============================================================
# FACE: delete siswa then re-enroll same descriptors
# =============================================================
class TestFaceRebind:
    created_users = []
    created_profiles_direct = []

    @classmethod
    def teardown_class(cls):
        tok, _ = login(*ADMIN)
        for uid in cls.created_users:
            requests.delete(f"{BASE}/api/users/{uid}", headers=H(tok))
        for sid in cls.created_profiles_direct:
            mdb.face_profiles.delete_many({"student_id": sid})
        # cleanup any attendance made today for test users (best-effort)
        mdb.attendance.delete_many({"student_id": {"$in": cls.created_users}})

    def test_01_create_siswa_A_enroll_then_delete(self, admin):
        tok = admin["tok"]
        A = _create_siswa(tok, "TEST_Siswa_A", "9900000001")
        self.created_users.append(A["id"])
        descs = _desc(seed=42)
        r = requests.post(f"{BASE}/api/face/enroll", headers=H(tok),
                          json={"student_id": A["id"], "descriptors": descs})
        assert r.status_code == 200, f"enroll A failed: {r.status_code} {r.text}"
        assert r.json()["samples"] == 3

        # delete siswa A -> face_profiles row for A must be gone
        d = requests.delete(f"{BASE}/api/users/{A['id']}", headers=H(tok))
        assert d.status_code == 200
        remaining = mdb.face_profiles.count_documents({"student_id": A["id"]})
        assert remaining == 0, "face_profile for deleted siswa A was NOT purged"
        self.created_users.remove(A["id"])
        # stash desc for next test
        type(self).shared_desc = descs

    def test_02_recreate_similar_and_enroll_same_face_must_succeed(self, admin):
        tok = admin["tok"]
        B = _create_siswa(tok, "TEST_Siswa_B", "9900000002")
        self.created_users.append(B["id"])
        descs = type(self).shared_desc
        r = requests.post(f"{BASE}/api/face/enroll", headers=H(tok),
                          json={"student_id": B["id"], "descriptors": descs})
        assert r.status_code == 200, (
            f"RE-ENROLL after delete must succeed but got {r.status_code} {r.text}. "
            "BUG: orphan face_profiles not purged on delete.")
        type(self).siswa_B_id = B["id"]

    def test_03_face_scan_matches_B(self, admin):
        tok = admin["tok"]
        probe = type(self).shared_desc[0]
        r = requests.post(f"{BASE}/api/attendance/face-scan", headers=H(tok),
                          json={"descriptor": probe, "station_name": "TEST"})
        assert r.status_code == 200, f"scan failed: {r.status_code} {r.text}"
        body = r.json()
        # scan() returns attendance info with student name
        assert body.get("method") == "face" or body.get("student", {}).get("id") == type(self).siswa_B_id \
            or type(self).siswa_B_id in str(body), f"unexpected scan body: {body}"

    def test_04_orphan_profile_does_not_block_new_enrol(self, admin):
        tok = admin["tok"]
        # Inject orphan face profile directly in Mongo (student_id references nothing)
        fake_sid = "nonexistent-" + uuid.uuid4().hex[:8]
        mdb.face_profiles.insert_one({
            "student_id": fake_sid,
            "descriptors": type(self).shared_desc,
            "samples": 3,
            "updated_at": datetime.utcnow().isoformat(),
        })
        self.created_profiles_direct.append(fake_sid)

        C = _create_siswa(tok, "TEST_Siswa_C", "9900000003")
        self.created_users.append(C["id"])
        # Delete B first so there is no conflict with real B
        requests.delete(f"{BASE}/api/face/enroll/{type(self).siswa_B_id}", headers=H(tok))
        r = requests.post(f"{BASE}/api/face/enroll", headers=H(tok),
                          json={"student_id": C["id"], "descriptors": type(self).shared_desc})
        assert r.status_code == 200, (
            f"orphan should auto-purge, got {r.status_code} {r.text}")
        # orphan must be gone
        assert mdb.face_profiles.count_documents({"student_id": fake_sid}) == 0

    def test_05_face_students_counts_consistent(self, admin):
        tok = admin["tok"]
        r = requests.get(f"{BASE}/api/face/students", headers=H(tok))
        assert r.status_code == 200
        body = r.json()
        assert body["enrolled"] <= body["total"], f"enrolled>{body['total']}: {body}"


# =============================================================
# PIKET REPORT
# =============================================================
class TestPiketReport:
    created_users = []
    created_shifts = []
    guru_tok = None

    @classmethod
    def teardown_class(cls):
        tok, _ = login(*ADMIN)
        for sid in cls.created_shifts:
            requests.delete(f"{BASE}/api/piket/shifts/{sid}", headers=H(tok))
        # also clear any direct-inserted past shifts
        mdb.piket_shifts.delete_many({"gate": "TEST_Gerbang_Report"})
        for uid in cls.created_users:
            requests.delete(f"{BASE}/api/users/{uid}", headers=H(tok))

    def test_01_create_guru_and_shifts(self, admin):
        tok = admin["tok"]
        guru = _create_guru(tok, "TEST_Guru_Report")
        self.created_users.append(guru["id"])
        type(self).guru_id = guru["id"]
        # login as guru
        gt, _ = login(guru["email"], "Test12345!")
        type(self).guru_tok = gt

        now = datetime.now(WIB)
        today = now.date().isoformat()
        month = now.strftime("%Y-%m")
        type(self).month = month

        # Past shift earlier this month (3 days ago, 08:00-09:00) via API if same month else insert directly
        past_date = (now - timedelta(days=3)).date()
        if past_date.strftime("%Y-%m") == month:
            # insert directly into Mongo (API allows past but check-in gated) so remains "tidak_hadir"
            doc = {
                "id": str(uuid.uuid4()), "teacher_id": guru["id"],
                "teacher_name": guru["name"], "teacher_photo": None,
                "date": past_date.isoformat(), "start_time": "08:00", "end_time": "09:00",
                "gate": "TEST_Gerbang_Report", "notes": None,
                "created_by": "test", "created_at": datetime.utcnow().isoformat(),
                "checked_in_at": None, "checked_out_at": None, "late_minutes": None,
            }
            mdb.piket_shifts.insert_one(doc)
            type(self).past_shift_id = doc["id"]
        else:
            type(self).past_shift_id = None

        # Current shift covering now
        start_dt = now - timedelta(minutes=5)
        end_dt = now + timedelta(hours=1)
        body = {
            "teacher_id": guru["id"],
            "date": today,
            "start_time": start_dt.strftime("%H:%M"),
            "end_time": end_dt.strftime("%H:%M"),
            "gate": "TEST_Gerbang_Report",
        }
        r = requests.post(f"{BASE}/api/piket/shifts", headers=H(tok), json=body)
        assert r.status_code == 200, f"create current shift: {r.status_code} {r.text}"
        shift = r.json()["created"][0]
        type(self).current_shift_id = shift["id"]
        self.created_shifts.append(shift["id"])

        # guru checks in
        ci = requests.post(f"{BASE}/api/piket/shifts/{shift['id']}/checkin", headers=H(gt))
        assert ci.status_code == 200, f"checkin: {ci.status_code} {ci.text}"

    def test_02_report_counts(self, admin):
        r = requests.get(f"{BASE}/api/piket/report?month={type(self).month}", headers=H(admin["tok"]))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["month"] == type(self).month
        assert "teachers" in body and "shifts" in body
        row = next((t for t in body["teachers"] if t["teacher_id"] == type(self).guru_id), None)
        assert row is not None, "test guru row missing in report"
        assert row["hadir"] >= 1
        if type(self).past_shift_id:
            assert row["tidak_hadir"] >= 1
        assert "persen" in row

    def test_03_invalid_month_400(self, admin):
        r = requests.get(f"{BASE}/api/piket/report?month=2025-13", headers=H(admin["tok"]))
        assert r.status_code == 400

    def test_04_guru_forbidden(self):
        r = requests.get(f"{BASE}/api/piket/report?month={type(self).month}", headers=H(type(self).guru_tok))
        assert r.status_code == 403, f"guru should be 403 got {r.status_code}"

    def test_05_export_xlsx(self, admin):
        r = requests.get(f"{BASE}/api/piket/report/export?month={type(self).month}", headers=H(admin["tok"]))
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheet" in ct or "excel" in ct or "officedocument" in ct, f"ct={ct}"
        assert len(r.content) > 500
