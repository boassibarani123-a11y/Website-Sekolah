"""Iteration 24 — Galeri Prestasi (Profile Achievements) backend tests.

Covers:
- Public GET /api/profile-achievements (no auth)
- Role enforcement for POST/PATCH/DELETE (super_admin only)
- CRUD lifecycle + 404 handling
- 403 for non-super-admin (guru)
Cleans up all TEST_ data at the end.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

SUPER = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
GURU_EMAIL = f"test_guru_{uuid.uuid4().hex[:6]}@example.com"
GURU_PASS = "GuruTest123!"

created_ach_ids = []
created_user_ids = []


@pytest.fixture(scope="module")
def super_token():
    r = requests.post(f"{API}/auth/login", json=SUPER, timeout=15)
    assert r.status_code == 200, f"Super admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def guru_token(super_token):
    # Create guru user via super admin
    headers = {"Authorization": f"Bearer {super_token}"}
    payload = {
        "email": GURU_EMAIL,
        "password": GURU_PASS,
        "name": "TEST Guru Uji",
        "role": "guru",
    }
    r = requests.post(f"{API}/users", json=payload, headers=headers, timeout=15)
    assert r.status_code in (200, 201), f"Create guru failed: {r.status_code} {r.text}"
    created_user_ids.append(r.json()["id"])
    # Login as guru
    rl = requests.post(f"{API}/auth/login", json={"email": GURU_EMAIL, "password": GURU_PASS}, timeout=15)
    assert rl.status_code == 200, f"Guru login failed: {rl.text}"
    return rl.json()["token"]


# ---------- Public GET ----------
def test_public_get_no_auth():
    r = requests.get(f"{API}/profile-achievements", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)


# ---------- Unauthenticated writes ----------
def test_post_without_auth_401():
    r = requests.post(f"{API}/profile-achievements",
                      json={"title": "TEST_x", "year": "2025", "level": "Sekolah"}, timeout=15)
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


# ---------- Super admin CRUD ----------
def test_super_admin_crud_lifecycle(super_token):
    headers = {"Authorization": f"Bearer {super_token}"}
    payload = {
        "title": "TEST_Juara 1 OSN Matematika",
        "year": "2025",
        "level": "Nasional",
        "description": "TEST deskripsi prestasi",
        "image_url": "",
    }
    # POST
    r = requests.post(f"{API}/profile-achievements", json=payload, headers=headers, timeout=15)
    assert r.status_code in (200, 201), f"POST failed: {r.status_code} {r.text}"
    item = r.json()
    assert item["title"] == payload["title"]
    assert item["level"] == "Nasional"
    assert item["year"] == "2025"
    assert "id" in item
    aid = item["id"]
    created_ach_ids.append(aid)

    # GET verifies persistence
    r2 = requests.get(f"{API}/profile-achievements", timeout=15)
    assert r2.status_code == 200
    assert any(x["id"] == aid for x in r2.json())

    # PATCH
    upd = {**payload, "title": "TEST_Juara 1 OSN Matematika (updated)", "level": "Internasional"}
    r3 = requests.patch(f"{API}/profile-achievements/{aid}", json=upd, headers=headers, timeout=15)
    assert r3.status_code == 200, f"PATCH failed: {r3.text}"
    assert r3.json()["title"].endswith("(updated)")
    assert r3.json()["level"] == "Internasional"

    # PATCH 404
    r4 = requests.patch(f"{API}/profile-achievements/non-existent-id",
                        json=upd, headers=headers, timeout=15)
    assert r4.status_code == 404

    # DELETE
    r5 = requests.delete(f"{API}/profile-achievements/{aid}", headers=headers, timeout=15)
    assert r5.status_code == 200
    created_ach_ids.remove(aid)

    # DELETE 404
    r6 = requests.delete(f"{API}/profile-achievements/{aid}", headers=headers, timeout=15)
    assert r6.status_code == 404


# ---------- Role enforcement: guru forbidden ----------
def test_guru_forbidden_post(guru_token):
    headers = {"Authorization": f"Bearer {guru_token}"}
    r = requests.post(f"{API}/profile-achievements",
                      json={"title": "TEST_guru", "year": "2025", "level": "Sekolah"},
                      headers=headers, timeout=15)
    assert r.status_code == 403, f"Expected 403, got {r.status_code} {r.text}"


def test_guru_forbidden_patch_delete(super_token, guru_token):
    # First create as super admin
    sh = {"Authorization": f"Bearer {super_token}"}
    gh = {"Authorization": f"Bearer {guru_token}"}
    r = requests.post(f"{API}/profile-achievements",
                      json={"title": "TEST_for_role_check", "year": "2025", "level": "Sekolah"},
                      headers=sh, timeout=15)
    assert r.status_code in (200, 201)
    aid = r.json()["id"]
    created_ach_ids.append(aid)

    rp = requests.patch(f"{API}/profile-achievements/{aid}",
                        json={"title": "x", "year": "2025", "level": "Sekolah"},
                        headers=gh, timeout=15)
    assert rp.status_code == 403

    rd = requests.delete(f"{API}/profile-achievements/{aid}", headers=gh, timeout=15)
    assert rd.status_code == 403


# ---------- Cleanup ----------
def test_zz_cleanup(super_token):
    sh = {"Authorization": f"Bearer {super_token}"}
    for aid in list(created_ach_ids):
        requests.delete(f"{API}/profile-achievements/{aid}", headers=sh, timeout=15)
    for uid in list(created_user_ids):
        requests.delete(f"{API}/users/{uid}", headers=sh, timeout=15)
    # Verify no TEST_ data remains
    r = requests.get(f"{API}/profile-achievements", timeout=15)
    remaining = [x for x in r.json() if str(x.get("title", "")).startswith("TEST_")]
    assert remaining == [], f"Leftover TEST_ achievements: {remaining}"
