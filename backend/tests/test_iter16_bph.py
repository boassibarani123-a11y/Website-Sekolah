"""Iter 16: Class BPH (Badan Pengurus Harian) endpoints."""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://edu-build-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
CID = "97194f55-894d-44dc-957a-1c2a8522e2b0"  # XI IPA 1
SEED_KETUA_NODE = "d758ab62-f0d2-4363-99d3-cbadaa6d4618"
PWD = "Demo12345"


def _login(email):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": PWD})
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def h_ketua():
    return _login("kelas.demo@sekolahku.id")


@pytest.fixture(scope="module")
def h_siswa():
    return _login("siswa.demo@sekolahku.id")


@pytest.fixture(scope="module")
def h_guru():
    return _login("guru.demo@sekolahku.id")


@pytest.fixture(scope="module")
def h_admin():
    return _login("admin.demo@sekolahku.id")


created_ids = []


@pytest.fixture(scope="module", autouse=True)
def cleanup(h_ketua):
    yield
    # delete all nodes we created (keep seed)
    for nid in created_ids:
        try:
            requests.delete(f"{API}/classes/{CID}/bph/{nid}", headers=h_ketua)
        except Exception:
            pass


class TestBphRead:
    def test_get_as_ketua(self, h_ketua):
        r = requests.get(f"{API}/classes/{CID}/bph", headers=h_ketua)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(n["id"] == SEED_KETUA_NODE for n in data), "seed Ketua Demo missing"

    def test_get_as_siswa(self, h_siswa):
        r = requests.get(f"{API}/classes/{CID}/bph", headers=h_siswa)
        assert r.status_code == 200

    def test_get_as_guru(self, h_guru):
        r = requests.get(f"{API}/classes/{CID}/bph", headers=h_guru)
        assert r.status_code == 200

    def test_get_as_super_admin(self, h_admin):
        r = requests.get(f"{API}/classes/{CID}/bph", headers=h_admin)
        assert r.status_code == 200


class TestBphWritePermissions:
    """Only ketua of this class can write (not super_admin, not guru, not siswa)."""

    def _payload(self, name="TEST_perm", parent=None):
        return {"name": name, "title": "Tester", "parent_id": parent, "order": 99}

    def test_post_forbidden_siswa(self, h_siswa):
        r = requests.post(f"{API}/classes/{CID}/bph", json=self._payload(), headers=h_siswa)
        assert r.status_code == 403

    def test_post_forbidden_guru(self, h_guru):
        r = requests.post(f"{API}/classes/{CID}/bph", json=self._payload(), headers=h_guru)
        assert r.status_code == 403

    def test_post_forbidden_super_admin(self, h_admin):
        r = requests.post(f"{API}/classes/{CID}/bph", json=self._payload(), headers=h_admin)
        assert r.status_code == 403, "super_admin should NOT be able to modify class BPH"

    def test_patch_forbidden_super_admin(self, h_admin):
        r = requests.patch(f"{API}/classes/{CID}/bph/{SEED_KETUA_NODE}", json={"title": "Hacked"}, headers=h_admin)
        assert r.status_code == 403

    def test_delete_forbidden_siswa(self, h_siswa):
        r = requests.delete(f"{API}/classes/{CID}/bph/{SEED_KETUA_NODE}", headers=h_siswa)
        assert r.status_code == 403


class TestBphCrudKetua:
    def test_create_puncak(self, h_ketua):
        r = requests.post(f"{API}/classes/{CID}/bph", headers=h_ketua,
                          json={"name": "TEST_Wakil", "title": "Wakil Ketua", "order": 1})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Wakil"
        assert d["class_id"] == CID
        assert d.get("parent_id") in (None, "")
        created_ids.append(d["id"])

    def test_create_bawahan_multi_depth(self, h_ketua):
        """Create 5-depth chain under seed Ketua Demo."""
        parent = SEED_KETUA_NODE
        for depth in range(1, 6):
            r = requests.post(f"{API}/classes/{CID}/bph", headers=h_ketua,
                              json={"name": f"TEST_Lapis{depth+1}", "title": f"Jabatan L{depth+1}",
                                    "parent_id": parent, "order": 0})
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["parent_id"] == parent
            created_ids.append(d["id"])
            parent = d["id"]

    def test_create_siblings(self, h_ketua):
        for i in range(3):
            r = requests.post(f"{API}/classes/{CID}/bph", headers=h_ketua,
                              json={"name": f"TEST_Sib{i}", "title": "Sekretaris", "parent_id": SEED_KETUA_NODE,
                                    "order": 10 + i, "dashed": i == 2})
            assert r.status_code == 200
            created_ids.append(r.json()["id"])

    def test_edit_title(self, h_ketua):
        nid = created_ids[0]
        r = requests.patch(f"{API}/classes/{CID}/bph/{nid}", headers=h_ketua,
                           json={"title": "Wakil Ketua Edited"})
        assert r.status_code == 200
        # verify
        r2 = requests.get(f"{API}/classes/{CID}/bph", headers=h_ketua)
        node = next(n for n in r2.json() if n["id"] == nid)
        assert node["title"] == "Wakil Ketua Edited"

    def test_move_parent(self, h_ketua):
        """Move last sibling to be child of first-created TEST_Wakil."""
        target_parent = created_ids[0]
        nid = created_ids[-1]
        r = requests.patch(f"{API}/classes/{CID}/bph/{nid}", headers=h_ketua,
                           json={"parent_id": target_parent, "order": 0})
        assert r.status_code == 200
        r2 = requests.get(f"{API}/classes/{CID}/bph", headers=h_ketua)
        node = next(n for n in r2.json() if n["id"] == nid)
        assert node["parent_id"] == target_parent

    def test_cycle_prevention(self, h_ketua):
        """Try to set seed ketua's parent to a descendant - should 400."""
        # created_ids[1..5] are depth chain under seed. Try to set seed's parent to created_ids[1].
        if len(created_ids) < 2:
            pytest.skip("need chain")
        r = requests.patch(f"{API}/classes/{CID}/bph/{SEED_KETUA_NODE}", headers=h_ketua,
                           json={"parent_id": created_ids[1]})
        assert r.status_code == 400, f"expected 400 for cycle, got {r.status_code} {r.text}"

    def test_delete_cascade(self, h_ketua):
        """Create a parent with 2 children, delete parent -> both gone."""
        r = requests.post(f"{API}/classes/{CID}/bph", headers=h_ketua,
                          json={"name": "TEST_ParentDel", "title": "P", "order": 50})
        parent = r.json()["id"]
        kids = []
        for i in range(2):
            rr = requests.post(f"{API}/classes/{CID}/bph", headers=h_ketua,
                               json={"name": f"TEST_Kid{i}", "title": "K", "parent_id": parent, "order": i})
            kids.append(rr.json()["id"])
        # delete parent
        d = requests.delete(f"{API}/classes/{CID}/bph/{parent}", headers=h_ketua)
        assert d.status_code == 200
        r3 = requests.get(f"{API}/classes/{CID}/bph", headers=h_ketua).json()
        ids = {n["id"] for n in r3}
        assert parent not in ids
        for k in kids:
            assert k not in ids, f"child {k} not cascaded"

    def test_parent_not_found(self, h_ketua):
        r = requests.post(f"{API}/classes/{CID}/bph", headers=h_ketua,
                          json={"name": "TEST_bad", "title": "X", "parent_id": "nonexistent-id-xyz"})
        assert r.status_code == 404


class TestBphIsolation:
    def test_nodes_scoped_to_class(self, h_ketua):
        """All returned nodes must have class_id == CID."""
        r = requests.get(f"{API}/classes/{CID}/bph", headers=h_ketua)
        for n in r.json():
            assert n.get("class_id") == CID
