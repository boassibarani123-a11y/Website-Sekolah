"""Iteration 30 — Phase 2 regression:
  - Schoolgram per-kelas listing + profile
  - Schoolgram permissions (super_admin, ketua_kelas own class, ketua_kelas cross class, siswa)
  - Schoolgram stories + highlights toggle + delete
  - Schoolgram post CRUD + likes/comments via /posts
  - AI endpoints: /ai/chat, /ai/quiz-generate (siswa 403), /ai/summarize
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://fullstack-sekolah.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN = ("boassibarani123@gmail.com", "Boas12345io")
SISWA = ("andi.demo@sekolah.id", "Siswa12345")

TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def siswa_token():
    return _login(*SISWA)


@pytest.fixture(scope="module")
def xii_ipa1(admin_token):
    r = requests.get(f"{API}/schoolgram/classes", headers=_h(admin_token), timeout=30)
    assert r.status_code == 200, r.text
    classes = r.json()
    target = next((c for c in classes if c["name"] == "XII IPA 1"), None)
    assert target, f"XII IPA 1 missing from {[c['name'] for c in classes]}"
    return target


@pytest.fixture(scope="module")
def other_class(admin_token):
    """Create a secondary class if none other exists, else reuse an existing one."""
    r = requests.get(f"{API}/schoolgram/classes", headers=_h(admin_token), timeout=30)
    classes = r.json()
    other = next((c for c in classes if c["name"] != "XII IPA 1"), None)
    if other:
        return {"id": other["id"], "name": other["name"], "created": False}
    name = f"TEST_K{uuid.uuid4().hex[:4]}"
    r = requests.post(f"{API}/classes", headers=_h(admin_token),
                      json={"name": name, "description": "TEST class"}, timeout=30)
    assert r.status_code in (200, 201), r.text
    cid = r.json().get("id")
    return {"id": cid, "name": name, "created": True}


@pytest.fixture(scope="module")
def ketua_own(admin_token):
    """ketua_kelas user for XII IPA 1."""
    email = f"TEST_ketua_own_{uuid.uuid4().hex[:6]}@test.id"
    pw = "Ketua12345"
    r = requests.post(f"{API}/users", headers=_h(admin_token),
                      json={"name": "TEST Ketua Own", "email": email, "password": pw,
                            "role": "ketua_kelas", "kelas": "XII IPA 1"}, timeout=30)
    assert r.status_code in (200, 201), r.text
    uid = r.json().get("id")
    tok = _login(email, pw)
    yield {"token": tok, "id": uid, "email": email}
    requests.delete(f"{API}/users/{uid}", headers=_h(admin_token), timeout=30)


@pytest.fixture(scope="module")
def ketua_other(admin_token, other_class):
    email = f"TEST_ketua_other_{uuid.uuid4().hex[:6]}@test.id"
    pw = "Ketua12345"
    r = requests.post(f"{API}/users", headers=_h(admin_token),
                      json={"name": "TEST Ketua Other", "email": email, "password": pw,
                            "role": "ketua_kelas", "kelas": other_class["name"]}, timeout=30)
    assert r.status_code in (200, 201), r.text
    uid = r.json().get("id")
    tok = _login(email, pw)
    yield {"token": tok, "id": uid, "email": email}
    requests.delete(f"{API}/users/{uid}", headers=_h(admin_token), timeout=30)


# ---------------- Schoolgram listing + profile ----------------

class TestSchoolgramListing:
    def test_classes_list_as_admin(self, admin_token):
        r = requests.get(f"{API}/schoolgram/classes", headers=_h(admin_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        c0 = data[0]
        for k in ("id", "name", "post_count", "student_count", "can_manage", "has_story"):
            assert k in c0, f"missing {k} in {c0}"
        # admin can manage any
        assert all(c["can_manage"] is True for c in data)

    def test_classes_list_as_siswa(self, siswa_token):
        r = requests.get(f"{API}/schoolgram/classes", headers=_h(siswa_token), timeout=30)
        assert r.status_code == 200
        assert all(c["can_manage"] is False for c in r.json())

    def test_class_profile(self, admin_token, xii_ipa1):
        r = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(admin_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["class"]["id"] == xii_ipa1["id"]
        assert data["can_manage"] is True
        assert isinstance(data["posts"], list)
        assert isinstance(data["stories"], list)
        assert isinstance(data["highlights"], list)

    def test_class_profile_404(self, admin_token):
        r = requests.get(f"{API}/schoolgram/class/does-not-exist", headers=_h(admin_token), timeout=30)
        assert r.status_code == 404

    def test_ketua_own_can_manage_own_only(self, ketua_own, xii_ipa1, other_class):
        r = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(ketua_own["token"]), timeout=30)
        assert r.status_code == 200
        assert r.json()["can_manage"] is True
        r2 = requests.get(f"{API}/schoolgram/class/{other_class['id']}", headers=_h(ketua_own["token"]), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["can_manage"] is False


# ---------------- Permissions on write ops ----------------

class TestSchoolgramPermissions:
    def test_siswa_cannot_post(self, siswa_token, xii_ipa1):
        r = requests.post(f"{API}/schoolgram/class/{xii_ipa1['id']}/post",
                          headers=_h(siswa_token), json={"image": TINY_PNG, "caption": "nope"}, timeout=30)
        assert r.status_code == 403

    def test_ketua_other_cannot_post_to_xii_ipa1(self, ketua_other, xii_ipa1):
        r = requests.post(f"{API}/schoolgram/class/{xii_ipa1['id']}/post",
                          headers=_h(ketua_other["token"]), json={"image": TINY_PNG, "caption": "nope"}, timeout=30)
        assert r.status_code == 403

    def test_ketua_own_can_post_edit_delete_own(self, ketua_own, xii_ipa1):
        # Create
        r = requests.post(f"{API}/schoolgram/class/{xii_ipa1['id']}/post",
                          headers=_h(ketua_own["token"]),
                          json={"image": TINY_PNG, "caption": "TEST caption"}, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["caption"] == "TEST caption"

        # Edit
        r2 = requests.patch(f"{API}/schoolgram/post/{pid}", headers=_h(ketua_own["token"]),
                            json={"caption": "TEST edited"}, timeout=30)
        assert r2.status_code == 200

        # Verify persist via profile GET
        prof = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(ketua_own["token"]), timeout=30).json()
        p = next((p for p in prof["posts"] if p["id"] == pid), None)
        assert p and p["caption"] == "TEST edited"

        # Delete
        r3 = requests.delete(f"{API}/schoolgram/post/{pid}", headers=_h(ketua_own["token"]), timeout=30)
        assert r3.status_code == 200
        prof2 = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(ketua_own["token"]), timeout=30).json()
        assert not any(p["id"] == pid for p in prof2["posts"])

    def test_ketua_other_cannot_edit_or_delete_xii_ipa1_post(self, admin_token, ketua_other, xii_ipa1):
        # Admin creates a post in XII IPA 1
        r = requests.post(f"{API}/schoolgram/class/{xii_ipa1['id']}/post",
                          headers=_h(admin_token),
                          json={"image": TINY_PNG, "caption": "TEST admin-post"}, timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        try:
            r2 = requests.patch(f"{API}/schoolgram/post/{pid}", headers=_h(ketua_other["token"]),
                                json={"caption": "hack"}, timeout=30)
            assert r2.status_code == 403
            r3 = requests.delete(f"{API}/schoolgram/post/{pid}", headers=_h(ketua_other["token"]), timeout=30)
            assert r3.status_code == 403
        finally:
            requests.delete(f"{API}/schoolgram/post/{pid}", headers=_h(admin_token), timeout=30)


# ---------------- Stories + highlights ----------------

class TestSchoolgramStories:
    def test_story_create_highlight_delete(self, admin_token, xii_ipa1):
        r = requests.post(f"{API}/schoolgram/class/{xii_ipa1['id']}/story",
                          headers=_h(admin_token), json={"image": TINY_PNG, "caption": "TEST story"}, timeout=30)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        assert r.json()["highlighted"] is False
        # Appears as active story
        prof = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(admin_token), timeout=30).json()
        assert any(s["id"] == sid for s in prof["stories"])

        # Toggle highlight on
        r2 = requests.post(f"{API}/schoolgram/story/{sid}/highlight", headers=_h(admin_token),
                           json={"highlighted": True, "title": "TEST sorotan"}, timeout=30)
        assert r2.status_code == 200
        prof2 = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(admin_token), timeout=30).json()
        assert any(h["id"] == sid for h in prof2["highlights"])

        # Siswa cannot delete
        s_tok = _login(*SISWA)
        rd0 = requests.delete(f"{API}/schoolgram/story/{sid}", headers=_h(s_tok), timeout=30)
        assert rd0.status_code == 403

        # Delete by admin
        rd = requests.delete(f"{API}/schoolgram/story/{sid}", headers=_h(admin_token), timeout=30)
        assert rd.status_code == 200
        prof3 = requests.get(f"{API}/schoolgram/class/{xii_ipa1['id']}", headers=_h(admin_token), timeout=30).json()
        assert not any(h["id"] == sid for h in prof3["highlights"])


# ---------------- Like / comment reachable for siswa ----------------

class TestLikeComment:
    def test_siswa_like_and_comment(self, admin_token, siswa_token, xii_ipa1):
        # admin creates a post to interact with
        r = requests.post(f"{API}/schoolgram/class/{xii_ipa1['id']}/post",
                          headers=_h(admin_token), json={"image": TINY_PNG, "caption": "TEST likeme"}, timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        try:
            rl = requests.post(f"{API}/posts/{pid}/like", headers=_h(siswa_token), timeout=30)
            assert rl.status_code in (200, 201), rl.text
            rc = requests.post(f"{API}/posts/{pid}/comment", headers=_h(siswa_token),
                               json={"text": "TEST comment"}, timeout=30)
            assert rc.status_code in (200, 201), rc.text
        finally:
            requests.delete(f"{API}/schoolgram/post/{pid}", headers=_h(admin_token), timeout=30)


# ---------------- AI endpoints ----------------

class TestAI:
    def test_ai_chat(self, siswa_token):
        r = requests.post(f"{API}/ai/chat", headers=_h(siswa_token),
                          json={"message": "Halo, sapa aku dalam 1 kalimat singkat."}, timeout=90)
        assert r.status_code == 200, r.text
        reply = r.json().get("reply", "")
        assert isinstance(reply, str) and len(reply.strip()) > 0

    def test_ai_quiz_generate_siswa_forbidden(self, siswa_token):
        r = requests.post(f"{API}/ai/quiz-generate", headers=_h(siswa_token),
                          json={"topic": "fotosintesis", "count": 2}, timeout=90)
        assert r.status_code == 403

    def test_ai_quiz_generate_admin(self, admin_token):
        r = requests.post(f"{API}/ai/quiz-generate", headers=_h(admin_token),
                          json={"topic": "fotosintesis", "count": 2}, timeout=120)
        assert r.status_code == 200, r.text
        qs = r.json().get("questions", [])
        assert len(qs) >= 1
        q0 = qs[0]
        assert q0.get("q")
        assert len(q0.get("options", [])) == 4
        assert isinstance(q0.get("answer"), int) and 0 <= q0["answer"] <= 3

    def test_ai_summarize(self, admin_token):
        txt = ("Rapat OSIS membahas persiapan Pentas Seni akhir semester. Panitia dibentuk, "
               "jadwal gladi resik ditetapkan, dan anggaran disetujui. Siswa diminta mendaftar "
               "sebagai pengisi acara paling lambat Jumat.")
        r = requests.post(f"{API}/ai/summarize", headers=_h(admin_token),
                          json={"text": txt}, timeout=90)
        assert r.status_code == 200, r.text
        s = r.json().get("summary", "")
        assert "-" in s and len(s) > 10

    def test_ai_summarize_empty_400(self, admin_token):
        r = requests.post(f"{API}/ai/summarize", headers=_h(admin_token),
                          json={"text": "   "}, timeout=30)
        assert r.status_code == 400
