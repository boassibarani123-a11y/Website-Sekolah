"""Iter 23: attendance reminder/auto-alpha cron, confirm endpoint, WA phone validation."""
import os
import uuid
import requests
import pytest
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
CRON_SECRET = "laguboti-cron-secret-2026"
SUPER_EMAIL = "boassibarani123@gmail.com"
SUPER_PW = "Boas12345io"

WIB = timezone(timedelta(hours=7))
TODAY = datetime.now(WIB).date().isoformat()

CREATED_USER_IDS = []
CREATED_CLASS_IDS = []
TEST_STUDENT_IDS = []  # for cleanup of attendance/tokens/notifs


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PW})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def ah(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def test_class(ah):
    # Create class 'X Uji iter23'
    name = f"X Uji iter23 {uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/classes", headers=ah, json={"name": name, "subjects": []})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    CREATED_CLASS_IDS.append(cid)
    return {"id": cid, "name": name}


def _make_student_payload(suffix, phone="081234567890", email=None):
    return {
        "email": email or f"test_iter23_{suffix}_{uuid.uuid4().hex[:6]}@example.com",
        "password": "Testpass123",
        "name": f"TEST Siswa {suffix}",
        "role": "siswa",
        "nisn": f"TST{uuid.uuid4().hex[:8]}",
        "kelas": None,
        "phone": phone,
    }


# ---------------- WA Phone validation ----------------
class TestPhoneValidation:
    def test_siswa_no_phone_rejected(self, ah, test_class):
        body = _make_student_payload("nopo", phone="")
        body["kelas"] = test_class["name"]
        body.pop("phone")
        r = requests.post(f"{API}/users", headers=ah, json=body)
        assert r.status_code == 400
        assert "WhatsApp" in r.text or "wajib" in r.text.lower()

    def test_siswa_bad_phone_rejected(self, ah, test_class):
        body = _make_student_payload("bad", phone="abc")
        body["kelas"] = test_class["name"]
        r = requests.post(f"{API}/users", headers=ah, json=body)
        assert r.status_code == 400

    def test_siswa_valid_phone_ok(self, ah, test_class):
        body = _make_student_payload("ok", phone="081234567890")
        body["kelas"] = test_class["name"]
        r = requests.post(f"{API}/users", headers=ah, json=body)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["phone"] == "081234567890"
        assert data["role"] == "siswa"
        CREATED_USER_IDS.append(data["id"])

    def test_guru_without_phone_ok(self, ah):
        body = {
            "email": f"test_iter23_guru_{uuid.uuid4().hex[:6]}@example.com",
            "password": "Testpass123",
            "name": "TEST Guru iter23",
            "role": "guru",
        }
        r = requests.post(f"{API}/users", headers=ah, json=body)
        assert r.status_code == 200, r.text
        CREATED_USER_IDS.append(r.json()["id"])


# ---------------- Create test students for cron tests ----------------
@pytest.fixture(scope="module")
def test_students(ah, test_class):
    """Create 2 test students using delivered@resend.dev (actually unique by appending +tag)."""
    students = []
    for i in range(2):
        body = _make_student_payload(
            f"cron{i}",
            phone="081234567890",
            email=f"delivered+iter23_{uuid.uuid4().hex[:6]}@resend.dev",
        )
        body["kelas"] = test_class["name"]
        r = requests.post(f"{API}/users", headers=ah, json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        students.append(d)
        CREATED_USER_IDS.append(d["id"])
        TEST_STUDENT_IDS.append(d["id"])
    return students


# ---------------- Cron reminder ----------------
class TestCronReminder:
    def test_unauthorized(self):
        r = requests.post(f"{API}/cron/attendance-reminder", json={})
        assert r.status_code == 401

    def test_bad_bearer(self):
        r = requests.post(
            f"{API}/cron/attendance-reminder",
            headers={"Authorization": "Bearer wrong"},
            json={},
        )
        assert r.status_code == 401

    def test_reminder_ok(self, test_students):
        run_id = f"test-iter23-reminder-{uuid.uuid4()}"
        r = requests.post(
            f"{API}/cron/attendance-reminder",
            headers={"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": run_id},
            json={},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert not body.get("duplicate")

    def test_reminder_duplicate(self):
        run_id = f"test-iter23-reminder-dup-{uuid.uuid4()}"
        headers = {"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": run_id}
        r1 = requests.post(f"{API}/cron/attendance-reminder", headers=headers, json={})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/cron/attendance-reminder", headers=headers, json={})
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True


# ---------------- Confirm endpoint ----------------
# Access DB directly via Mongo client to fetch a token
@pytest.fixture(scope="module")
def mongo_db():
    from pymongo import MongoClient
    cli = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    return cli[os.environ.get("DB_NAME", "test_database")]


class TestConfirmEndpoint:
    def test_tokens_created_for_students(self, mongo_db, test_students):
        import time
        time.sleep(3)  # give background task time
        for s in test_students:
            doc = mongo_db.attendance_confirm_tokens.find_one(
                {"student_id": s["id"], "date": TODAY}
            )
            assert doc is not None, f"token missing for {s['email']}"
            assert doc["used"] is False

    def test_reminder_idempotent_token(self, mongo_db, test_students):
        """Running reminder again today should NOT create duplicate tokens for same student."""
        before = mongo_db.attendance_confirm_tokens.count_documents(
            {"student_id": test_students[0]["id"], "date": TODAY}
        )
        run_id = f"test-iter23-rem2-{uuid.uuid4()}"
        r = requests.post(
            f"{API}/cron/attendance-reminder",
            headers={"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": run_id},
            json={},
        )
        assert r.status_code == 200
        import time; time.sleep(2)
        after = mongo_db.attendance_confirm_tokens.count_documents(
            {"student_id": test_students[0]["id"], "date": TODAY}
        )
        assert before == after == 1

    def test_notification_contains_link(self, mongo_db, test_students):
        notif = mongo_db.notifications.find_one(
            {"user_id": test_students[0]["id"], "link": {"$regex": "/konfirmasi-absensi"}}
        )
        assert notif is not None

    def test_confirm_invalid_status(self, mongo_db, test_students):
        tok = mongo_db.attendance_confirm_tokens.find_one({"student_id": test_students[0]["id"], "date": TODAY})
        r = requests.get(
            f"{API}/attendance/confirm",
            params={"token": tok["token"], "status": "hadir"},
            allow_redirects=False,
        )
        assert r.status_code == 303
        assert "result=invalid" in r.headers["Location"]

    def test_confirm_invalid_token(self):
        r = requests.get(
            f"{API}/attendance/confirm",
            params={"token": "notarealtoken", "status": "sakit"},
            allow_redirects=False,
        )
        assert r.status_code == 303
        assert "result=invalid" in r.headers["Location"]

    def test_confirm_ok_sakit(self, mongo_db, test_students):
        s = test_students[0]
        tok = mongo_db.attendance_confirm_tokens.find_one({"student_id": s["id"], "date": TODAY})
        r = requests.get(
            f"{API}/attendance/confirm",
            params={"token": tok["token"], "status": "sakit"},
            allow_redirects=False,
        )
        assert r.status_code == 303
        loc = r.headers["Location"]
        assert "result=ok" in loc and "status=sakit" in loc
        # attendance recorded
        att = mongo_db.attendance.find_one({"student_id": s["id"], "date": TODAY})
        assert att is not None
        assert att["status"] == "sakit"
        assert att["method"] == "email"
        assert att["scanned_by"] == "Konfirmasi Siswa (Email)"
        # token used
        tok2 = mongo_db.attendance_confirm_tokens.find_one({"token": tok["token"]})
        assert tok2["used"] is True

    def test_confirm_used_second_time(self, mongo_db, test_students):
        s = test_students[0]
        tok = mongo_db.attendance_confirm_tokens.find_one({"student_id": s["id"], "date": TODAY})
        r = requests.get(
            f"{API}/attendance/confirm",
            params={"token": tok["token"], "status": "sakit"},
            allow_redirects=False,
        )
        assert r.status_code == 303
        assert "result=used" in r.headers["Location"]

    def test_confirm_already_when_attendance_exists(self, mongo_db, ah, test_students):
        """Student with existing attendance (hadir via scan) + click konfirmasi -> result=already, no change."""
        s = test_students[1]
        # Manually insert a hadir attendance (simulate scan). Use QR scan endpoint? Easier: insert directly.
        mongo_db.attendance.insert_one({
            "id": str(uuid.uuid4()),
            "student_id": s["id"], "student_name": s["name"],
            "kelas": s.get("kelas"), "date": TODAY, "status": "hadir",
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "scanned_by": "TEST", "photo": None, "method": "qr", "is_demo": False,
        })
        tok = mongo_db.attendance_confirm_tokens.find_one({"student_id": s["id"], "date": TODAY})
        r = requests.get(
            f"{API}/attendance/confirm",
            params={"token": tok["token"], "status": "izin"},
            allow_redirects=False,
        )
        assert r.status_code == 303
        assert "result=already" in r.headers["Location"]
        # ensure status NOT changed
        atts = list(mongo_db.attendance.find({"student_id": s["id"], "date": TODAY}))
        assert len(atts) == 1
        assert atts[0]["status"] == "hadir"


# ---------------- Auto-alpha ----------------
class TestAutoAlpha:
    def test_auto_alpha_marks_only_pending(self, ah, test_class, mongo_db, test_students):
        # create a 3rd student with no attendance, no confirmation
        body = _make_student_payload("pending", phone="081234567890",
                                     email=f"delivered+alpha_{uuid.uuid4().hex[:6]}@resend.dev")
        body["kelas"] = test_class["name"]
        r = requests.post(f"{API}/users", headers=ah, json=body)
        assert r.status_code == 200
        pending = r.json()
        CREATED_USER_IDS.append(pending["id"])
        TEST_STUDENT_IDS.append(pending["id"])

        run_id = f"test-iter23-alpha-{uuid.uuid4()}"
        r = requests.post(
            f"{API}/cron/attendance-auto-alpha",
            headers={"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": run_id},
            json={},
        )
        assert r.status_code == 200
        import time; time.sleep(3)

        # pending student should now have alpa
        att = mongo_db.attendance.find_one({"student_id": pending["id"], "date": TODAY})
        assert att is not None, "auto-alpha did not mark pending student"
        assert att["status"] == "alpa"
        assert att["method"] == "sistem"
        assert "Auto-Alpa" in att["scanned_by"]

        # student 0 (sakit via email) stays sakit
        att0 = list(mongo_db.attendance.find({"student_id": test_students[0]["id"], "date": TODAY}))
        assert len(att0) == 1
        assert att0[0]["status"] == "sakit"

        # student 1 (hadir) stays hadir, only 1 record
        att1 = list(mongo_db.attendance.find({"student_id": test_students[1]["id"], "date": TODAY}))
        assert len(att1) == 1
        assert att1[0]["status"] == "hadir"


# ---------------- Cleanup ----------------
def test_zz_cleanup(ah, mongo_db):
    """Delete created test data to leave DB clean."""
    for uid in CREATED_USER_IDS:
        requests.delete(f"{API}/users/{uid}", headers=ah)
    for cid in CREATED_CLASS_IDS:
        requests.delete(f"{API}/classes/{cid}", headers=ah)
    if TEST_STUDENT_IDS:
        mongo_db.attendance.delete_many({"student_id": {"$in": TEST_STUDENT_IDS}})
        mongo_db.attendance_confirm_tokens.delete_many({"student_id": {"$in": TEST_STUDENT_IDS}})
        mongo_db.notifications.delete_many({"user_id": {"$in": TEST_STUDENT_IDS}})
    mongo_db.cron_runs.delete_many({"run_id": {"$regex": "^test-iter23"}})
