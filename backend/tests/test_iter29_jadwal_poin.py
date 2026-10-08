"""Iteration 29 — Jadwal Pelajaran + Gamifikasi Poin + Role perms + PWA assets."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"
STUDENT_EMAIL = "andi.demo@sekolah.id"
STUDENT_PASSWORD = "Siswa12345"


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="session")
def admin_h():
    return {"Authorization": f"Bearer {_login(ADMIN_EMAIL, ADMIN_PASSWORD)}"}


@pytest.fixture(scope="session")
def student_h():
    try:
        return {"Authorization": f"Bearer {_login(STUDENT_EMAIL, STUDENT_PASSWORD)}"}
    except AssertionError:
        pytest.skip("Student seed not available")


@pytest.fixture(scope="session")
def class_id(admin_h):
    r = requests.get(f"{API}/classes", headers=admin_h, timeout=20)
    assert r.status_code == 200
    classes = r.json()
    assert classes, "no classes in seed"
    # Prefer XII IPA 1 if present
    for c in classes:
        if c.get("name") == "XII IPA 1":
            return c["id"]
    return classes[0]["id"]


# ------------------------------------------------------------------
# Timetable
# ------------------------------------------------------------------
class TestTimetable:
    created_ids = []

    def _uniq_subject(self):
        return f"TEST_MP_{uuid.uuid4().hex[:6]}"

    def test_create_timetable_ok(self, admin_h, class_id):
        payload = {
            "class_id": class_id, "day": "Rabu",
            "start_time": "13:00", "end_time": "14:30",
            "subject": self._uniq_subject(), "room": "TEST_R901",
        }
        r = requests.post(f"{API}/timetable", headers=admin_h, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["day"] == "Rabu"
        assert d["subject"] == payload["subject"]
        assert d["class_name"]
        assert "id" in d
        TestTimetable.created_ids.append(d["id"])

    def test_conflict_same_class(self, admin_h, class_id):
        # overlapping with 13:00-14:30 same class
        payload = {
            "class_id": class_id, "day": "Rabu",
            "start_time": "14:00", "end_time": "15:00",
            "subject": self._uniq_subject(),
        }
        r = requests.post(f"{API}/timetable", headers=admin_h, json=payload, timeout=20)
        assert r.status_code == 409, f"expected 409, got {r.status_code} {r.text}"
        assert "entrok" in r.json().get("detail", "").lower() or "bentrok" in r.text.lower()

    def test_conflict_same_room(self, admin_h, class_id):
        # Make a 2nd class in same room overlapping - need another class id
        rc = requests.get(f"{API}/classes", headers=admin_h, timeout=20).json()
        other = next((c for c in rc if c["id"] != class_id), None)
        if not other:
            pytest.skip("Only one class exists")
        payload = {
            "class_id": other["id"], "day": "Rabu",
            "start_time": "13:30", "end_time": "14:00",
            "subject": self._uniq_subject(), "room": "TEST_R901",
        }
        r = requests.post(f"{API}/timetable", headers=admin_h, json=payload, timeout=20)
        assert r.status_code == 409, r.text

    def test_non_overlap_ok(self, admin_h, class_id):
        payload = {
            "class_id": class_id, "day": "Rabu",
            "start_time": "15:00", "end_time": "16:00",
            "subject": self._uniq_subject(), "room": "TEST_R902",
        }
        r = requests.post(f"{API}/timetable", headers=admin_h, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        TestTimetable.created_ids.append(r.json()["id"])

    def test_list_sorted(self, admin_h, class_id):
        r = requests.get(f"{API}/timetable?class_id={class_id}", headers=admin_h, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Verify sort by (day, start_time)
        days_order = {"Senin": 0, "Selasa": 1, "Rabu": 2, "Kamis": 3, "Jumat": 4, "Sabtu": 5}
        prev = (-1, "")
        for it in items:
            cur = (days_order.get(it["day"], 9), it["start_time"])
            assert cur >= prev
            prev = cur

    def test_patch(self, admin_h):
        if not TestTimetable.created_ids:
            pytest.skip("no created entry")
        tid = TestTimetable.created_ids[0]
        r = requests.patch(f"{API}/timetable/{tid}", headers=admin_h,
                           json={"room": "TEST_R999"}, timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["room"] == "TEST_R999"

    def test_today(self, admin_h):
        r = requests.get(f"{API}/timetable/today", headers=admin_h, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "day" in d and "items" in d
        assert isinstance(d["items"], list)

    def test_cleanup(self, admin_h):
        for tid in TestTimetable.created_ids:
            r = requests.delete(f"{API}/timetable/{tid}", headers=admin_h, timeout=20)
            assert r.status_code == 200


# ------------------------------------------------------------------
# Points
# ------------------------------------------------------------------
class TestPoints:
    def test_leaderboard(self, admin_h):
        r = requests.get(f"{API}/points/leaderboard", headers=admin_h, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "students" in d and "classes" in d
        assert isinstance(d["students"], list)

    def test_award_and_me(self, admin_h, student_h):
        # Get student id from /auth/me
        me = requests.get(f"{API}/auth/me", headers=student_h, timeout=20).json()
        sid = me["id"]
        before = requests.get(f"{API}/points/me", headers=student_h, timeout=20).json()["total"]

        r = requests.post(f"{API}/points", headers=admin_h,
                          json={"user_id": sid, "points": 7, "reason": "TEST_regresi",
                                "category": "prestasi"}, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["points"] == 7
        assert d["user_id"] == sid

        after = requests.get(f"{API}/points/me", headers=student_h, timeout=20)
        assert after.status_code == 200
        body = after.json()
        assert body["total"] == before + 7
        assert any(h.get("reason") == "TEST_regresi" for h in body["history"])

    def test_award_requires_reason(self, admin_h, student_h):
        me = requests.get(f"{API}/auth/me", headers=student_h, timeout=20).json()
        r = requests.post(f"{API}/points", headers=admin_h,
                          json={"user_id": me["id"], "points": 1, "reason": "   ",
                                "category": "prestasi"}, timeout=20)
        assert r.status_code == 400


# ------------------------------------------------------------------
# Role perms (siswa should NOT be able to award / create timetable)
# ------------------------------------------------------------------
class TestRolePerms:
    def test_siswa_cannot_create_timetable(self, student_h, class_id):
        r = requests.post(f"{API}/timetable", headers=student_h, json={
            "class_id": class_id, "day": "Rabu", "start_time": "07:00",
            "end_time": "08:00", "subject": "TEST_X",
        }, timeout=20)
        assert r.status_code == 403, f"expected 403 got {r.status_code}"

    def test_siswa_cannot_award(self, student_h):
        me = requests.get(f"{API}/auth/me", headers=student_h, timeout=20).json()
        r = requests.post(f"{API}/points", headers=student_h,
                          json={"user_id": me["id"], "points": 1, "reason": "self",
                                "category": "prestasi"}, timeout=20)
        assert r.status_code == 403

    def test_siswa_can_view_leaderboard_and_jadwal(self, student_h):
        r = requests.get(f"{API}/points/leaderboard", headers=student_h, timeout=20)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/timetable", headers=student_h, timeout=20)
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)

    def test_siswa_can_view_own_points(self, student_h):
        r = requests.get(f"{API}/points/me", headers=student_h, timeout=20)
        assert r.status_code == 200
        assert "total" in r.json()


# ------------------------------------------------------------------
# PWA assets
# ------------------------------------------------------------------
class TestPWA:
    def test_manifest(self):
        r = requests.get(f"{BASE_URL}/manifest.json", timeout=20)
        assert r.status_code == 200, r.status_code
        d = r.json()
        assert "name" in d or "short_name" in d
        assert "icons" in d

    def test_service_worker(self):
        r = requests.get(f"{BASE_URL}/service-worker.js", timeout=20)
        assert r.status_code == 200
        assert "self" in r.text or "cache" in r.text.lower()

    def test_icon_192(self):
        r = requests.get(f"{BASE_URL}/icon-192.png", timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_icon_512(self):
        r = requests.get(f"{BASE_URL}/icon-512.png", timeout=20)
        assert r.status_code == 200

    def test_index_references_manifest_and_theme(self):
        r = requests.get(f"{BASE_URL}/", timeout=20)
        assert r.status_code == 200
        html = r.text
        assert "manifest.json" in html
        assert "#0284C7" in html or "#0284c7" in html.lower()
