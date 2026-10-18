# Import smoke test (iteration 37): settings, auth, cron auth guards, admin GET endpoints sweep
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "boassibarani123@gmail.com", "password": "<SUPER_ADMIN_PASSWORD>"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# Settings (public)
def test_settings_public():
    r = requests.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_health():
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200


# Auth
def test_login_success():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["token"], str) and d["token"]
    assert d["user"]["email"] == ADMIN["email"]
    assert "password_hash" not in d["user"]
    assert "_id" not in d["user"]


def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "TEST_nouser@example.com", "password": "wrong123"})
    assert r.status_code == 401


def test_me(auth):
    r = auth.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]
    assert r.json().get("role") == "super_admin"


def test_me_unauth():
    assert requests.get(f"{BASE_URL}/api/auth/me").status_code == 401


# Cron endpoints must reject without auth / wrong secret
CRONS = ["attendance-archive", "attendance-reminder", "attendance-auto-alpha",
         "kas-reminder", "piket-reminder", "agenda-reminder"]


@pytest.mark.parametrize("job", CRONS)
def test_cron_unauth(job):
    r = requests.post(f"{BASE_URL}/api/cron/{job}", json={"run_id": "TEST_x"})
    assert r.status_code == 401
    r2 = requests.post(f"{BASE_URL}/api/cron/{job}", json={"run_id": "TEST_x"},
                       headers={"Authorization": "Bearer wrong"})
    assert r2.status_code == 401


# Sweep of admin GET list endpoints backing sidebar pages: none should 5xx
GETS = ["/users", "/classes", "/org-structures", "/org-structures/public", "/org", "/org/public",
        "/attendance/stations", "/attendance", "/attendance/stats", "/attendance/week", "/attendance/archives",
        "/inventory", "/borrow", "/assignments", "/submissions", "/subjects", "/reschedules", "/quizzes",
        "/exams", "/posts", "/announcements", "/announcements/login", "/social-fund", "/candidates",
        "/my-votes", "/election/status", "/election/stats", "/feedback", "/feedback/mine", "/achievements",
        "/stats", "/notifications", "/analytics/kepsek", "/admin/reset-requests", "/admin/audit-logs",
        "/reports-summary", "/email/status", "/events", "/ppdb", "/library/config", "/books/categories",
        "/library/stats", "/library/popular", "/books", "/loans/my", "/loans", "/reservations", "/gallery",
        "/profile-achievements", "/timetable", "/timetable/today", "/points/me", "/points/leaderboard",
        "/points/manage", "/schoolgram/classes", "/schoolgram/feed", "/schoolgram/stories", "/schoolgram/reels",
        "/piket/teachers", "/piket/shifts", "/piket/now", "/piket/report", "/face/students",
        "/teacher-attendance", "/teacher-attendance/week", "/teacher-attendance/archives",
        "/public/guest-hours", "/guests", "/guests/summary", "/ik/context", "/ik", "/question-bank",
        "/inventory-rooms", "/inventory-stats", "/inventory-activity", "/teacher-attendance/monthly",
        "/gate/settings", "/gate/monitor", "/gate/me", "/auth/reset-options", "/question-bank/stock",
        "/ai/status", "/exam-types", "/exam-requests", "/live/settings", "/live/health", "/live/monitor"]


@pytest.mark.parametrize("path", GETS)
def test_admin_get_no_5xx(auth, path):
    r = auth.get(f"{BASE_URL}/api{path}")
    assert r.status_code < 500, f"{path} -> {r.status_code}: {r.text[:200]}"
