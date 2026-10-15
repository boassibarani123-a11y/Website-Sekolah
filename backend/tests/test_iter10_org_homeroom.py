"""Iteration 10: Org Structure CRUD + Homeroom Auto-Assign tests"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = ("admin.demo@sekolahku.id", "Demo12345")
GURU = ("guru.demo@sekolahku.id", "Demo12345")
SISWA = ("siswa.demo@sekolahku.id", "Demo12345")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_tok():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def guru_tok():
    return _login(*GURU)


@pytest.fixture(scope="module")
def siswa_tok():
    return _login(*SISWA)


@pytest.fixture(scope="module")
def guru_id(admin_tok):
    r = requests.get(f"{API}/users", headers=H(admin_tok), timeout=15)
    assert r.status_code == 200
    for u in r.json():
        if u.get("email") == GURU[0]:
            return u["id"]
    pytest.fail("guru.demo not found")


# ---------------- ORG BACKEND ----------------

class TestOrgBackend:
    def test_list_org_authenticated(self, siswa_tok):
        r = requests.get(f"{API}/org", headers=H(siswa_tok), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_non_admin_cannot_create(self, guru_tok):
        r = requests.post(f"{API}/org", headers=H(guru_tok), json={"name": "X", "title": "Y"}, timeout=15)
        assert r.status_code == 403

    def test_create_deep_tree_and_cascade_delete(self, admin_tok):
        ts = int(time.time())
        # Root
        r = requests.post(f"{API}/org", headers=H(admin_tok),
                          json={"name": f"TEST_Root_{ts}", "title": "Kepala"}, timeout=15)
        assert r.status_code == 200, r.text
        root = r.json()
        assert root["parent_id"] is None
        assert "_id" not in root

        # Child
        r = requests.post(f"{API}/org", headers=H(admin_tok),
                          json={"name": f"TEST_Child_{ts}", "title": "Wakil", "parent_id": root["id"]}, timeout=15)
        assert r.status_code == 200
        child = r.json()
        assert child["parent_id"] == root["id"]

        # Grandchild
        r = requests.post(f"{API}/org", headers=H(admin_tok),
                          json={"name": f"TEST_GC_{ts}", "title": "Staff", "parent_id": child["id"]}, timeout=15)
        assert r.status_code == 200
        gc = r.json()

        # Great-grandchild
        r = requests.post(f"{API}/org", headers=H(admin_tok),
                          json={"name": f"TEST_GGC_{ts}", "title": "Anggota", "parent_id": gc["id"]}, timeout=15)
        assert r.status_code == 200
        ggc = r.json()
        assert ggc["parent_id"] == gc["id"]

        # Invalid parent -> 404
        r = requests.post(f"{API}/org", headers=H(admin_tok),
                          json={"name": "X", "title": "Y", "parent_id": "nonexistent-abc"}, timeout=15)
        assert r.status_code == 404

        # PATCH self-parent -> 400
        r = requests.patch(f"{API}/org/{child['id']}", headers=H(admin_tok),
                           json={"parent_id": child["id"]}, timeout=15)
        assert r.status_code == 400

        # PATCH update field
        r = requests.patch(f"{API}/org/{child['id']}", headers=H(admin_tok),
                           json={"title": "Wakil Kepala Updated"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["title"] == "Wakil Kepala Updated"

        # Cascade DELETE root -> all descendants gone
        r = requests.delete(f"{API}/org/{root['id']}", headers=H(admin_tok), timeout=15)
        assert r.status_code == 200

        r = requests.get(f"{API}/org", headers=H(admin_tok), timeout=15)
        ids = {n["id"] for n in r.json()}
        for nid in [root["id"], child["id"], gc["id"], ggc["id"]]:
            assert nid not in ids, f"node {nid} not cascade-deleted"

    def test_non_admin_patch_delete_forbidden(self, admin_tok, guru_tok):
        # create as admin
        r = requests.post(f"{API}/org", headers=H(admin_tok),
                          json={"name": "TEST_ForbidTarget", "title": "T"}, timeout=15)
        nid = r.json()["id"]
        try:
            r1 = requests.patch(f"{API}/org/{nid}", headers=H(guru_tok), json={"title": "hack"}, timeout=15)
            assert r1.status_code == 403
            r2 = requests.delete(f"{API}/org/{nid}", headers=H(guru_tok), timeout=15)
            assert r2.status_code == 403
        finally:
            requests.delete(f"{API}/org/{nid}", headers=H(admin_tok), timeout=15)


# ---------------- HOMEROOM BACKEND ----------------

class TestHomeroomBackend:
    def test_homeroom_assign_unlocks_guru(self, admin_tok, guru_tok, guru_id):
        ts = int(time.time())
        cname = f"TEST_KelasHR_{ts}"
        # Create class as admin
        r = requests.post(f"{API}/classes", headers=H(admin_tok),
                          json={"name": cname, "subjects": ["Math"]}, timeout=15)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]

        try:
            # Before assignment, guru cannot patch this class
            r = requests.patch(f"{API}/classes/{cid}", headers=H(guru_tok),
                               json={"description": "guru attempt"}, timeout=15)
            assert r.status_code == 403

            # Admin assigns guru as homeroom
            r = requests.patch(f"{API}/classes/{cid}", headers=H(admin_tok),
                               json={"homeroom_teacher_id": guru_id}, timeout=15)
            assert r.status_code == 200
            body = r.json()
            assert body.get("homeroom_teacher_id") == guru_id

            # GET /classes returns homeroom_teacher_name
            r = requests.get(f"{API}/classes", headers=H(admin_tok), timeout=15)
            match = [c for c in r.json() if c["id"] == cid]
            assert match and match[0].get("homeroom_teacher_name")

            # Now guru CAN edit
            r = requests.patch(f"{API}/classes/{cid}", headers=H(guru_tok),
                               json={"description": "by homeroom guru"}, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json().get("description") == "by homeroom guru"

            # Guru can post assignment (tugas) targeting this class
            r = requests.post(f"{API}/assignments", headers=H(guru_tok),
                              json={"title": "TEST_Tugas_HR", "description": "d",
                                    "class_id": cid, "kelas": cname,
                                    "subject": "Math",
                                    "due_date": "2026-12-31T23:59:00"}, timeout=15)
            assert r.status_code in (200, 201), f"tugas post failed: {r.status_code} {r.text}"
        finally:
            requests.delete(f"{API}/classes/{cid}", headers=H(admin_tok), timeout=15)
