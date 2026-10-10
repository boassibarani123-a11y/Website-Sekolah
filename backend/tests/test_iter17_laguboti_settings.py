"""Iter 17 tests: SMA Negeri 1 Laguboti settings/login/presentation."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://github-school-build.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PW = "Boas12345io"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json().get("access_token") or r.json().get("token")


# ---------------- GET /api/settings (public) ----------------
def test_settings_public_contains_laguboti_fields():
    r = requests.get(f"{BASE_URL}/api/settings", timeout=20)
    assert r.status_code == 200
    s = r.json()
    assert s.get("school_name") == "SMA NEGERI 1 LAGUBOTI"
    assert s.get("npsn") == "10208460"
    assert s.get("nss") == "301070818006"
    assert s.get("land_area") == "3.444 m²"
    assert "A" in (s.get("accreditation") or "")
    assert "Panjaitan" in (s.get("principal_name") or "")
    assert isinstance(s.get("mission"), list) and len(s["mission"]) == 13
    assert isinstance(s.get("history_periods"), list) and len(s["history_periods"]) == 14
    assert isinstance(s.get("goals"), list) and len(s["goals"]) >= 10
    assert isinstance(s.get("environment"), list) and len(s["environment"]) >= 5
    assert isinstance(s.get("goals_short"), list)
    assert isinstance(s.get("goals_medium"), list)
    assert isinstance(s.get("goals_long"), list)
    assert isinstance(s.get("targets"), list)
    # login_* fields
    for k in [
        "login_badge", "login_headline", "login_description",
        "login_welcome_title", "login_welcome_subtitle", "login_footer",
    ]:
        assert k in s and s[k], f"missing login field {k}"


# ---------------- PATCH /api/settings auth guard ----------------
def test_settings_patch_requires_auth():
    r = requests.patch(f"{BASE_URL}/api/settings", json={"login_headline": "x"}, timeout=20)
    assert r.status_code in (401, 403)


# ---------------- PATCH /api/settings as super_admin ----------------
def test_settings_patch_login_and_lists_persist(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    # read current to restore later
    orig = requests.get(f"{BASE_URL}/api/settings", timeout=20).json()
    new_headline = "TEST_HEADLINE_IT17"
    new_welcome = "TEST_WELCOME_IT17"
    new_mission = (orig.get("mission") or [])[:] + ["TEST_MISSION_IT17"]
    new_goals = (orig.get("goals") or [])[:] + ["TEST_GOAL_IT17"]
    new_history_periods = (orig.get("history_periods") or [])[:] + ["TEST_PERIOD_IT17"]

    r = requests.patch(
        f"{BASE_URL}/api/settings",
        headers=headers,
        json={
            "login_headline": new_headline,
            "login_welcome_title": new_welcome,
            "mission": new_mission,
            "goals": new_goals,
            "history_periods": new_history_periods,
        },
        timeout=20,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["login_headline"] == new_headline
    assert body["login_welcome_title"] == new_welcome
    assert "TEST_MISSION_IT17" in body["mission"]
    assert "TEST_GOAL_IT17" in body["goals"]
    assert "TEST_PERIOD_IT17" in body["history_periods"]

    # verify persistence via GET
    g = requests.get(f"{BASE_URL}/api/settings", timeout=20).json()
    assert g["login_headline"] == new_headline
    assert g["login_welcome_title"] == new_welcome
    assert "TEST_MISSION_IT17" in g["mission"]

    # restore
    rr = requests.patch(
        f"{BASE_URL}/api/settings",
        headers=headers,
        json={
            "login_headline": orig.get("login_headline"),
            "login_welcome_title": orig.get("login_welcome_title"),
            "mission": orig.get("mission"),
            "goals": orig.get("goals"),
            "history_periods": orig.get("history_periods"),
        },
        timeout=20,
    )
    assert rr.status_code == 200
