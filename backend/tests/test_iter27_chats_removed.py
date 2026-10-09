"""Iteration 27: Verify /api/chats endpoints removed; other APIs still work."""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://website-import-2.preview.emergentagent.com").rstrip("/")
EMAIL = "boassibarani123@gmail.com"
PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_chats_list_removed(headers):
    r = requests.get(f"{BASE}/api/chats", headers=headers, timeout=15)
    assert r.status_code == 404, f"expected 404, got {r.status_code}"


def test_chat_messages_removed(headers):
    r = requests.get(f"{BASE}/api/chats/anyid/messages", headers=headers, timeout=15)
    assert r.status_code == 404


def test_chat_send_removed(headers):
    r = requests.post(f"{BASE}/api/chats/anyid/messages", json={"text": "hi"}, headers=headers, timeout=15)
    assert r.status_code == 404


def test_settings_still_works(headers):
    r = requests.get(f"{BASE}/api/settings", headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_loans_endpoint_works(headers):
    r = requests.get(f"{BASE}/api/loans", headers=headers, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_books_endpoint_works(headers):
    r = requests.get(f"{BASE}/api/books", headers=headers, timeout=15)
    assert r.status_code == 200
