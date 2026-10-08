"""Iter 26 regression tests: upload retry, candidate validation, feedback delete,
account roles (admin_perpus / no orang_tua), posts+announcements+settings with image."""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://website-import-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return {"Authorization": f"Bearer {tok}"}


# tiny valid PNG (1x1)
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4"
    b"\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\x5c\xcd\xff\x69\x00\x00\x00\x00IEND\xaeB`\x82"
)


# --- 1) IMAGE UPLOAD RELIABILITY ---
class TestUploadReliability:
    def test_upload_10_times(self, auth_headers):
        urls = []
        for i in range(10):
            files = {"file": (f"test_{i}.png", io.BytesIO(PNG_BYTES), "image/png")}
            r = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
            assert r.status_code == 200, f"upload #{i+1} failed: {r.status_code} {r.text[:200]}"
            d = r.json()
            assert "url" in d and d["url"].startswith("/api/files/"), d
            urls.append(d["url"])
        # verify at least one of them is retrievable
        full = f"{BASE_URL}{urls[0]}"
        r = requests.get(full, headers=auth_headers, timeout=30)
        assert r.status_code == 200, f"file not retrievable: {r.status_code}"
        assert r.headers.get("content-type", "").startswith("image/")


# --- 2) SCHOOLGRAM POST WITH IMAGE ---
class TestPostWithImage:
    def test_create_post(self, auth_headers):
        files = {"file": ("post.png", io.BytesIO(PNG_BYTES), "image/png")}
        up = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        assert up.status_code == 200
        img_url = up.json()["url"]
        r = requests.post(f"{API}/posts", headers=auth_headers,
                          json={"image": img_url, "caption": "TEST_iter26 post"}, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json().get("id")
        assert pid
        # cleanup
        requests.delete(f"{API}/posts/{pid}", headers=auth_headers, timeout=20)


# --- 3) ANNOUNCEMENT WITH IMAGE ---
class TestAnnouncementWithImage:
    def test_create_announcement(self, auth_headers):
        files = {"file": ("a.png", io.BytesIO(PNG_BYTES), "image/png")}
        up = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        img_url = up.json()["url"]
        payload = {"title": "TEST_iter26", "content": "test content",
                   "scope": "sekolah", "category": "Umum", "image": img_url}
        r = requests.post(f"{API}/announcements", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        aid = r.json().get("id")
        assert aid
        # verify persistence
        rl = requests.get(f"{API}/announcements", headers=auth_headers, timeout=20)
        assert any(a.get("id") == aid for a in rl.json())
        requests.delete(f"{API}/announcements/{aid}", headers=auth_headers, timeout=20)


# --- 4) ELECTIONS: candidate with photo + reject 'anggota' ---
class TestCandidates:
    def test_create_candidate_ketua_wakil(self, auth_headers):
        files = {"file": ("c.png", io.BytesIO(PNG_BYTES), "image/png")}
        up = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        img_url = up.json()["url"]
        for pos in ("ketua", "wakil"):
            payload = {"name": f"TEST_cand_{pos}", "position": pos,
                       "vision": "v", "mission": "m", "photo": img_url}
            r = requests.post(f"{API}/candidates", headers=auth_headers, json=payload, timeout=30)
            assert r.status_code == 200, f"{pos}: {r.status_code} {r.text}"
            cid = r.json().get("id")
            requests.delete(f"{API}/candidates/{cid}", headers=auth_headers, timeout=20)

    def test_reject_anggota(self, auth_headers):
        payload = {"name": "TEST_bad", "position": "anggota",
                   "vision": "v", "mission": "m"}
        r = requests.post(f"{API}/candidates", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 400, f"should reject anggota: {r.status_code} {r.text}"


# --- 5) SETTINGS LOGO UPLOAD ---
class TestSettings:
    def test_settings_update_with_logo(self, auth_headers):
        files = {"file": ("logo.png", io.BytesIO(PNG_BYTES), "image/png")}
        up = requests.post(f"{API}/upload", headers=auth_headers, files=files, timeout=60)
        img_url = up.json()["url"]
        # get current settings
        cur = requests.get(f"{API}/settings", timeout=20).json()
        prev_logo = cur.get("school_logo_url")
        r = requests.patch(f"{API}/settings", headers=auth_headers,
                           json={"school_logo_url": img_url}, timeout=30)
        assert r.status_code == 200, r.text
        new_s = requests.get(f"{API}/settings", timeout=20).json()
        assert new_s.get("school_logo_url") == img_url
        # restore
        if prev_logo:
            requests.patch(f"{API}/settings", headers=auth_headers,
                           json={"school_logo_url": prev_logo}, timeout=20)


# --- 6) FEEDBACK DELETE ---
class TestFeedbackDelete:
    def test_create_and_delete_feedback(self, auth_headers):
        payload = {"category": "saran", "content": "TEST_iter26 feedback", "anonymous": False}
        r = requests.post(f"{API}/feedback", headers=auth_headers, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        fid = r.json().get("id")
        assert fid
        r = requests.delete(f"{API}/feedback/{fid}", headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        # verify gone
        r = requests.delete(f"{API}/feedback/{fid}", headers=auth_headers, timeout=20)
        assert r.status_code == 404


# --- 7) BARCODE ATTENDANCE: method 'barcode' accepted ---
class TestBarcodeAttendance:
    def test_barcode_requires_identifier(self, auth_headers):
        r = requests.post(f"{API}/attendance/scan", headers=auth_headers,
                          json={"method": "barcode", "status": "hadir"}, timeout=20)
        # Either validation 400 (no NISN) OR 404 (not recognized). Must NOT be 400 'metode tidak valid'
        assert r.status_code in (400, 404)
        if r.status_code == 400:
            assert "metode" not in r.text.lower() or "nisn" in r.text.lower() or "qr" in r.text.lower()


# --- 8) ACCOUNT ROLES: admin_perpus allowed, orang_tua rejected ---
class TestAccountRoles:
    def test_create_admin_perpus(self, auth_headers):
        email = f"test_adminperpus_{uuid.uuid4().hex[:8]}@test.com"
        payload = {"email": email, "password": "Test123456",
                   "name": "TEST Admin Perpus", "role": "admin_perpus"}
        r = requests.post(f"{API}/users", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        uid = r.json().get("id")
        assert uid
        assert r.json().get("role") == "admin_perpus"
        # cleanup
        requests.delete(f"{API}/users/{uid}", headers=auth_headers, timeout=20)

    def test_orang_tua_removed_from_roles(self, auth_headers):
        # orang_tua is not in ROLES list anymore -> should 400
        email = f"test_ortu_{uuid.uuid4().hex[:8]}@test.com"
        payload = {"email": email, "password": "Test123456",
                   "name": "TEST Ortu", "role": "orang_tua"}
        r = requests.post(f"{API}/users", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 400, f"orang_tua should be rejected: {r.status_code} {r.text}"


# --- 9) BOOKS + AI SUMMARY ---
class TestBooksAI:
    def test_create_book_and_ai_summary(self, auth_headers):
        payload = {"title": "TEST_iter26 Buku", "author": "Penulis",
                   "category": "Fiksi", "description": "Cerita pendek anak sekolah."}
        rb = requests.post(f"{API}/books", headers=auth_headers, json=payload, timeout=30)
        assert rb.status_code in (200, 201), rb.text
        bid = rb.json().get("id")
        assert bid
        r = requests.post(f"{API}/books/{bid}/ai-summary", headers=auth_headers, timeout=120)
        # cleanup regardless
        requests.delete(f"{API}/books/{bid}", headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"AI summary failed: {r.status_code} {r.text[:300]}"
        body_lower = r.text.lower()
        assert "fitur ai belum aktif" not in body_lower


# --- 10) CLASSES + STUDENT CREATION (for ID card prereq) ---
class TestClassAndStudent:
    def test_create_class_and_student(self, auth_headers):
        cname = f"TEST_K{uuid.uuid4().hex[:6]}"
        rc = requests.post(f"{API}/classes", headers=auth_headers,
                           json={"name": cname, "subjects": []}, timeout=30)
        assert rc.status_code == 200, rc.text
        cid = rc.json().get("id")
        assert cid
        email = f"test_siswa_{uuid.uuid4().hex[:6]}@test.com"
        payload = {"email": email, "password": "Siswa123456",
                   "name": "TEST Siswa", "role": "siswa",
                   "nisn": f"TEST{uuid.uuid4().hex[:6]}",
                   "kelas": cname, "phone": "081234567890"}
        rs = requests.post(f"{API}/users", headers=auth_headers, json=payload, timeout=30)
        assert rs.status_code == 200, rs.text
        sid = rs.json().get("id")
        assert rs.json().get("kelas") == cname
        # cleanup
        requests.delete(f"{API}/users/{sid}", headers=auth_headers, timeout=20)
        requests.delete(f"{API}/classes/{cid}", headers=auth_headers, timeout=20)
