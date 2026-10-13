"""Backend tests for Iteration 35 — Schoolgram rework + verify-password + chat.

Covers:
- POST /api/auth/verify-password (200 correct, 401 wrong)
- GET /api/schoolgram/feed, /api/schoolgram/stories, /api/schoolgram/reels
- POST /api/schoolgram/class/{cid}/post with media_type=video shows under reels
- PATCH /api/schoolgram/class/{cid}/profile: ketua_kelas OK on own class; siswa 403 on another
- Chat: /api/chat/contacts, /api/chat/send, /api/chat/history/{peer}
"""
import os, time, uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].splitlines()[0].strip()
BASE = BASE.rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASS = "Boas12345io"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_EMAIL, ADMIN_PASS)


@pytest.fixture(scope="module")
def test_class(admin_token):
    """Ensure at least one class exists; return its id/name."""
    r = requests.get(f"{API}/classes", headers=_hdr(admin_token), timeout=30)
    assert r.status_code == 200
    classes = r.json()
    if classes:
        c = classes[0]
        return {"id": c["id"], "name": c["name"]}
    # create
    cname = f"TEST XII IPA {uuid.uuid4().hex[:4]}"
    r = requests.post(f"{API}/classes", headers=_hdr(admin_token),
                      json={"name": cname, "subjects": ["Matematika"]}, timeout=30)
    assert r.status_code in (200, 201), r.text
    cid = r.json().get("id") or r.json().get("class", {}).get("id")
    if not cid:
        r2 = requests.get(f"{API}/classes", headers=_hdr(admin_token), timeout=30)
        cid = next(c["id"] for c in r2.json() if c["name"] == cname)
    return {"id": cid, "name": cname}


@pytest.fixture(scope="module")
def ketua(admin_token, test_class):
    """Create a ketua_kelas whose kelas == test_class name."""
    tag = uuid.uuid4().hex[:6]
    email = f"test_ketua_{tag}@test.com"
    body = {"email": email, "password": "Pass12345!", "name": f"TEST Ketua {tag}",
            "role": "ketua_kelas", "kelas": test_class["name"], "phone": "081234567890"}
    r = requests.post(f"{API}/users", headers=_hdr(admin_token), json=body, timeout=30)
    assert r.status_code in (200, 201), r.text
    tok = _login(email, "Pass12345!")
    return {"email": email, "password": "Pass12345!", "token": tok}


@pytest.fixture(scope="module")
def siswa_a(admin_token):
    tag = uuid.uuid4().hex[:6]
    email = f"test_siswa_a_{tag}@test.com"
    body = {"email": email, "password": "Pass12345!", "name": f"TEST Siswa A {tag}",
            "role": "siswa", "phone": "081234567891"}
    r = requests.post(f"{API}/users", headers=_hdr(admin_token), json=body, timeout=30)
    assert r.status_code in (200, 201), r.text
    uid = r.json().get("id") or r.json().get("user", {}).get("id")
    tok = _login(email, "Pass12345!")
    # also get id via /auth/me if missing
    if not uid:
        me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=30).json()
        uid = me["id"]
    return {"email": email, "password": "Pass12345!", "token": tok, "id": uid}


@pytest.fixture(scope="module")
def siswa_b(admin_token):
    tag = uuid.uuid4().hex[:6]
    email = f"test_siswa_b_{tag}@test.com"
    body = {"email": email, "password": "Pass12345!", "name": f"TEST Siswa B {tag}",
            "role": "siswa", "phone": "081234567892"}
    r = requests.post(f"{API}/users", headers=_hdr(admin_token), json=body, timeout=30)
    assert r.status_code in (200, 201), r.text
    uid = r.json().get("id") or r.json().get("user", {}).get("id")
    tok = _login(email, "Pass12345!")
    if not uid:
        me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=30).json()
        uid = me["id"]
    return {"email": email, "password": "Pass12345!", "token": tok, "id": uid}


# -------- verify-password --------
class TestVerifyPassword:
    def test_correct(self, admin_token):
        r = requests.post(f"{API}/auth/verify-password",
                          headers=_hdr(admin_token), json={"password": ADMIN_PASS}, timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_wrong(self, admin_token):
        r = requests.post(f"{API}/auth/verify-password",
                          headers=_hdr(admin_token), json={"password": "WRONG_PW"}, timeout=30)
        assert r.status_code == 401


# -------- schoolgram feed/stories/reels --------
class TestSchoolgramFeeds:
    def test_feed(self, admin_token):
        r = requests.get(f"{API}/schoolgram/feed", headers=_hdr(admin_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_stories(self, admin_token):
        r = requests.get(f"{API}/schoolgram/stories", headers=_hdr(admin_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_reels_empty_or_list(self, admin_token):
        r = requests.get(f"{API}/schoolgram/reels", headers=_hdr(admin_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for p in data:
            assert p.get("media_type") == "video"


# -------- ketua_kelas posting video + reels appearance --------
class TestKetuaPostingAndReels:
    def test_create_video_post(self, ketua, test_class, admin_token):
        payload = {"image": "https://example.com/video.mp4",
                   "caption": "TEST reel video",
                   "media_type": "video"}
        r = requests.post(f"{API}/schoolgram/class/{test_class['id']}/post",
                          headers=_hdr(ketua["token"]), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        post = r.json()
        assert post["media_type"] == "video"
        assert post["caption"] == "TEST reel video"
        # verify under reels
        time.sleep(0.5)
        r2 = requests.get(f"{API}/schoolgram/reels", headers=_hdr(admin_token), timeout=30)
        assert r2.status_code == 200
        ids = [p["id"] for p in r2.json()]
        assert post["id"] in ids, "Newly created video post not under reels"

    def test_create_image_post_not_in_reels(self, ketua, test_class, admin_token):
        payload = {"image": "https://example.com/pic.jpg", "caption": "TEST image",
                   "media_type": "image"}
        r = requests.post(f"{API}/schoolgram/class/{test_class['id']}/post",
                          headers=_hdr(ketua["token"]), json=payload, timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        r2 = requests.get(f"{API}/schoolgram/reels", headers=_hdr(ketua["token"]), timeout=30)
        ids = [p["id"] for p in r2.json()]
        assert pid not in ids


# -------- profile edit permissions --------
class TestProfilePermissions:
    def test_ketua_can_edit_own_class(self, ketua, test_class):
        r = requests.patch(f"{API}/schoolgram/class/{test_class['id']}/profile",
                           headers=_hdr(ketua["token"]),
                           json={"description": "TEST desc from ketua"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_siswa_cannot_edit_other_class(self, siswa_a, test_class):
        r = requests.patch(f"{API}/schoolgram/class/{test_class['id']}/profile",
                           headers=_hdr(siswa_a["token"]),
                           json={"description": "nope"}, timeout=30)
        assert r.status_code == 403


# -------- chat --------
class TestChat:
    def test_contacts_lists_other_students(self, siswa_a, siswa_b):
        r = requests.get(f"{API}/chat/contacts", headers=_hdr(siswa_a["token"]), timeout=30)
        assert r.status_code == 200
        ids = [u["id"] for u in r.json()]
        assert siswa_b["id"] in ids
        assert siswa_a["id"] not in ids  # excludes self

    def test_send_and_history(self, siswa_a, siswa_b):
        text = f"hello {uuid.uuid4().hex[:4]}"
        r = requests.post(f"{API}/chat/send", headers=_hdr(siswa_a["token"]),
                          json={"to": siswa_b["id"], "text": text}, timeout=30)
        assert r.status_code == 200, r.text
        msg = r.json()
        assert msg["text"] == text
        assert msg["from_id"] == siswa_a["id"]
        assert msg["to_id"] == siswa_b["id"]
        # B fetches history with A (peer=A id)
        r2 = requests.get(f"{API}/chat/history/{siswa_a['id']}",
                          headers=_hdr(siswa_b["token"]), timeout=30)
        assert r2.status_code == 200
        hist = r2.json()
        assert any(m["text"] == text for m in hist)
        # A fetches history with B too
        r3 = requests.get(f"{API}/chat/history/{siswa_b['id']}",
                          headers=_hdr(siswa_a["token"]), timeout=30)
        assert r3.status_code == 200
        assert any(m["text"] == text for m in r3.json())

    def test_empty_text_rejected(self, siswa_a, siswa_b):
        r = requests.post(f"{API}/chat/send", headers=_hdr(siswa_a["token"]),
                          json={"to": siswa_b["id"], "text": "   "}, timeout=30)
        assert r.status_code == 400
