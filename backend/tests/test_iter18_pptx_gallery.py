"""Iteration 18: PPTX download + Public Gallery + Gallery CRUD tests."""
import os
import io
import zipfile
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
SUPER_EMAIL = 'boassibarani123@gmail.com'
SUPER_PWD = 'Boas12345io'


@pytest.fixture(scope='module')
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={'email': SUPER_EMAIL, 'password': SUPER_PWD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json().get('access_token') or r.json().get('token')


@pytest.fixture(scope='module')
def admin_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


# ---------------- Presentation PPTX ----------------
class TestPresentationPPTX:
    def test_pptx_public_download(self):
        r = requests.get(f"{BASE_URL}/api/presentation/pptx", timeout=60)
        assert r.status_code == 200, r.text
        ct = r.headers.get('content-type', '')
        assert 'presentationml.presentation' in ct, f"Unexpected content-type: {ct}"
        cd = r.headers.get('content-disposition', '')
        assert 'attachment' in cd.lower()
        # pptx is a zip
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        slide_files = [n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
        assert len(slide_files) == 10, f"Expected 10 slides, got {len(slide_files)}"


# ---------------- Gallery ----------------
class TestGallery:
    created_id = None

    def test_gallery_public_list(self):
        r = requests.get(f"{BASE_URL}/api/gallery", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        titles = [i.get('title', '') for i in data]
        assert any('Olimpiade' in t or 'Juara' in t for t in titles), titles

    def test_gallery_post_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/gallery", json={'title': 'TEST_unauth', 'category': 'prestasi'}, timeout=20)
        assert r.status_code in (401, 403), r.status_code

    def test_gallery_crud_as_admin(self, admin_headers):
        payload = {'title': 'TEST_Dokumentasi_Kegiatan', 'category': 'kegiatan', 'description': 'test item'}
        r = requests.post(f"{BASE_URL}/api/gallery", json=payload, headers=admin_headers, timeout=20)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        gid = created.get('id')
        assert gid, created
        assert created['title'] == payload['title']
        assert created['category'] == payload['category']
        TestGallery.created_id = gid

        # Verify via GET
        r2 = requests.get(f"{BASE_URL}/api/gallery", timeout=20)
        assert r2.status_code == 200
        ids = [i.get('id') for i in r2.json()]
        assert gid in ids

        # Delete
        r3 = requests.delete(f"{BASE_URL}/api/gallery/{gid}", headers=admin_headers, timeout=20)
        assert r3.status_code in (200, 204), r3.text

        # Verify removed
        r4 = requests.get(f"{BASE_URL}/api/gallery", timeout=20)
        ids4 = [i.get('id') for i in r4.json()]
        assert gid not in ids4


# ---------------- Settings academic_year ----------------
class TestSettingsAcademicYear:
    def test_academic_year_persist(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/settings", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        s = r.json()
        assert 'academic_year' in s, list(s.keys())

        new_val = '2025/2026'
        payload = dict(s)
        payload['academic_year'] = new_val
        # try PUT
        r2 = requests.put(f"{BASE_URL}/api/settings", json=payload, headers=admin_headers, timeout=20)
        if r2.status_code not in (200, 204):
            r2 = requests.patch(f"{BASE_URL}/api/settings", json={'academic_year': new_val}, headers=admin_headers, timeout=20)
        assert r2.status_code in (200, 204), r2.text

        r3 = requests.get(f"{BASE_URL}/api/settings", headers=admin_headers, timeout=20)
        assert r3.json().get('academic_year') == new_val
