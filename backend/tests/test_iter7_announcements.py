"""Backend tests for Announcements feature (Iteration 7)."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL') or ''
# Get REACT_APP_BACKEND_URL from frontend env
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"

SUPER = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
GURU = {"email": "guru.test@sekolah.id", "password": "Guru12345"}
SISWA = {"email": "siswa.test@sekolah.id", "password": "Siswa12345"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.status_code} {r.text}"
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s, r.json()["user"]


@pytest.fixture(scope="module")
def admin():
    return _login(SUPER)


@pytest.fixture(scope="module")
def guru():
    return _login(GURU)


@pytest.fixture(scope="module")
def siswa():
    return _login(SISWA)


@pytest.fixture(scope="module")
def cleanup():
    created = []
    yield created
    # cleanup as admin
    s, _ = _login(SUPER)
    for aid in created:
        try:
            s.delete(f"{API}/announcements/{aid}", timeout=15)
        except Exception:
            pass


class TestAnnouncementsCRUD:
    def test_admin_create_full_fields(self, admin, cleanup):
        s, u = admin
        payload = {
            "title": "TEST_A Prestasi Juara",
            "content": "Selamat kepada siswa juara lomba",
            "scope": "sekolah",
            "category": "Prestasi",
            "image": "https://example.com/img.jpg",
            "pinned": True,
        }
        r = s.post(f"{API}/announcements", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["category"] == "Prestasi"
        assert d["pinned"] is True
        assert d["image"] == payload["image"]
        assert d["author_id"] == u["id"]
        assert "id" in d
        cleanup.append(d["id"])

    def test_list_sorted_pinned_first(self, admin, cleanup):
        s, _ = admin
        # add non-pinned
        r = s.post(f"{API}/announcements", json={
            "title": "TEST_A Non pinned", "content": "x",
            "scope": "sekolah", "category": "Umum", "pinned": False}, timeout=30)
        cleanup.append(r.json()["id"])
        r = s.get(f"{API}/announcements", timeout=30)
        assert r.status_code == 200
        items = r.json()
        # first pinned=True item should come before any pinned=False (only within TEST_A items)
        test_items = [a for a in items if a["title"].startswith("TEST_A")]
        assert len(test_items) >= 2
        # find first pinned and first not pinned indices
        pinned_indices = [i for i, a in enumerate(test_items) if a.get("pinned")]
        unpinned_indices = [i for i, a in enumerate(test_items) if not a.get("pinned")]
        if pinned_indices and unpinned_indices:
            assert min(pinned_indices) < min(unpinned_indices), "pinned items must sort first"

    def test_admin_edit_announcement(self, admin, cleanup):
        s, _ = admin
        r = s.post(f"{API}/announcements", json={
            "title": "TEST_A Edit Me", "content": "orig", "scope": "sekolah",
            "category": "Umum"}, timeout=30)
        aid = r.json()["id"]
        cleanup.append(aid)
        r = s.patch(f"{API}/announcements/{aid}",
                    json={"title": "TEST_A Edited", "category": "Akademik"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST_A Edited"
        assert d["category"] == "Akademik"
        assert d["content"] == "orig"  # unchanged

    def test_admin_delete_announcement(self, admin):
        s, _ = admin
        r = s.post(f"{API}/announcements", json={
            "title": "TEST_A Delete Me", "content": "x", "scope": "sekolah"}, timeout=30)
        aid = r.json()["id"]
        r = s.delete(f"{API}/announcements/{aid}", timeout=30)
        assert r.status_code == 200
        # verify gone
        r = s.get(f"{API}/announcements", timeout=30)
        assert not any(a["id"] == aid for a in r.json())


class TestAnnouncementsPermissions:
    def test_siswa_cannot_create(self, siswa):
        s, _ = siswa
        r = s.post(f"{API}/announcements", json={
            "title": "TEST_A siswa try", "content": "no"}, timeout=30)
        assert r.status_code == 403

    def test_guru_can_create(self, guru, cleanup):
        s, u = guru
        r = s.post(f"{API}/announcements", json={
            "title": "TEST_A Guru Post", "content": "guru pengumuman",
            "scope": "kelas", "category": "Akademik"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["author_id"] == u["id"]
        assert d["role"] == "guru"
        cleanup.append(d["id"])

    def test_guru_cannot_edit_others(self, admin, guru, cleanup):
        sa, _ = admin
        sg, _ = guru
        # admin creates
        r = sa.post(f"{API}/announcements", json={
            "title": "TEST_A Admin Owned", "content": "x", "scope": "sekolah"}, timeout=30)
        aid = r.json()["id"]
        cleanup.append(aid)
        # guru tries to edit
        r = sg.patch(f"{API}/announcements/{aid}",
                     json={"title": "hacked"}, timeout=30)
        assert r.status_code == 403
        # guru tries to delete
        r = sg.delete(f"{API}/announcements/{aid}", timeout=30)
        assert r.status_code == 403

    def test_guru_can_edit_own(self, guru, cleanup):
        s, _ = guru
        r = s.post(f"{API}/announcements", json={
            "title": "TEST_A Guru Own", "content": "x", "scope": "kelas"}, timeout=30)
        aid = r.json()["id"]
        cleanup.append(aid)
        r = s.patch(f"{API}/announcements/{aid}",
                    json={"content": "updated by guru"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["content"] == "updated by guru"
        # guru can delete own
        r = s.delete(f"{API}/announcements/{aid}", timeout=30)
        assert r.status_code == 200

    def test_admin_can_edit_others(self, admin, guru, cleanup):
        sa, _ = admin
        sg, _ = guru
        r = sg.post(f"{API}/announcements", json={
            "title": "TEST_A Guru Made", "content": "x", "scope": "kelas"}, timeout=30)
        aid = r.json()["id"]
        cleanup.append(aid)
        r = sa.patch(f"{API}/announcements/{aid}",
                     json={"title": "TEST_A Admin Overrode"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_A Admin Overrode"

    def test_patch_nonexistent_404(self, admin):
        s, _ = admin
        r = s.patch(f"{API}/announcements/nonexistent-id-xxx",
                    json={"title": "x"}, timeout=30)
        assert r.status_code == 404


class TestUpload:
    def test_upload_image(self, admin):
        s, _ = admin
        # tiny fake PNG bytes
        png = b'\x89PNG\r\n\x1a\n' + b'\x00' * 32
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        # remove Content-Type so multipart works
        r = s.post(f"{API}/upload", files=files, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and d["url"].startswith("/api/files/")
