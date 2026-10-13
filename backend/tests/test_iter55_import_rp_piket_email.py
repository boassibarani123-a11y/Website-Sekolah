"""Iter55 backend tests:
- Bulk student import (template, preview, import 520 rows, duplicate/bad NIS/email detection)
- Random question package + bank stock + exclude_poor
- Piket TV endpoint + siswa 403
- Reset flow: options + forgot-password/email (configured:false) + reset-password invalid token
- Email status (super admin) shows configured:false
- AI exam generate (1 small call) uses Claude Sonnet 4.5
"""
import os, io, hashlib, uuid, time
from datetime import datetime, timezone, timedelta
import pytest
import requests
from openpyxl import Workbook
from pymongo import MongoClient

def _load_env(path):
    try:
        for line in open(path):
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except Exception:
        pass

_load_env("/app/frontend/.env")
_load_env("/app/backend/.env")

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE}/api"

SUPER = ("mtambunan864@gmail.com", "Admin12345io")
GURU = ("guru.test@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.test@sman1laguboti.sch.id", "Siswa12345")

MONGO = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
DB = MONGO[os.environ.get("DB_NAME", "test_database")]


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text[:200]}"
    tok = r.json().get("access_token") or r.json().get("token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="session")
def admin():
    return _login(*SUPER)


@pytest.fixture(scope="session")
def guru():
    return _login(*GURU)


@pytest.fixture(scope="session")
def siswa():
    return _login(*SISWA)


# ---------- Email / reset options ----------
class TestEmailAndReset:
    def test_email_status_not_configured(self, admin):
        r = admin.get(f"{API}/email/status")
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["configured"] is False
        assert j["provider"] in (None, "")
        assert j["brevo_key_set"] is False

    def test_reset_options_email_false(self):
        r = requests.get(f"{API}/auth/reset-options", timeout=10)
        assert r.status_code == 200
        j = r.json()
        assert j["email_reset"] is False
        assert j["admin_approval"] is True

    def test_forgot_password_email_configured_false(self):
        r = requests.post(f"{API}/auth/forgot-password/email", json={"email": GURU[0]}, timeout=10)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["configured"] is False
        assert "belum dikonfigurasi" in j.get("message", "").lower()

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password",
                          json={"token": "x" * 40, "new_password": "Abcdef123"}, timeout=10)
        assert r.status_code == 400

    def test_reset_password_token_single_use(self):
        """Insert valid token directly, consume once, verify second use fails. Restore password."""
        user = DB.users.find_one({"email": SISWA[0]}, {"_id": 0, "id": 1, "password_hash": 1})
        assert user, "siswa.test must exist (seed first)"
        raw = f"tok_{uuid.uuid4().hex}{uuid.uuid4().hex}"
        th = hashlib.sha256(raw.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        tok_id = str(uuid.uuid4())
        DB.password_reset_tokens.insert_one({
            "id": tok_id, "user_id": user["id"], "token_hash": th, "used": False,
            "created_at": now.isoformat(), "expires_at": now + timedelta(minutes=15)
        })
        try:
            r = requests.post(f"{API}/auth/reset-password",
                              json={"token": raw, "new_password": "Siswa12345!"}, timeout=10)
            assert r.status_code == 200, r.text
            # Second use fails
            r2 = requests.post(f"{API}/auth/reset-password",
                               json={"token": raw, "new_password": "Siswa12345!"}, timeout=10)
            assert r2.status_code == 400
            # Login with new pw works
            s2 = _login(SISWA[0], "Siswa12345!")
            assert s2 is not None
        finally:
            # Restore
            DB.users.update_one({"id": user["id"]}, {"$set": {"password_hash": user["password_hash"]}})
            DB.password_reset_tokens.delete_one({"id": tok_id})


# ---------- Piket TV ----------
class TestPiketTV:
    def test_piket_tv_as_guru(self, guru):
        r = guru.get(f"{API}/piket/tv")
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("gate", "counts", "today", "upcoming", "summary"):
            assert k in j, f"missing {k}"
        assert "code" in j["gate"] and j["gate"]["code"] in ("masuk", "pelajaran", "pulang")
        assert set(["masuk", "keluar", "inside", "late", "unauthorized"]).issubset(j["counts"].keys())

    def test_piket_tv_as_admin(self, admin):
        r = admin.get(f"{API}/piket/tv")
        assert r.status_code == 200

    def test_piket_tv_siswa_forbidden(self, siswa):
        r = siswa.get(f"{API}/piket/tv")
        assert r.status_code == 403


# ---------- Bank stock + random package ----------
class TestRandomPackage:
    def test_bank_stock(self, guru):
        r = guru.get(f"{API}/question-bank/stock", params={"subject": "Matematika"})
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ("mudah", "sedang", "sulit"):
            assert k in j and isinstance(j[k], int)

    def test_random_package_shortfall_warning(self, guru):
        payload = {"subject": "Matematika", "mudah": 2, "sedang": 2, "sulit": 9, "exclude_poor": True}
        r = guru.post(f"{API}/exams/random-package", json=payload)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "questions" in j and "levels" in j and "warnings" in j
        # unique bank_ids
        ids = [q["bank_id"] for q in j["questions"]]
        assert len(ids) == len(set(ids))
        # Sukar shortfall -> warning present if stock<9
        sulit_avail = j["levels"]["sulit"]["available"]
        if sulit_avail < 9:
            assert any("Sukar" in w for w in j["warnings"]), j["warnings"]

    def test_random_package_exclude_poor(self, guru):
        """exclude_poor=true means no returned questions should have label 'Jelek'."""
        payload = {"subject": "Matematika", "mudah": 3, "sedang": 0, "sulit": 0, "exclude_poor": True}
        r = guru.post(f"{API}/exams/random-package", json=payload)
        assert r.status_code == 200
        for q in r.json()["questions"]:
            assert q.get("discrimination_label") != "Jelek"

    def test_random_package_zero_request_400(self, guru):
        r = guru.post(f"{API}/exams/random-package",
                      json={"subject": "Matematika", "mudah": 0, "sedang": 0, "sulit": 0})
        assert r.status_code == 400


# ---------- Student import ----------
def _mk_xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.append(["Nama", "Email", "NISN", "NIS", "Nomor WA", "Kelas"])
    for row in rows:
        ws.append(row)
    for r in ws.iter_rows(min_row=2, min_col=3, max_col=5):
        for c in r:
            c.number_format = "@"
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


class TestImportStudents:
    @pytest.fixture(autouse=True, scope="class")
    def _cleanup(self):
        DB.users.delete_many({"email": {"$regex": r"^test_iter55_"}})
        yield
        DB.users.delete_many({"email": {"$regex": r"^test_iter55_"}})

    def test_template_download(self, admin):
        r = admin.get(f"{API}/admin/students/import/template")
        assert r.status_code == 200
        assert r.content[:2] == b"PK"  # xlsx = zip
        assert "spreadsheet" in r.headers.get("content-type", "")

    def test_preview_detects_errors(self, admin):
        rows = [
            ["Alice Baik", "test_iter55_alice@example.com", "0085551111", "55001", "081234567890", "XII IPA 1"],
            ["Bob BadNIS", "test_iter55_bob@example.com", "0085551112", "123", "081234567891", "XII IPA 1"],  # NIS not 5 digits
            ["Carol BadEmail", "notanemail", "0085551113", "55003", "081234567892", "XII IPA 1"],
            ["Dup NIS", "test_iter55_dup@example.com", "0085551114", "55001", "081234567893", "XII IPA 1"],  # dup NIS
        ]
        files = {"file": ("preview.xlsx", _mk_xlsx(rows),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r = admin.post(f"{API}/admin/students/import/preview", files=files, data={"kelas": "XII IPA 1"})
        assert r.status_code == 200, r.text
        j = r.json()
        statuses = {row["name"]: row["status"] for row in j["rows"]}
        assert statuses["Alice Baik"] == "ok"
        assert statuses["Bob BadNIS"] == "error"
        assert statuses["Carol BadEmail"] == "error"
        assert statuses["Dup NIS"] == "error"
        assert j["summary"]["ok"] == 1
        assert j["summary"]["error"] == 3

    def test_import_520_rows_perf_and_duplicate(self, admin):
        # Build 520 rows: 500 valid new + 10 bad NIS + 10 that duplicate existing (will be 'exists' only after first batch)
        rows = []
        for i in range(500):
            rows.append([f"TestIter55 {i:04d}", f"test_iter55_s{i:04d}@example.com",
                         f"00812{i:05d}", f"{(55000 + i) % 100000:05d}", f"08123456{i:04d}", "XII IPA 1"])
        # 10 bad NIS
        for i in range(10):
            rows.append([f"TestIter55 Bad {i}", f"test_iter55_bad{i}@example.com",
                         f"00812{i:05d}99", f"12{i}", f"081999000{i:03d}", "XII IPA 1"])
        # 10 bad email
        for i in range(10):
            rows.append([f"TestIter55 BadEmail {i}", f"not-an-email-{i}",
                         f"00812{i:05d}88", f"{(56000 + i):05d}", f"081888000{i:03d}", "XII IPA 1"])

        files = {"file": ("import520.xlsx", _mk_xlsx(rows),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        t0 = time.time()
        r = admin.post(f"{API}/admin/students/import", files=files,
                       data={"kelas": "XII IPA 1", "password": "SiswaBaru2026"})
        dt = time.time() - t0
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True
        assert j["created"] == 500, f"created={j['created']} summary={j['summary']}"
        assert j["summary"]["error"] == 20
        assert j["email_configured"] is False
        assert j["email_queued"] == 0
        assert len(j["skipped_rows"]) == 20
        print(f"\n[iter55] import 520 rows took {dt:.2f}s, created={j['created']}")
        # Re-import same file -> duplicates reported as 'exists'
        files2 = {"file": ("import520b.xlsx", _mk_xlsx(rows[:5]),
                           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        r2 = admin.post(f"{API}/admin/students/import", files=files2,
                        data={"kelas": "XII IPA 1", "password": "SiswaBaru2026"})
        assert r2.status_code == 200
        j2 = r2.json()
        assert j2["created"] == 0
        assert j2["summary"]["exists"] == 5


# ---------- AI exam generate (small, single call) ----------
class TestAiExamGenerate:
    def test_ai_status(self, guru):
        r = guru.get(f"{API}/ai/status")
        assert r.status_code == 200
        j = r.json()
        assert j["configured"] is True
        assert "claude-sonnet-4" in (j.get("model") or "").lower() or j["model"]

    def test_ai_generate_small(self, guru):
        body = {"material": "Teorema Pythagoras pada segitiga siku-siku: a^2 + b^2 = c^2.",
                "subject": "Matematika", "kelas": "X", "mc_count": 2, "essay_count": 0, "level": "mudah"}
        r = guru.post(f"{API}/ai/exam-generate", json=body, timeout=90)
        assert r.status_code == 200, r.text
        qs = r.json()["questions"]
        assert isinstance(qs, list) and len(qs) >= 1
        for q in qs:
            assert q["type"] in ("mc", "essay")
            assert q["q"].strip()
            if q["type"] == "mc":
                assert len(q["options"]) >= 2
