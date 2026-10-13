"""Iteration 5: Settings API + Excel export integrity + MyCard QR."""
import io
import os
import zipfile
import re
import pytest
import requests
from openpyxl import load_workbook

def _read_frontend_env():
    p = "/app/frontend/.env"
    if os.path.exists(p):
        for line in open(p):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().strip('"')
    return None

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env()).rstrip("/")
ADMIN = ("cassandramarsada@gmail.com", "Admin@Sekolah2026")
SISWA = ("siswa@sekolahku.id", "Siswa@2026")
GURU  = ("guru@sekolahku.id", "Guru@2026")


def _login(email, pw):
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"Login {email} failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def admin():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def siswa():
    return _login(*SISWA)


# ---------- Public Settings ----------
def test_public_settings_no_auth():
    r = requests.get(f"{BASE}/api/settings", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "school_name" in d
    assert isinstance(d.get("id_card_rules"), list)


def test_settings_patch_and_persist(admin):
    # backup
    orig = requests.get(f"{BASE}/api/settings").json()
    try:
        r = admin.patch(f"{BASE}/api/settings", json={"school_name": "SMAN TESTFIX"})
        assert r.status_code == 200, r.text
        assert r.json()["school_name"] == "SMAN TESTFIX"
        # public read reflects
        pub = requests.get(f"{BASE}/api/settings").json()
        assert pub["school_name"] == "SMAN TESTFIX"
    finally:
        admin.patch(f"{BASE}/api/settings", json={"school_name": orig.get("school_name", "SEKOLAHKU")})


def test_settings_patch_requires_super_admin(siswa):
    r = siswa.patch(f"{BASE}/api/settings", json={"school_name": "HACK"})
    assert r.status_code in (401, 403)


# ---------- Siswa QR + MyCard data ----------
def test_siswa_has_qr_code(siswa):
    r = siswa.get(f"{BASE}/api/auth/me")
    assert r.status_code == 200
    me = r.json()
    qr = me.get("qr_code") or me.get("student_qr") or ""
    assert qr.startswith("SEKOLAHKU-") or "SEKOLAHKU" in qr, f"Missing/invalid qr_code: {me}"


# ---------- Excel exports integrity ----------
EXPORT_ENDPOINTS = [
    "/api/attendance/export",
    "/api/social-fund/export",
    "/api/kas/export",
    "/api/inventory/export",
    "/api/users/export?role=siswa",
    "/api/ppdb/export/xlsx",
]

EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF\U0001F900-\U0001F9FF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\u2600-\u27BF\U0001F300-\U0001F5FF\U0001F004\U0001F0CF🎓]")


@pytest.mark.parametrize("ep", EXPORT_ENDPOINTS)
def test_export_valid_and_branded(admin, ep):
    r = admin.get(f"{BASE}{ep}", timeout=60)
    assert r.status_code == 200, f"{ep} -> {r.status_code} {r.text[:200]}"
    body = r.content
    assert len(body) > 4000, f"{ep} too small: {len(body)}"
    # Valid zip / xlsx
    with zipfile.ZipFile(io.BytesIO(body)) as z:
        names = z.namelist()
        assert "xl/worksheets/sheet1.xml" in names
        # sharedStrings may or may not exist depending on content, check both
        text_blob = ""
        for n in ("xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"):
            if n in names:
                text_blob += z.read(n).decode("utf-8", errors="ignore")
        assert "SEKOLAHKU" in text_blob, f"{ep}: SEKOLAHKU brand missing"
        assert not EMOJI_RE.search(text_blob), f"{ep}: emoji found in xlsx (should be plain ASCII)"
    # openpyxl opens cleanly
    wb = load_workbook(io.BytesIO(body))
    assert wb.active is not None
    wb.close()
