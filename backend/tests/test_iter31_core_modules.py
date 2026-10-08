"""Iter31: E2E of 6 core modules (Absensi QR, Schoolgram, Inventaris, Tugas, Kuis,
Pemilu OSIS) + Kartu Pelajar logo settings. Backend-only. Uses the preview URL
from REACT_APP_BACKEND_URL.
"""
import os, time, uuid, requests, pytest

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
ADMIN = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
TAG = f"ITER31_{uuid.uuid4().hex[:6]}"


def _login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, (email, r.status_code, r.text)
    return r.json()["token"]


def _h(tok): return {"Authorization": f"Bearer {tok}"}


# ----- Session-scoped setup: create guru / siswa / ketua_osis + class -----
@pytest.fixture(scope="session")
def ctx():
    admin_tok = _login(**ADMIN)
    # verify role
    me = requests.get(f"{BASE}/auth/me", headers=_h(admin_tok), timeout=10).json()
    assert me["role"] == "super_admin"

    # class
    cname = f"TEST_{TAG}_X"
    r = requests.post(f"{BASE}/classes", headers=_h(admin_tok),
                      json={"name": cname, "subjects": ["Matematika"]}, timeout=10)
    assert r.status_code in (200, 201), r.text
    cls = r.json()
    class_id, class_name = cls["id"], cls["name"]

    # guru teaching Matematika
    guru_email = f"test_guru_{TAG.lower()}@sma.id"
    g = requests.post(f"{BASE}/users", headers=_h(admin_tok), json={
        "email": guru_email, "password": "Guru12345", "name": f"TEST Guru {TAG}",
        "role": "guru", "subjects": ["Matematika"]}, timeout=10)
    assert g.status_code == 200, g.text
    guru = g.json()

    # siswa in that class (requires phone)
    siswa_email = f"test_siswa_{TAG.lower()}@sma.id"
    s = requests.post(f"{BASE}/users", headers=_h(admin_tok), json={
        "email": siswa_email, "password": "Siswa12345", "name": f"TEST Siswa {TAG}",
        "role": "siswa", "kelas": class_name, "nisn": "9999999901",
        "phone": "081234567890"}, timeout=10)
    assert s.status_code == 200, s.text
    siswa = s.json()

    # ketua_osis
    kosis_email = f"test_kosis_{TAG.lower()}@sma.id"
    k = requests.post(f"{BASE}/users", headers=_h(admin_tok), json={
        "email": kosis_email, "password": "Kosis12345", "name": f"TEST KOsis {TAG}",
        "role": "ketua_osis", "kelas": class_name}, timeout=10)
    assert k.status_code == 200, k.text

    guru_tok = _login(guru_email, "Guru12345")
    siswa_tok = _login(siswa_email, "Siswa12345")
    kosis_tok = _login(kosis_email, "Kosis12345")

    yield {
        "admin": admin_tok, "guru": guru_tok, "siswa": siswa_tok, "kosis": kosis_tok,
        "class_id": class_id, "class_name": class_name,
        "siswa_id": siswa["id"], "siswa_qr": siswa["qr_code"],
        "siswa_nisn": siswa["nisn"], "guru_id": guru["id"],
    }

    # teardown
    for em in (guru_email, siswa_email, kosis_email):
        u = requests.get(f"{BASE}/users", headers=_h(admin_tok), timeout=10).json()
        for x in u:
            if x.get("email") == em:
                requests.delete(f"{BASE}/users/{x['id']}", headers=_h(admin_tok), timeout=10)
    requests.delete(f"{BASE}/classes/{class_id}", headers=_h(admin_tok), timeout=10)


# -------------- AUTH --------------
def test_auth_super_admin():
    tok = _login(**ADMIN)
    me = requests.get(f"{BASE}/auth/me", headers=_h(tok), timeout=10).json()
    assert me["role"] == "super_admin"
    assert me["email"] == ADMIN["email"].lower()


def test_user_roles_login(ctx):
    # all 3 created users can log in (already logged in in fixture)
    for role in ("guru", "siswa", "kosis"):
        r = requests.get(f"{BASE}/auth/me", headers=_h(ctx[role]), timeout=10)
        assert r.status_code == 200 and r.json()["role"] in ("guru", "siswa", "ketua_osis")


def test_siswa_requires_phone(ctx):
    r = requests.post(f"{BASE}/users", headers=_h(ctx["admin"]), json={
        "email": f"nophone_{TAG.lower()}@x.id", "password": "P12345",
        "name": "No Phone", "role": "siswa", "kelas": ctx["class_name"]}, timeout=10)
    assert r.status_code == 400


# -------------- CLASSES --------------
def test_class_created_and_listed(ctx):
    r = requests.get(f"{BASE}/classes", headers=_h(ctx["admin"]), timeout=10)
    assert r.status_code == 200
    assert any(c["id"] == ctx["class_id"] for c in r.json())


# -------------- ABSENSI QR --------------
def test_attendance_scan_and_list(ctx):
    r = requests.post(f"{BASE}/attendance/scan", headers=_h(ctx["admin"]),
                      json={"qr_code": ctx["siswa_qr"], "status": "hadir", "method": "qr"}, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] and j["status"] == "hadir"

    lst = requests.get(f"{BASE}/attendance", headers=_h(ctx["admin"]), timeout=10).json()
    assert any(a["student_id"] == ctx["siswa_id"] for a in lst)

    stats = requests.get(f"{BASE}/attendance/stats", headers=_h(ctx["admin"]), timeout=10).json()
    assert stats["total_siswa"] >= 1 and stats["hadir"] >= 1


def test_attendance_scan_by_nisn(ctx):
    r = requests.post(f"{BASE}/attendance/scan", headers=_h(ctx["admin"]),
                      json={"nisn": ctx["siswa_nisn"], "status": "izin", "method": "manual"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "izin"


def test_attendance_confirm_invalid_token():
    # Confirm endpoint redirects (303) with ?result=invalid on bad token
    r = requests.get(f"{BASE}/attendance/confirm?token=badtoken&status=izin",
                     allow_redirects=False, timeout=10)
    assert r.status_code in (302, 303, 307)
    assert "result=invalid" in r.headers.get("location", "")


# -------------- SCHOOLGRAM --------------
def test_schoolgram_post_like_comment(ctx):
    # super_admin may post (image can be a short string placeholder)
    r = requests.post(f"{BASE}/posts", headers=_h(ctx["admin"]),
                      json={"image": "https://example.com/x.png",
                            "caption": f"{TAG} hello"}, timeout=10)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]

    lst = requests.get(f"{BASE}/posts", headers=_h(ctx["siswa"]), timeout=10).json()
    assert any(p["id"] == pid for p in lst)

    lk = requests.post(f"{BASE}/posts/{pid}/like", headers=_h(ctx["siswa"]), timeout=10)
    assert lk.status_code == 200 and lk.json()["liked"] is True

    cm = requests.post(f"{BASE}/posts/{pid}/comment", headers=_h(ctx["siswa"]),
                       json={"text": "mantap"}, timeout=10)
    assert cm.status_code == 200 and cm.json()["text"] == "mantap"


# -------------- INVENTARIS --------------
def test_inventory_crud_and_borrow(ctx):
    r = requests.post(f"{BASE}/inventory", headers=_h(ctx["admin"]),
                      json={"name": f"TEST_{TAG}_Item", "category": "Elektronik",
                            "stock": 10, "condition": "Baik"}, timeout=10)
    assert r.status_code == 200, r.text
    iid = r.json()["id"]

    lst = requests.get(f"{BASE}/inventory", headers=_h(ctx["admin"]), timeout=10).json()
    assert any(i["id"] == iid for i in lst)

    br = requests.post(f"{BASE}/borrow", headers=_h(ctx["siswa"]),
                       json={"item_id": iid, "quantity": 2, "purpose": "praktikum",
                             "return_date": "2026-12-31"}, timeout=10)
    assert br.status_code == 200, br.text

    hist = requests.get(f"{BASE}/inventory/{iid}/history", headers=_h(ctx["admin"]), timeout=10)
    assert hist.status_code == 200 and len(hist.json()) >= 1

    requests.delete(f"{BASE}/inventory/{iid}", headers=_h(ctx["admin"]), timeout=10)


# -------------- TUGAS --------------
def test_assignment_and_submission(ctx):
    r = requests.post(f"{BASE}/assignments", headers=_h(ctx["admin"]),
                      json={"title": f"{TAG} Tugas", "description": "Kerjakan!",
                            "kelas": ctx["class_name"], "class_id": ctx["class_id"],
                            "subject": "Matematika", "due_date": "2026-12-31"}, timeout=10)
    assert r.status_code == 200, r.text
    aid = r.json()["id"]

    lst = requests.get(f"{BASE}/assignments", headers=_h(ctx["siswa"]), timeout=10).json()
    assert any(a["id"] == aid for a in lst)

    sub = requests.post(f"{BASE}/submissions", headers=_h(ctx["siswa"]),
                        json={"assignment_id": aid, "content": "jawaban"}, timeout=10)
    assert sub.status_code == 200 and sub.json()["ok"]


# -------------- KUIS --------------
def test_quiz_start_and_attempt(ctx):
    r = requests.post(f"{BASE}/quizzes", headers=_h(ctx["admin"]), json={
        "title": f"{TAG} Quiz", "kelas": ctx["class_name"],
        "class_id": ctx["class_id"], "subject": "Matematika",
        "questions": [
            # answer stores the ORIGINAL option index (int)
            {"q": "1+1=", "options": ["1", "2", "3", "4"], "answer": 1},
            {"q": "2+2=", "options": ["3", "4", "5", "6"], "answer": 1},
        ]}, timeout=10)
    assert r.status_code == 200, r.text
    qid = r.json()["id"]

    st = requests.post(f"{BASE}/quizzes/{qid}/start", headers=_h(ctx["siswa"]), timeout=10)
    assert st.status_code == 200, st.text
    shuffled = st.json()["questions"]
    assert len(shuffled) == 2
    # correct text is at original index 1 for each question
    correct_map = {"1+1=": "2", "2+2=": "4"}
    answers = [q["options"].index(correct_map[q["q"]]) for q in shuffled]

    att = requests.post(f"{BASE}/quizzes/attempt", headers=_h(ctx["siswa"]),
                        json={"quiz_id": qid, "answers": answers}, timeout=10)
    assert att.status_code == 200, att.text
    data = att.json()
    assert data["score"] == 2 and data["total"] == 2


# -------------- PEMILU OSIS --------------
def test_osis_candidate_vote(ctx):
    r = requests.post(f"{BASE}/candidates", headers=_h(ctx["admin"]), json={
        "name": f"TEST_{TAG}_Cand", "position": "ketua",
        "vision": "visi", "mission": "misi"}, timeout=10)
    assert r.status_code == 200, r.text
    cand_id = r.json()["id"]

    lst = requests.get(f"{BASE}/candidates", headers=_h(ctx["siswa"]), timeout=10).json()
    assert any(c["id"] == cand_id for c in lst)

    v = requests.post(f"{BASE}/vote/{cand_id}", headers=_h(ctx["siswa"]), timeout=10)
    assert v.status_code == 200, v.text

    mv = requests.get(f"{BASE}/my-votes", headers=_h(ctx["siswa"]), timeout=10).json()
    assert any(x["candidate_id"] == cand_id for x in mv)

    # double-vote prevention
    v2 = requests.post(f"{BASE}/vote/{cand_id}", headers=_h(ctx["siswa"]), timeout=10)
    assert v2.status_code == 400

    requests.delete(f"{BASE}/candidates/{cand_id}", headers=_h(ctx["admin"]), timeout=10)


# -------------- SETTINGS / LOGO (Kartu Pelajar) --------------
def test_settings_logo_url():
    r = requests.get(f"{BASE}/settings", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "school_logo_url" in data
    logo = data["school_logo_url"] or ""
    assert logo, "school_logo_url is empty"
    # resolve absolute URL
    if logo.startswith("/"):
        logo_url = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + logo
    else:
        logo_url = logo
    h = requests.head(logo_url, timeout=10, allow_redirects=True)
    assert h.status_code == 200, f"logo HEAD {logo_url} -> {h.status_code}"
    assert "image" in h.headers.get("content-type", ""), h.headers.get("content-type")
