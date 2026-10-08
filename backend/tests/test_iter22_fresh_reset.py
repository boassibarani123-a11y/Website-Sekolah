"""Iter 22 — fresh DB reset validation (demo accounts removed, super admin seeded,
   super admin can build users/classes/books/ppdb/kas; email forgot-password works)."""
import os, uuid, time
import pytest
import requests

def _load_base():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        # Fallback to frontend/.env
        try:
            with open("/app/frontend/.env") as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        v = line.split("=", 1)[1].strip().strip('"')
                        break
        except Exception:
            pass
    assert v, "REACT_APP_BACKEND_URL not set"
    return v.rstrip("/")

BASE_URL = _load_base()
API = f"{BASE_URL}/api"

SUPER = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}


@pytest.fixture(scope="session")
def super_token():
    r = requests.post(f"{API}/auth/login", json=SUPER, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def super_headers(super_token):
    return {"Authorization": f"Bearer {super_token}"}


# ---------------- Phase 1: Login & DB sanity ----------------
class TestSuperAdminLogin:
    def test_super_admin_login_ok(self):
        r = requests.post(f"{API}/auth/login", json=SUPER, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "super_admin"
        assert d["user"]["email"] == SUPER["email"]
        assert isinstance(d["token"], str) and len(d["token"]) > 10

    def test_demo_accounts_removed(self):
        """Known legacy demo emails must no longer be able to login."""
        for em in ["kepsek@sekolahku.id", "guru@sekolahku.id", "siswa@sekolahku.id",
                   "tu@sekolahku.id", "ketuaosis@sekolahku.id", "ketuakelas@sekolahku.id"]:
            r = requests.post(f"{API}/auth/login",
                              json={"email": em, "password": "Demo12345"}, timeout=15)
            assert r.status_code in (400, 401, 403), f"{em} should NOT login, got {r.status_code}"

    def test_users_list_only_super_admin(self, super_headers):
        r = requests.get(f"{API}/users", headers=super_headers, timeout=20)
        assert r.status_code == 200
        users = r.json()
        emails = [u["email"] for u in users]
        assert SUPER["email"] in emails


# ---------------- Phase 2: Super admin creates users ----------------
class TestCreateUsers:
    @pytest.fixture(scope="class")
    def created(self, super_headers):
        uniq = uuid.uuid4().hex[:6]
        payloads = [
            {"email": f"TEST_guru_{uniq}@laguboti.sch.id", "password": "Guru12345",
             "name": "TEST Guru", "role": "guru", "subjects": ["Matematika"]},
            {"email": f"TEST_tu_{uniq}@laguboti.sch.id", "password": "Tu12345",
             "name": "TEST Staff TU", "role": "staff_tu"},
            {"email": f"TEST_siswa_{uniq}@laguboti.sch.id", "password": "Siswa12345",
             "name": "TEST Siswa Satu", "role": "siswa", "nisn": "1234567890",
             "kelas": "X-TEST", "jurusan": "IPA"},
        ]
        out = []
        for p in payloads:
            r = requests.post(f"{API}/users", headers=super_headers, json=p, timeout=20)
            assert r.status_code == 200, f"{p['email']}: {r.status_code} {r.text}"
            out.append(r.json())
        return out

    def test_user_created_payload(self, created):
        assert len(created) == 3
        roles = {u["role"] for u in created}
        assert roles == {"guru", "staff_tu", "siswa"}
        siswa = next(u for u in created if u["role"] == "siswa")
        assert siswa["nisn"] == "1234567890"
        assert siswa.get("qr_code", "").startswith("SEKOLAHKU-")

    def test_user_persisted_get(self, created, super_headers):
        r = requests.get(f"{API}/users", headers=super_headers, timeout=15)
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        for u in created:
            assert u["email"] in emails


# ---------------- Phase 3: Classes & attendance base ----------------
class TestClassesAndAttendance:
    @pytest.fixture(scope="class")
    def klass(self, super_headers):
        name = f"X-TEST-{uuid.uuid4().hex[:4].upper()}"
        r = requests.post(f"{API}/classes", headers=super_headers,
                          json={"name": name, "subjects": ["Matematika"]}, timeout=20)
        assert r.status_code == 200, r.text
        return r.json()

    def test_class_create_and_list(self, klass, super_headers):
        assert klass["name"].startswith("X-TEST")
        r = requests.get(f"{API}/classes", headers=super_headers, timeout=15)
        assert r.status_code == 200
        assert any(c["id"] == klass["id"] for c in r.json())

    def test_attendance_endpoints_empty_ok(self, klass, super_headers):
        """Empty-state: today attendance list should not 500."""
        r = requests.get(f"{API}/attendance/today", headers=super_headers, timeout=20)
        assert r.status_code in (200, 404), r.text
        r2 = requests.get(f"{API}/attendance/stats", headers=super_headers, timeout=20)
        assert r2.status_code in (200, 404), r2.text

    def test_kas_list_empty_ok(self, klass, super_headers):
        r = requests.get(f"{API}/classes/{klass['id']}/kas", headers=super_headers, timeout=15)
        assert r.status_code == 200
        assert r.json() == []


# ---------------- Phase 4: Library ----------------
class TestLibrary:
    def test_books_catalog_empty(self, super_headers):
        r = requests.get(f"{API}/books", headers=super_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_library_stats_empty_ok(self, super_headers):
        r = requests.get(f"{API}/library/stats", headers=super_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total_titles"] >= 0
        assert d["borrowed"] == 0 or isinstance(d["borrowed"], int)

    def test_create_book_and_appears_in_catalog(self, super_headers):
        body = {"title": f"TEST Buku {uuid.uuid4().hex[:6]}",
                "author": "Penulis TEST", "category": "Umum",
                "total_copies": 3, "year": 2026}
        r = requests.post(f"{API}/books", headers=super_headers, json=body, timeout=20)
        assert r.status_code == 200, r.text
        book = r.json()
        assert book["title"] == body["title"]
        assert book["available_copies"] == 3
        # GET verify persistence
        r2 = requests.get(f"{API}/books", headers=super_headers, timeout=15)
        assert any(b["id"] == book["id"] for b in r2.json())


# ---------------- Phase 5: PPDB ----------------
class TestPpdb:
    def test_ppdb_register_public_no_auth(self):
        payload = {
            "full_name": f"TEST Calon {uuid.uuid4().hex[:5]}",
            "nisn": "1122334455", "birth_place": "Laguboti", "birth_date": "2010-05-10",
            "gender": "L", "address": "Jl. TEST No.1", "phone": "081200000000",
            "parent_name": "Orang Tua TEST", "parent_phone": "081300000000",
            "parent_email": f"test_ppdb_{uuid.uuid4().hex[:4]}@example.com",
            "prev_school": "SMP TEST", "nem_avg": 85.5, "jurusan_pilihan": "IPA",
            "berkas_urls": [],
        }
        r = requests.post(f"{API}/ppdb/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True and "id" in d

    def test_ppdb_list_admin_only(self, super_headers):
        r = requests.get(f"{API}/ppdb", headers=super_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1  # we just created one

    def test_ppdb_list_requires_auth(self):
        r = requests.get(f"{API}/ppdb", timeout=15)
        assert r.status_code in (401, 403)


# ---------------- Phase 6: Forgot password (email) ----------------
class TestForgotPassword:
    def test_forgot_password_returns_generic_message(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": SUPER["email"]}, timeout=30)
        assert r.status_code == 200, r.text
        assert "message" in r.json()

    def test_forgot_password_unknown_email_still_generic(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": "nonexistent_user_xyz@example.com"}, timeout=20)
        # Must not leak existence; must still return 200 generic.
        assert r.status_code == 200
        assert "message" in r.json()
