"""Iter49 - verify newly added endpoints:
- GET /api/health
- GET /api/users/{uid} (role-based, 404, excludes password_hash)
- POST /api/users/bulk-delete super_admin guard + working flow
- POST /api/auth/forgot-password weak-password early-return
"""
import os, re, time, uuid, pytest, requests
from pathlib import Path

def _load_env(p):
    for line in Path(p).read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            os.environ.setdefault(k.strip(), v)

_load_env("/app/frontend/.env")
_load_env("/app/backend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
SISWA = {"email": "siswa.vortex@sman1laguboti.sch.id", "password": "BaruSiswa123"}
SISWA_NISN = "0012345678"


def _login(creds):
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, r.text
    tok = r.json().get("token")
    if tok:
        s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="session")
def admin():
    return _login(ADMIN)


@pytest.fixture(scope="session")
def siswa():
    return _login(SISWA)


# ---------- /api/health ----------
def test_health_public():
    r = requests.get(f"{BASE}/api/health", timeout=10)
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# ---------- GET /api/users/{uid} ----------
class TestGetUser:
    def test_super_admin_get_single_user(self, admin):
        users = admin.get(f"{BASE}/api/users", params={"role": "siswa"}, timeout=20).json()
        siswa = next(u for u in users if u["email"].startswith("siswa.vortex"))
        r = admin.get(f"{BASE}/api/users/{siswa['id']}", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == siswa["id"]
        assert data["email"] == siswa["email"]
        assert "password_hash" not in data
        assert "_id" not in data

    def test_unknown_id_404(self, admin):
        r = admin.get(f"{BASE}/api/users/does-not-exist-{uuid.uuid4()}", timeout=20)
        assert r.status_code == 404

    def test_siswa_forbidden(self, siswa, admin):
        users = admin.get(f"{BASE}/api/users", params={"role": "siswa"}, timeout=20).json()
        any_id = users[0]["id"]
        r = siswa.get(f"{BASE}/api/users/{any_id}", timeout=20)
        assert r.status_code == 403, r.status_code


# ---------- POST /api/users/bulk-delete ----------
class TestBulkDelete:
    def test_super_admin_role_rejected(self, admin):
        r = admin.post(f"{BASE}/api/users/bulk-delete",
                       json={"roles": ["super_admin"], "kelas": None, "confirm": "HAPUS"}, timeout=20)
        assert r.status_code == 400
        assert "Super Admin" in r.json().get("detail", "")

    def test_mixed_super_admin_rejected(self, admin):
        r = admin.post(f"{BASE}/api/users/bulk-delete",
                       json={"roles": ["siswa", "super_admin"], "kelas": None, "confirm": "HAPUS"}, timeout=20)
        assert r.status_code == 400

    def test_confirm_required(self, admin):
        r = admin.post(f"{BASE}/api/users/bulk-delete",
                       json={"roles": ["siswa"], "kelas": "__NOTEXIST__", "confirm": ""}, timeout=20)
        assert r.status_code == 400

    def test_bulk_delete_throwaway_accounts(self, admin):
        # create throwaway siswa in an isolated kelas, then bulk-delete by kelas
        kelas = f"TEST_K_{uuid.uuid4().hex[:6]}"
        created = []
        for i in range(2):
            payload = {
                "email": f"test_bulk_{uuid.uuid4().hex[:8]}@test.io",
                "name": f"TEST Bulk {i}",
                "role": "siswa",
                "password": "Testing123",
                "kelas": kelas,
                "nisn": f"999{uuid.uuid4().hex[:7]}",
                "nis": f"T{uuid.uuid4().hex[:7]}",
                "whatsapp": "081234567890",
                "phone": "081234567890",
            }
            r = admin.post(f"{BASE}/api/users", json=payload, timeout=20)
            assert r.status_code in (200, 201), r.text
            created.append(r.json()["id"])
        # verify they exist
        r = admin.get(f"{BASE}/api/users", params={"kelas": kelas}, timeout=20)
        assert len({u["id"] for u in r.json()} & set(created)) == 2
        # bulk delete
        r = admin.post(f"{BASE}/api/users/bulk-delete",
                       json={"roles": ["siswa"], "kelas": kelas, "confirm": "HAPUS"}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["deleted"] >= 2
        # verify gone
        r = admin.get(f"{BASE}/api/users", params={"kelas": kelas}, timeout=20)
        remaining = {u["id"] for u in r.json()} & set(created)
        assert remaining == set()


# ---------- POST /api/auth/forgot-password ----------
class TestForgotPassword:
    def test_weak_password_returns_400_first(self):
        """Even with wrong email, password-rule error should be returned FIRST."""
        for weak in ["abc", "abcdefgh", "12345678", "aaa"]:
            r = requests.post(f"{BASE}/api/auth/forgot-password", json={
                "email": f"nonexist_{uuid.uuid4().hex[:6]}@none.io",
                "identifier": "0000",
                "new_password": weak,
                "note": "weak"
            }, timeout=20)
            # Pydantic Field(min_length=8) returns 422 for len<8; our server-side rule returns 400
            if len(weak) < 8:
                assert r.status_code in (400, 422), f"{weak}: {r.status_code} {r.text}"
            else:
                assert r.status_code == 400, f"{weak}: {r.status_code} {r.text}"
                assert "Password" in r.json().get("detail", "")

    def test_valid_forgot_creates_request_and_approve_all(self, admin):
        # clean collection for determinism (avoid 429)
        from pymongo import MongoClient
        mc = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        dbn = os.environ.get("DB_NAME", "test_database")
        mc[dbn].password_reset_requests.delete_many({})
        # cancel/approve any pending for siswa
        mc[dbn].reset_requests.delete_many({"email": SISWA["email"]})

        new_pw = "StrongPass123"
        r = requests.post(f"{BASE}/api/auth/forgot-password", json={
            "email": SISWA["email"],
            "identifier": SISWA_NISN,
            "new_password": new_pw,
            "note": "iter49 e2e"
        }, timeout=20)
        assert r.status_code == 200, r.text

        # admin sees pending
        r = admin.get(f"{BASE}/api/admin/reset-requests", params={"status": "pending"}, timeout=20)
        assert r.status_code == 200
        pend = [x for x in r.json() if x["email"] == SISWA["email"]]
        assert pend, "pending reset request not visible to admin"

        # approve-all
        r = admin.post(f"{BASE}/api/admin/reset-requests/approve-all", timeout=30)
        assert r.status_code == 200
        assert r.json().get("approved", 0) >= 1

        # verify login with NEW password works
        s = requests.Session()
        rl = s.post(f"{BASE}/api/auth/login", json={"email": SISWA["email"], "password": new_pw}, timeout=20)
        assert rl.status_code == 200, f"new pw login failed: {rl.status_code} {rl.text}"
        tok = rl.json().get("token")
        if tok:
            s.headers["Authorization"] = f"Bearer {tok}"

        # restore via admin PATCH so other tests keep working
        users = admin.get(f"{BASE}/api/users", params={"role": "siswa"}, timeout=20).json()
        siswa_id = next(u["id"] for u in users if u["email"] == SISWA["email"])
        rp = admin.patch(f"{BASE}/api/users/{siswa_id}", json={"password": "BaruSiswa123"}, timeout=20)
        assert rp.status_code == 200, rp.text
        # confirm restore
        rl = requests.post(f"{BASE}/api/auth/login", json=SISWA, timeout=20)
        assert rl.status_code == 200
