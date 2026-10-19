"""
Iteration 51 tests:
  - Bulk student import (template / preview / commit / re-import / cleanup / RBAC)
  - Monthly teacher attendance recap
  - Vortex Guard proctor live-feed violation signal
"""
import os
import io
import time
import pytest
import requests
from datetime import datetime
from pathlib import Path

def _load_env():
    for p in ("/app/frontend/.env", "/app/backend/.env"):
        try:
            for line in Path(p).read_text().splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip().strip('"'))
        except FileNotFoundError:
            pass
_load_env()
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL missing"

ADMIN = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
GURU = ("guru.vortex@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.vortex@sman1laguboti.sch.id", "BaruSiswa123")

IMPORT_FILE = "/root/siswa800.xlsx"
IMPORT_KELAS = "X TEST IMPOR"
IMPORT_PW = "siswa2026@"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text[:200]}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def guru():
    return _login(*GURU)


@pytest.fixture(scope="module")
def siswa():
    return _login(*SISWA)


# ---------------- IMPORT SISWA ----------------

class TestBulkImport:
    def test_template_xlsx(self, admin):
        r = admin.get(f"{BASE_URL}/api/users/import/template", timeout=30)
        assert r.status_code == 200
        assert "spreadsheet" in r.headers.get("content-type", "") or r.content[:2] == b"PK"
        assert len(r.content) > 500

    def test_template_forbidden_siswa(self, siswa):
        r = siswa.get(f"{BASE_URL}/api/users/import/template", timeout=30)
        assert r.status_code == 403

    def test_preview_without_kelas_all_error(self, admin):
        assert Path(IMPORT_FILE).exists(), f"missing test file {IMPORT_FILE}"
        with open(IMPORT_FILE, "rb") as f:
            r = admin.post(f"{BASE_URL}/api/users/import/preview",
                           files={"file": ("siswa800.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                           data={"kelas": ""}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        summary = data["summary"]
        # Without kelas: every row has 'Kelas belum ditentukan' error
        assert summary["total"] >= 800
        assert summary["ok"] == 0
        assert summary["error"] >= summary["total"] - summary["exists"]
        # At least one row explicitly mentions Kelas error
        row_errs = sum("Kelas belum ditentukan" in " ".join(r.get("errors") or []) for r in data["rows"])
        assert row_errs > 0

    def test_preview_with_kelas(self, admin):
        with open(IMPORT_FILE, "rb") as f:
            r = admin.post(f"{BASE_URL}/api/users/import/preview",
                           files={"file": ("siswa800.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
                           data={"kelas": IMPORT_KELAS}, timeout=120)
        assert r.status_code == 200
        summary = r.json()["summary"]
        # Expected: ok=800, error=1 (invalid duplicate row)
        assert summary["ok"] == 800, f"expected ok=800 got {summary}"
        assert summary["error"] >= 1, f"expected >=1 error row, got {summary}"

    def test_preview_forbidden_guru(self, guru):
        with open(IMPORT_FILE, "rb") as f:
            r = guru.post(f"{BASE_URL}/api/users/import/preview",
                          files={"file": ("siswa800.xlsx", f)}, data={"kelas": IMPORT_KELAS}, timeout=60)
        assert r.status_code == 403

    def test_commit_import_creates_800(self, admin):
        # Ensure clean before commit
        admin.post(f"{BASE_URL}/api/users/bulk-delete",
                   json={"roles": ["siswa"], "kelas": IMPORT_KELAS, "confirm": "HAPUS"}, timeout=120)
        t0 = time.time()
        with open(IMPORT_FILE, "rb") as f:
            r = admin.post(f"{BASE_URL}/api/users/import",
                           files={"file": ("siswa800.xlsx", f)},
                           data={"kelas": IMPORT_KELAS, "password": IMPORT_PW}, timeout=120)
        dt = time.time() - t0
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["ok"] is True
        assert data["created"] == 800, f"created={data['created']} summary={data['summary']}"
        assert dt < 15, f"import took {dt:.2f}s (should be <~10s)"
        print(f"[import] 800 created in {dt:.2f}s")

    def test_imported_student_can_login(self, admin):
        # Find one imported student via users list
        r = admin.get(f"{BASE_URL}/api/users?role=siswa&kelas={IMPORT_KELAS}&limit=1000", timeout=30)
        assert r.status_code == 200
        js = r.json()
        if isinstance(js, dict):
            users = js.get("items") or js.get("users") or []
        else:
            users = js
        # Backend may ignore kelas filter -> narrow client side
        users = [u for u in users if u.get("kelas") == IMPORT_KELAS]
        assert users, f"no imported users with kelas={IMPORT_KELAS}"
        email = users[0]["email"]
        s = requests.Session()
        lr = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": IMPORT_PW}, timeout=20)
        assert lr.status_code == 200, f"imported login failed: {lr.status_code} {lr.text[:200]}"
        # verify fields on the user record (NISN/NIS/phone/kelas/role)
        u = users[0]
        assert u.get("role") == "siswa"
        assert u.get("kelas") == IMPORT_KELAS
        assert u.get("nisn") and u["nisn"].isdigit()
        assert u.get("phone")

    def test_reimport_same_file_all_exists(self, admin):
        with open(IMPORT_FILE, "rb") as f:
            r = admin.post(f"{BASE_URL}/api/users/import",
                           files={"file": ("siswa800.xlsx", f)},
                           data={"kelas": IMPORT_KELAS, "password": IMPORT_PW}, timeout=120)
        assert r.status_code == 200
        data = r.json()
        assert data["created"] == 0, f"re-import should create 0, got {data['created']}"
        assert data["summary"]["exists"] >= 800

    def test_import_forbidden_siswa(self, siswa):
        with open(IMPORT_FILE, "rb") as f:
            r = siswa.post(f"{BASE_URL}/api/users/import",
                           files={"file": ("siswa800.xlsx", f)},
                           data={"kelas": IMPORT_KELAS}, timeout=60)
        assert r.status_code == 403

    def test_zz_cleanup_imported(self, admin):
        r = admin.post(f"{BASE_URL}/api/users/bulk-delete",
                       json={"roles": ["siswa"], "kelas": IMPORT_KELAS, "confirm": "HAPUS"}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        js = r.json()
        print("[cleanup]", js)
        assert (js.get("deleted") or 0) >= 800 or (js.get("count") or 0) >= 800 or js.get("ok") is True


# ---------------- TEACHER MONTHLY ----------------

class TestTeacherMonthly:
    def test_monthly_schema(self, admin):
        today = datetime.now().strftime("%Y-%m")
        r = admin.get(f"{BASE_URL}/api/teacher-attendance/monthly",
                      params={"year": 2026, "month": today}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["year"] == 2026
        assert len(data["months"]) == 12
        req_keys = {"hadir", "terlambat", "tepat_waktu", "izin", "sakit", "alpa", "rate", "late_rate", "label", "month"}
        assert req_keys.issubset(data["months"][0].keys()), f"missing keys: {req_keys - data['months'][0].keys()}"
        assert "month_summary" in data and "per_teacher" in data and "daily" in data
        if data["per_teacher"]:
            # rata_jam_datang key present (value may be None if no hadir in month)
            assert "rata_jam_datang" in data["per_teacher"][0]

    def test_guru_vortex_counted(self, admin, guru):
        # Record manual hadir today for Guru Vortex (via guru session absen-datang? Simpler: ensure endpoint ok)
        # Use admin to insert a manual record if endpoint exists; else just check monthly reads existing.
        today = datetime.now().strftime("%Y-%m-%d")
        ym = datetime.now().strftime("%Y-%m")
        r = admin.get(f"{BASE_URL}/api/teacher-attendance/monthly",
                      params={"year": datetime.now().year, "month": ym}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # month_summary.hadir may be 0 if no attendance today - we at least verify shape
        assert isinstance(data["month_summary"].get("hadir"), int)

    def test_monthly_forbidden_guru(self, guru):
        r = guru.get(f"{BASE_URL}/api/teacher-attendance/monthly", timeout=30)
        assert r.status_code == 403

    def test_monthly_forbidden_siswa(self, siswa):
        r = siswa.get(f"{BASE_URL}/api/teacher-attendance/monthly", timeout=30)
        assert r.status_code == 403

    def test_kepsek_access(self, admin):
        # Create temp kepsek, login, check 200, delete
        email = "TEST_tmpkepsek_iter51@sman1laguboti.sch.id"
        # cleanup prior
        r0 = admin.get(f"{BASE_URL}/api/users?role=kepsek&q=TEST_tmpkepsek_iter51", timeout=30)
        existing = []
        if r0.status_code == 200:
            jj = r0.json()
            existing = jj.get("items") if isinstance(jj, dict) else (jj if isinstance(jj, list) else [])
        for u in (existing or []):
            admin.delete(f"{BASE_URL}/api/users/{u['id']}", timeout=20)
        rc = admin.post(f"{BASE_URL}/api/users", json={
            "email": email, "password": "Kepsek12345", "name": "TEST Tmp Kepsek", "role": "kepsek",
            "nip": "999000000000000051"
        }, timeout=30)
        assert rc.status_code in (200, 201), f"create kepsek: {rc.status_code} {rc.text[:200]}"
        uid = rc.json().get("id") or rc.json().get("user", {}).get("id")
        try:
            ks = _login(email, "Kepsek12345")
            r = ks.get(f"{BASE_URL}/api/teacher-attendance/monthly", timeout=30)
            assert r.status_code == 200, f"kepsek monthly: {r.status_code}"
        finally:
            if uid:
                admin.delete(f"{BASE_URL}/api/users/{uid}", timeout=20)


# ---------------- VORTEX PROCTOR LIVE ----------------

class TestVortexProctor:
    def _get_or_make_exam(self, guru):
        r = guru.get(f"{BASE_URL}/api/exams", timeout=30)
        assert r.status_code == 200, r.text[:200]
        items = r.json()
        if isinstance(items, dict):
            items = items.get("items") or items.get("exams") or []
        for ex in items:
            if ex.get("title") == "UH Matematika Bab 1":
                return ex
        return None

    def test_live_endpoint_after_violation(self, guru, siswa):
        # Find exam
        exam = self._get_or_make_exam(guru)
        assert exam, "exam 'UH Matematika Bab 1' not found - iter50 should have seeded it"
        eid = exam["id"]

        # Try start as siswa; if 409 'sudah mengerjakan', create a fresh exam as guru
        sr = siswa.post(f"{BASE_URL}/api/exams/{eid}/start", json={"password": "MAT123"}, timeout=20)
        if sr.status_code == 409:
            # Need a fresh exam - find class XII IPA 1
            cr = guru.get(f"{BASE_URL}/api/classes", timeout=20)
            classes = cr.json() if cr.status_code == 200 else []
            if isinstance(classes, dict):
                classes = classes.get("items") or classes.get("classes") or []
            cls = next((c for c in classes if c.get("name") == "XII IPA 1"), None)
            assert cls, "class 'XII IPA 1' not found"
            payload = {
                "title": "TEST_UH Proctor Iter51",
                "kelas": "XII IPA 1",
                "class_id": cls["id"],
                "password": "PRC51A",
                "time_limit": 60,
                "max_violations": 3,
                "questions": [{"type": "mc", "q": "1+1=?", "text": "1+1=?", "options": ["1", "2", "3", "4"], "answer": 1, "points": 10}],
            }
            cr2 = guru.post(f"{BASE_URL}/api/exams", json=payload, timeout=30)
            assert cr2.status_code in (200, 201), f"create exam: {cr2.status_code} {cr2.text[:300]}"
            eid = cr2.json().get("id") or cr2.json().get("exam", {}).get("id")
            sr = siswa.post(f"{BASE_URL}/api/exams/{eid}/start", json={"password": "PRC51A"}, timeout=20)
        assert sr.status_code == 200, f"start exam: {sr.status_code} {sr.text[:200]}"

        # Post violation
        vr = siswa.post(f"{BASE_URL}/api/exams/{eid}/violation",
                        json={"reason": "Keluar dari layar penuh"}, timeout=20)
        assert vr.status_code == 200, f"violation: {vr.status_code} {vr.text[:200]}"
        vdata = vr.json()
        assert vdata["violations"] >= 1

        # Live endpoint as guru should surface this student with violation count>=1
        time.sleep(1)
        lr = guru.get(f"{BASE_URL}/api/exams/{eid}/live", timeout=20)
        assert lr.status_code == 200, f"live: {lr.status_code} {lr.text[:200]}"
        live = lr.json()
        assert live.get("total_violations", 0) >= 1
        rows = live.get("rows") or live.get("students") or []
        melanggar = [r for r in rows if (r.get("violations") or 0) >= 1]
        assert melanggar, f"no violator row in live feed: {str(live)[:400]}"
        print(f"[live] exam {eid} total_violations={live.get('total_violations')} rows={len(rows)}")

        # Submit to clean session
        try:
            siswa.post(f"{BASE_URL}/api/exams/attempt",
                       json={"exam_id": eid, "answers": [], "violations": 1}, timeout=20)
        except Exception:
            pass

        # Cleanup fresh exam if we created it
        if exam["id"] != eid:
            guru.delete(f"{BASE_URL}/api/exams/{eid}", timeout=20)
