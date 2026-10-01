"""Backend tests for PPDB module + branded Excel exports (Phase 5)."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://a11y-school-build.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SUPER_ADMIN = {"email": "cassandramarsada@gmail.com", "password": "Admin@Sekolah2026"}
STAFF_TU = {"email": "tu@sekolahku.id", "password": "TU@2026"}
KEPSEK = {"email": "kepsek@sekolahku.id", "password": "Kepsek@2026"}
SISWA = {"email": "siswa@sekolahku.id", "password": "Siswa@2026"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin():
    return _login(SUPER_ADMIN)


@pytest.fixture(scope="session")
def siswa():
    return _login(SISWA)


# ---------------- PPDB PUBLIC ----------------
class TestPpdbPublic:
    def test_register_public_no_auth(self):
        payload = {
            "full_name": "TEST_Ahmad Rizki",
            "address": "Jl. Merdeka No. 10",
            "phone": "081234567890",
            "parent_name": "TEST_Budi Rizki",
            "parent_phone": "081234567899",
            "parent_email": "test_parent@example.com",
            "prev_school": "SMPN 1 TEST",
            "nem_avg": 85.5,
            "jurusan_pilihan": "IPA",
            "gender": "L"
        }
        r = requests.post(f"{API}/ppdb/register", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert "id" in data
        assert "Nomor pendaftaran" in data.get("message", "")
        pytest.ppdb_id = data["id"]

    def test_register_validation_bad_nem(self):
        payload = {
            "full_name": "TEST_Bad",
            "address": "x",
            "phone": "0812",
            "parent_name": "y",
            "parent_phone": "0812",
            "parent_email": "bad_email_no_at",
            "prev_school": "x",
            "nem_avg": 150.0
        }
        r = requests.post(f"{API}/ppdb/register", json=payload, timeout=30)
        assert r.status_code in (400, 422)

    def test_upload_public(self):
        # Tiny valid PNG (1x1)
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
               b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf"
               b"\xc0\x00\x00\x00\x03\x00\x01\x5b\x9f\x86\x87\x00\x00\x00\x00IEND\xaeB`\x82")
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/ppdb/upload", files=files, timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "path" in j and "url" in j


# ---------------- PPDB ADMIN ----------------
class TestPpdbAdmin:
    def test_list_requires_auth(self):
        r = requests.get(f"{API}/ppdb", timeout=30)
        assert r.status_code in (401, 403)

    def test_list_as_admin(self, admin):
        r = admin.get(f"{API}/ppdb", timeout=30)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        # Should contain our test registration
        assert any("TEST_Ahmad Rizki" == d.get("full_name") for d in arr)

    def test_list_forbidden_for_siswa(self, siswa):
        r = siswa.get(f"{API}/ppdb", timeout=30)
        assert r.status_code in (401, 403)

    def test_auto_select(self, admin):
        r = admin.post(f"{API}/ppdb/auto-select?threshold=75&capacity=100", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "accepted" in data and "rejected" in data
        # Verify the TEST_Ahmad Rizki (NEM 85.5 >= 75) got LOLOS
        lst = admin.get(f"{API}/ppdb").json()
        target = next((d for d in lst if d.get("full_name") == "TEST_Ahmad Rizki"), None)
        assert target is not None
        assert target.get("status") == "lolos"

    def test_patch_status(self, admin):
        pid = getattr(pytest, "ppdb_id", None)
        assert pid
        r = admin.patch(f"{API}/ppdb/{pid}?status=review&notes=cek", timeout=30)
        assert r.status_code == 200
        got = admin.get(f"{API}/ppdb/{pid}").json()
        assert got.get("status") == "review"
        assert got.get("notes") == "cek"


# ---------------- BRANDED EXCEL EXPORTS ----------------
class TestBrandedExports:
    MIN_SIZE = 4000  # branded pretty_excel typically > 4KB

    def _dl(self, session, url):
        r = session.get(url, timeout=60)
        assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"
        assert "spreadsheet" in r.headers.get("content-type", "").lower() or url.endswith("xlsx")
        return r.content

    def _is_branded(self, content):
        """Check SEKOLAHKU marker is present in worksheet (via inline strings, no sharedStrings.xml)."""
        import io, zipfile
        try:
            z = zipfile.ZipFile(io.BytesIO(content))
            sheet = z.read('xl/worksheets/sheet1.xml').decode('utf8', errors='ignore')
            return 'SEKOLAHKU' in sheet
        except Exception:
            return False

    def test_export_ppdb(self, admin):
        data = self._dl(admin, f"{API}/ppdb/export/xlsx")
        assert self._is_branded(data), "PPDB export missing SEKOLAHKU branding"

    def test_export_attendance(self, admin):
        data = self._dl(admin, f"{API}/attendance/export")
        assert self._is_branded(data), "Attendance export missing SEKOLAHKU branding"

    def test_export_social_fund(self, admin):
        data = self._dl(admin, f"{API}/social-fund/export")
        assert self._is_branded(data), "SocialFund export missing SEKOLAHKU branding (duplicate route bug: /social-fund/export defined twice in server.py L672 & L1207 - old plain pandas version shadows branded)"

    def test_export_uang_kas(self, admin):
        data = self._dl(admin, f"{API}/kas/export")
        assert self._is_branded(data), "UangKas export missing SEKOLAHKU branding"

    def test_export_inventory(self, admin):
        data = self._dl(admin, f"{API}/inventory/export")
        assert self._is_branded(data), "Inventory export missing SEKOLAHKU branding"
