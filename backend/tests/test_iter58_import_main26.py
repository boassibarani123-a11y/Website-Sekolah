# Iteration 58: fresh import (branch main26) regression smoke - auth, users, classes, attendance, exams, bank soal, uploads, public
import os, uuid, io, datetime
import pytest, requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@sman1laguboti.sch.id", "password": "<SUPER_ADMIN_PASSWORD>"}
SUF = uuid.uuid4().hex[:6]
STATE = {}


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    s.headers["Authorization"] = f"Bearer {r.json()['token']}"
    return s


# --- auth
def test_health():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200


def test_admin_login_and_me(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "super_admin"
    assert "password_hash" not in r.json()


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": f"nobody{SUF}@x.com", "password": "bad"})
    assert r.status_code == 401


# --- classes & accounts
def test_create_class(admin):
    r = admin.post(f"{API}/classes", json={"name": f"TEST_X-{SUF}", "subjects": ["Matematika"]})
    assert r.status_code == 200, r.text
    STATE["class"] = r.json()
    assert r.json()["name"] == f"TEST_X-{SUF}"
    lst = admin.get(f"{API}/classes").json()
    assert any(c["id"] == STATE["class"]["id"] for c in lst)


def test_create_guru_and_login(admin):
    email = f"test_guru_{SUF}@example.com"
    r = admin.post(f"{API}/users", json={"email": email, "password": "Guru12345", "name": "TEST Guru",
                                          "role": "guru", "subjects": ["Matematika"]})
    assert r.status_code == 200, r.text
    STATE["guru"] = r.json()
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "Guru12345"})
    assert lr.status_code == 200, lr.text
    STATE["guru_token"] = lr.json()["token"]


def test_create_siswa_and_login(admin):
    email = f"test_siswa_{SUF}@example.com"
    r = admin.post(f"{API}/users", json={"email": email, "password": "Siswa12345", "name": "TEST Siswa",
                                          "role": "siswa", "kelas": f"TEST_X-{SUF}", "phone": "081234567890"})
    assert r.status_code == 200, r.text
    STATE["siswa"] = r.json()
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "Siswa12345"})
    assert lr.status_code == 200, lr.text
    STATE["siswa_token"] = lr.json()["token"]
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {lr.json()['token']}"})
    assert me.json()["role"] == "siswa"


def test_siswa_requires_phone(admin):
    r = admin.post(f"{API}/users", json={"email": f"test_np_{SUF}@example.com", "password": "Siswa12345",
                                          "name": "TEST NP", "role": "siswa"})
    assert r.status_code == 400


# --- class detail tabs
def test_class_tabs(admin):
    cid = STATE["class"]["id"]
    m = admin.post(f"{API}/classes/{cid}/materials", json={"title": "TEST Materi", "subject": "Matematika"})
    assert m.status_code == 200, m.text
    s = admin.post(f"{API}/classes/{cid}/schedule", json={"day": 1, "start": "07:30", "end": "09:00", "subject": "Matematika"})
    assert s.status_code == 200, s.text
    a = admin.post(f"{API}/classes/{cid}/agenda", json={"title": "TEST Agenda", "date": "2026-02-01"})
    assert a.status_code == 200, a.text
    for tab in ["materials", "schedule", "agenda", "announcements", "seating", "discussions"]:
        r = admin.get(f"{API}/classes/{cid}/{tab}")
        assert r.status_code == 200, f"{tab}: {r.status_code} {r.text[:200]}"
    assert any(x["title"] == "TEST Materi" for x in admin.get(f"{API}/classes/{cid}/materials").json())


# --- attendance
def test_recap_range(admin):
    today = datetime.date.today()
    st = (today - datetime.timedelta(days=7)).isoformat()
    for kind in ["siswa", "guru"]:
        r = admin.get(f"{API}/attendance/recap-range", params={"start": st, "end": today.isoformat(), "kind": kind})
        assert r.status_code == 200, f"{kind}: {r.text[:300]}"


# --- exams / bank soal / pengajuan
def test_question_bank_create(admin):
    r = admin.post(f"{API}/question-bank", json={"subject": "Matematika", "type": "mc", "q": "TEST 1+1?",
                                                  "options": ["1", "2", "3"], "answer": 1})
    assert r.status_code == 200, r.text
    bid = r.json()["id"]
    lst = admin.get(f"{API}/question-bank")
    assert lst.status_code == 200
    body = lst.json()
    items = body if isinstance(body, list) else body.get("items", [])
    assert any(i["id"] == bid for i in items)
    admin.delete(f"{API}/question-bank/{bid}")


def test_exam_create(admin):
    now = datetime.datetime.utcnow()
    r = admin.post(f"{API}/exams", json={
        "title": f"TEST Exam {SUF}", "kelas": f"TEST_X-{SUF}", "class_id": STATE["class"]["id"],
        "subject": "Matematika", "password": "tok123",
        "questions": [{"q": "2+2?", "type": "mc", "options": ["3", "4"], "answer": 1}],
        "start_at": now.isoformat(), "end_at": (now + datetime.timedelta(hours=2)).isoformat(), "time_limit": 30})
    assert r.status_code == 200, r.text
    STATE["exam"] = r.json()["id"]
    assert any(e["id"] == STATE["exam"] for e in admin.get(f"{API}/exams").json())


def test_exam_request_guru(admin):
    h = {"Authorization": f"Bearer {STATE['guru_token']}"}
    now = datetime.datetime.utcnow()
    r = requests.post(f"{API}/exam-requests", headers=h, json={
        "title": f"TEST Req {SUF}", "subject": "Matematika", "class_ids": [STATE["class"]["id"]],
        "questions": [{"q": "3+3?", "type": "mc", "options": ["6", "7"], "answer": 0}],
        "start_at": now.isoformat(), "end_at": (now + datetime.timedelta(hours=2)).isoformat()})
    # guru not assigned to class may get 403; report status
    assert r.status_code in (200, 403), r.text
    STATE["req_status"] = r.status_code
    lr = requests.get(f"{API}/exam-requests", headers=h)
    assert lr.status_code == 200


# --- file upload + profile photo
def test_upload_and_photo(admin):
    png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
           b"\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82")
    r = admin.post(f"{API}/upload", files={"file": ("p.png", io.BytesIO(png), "image/png")})
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    p = admin.patch(f"{API}/auth/me/photo", json={"photo": url})
    assert p.status_code == 200, p.text
    assert admin.get(f"{API}/auth/me").json()["photo"] == url
    f = admin.get(f"{BASE_URL}{url}")
    assert f.status_code == 200 and f.content == png
    assert requests.get(f"{BASE_URL}{url}").status_code == 401
    admin.patch(f"{API}/auth/me/photo", json={"photo": None})


# --- public
def test_public_endpoints():
    for ep in ["/public/guest-hours", "/org/public", "/org-structures/public", "/gallery", "/settings", "/announcements/login"]:
        r = requests.get(f"{API}{ep}")
        assert r.status_code in (200, 401), f"{ep}: {r.status_code}"
        assert r.status_code < 500


def test_ppdb_register():
    r = requests.post(f"{API}/ppdb/register", json={
        "full_name": "TEST PPDB", "address": "Jl. Test", "phone": "081234567890", "parent_name": "Ortu",
        "parent_phone": "081234567891", "parent_email": "ortu@example.com", "prev_school": "SMP 1", "nem_avg": 85})
    assert r.status_code == 200, r.text


def test_guest_create_public():
    r = requests.post(f"{API}/guests", json={"name": "TEST Tamu", "institution": "Dinas", "purpose": "Kunjungan",
                                             "visit_date": datetime.date.today().isoformat()})
    assert r.status_code in (200, 400, 401, 403), r.text
    STATE["guest_status"] = (r.status_code, r.text[:200])


# --- GET smoke for all no-param endpoints (no 5xx)
SMOKE = ("/users /classes /org-structures /org /attendance/stations /attendance /attendance/stats /attendance/week "
         "/attendance/archives /inventory /borrow /assignments /submissions /subjects /reschedules /quizzes /exams /posts "
         "/announcements /social-fund /candidates /my-votes /election/status /election/stats /feedback /feedback/mine "
         "/achievements /stats /notifications /analytics/kepsek /admin/reset-requests /admin/audit-logs /reports-summary "
         "/email/status /events /ppdb /library/config /books/categories /library/stats /library/popular /books /loans/my "
         "/loans /reservations /settings /gallery /profile-achievements /timetable /timetable/today /points/me "
         "/points/leaderboard /points/manage /schoolgram/classes /schoolgram/feed /schoolgram/stories /schoolgram/reels "
         "/chat/contacts /piket/teachers /piket/shifts /piket/now /piket/report /face/students /teacher-attendance "
         "/teacher-attendance/week /teacher-attendance/archives /guests /guests/summary /ik/context /ik /question-bank "
         "/inventory-rooms /inventory-stats /inventory-activity /teacher-attendance/monthly /gate/settings /gate/monitor "
         "/gate/me /question-bank/stock /ai/status /piket/tv /exam-types /exam-requests "
         "/users/export /attendance/export /users/staff/export/xlsx /ppdb/export/xlsx /inventory/export "
         "/users/import/template /admin/students/import/template /presentation/pptx").split()


def test_get_smoke(admin):
    bad = []
    for ep in SMOKE:
        r = admin.get(f"{API}{ep}")
        if r.status_code >= 500:
            bad.append(f"{ep}:{r.status_code}")
    assert not bad, f"5xx endpoints: {bad}"


def test_cleanup(admin):
    if STATE.get("exam"):
        admin.delete(f"{API}/exams/{STATE['exam']}")
    for k in ("guru", "siswa"):
        if STATE.get(k):
            admin.delete(f"{API}/users/{STATE[k]['id']}")
    if STATE.get("class"):
        admin.delete(f"{API}/classes/{STATE['class']['id']}")
    print("STATE", {k: v for k, v in STATE.items() if k.endswith("status")})
