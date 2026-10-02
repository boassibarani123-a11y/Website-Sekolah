"""Iter 11: Org structure (unlimited depth, parent moves), login announcements, forgot-password."""
import os, time, uuid, pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://school-site-54.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"
GURU_EMAIL = "guru.demo@sekolahku.id"
DEMO_PWD = "Demo12345"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="module")
def guru_token():
    try:
        return _login(GURU_EMAIL, DEMO_PWD)
    except AssertionError:
        pytest.skip("guru demo missing")


@pytest.fixture(scope="module")
def structure_id(admin_token):
    h = {"Authorization": f"Bearer {admin_token}"}
    name = f"TEST_struct_{int(time.time())}"
    r = requests.post(f"{API}/org-structures", json={"name": name}, headers=h, timeout=20)
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    yield sid
    requests.delete(f"{API}/org-structures/{sid}", headers=h, timeout=20)


# -------- ORG: unlimited depth + cycle guard + cascade delete --------
class TestOrgTree:
    def _add(self, h, sid, parent, name):
        r = requests.post(f"{API}/org", headers=h, timeout=20, json={
            "name": name, "title": "Role", "parent_id": parent,
            "order": 0, "structure_id": sid, "dashed": False})
        assert r.status_code == 200, r.text
        return r.json()["id"]

    def test_add_nested_5_levels_and_siblings(self, admin_token, structure_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        root = self._add(h, structure_id, None, f"TEST_L1_{uuid.uuid4().hex[:6]}")
        l2a = self._add(h, structure_id, root, "TEST_L2a")
        l2b = self._add(h, structure_id, root, "TEST_L2b")  # sibling
        l3 = self._add(h, structure_id, l2a, "TEST_L3")
        l4 = self._add(h, structure_id, l3, "TEST_L4")
        l5 = self._add(h, structure_id, l4, "TEST_L5")

        r = requests.get(f"{API}/org?structure_id={structure_id}", headers=h, timeout=20)
        assert r.status_code == 200
        nodes = r.json()
        ids = {n["id"] for n in nodes}
        for nid in [root, l2a, l2b, l3, l4, l5]:
            assert nid in ids
        parents = {n["id"]: n.get("parent_id") for n in nodes}
        assert parents[l5] == l4
        assert parents[l4] == l3
        assert parents[l3] == l2a

    def test_prevent_move_into_own_descendant(self, admin_token, structure_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        a = self._add(h, structure_id, None, f"TEST_A_{uuid.uuid4().hex[:4]}")
        b = self._add(h, structure_id, a, "TEST_B")
        c = self._add(h, structure_id, b, "TEST_C")
        # Try to move A under C -> cycle
        r = requests.patch(f"{API}/org/{a}", headers=h, json={"parent_id": c}, timeout=20)
        assert r.status_code == 400, r.text

    def test_move_parent_valid(self, admin_token, structure_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        p1 = self._add(h, structure_id, None, f"TEST_P1_{uuid.uuid4().hex[:4]}")
        p2 = self._add(h, structure_id, None, f"TEST_P2_{uuid.uuid4().hex[:4]}")
        child = self._add(h, structure_id, p1, "TEST_child")
        r = requests.patch(f"{API}/org/{child}", headers=h, json={"parent_id": p2}, timeout=20)
        assert r.status_code == 200
        assert r.json()["parent_id"] == p2

    def test_delete_cascade(self, admin_token, structure_id):
        h = {"Authorization": f"Bearer {admin_token}"}
        root = self._add(h, structure_id, None, f"TEST_D_{uuid.uuid4().hex[:4]}")
        ch = self._add(h, structure_id, root, "TEST_D_ch")
        gc = self._add(h, structure_id, ch, "TEST_D_gc")
        r = requests.delete(f"{API}/org/{root}", headers=h, timeout=20)
        assert r.status_code == 200
        r = requests.get(f"{API}/org?structure_id={structure_id}", headers=h, timeout=20)
        ids = {n["id"] for n in r.json()}
        assert root not in ids and ch not in ids and gc not in ids

    def test_public_org_endpoint_no_auth(self):
        r = requests.get(f"{API}/org/public", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # ensure no demo items leak
        for n in data:
            assert not n.get("is_demo", False)


# -------- Login announcements --------
class TestLoginAnnouncements:
    def test_public_login_endpoint_no_auth(self):
        r = requests.get(f"{API}/announcements/login", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for a in data:
            # endpoint projects limited fields; shouldn't contain is_demo true items
            assert "title" in a and "content" in a

    def test_super_admin_can_set_show_on_login(self, admin_token):
        h = {"Authorization": f"Bearer {admin_token}"}
        payload = {"title": f"TEST_ann_login_{int(time.time())}",
                   "content": "Pengumuman tes banner login",
                   "scope": "sekolah", "category": "Umum", "show_on_login": True}
        r = requests.post(f"{API}/announcements", headers=h, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        try:
            # confirm appears in public login list
            r2 = requests.get(f"{API}/announcements/login", timeout=20)
            assert r2.status_code == 200
            titles = [a["title"] for a in r2.json()]
            assert payload["title"] in titles
        finally:
            requests.delete(f"{API}/announcements/{aid}", headers=h, timeout=20)

    def test_guru_forced_show_on_login_false(self, guru_token):
        h = {"Authorization": f"Bearer {guru_token}"}
        payload = {"title": f"TEST_ann_guru_{int(time.time())}",
                   "content": "guru try banner", "scope": "sekolah",
                   "show_on_login": True}
        r = requests.post(f"{API}/announcements", headers=h, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        try:
            assert r.json().get("show_on_login") in (False, None)
            # Also shouldn't appear in public login list
            r2 = requests.get(f"{API}/announcements/login", timeout=20)
            titles = [a["title"] for a in r2.json()]
            assert payload["title"] not in titles
        finally:
            requests.delete(f"{API}/announcements/{aid}", headers=h, timeout=20)


# -------- Forgot/reset password --------
class TestForgotPassword:
    def test_forgot_password_generic_response_unknown_email(self):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": f"TEST_nouser_{int(time.time())}@example.com"}, timeout=20)
        assert r.status_code == 200
        assert "message" in r.json()

    def test_forgot_password_existing_user_generic_response(self):
        # Use demo guru - safe; email endpoint called in background, won't actually be delivered to real inbox
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": GURU_EMAIL}, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "message" in body
        # Must NOT leak whether user exists (same generic msg structure)

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password",
                          json={"token": "invalid-token-xyz", "password": "newpass123"}, timeout=20)
        assert r.status_code == 400
