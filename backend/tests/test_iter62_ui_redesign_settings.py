# Iteration 62: UI redesign - backend check for settings.card_show_zynex
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL = "boassibarani123@gmail.com"
PASSWORD = "<SUPER_ADMIN_PASSWORD>"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text[:200]}")
    tok = r.json().get("token") or r.json().get("access_token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# Settings: default/public read includes card_show_zynex
def test_get_settings_has_field(client):
    r = client.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200
    assert "card_show_zynex" in r.json()
    assert isinstance(r.json()["card_show_zynex"], bool)


# Settings: PATCH false -> persisted, then restore true
def test_patch_card_show_zynex_roundtrip(client):
    r = client.patch(f"{BASE_URL}/api/settings", json={"card_show_zynex": False})
    assert r.status_code == 200, r.text
    g = client.get(f"{BASE_URL}/api/settings").json()
    assert g["card_show_zynex"] is False
    r = client.patch(f"{BASE_URL}/api/settings", json={"card_show_zynex": True})
    assert r.status_code == 200
    g = client.get(f"{BASE_URL}/api/settings").json()
    assert g["card_show_zynex"] is True
    # other fields untouched
    assert g.get("school_name")


# Settings: unauthenticated PATCH rejected
def test_patch_settings_unauth():
    r = requests.patch(f"{BASE_URL}/api/settings", json={"card_show_zynex": False})
    assert r.status_code in (401, 403)
