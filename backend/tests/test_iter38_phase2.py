"""Phase 2 backend tests: GuruStaff, Attendance live log data, PPDB jurusan removal, Points leaderboard filters."""
import os
import uuid
import pytest
import requests
from pathlib import Path


def _load_env():
    f = Path("/app/frontend/.env")
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_env()
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture
def throwaway_siswa(admin_session):
    created = []

    def _make(**overrides):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_siswa_{suffix}@example.com",
            "password": "Pass1234!",
            "name": f"TEST Siswa {suffix}",
            "role": "siswa",
            "phone": "081234567890",
            "nisn": overrides.get("nisn") or f"99{suffix[:8]}",
            "kelas": "X-1",
        }
        payload.update(overrides)
        r = admin_session.post(f"{API}/users", json=payload)
        assert r.status_code == 200, r.text
        u = r.json()
        created.append(u["id"])
        return u

    yield _make

    for uid in created:
        admin_session.delete(f"{API}/users/{uid}")


@pytest.fixture
def throwaway_guru(admin_session):
    created = []
    suffix = uuid.uuid4().hex[:8]
    payload = {
        "email": f"TEST_guru_{suffix}@example.com",
        "password": "Pass1234!",
        "name": f"TEST Guru {suffix}",
        "role": "guru",
        "phone": "081298765432",
        "subjects": ["Matematika", "Fisika"],
        "nip": "19800101",
    }
    r = admin_session.post(f"{API}/users", json=payload)
    assert r.status_code == 200, r.text
    u = r.json()
    created.append(u["id"])
    yield u
    for uid in created:
        admin_session.delete(f"{API}/users/{uid}")


# ---------- GURU & STAFF data ----------
class TestGuruStaff:
    def test_guru_listing_includes_phone_and_subjects(self, admin_session, throwaway_guru):
        r = admin_session.get(f"{API}/users", params={"role": "guru"})
        assert r.status_code == 200
        found = next((u for u in r.json() if u["id"] == throwaway_guru["id"]), None)
        assert found is not None
        assert found.get("phone") == "081298765432"
        assert "Matematika" in (found.get("subjects") or [])


# ---------- PPDB without jurusan ----------
class TestPpdbNoJurusan:
    def test_register_without_jurusan(self, admin_session):
        payload = {
            "full_name": "TEST Pendaftar NoJurusan",
            "address": "Jl. Test 1",
            "phone": "081200000001",
            "parent_name": "Ortu Test",
            "parent_phone": "081200000002",
            "parent_email": "testppdb@example.com",
            "prev_school": "SMP TEST",
            "nem_avg": 85.0,
        }
        r = requests.post(f"{API}/ppdb/register", json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # verify created
        r2 = admin_session.get(f"{API}/ppdb/{pid}")
        assert r2.status_code == 200
        doc = r2.json()
        assert doc["full_name"] == payload["full_name"]
        # jurusan_pilihan is optional / empty
        assert doc.get("jurusan_pilihan", "") in ("", None)

        # cleanup
        admin_session.delete(f"{API}/ppdb/{pid}")

    def test_list_ppdb_ok(self, admin_session):
        r = admin_session.get(f"{API}/ppdb")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Attendance scan + live log ----------
class TestAttendanceLiveLog:
    def test_manual_nisn_scan_and_list(self, admin_session, throwaway_siswa):
        nisn = f"990011{uuid.uuid4().hex[:4]}"
        siswa = throwaway_siswa(nisn=nisn)

        r = admin_session.post(f"{API}/attendance/scan",
                               json={"nisn": nisn, "method": "manual", "status": "hadir"})
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        assert r.json()["student"]["id"] == siswa["id"]

        # live log data source
        r2 = admin_session.get(f"{API}/attendance")
        assert r2.status_code == 200
        rows = r2.json()
        match = next((x for x in rows if x.get("student_id") == siswa["id"]), None)
        assert match is not None
        assert match["status"] == "hadir"
        assert match["method"] == "manual"
        assert match["student_name"] == siswa["name"]

    def test_scan_invalid_nisn_returns_404(self, admin_session):
        r = admin_session.post(f"{API}/attendance/scan",
                               json={"nisn": "DOES_NOT_EXIST_" + uuid.uuid4().hex[:4],
                                     "method": "manual", "status": "hadir"})
        assert r.status_code == 404


# ---------- Points leaderboard with filters ----------
class TestPointsLeaderboard:
    def test_leaderboard_filters_and_podium(self, admin_session, throwaway_siswa):
        s1 = throwaway_siswa()
        s2 = throwaway_siswa()
        s3 = throwaway_siswa()

        # Award points across categories
        awards = [
            (s1["id"], 50, "prestasi"),
            (s1["id"], 10, "akademik"),
            (s2["id"], 30, "prestasi"),
            (s3["id"], 20, "prestasi"),
            (s3["id"], 100, "kedisiplinan"),
        ]
        for uid, pts, cat in awards:
            r = admin_session.post(f"{API}/points",
                                   json={"user_id": uid, "points": pts,
                                         "reason": "TEST", "category": cat})
            assert r.status_code == 200, r.text

        # No filter: all students appear with totals
        r = admin_session.get(f"{API}/points/leaderboard")
        assert r.status_code == 200
        data = r.json()
        assert "students" in data and "classes" in data
        by_id = {s["user_id"]: s for s in data["students"]}
        assert by_id[s1["id"]]["total"] == 60
        assert by_id[s2["id"]]["total"] == 30
        assert by_id[s3["id"]]["total"] == 120

        # Category filter: prestasi narrows
        r = admin_session.get(f"{API}/points/leaderboard", params={"category": "prestasi"})
        assert r.status_code == 200
        by_id = {s["user_id"]: s for s in r.json()["students"]}
        assert by_id.get(s1["id"], {}).get("total") == 50
        assert by_id.get(s2["id"], {}).get("total") == 30
        assert by_id.get(s3["id"], {}).get("total") == 20
        # s1 shouldn't be ranked higher than from akademik contribution — verify kedisiplinan excluded
        assert by_id.get(s3["id"], {}).get("total") != 120

        # Period filter: bulan should include today's awards
        r = admin_session.get(f"{API}/points/leaderboard", params={"period": "bulan"})
        assert r.status_code == 200
        by_id = {s["user_id"]: s for s in r.json()["students"]}
        assert by_id[s1["id"]]["total"] == 60

        # Period filter: semester
        r = admin_session.get(f"{API}/points/leaderboard", params={"period": "semester"})
        assert r.status_code == 200
        assert any(s["user_id"] == s1["id"] for s in r.json()["students"])

        # Verify name field is present (podium needs it)
        for s in r.json()["students"]:
            assert "name" in s
