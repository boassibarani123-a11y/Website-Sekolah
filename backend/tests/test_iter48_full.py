"""
Iteration 48 — full backend test for:
 - crons (attendance + piket): auth, idempotency
 - weekly-by-class attendance chart
 - attendance scan (barcode / manual, synced_offline via client_at)
 - attendance delete (one + today-all) + audit logs
 - face: enroll + similar twins (409 + confirm_similar), face-scan need_confirm, face-confirm
 - schoolgram: profile avatar/cover/description, class post with cross-tag, like_total, feed class_avatar
 - points / leaderboard
 - chat send + history between two users
"""
import os, uuid, time, random, hashlib
from datetime import datetime, timezone
import pytest, requests

def _frontend_url():
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL"):
                return ln.split("=", 1)[1].strip().strip('"')
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or _frontend_url()).rstrip("/")
API = f"{BASE}/api"
ADMIN = {"email": "boassibarani123@gmail.com", "password": "Boas12345io"}
PFX = f"T48{uuid.uuid4().hex[:6]}"

# Load cron secret from backend .env (file is readable in test env)
def _cron_secret():
    with open("/app/backend/.env") as f:
        for line in f:
            if line.startswith("WEBHOOK_CRON_SECRET"):
                return line.split("=", 1)[1].strip().strip('"')
    return ""

CRON_SECRET = _cron_secret()


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _unique_email(role):
    return f"{PFX.lower()}_{role}_{uuid.uuid4().hex[:4]}@example.com"


def _mkuser(admin_h, role, **extra):
    body = {"email": _unique_email(role), "password": "Passw0rd!", "name": f"{PFX} {role}",
            "role": role, **extra}
    r = requests.post(f"{API}/users", headers=admin_h, json=body, timeout=30)
    assert r.status_code in (200, 201), r.text
    user = r.json()
    user["_password"] = body["password"]
    user["_email"] = body["email"]
    return user


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ============ CRON ============
class TestCron:
    def test_attendance_reminder_auth_and_idempotent(self):
        wid = f"{PFX}-att-{uuid.uuid4().hex[:8]}"
        headers = {"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": wid,
                   "Content-Type": "application/json"}
        r1 = requests.post(f"{API}/cron/attendance-reminder", json={}, headers=headers, timeout=30)
        assert r1.status_code == 200, r1.text
        assert r1.json().get("ok") is True
        # 2nd time with same X-Webhook-Id => duplicate:true
        r2 = requests.post(f"{API}/cron/attendance-reminder", json={}, headers=headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True
        # wrong token => 401
        bad = dict(headers, Authorization="Bearer wrong", **{"X-Webhook-Id": wid + "x"})
        r3 = requests.post(f"{API}/cron/attendance-reminder", json={}, headers=bad, timeout=30)
        assert r3.status_code == 401

    def test_piket_reminder_auth_and_idempotent(self):
        wid = f"{PFX}-piket-{uuid.uuid4().hex[:8]}"
        headers = {"Authorization": f"Bearer {CRON_SECRET}", "X-Webhook-Id": wid,
                   "Content-Type": "application/json"}
        r1 = requests.post(f"{API}/cron/piket-reminder", json={}, headers=headers, timeout=30)
        assert r1.status_code == 200, r1.text
        r2 = requests.post(f"{API}/cron/piket-reminder", json={}, headers=headers, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True
        bad = dict(headers, Authorization="Bearer wrong", **{"X-Webhook-Id": wid + "x"})
        r3 = requests.post(f"{API}/cron/piket-reminder", json={}, headers=bad, timeout=30)
        assert r3.status_code == 401


# ============ SHARED CLASS + STUDENTS ============
@pytest.fixture(scope="session")
def class_ctx(admin_h):
    cname = f"{PFX}-XII IPA"
    r = requests.post(f"{API}/classes", headers=admin_h, json={"name": cname, "subjects": ["Matematika"]}, timeout=30)
    assert r.status_code in (200, 201), r.text
    klass = r.json()
    students = []
    for i in range(3):
        s = _mkuser(admin_h, "siswa",
                    kelas=cname, nisn=f"{PFX}{i}{uuid.uuid4().hex[:4]}",
                    phone=f"62811000{i:04d}")
        students.append(s)
    return {"class": klass, "students": students, "name": cname}


# ============ ATTENDANCE ============
class TestAttendance:
    def test_scan_barcode_and_manual_and_list(self, admin_h, class_ctx):
        s0 = class_ctx["students"][0]
        # barcode by qr_code
        r = requests.post(f"{API}/attendance/scan", headers=admin_h,
                          json={"qr_code": s0["qr_code"], "method": "barcode", "status": "hadir"}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # manual by nisn
        s1 = class_ctx["students"][1]
        r = requests.post(f"{API}/attendance/scan", headers=admin_h,
                          json={"nisn": s1["nisn"], "method": "manual", "status": "hadir"}, timeout=30)
        assert r.status_code == 200
        # listing today (use backend-reported today via stats to avoid tz drift)
        stats = requests.get(f"{API}/attendance/stats", headers=admin_h, timeout=30).json()
        today = stats.get("date")
        r = requests.get(f"{API}/attendance", headers=admin_h, params={"date": today}, timeout=30)
        assert r.status_code == 200
        ids = {row["student_id"] for row in r.json()}
        assert s0["id"] in ids and s1["id"] in ids

    def test_scan_offline_client_at(self, admin_h, class_ctx):
        s2 = class_ctx["students"][2]
        # 3 minutes ago
        past = (datetime.now(timezone.utc).timestamp() - 180)
        ca = datetime.fromtimestamp(past, timezone.utc).isoformat().replace("+00:00", "Z")
        r = requests.post(f"{API}/attendance/scan", headers=admin_h,
                          json={"nisn": s2["nisn"], "method": "manual", "status": "hadir", "client_at": ca}, timeout=30)
        assert r.status_code == 200, r.text
        # Fetch and verify synced_offline flag
        r = requests.get(f"{API}/attendance", headers=admin_h, timeout=30)
        rows = [x for x in r.json() if x["student_id"] == s2["id"]]
        assert rows and rows[0].get("synced_offline") is True

    def test_delete_attendance_role_matrix(self, admin_h, class_ctx):
        # Create admin_absensi + guru
        aa = _mkuser(admin_h, "admin_absensi")
        guru = _mkuser(admin_h, "guru")
        aa_tok = _login(aa["_email"], aa["_password"])
        guru_tok = _login(guru["_email"], guru["_password"])
        # Create an attendance record via admin
        s = class_ctx["students"][0]
        # ensure one exists
        requests.post(f"{API}/attendance/scan", headers=admin_h,
                      json={"qr_code": s["qr_code"], "method": "barcode", "status": "hadir"}, timeout=30)
        rows = requests.get(f"{API}/attendance", headers=admin_h, timeout=30).json()
        aid = [x for x in rows if x["student_id"] == s["id"]][0]["id"]
        # guru 403
        r = requests.delete(f"{API}/attendance/{aid}", headers={"Authorization": f"Bearer {guru_tok}"}, timeout=30)
        assert r.status_code == 403
        # admin_absensi OK
        r = requests.delete(f"{API}/attendance/{aid}", headers={"Authorization": f"Bearer {aa_tok}"}, timeout=30)
        assert r.status_code == 200, r.text
        # Audit entry visible
        r = requests.get(f"{API}/admin/audit-logs", headers=admin_h, timeout=30)
        assert r.status_code == 200
        acts = {e.get("action") for e in r.json()}
        assert "attendance_deleted" in acts

    def test_delete_today_all_and_audit(self, admin_h, class_ctx):
        # create some records
        for s in class_ctx["students"]:
            requests.post(f"{API}/attendance/scan", headers=admin_h,
                          json={"qr_code": s["qr_code"], "method": "barcode", "status": "hadir"}, timeout=30)
        r = requests.delete(f"{API}/attendance/today/all", headers=admin_h, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # verify none today for those students
        today = requests.get(f"{API}/attendance/stats", headers=admin_h, timeout=30).json().get("date")
        rows = requests.get(f"{API}/attendance", headers=admin_h, params={"date": today}, timeout=30).json()
        ids = {x["student_id"] for x in rows}
        for s in class_ctx["students"]:
            assert s["id"] not in ids
        r = requests.get(f"{API}/admin/audit-logs", headers=admin_h, timeout=30)
        acts = {e.get("action") for e in r.json()}
        assert "attendance_cleared_day" in acts

    def test_weekly_by_class(self, admin_h, class_ctx):
        # produce one scan today
        s = class_ctx["students"][0]
        requests.post(f"{API}/attendance/scan", headers=admin_h,
                      json={"qr_code": s["qr_code"], "method": "barcode", "status": "hadir"}, timeout=30)
        r = requests.get(f"{API}/attendance/weekly-by-class", headers=admin_h, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert len(data["days"]) == 6
        assert "classes" in data
        # Our class is present
        kelas_names = [c["kelas"] for c in data["classes"]]
        assert class_ctx["name"] in kelas_names
        row = [c for c in data["classes"] if c["kelas"] == class_ctx["name"]][0]
        assert len(row["series"]) == 6
        assert isinstance(row["avg"], (int, float))


# ============ FACE ============
def _rand_vec(seed, dim=128, noise=0.0):
    rng = random.Random(seed)
    v = [rng.uniform(-1, 1) for _ in range(dim)]
    if noise:
        v = [x + rng.uniform(-noise, noise) for x in v]
    return v

def _vecs(seed, n=5, noise=0.01):
    base = _rand_vec(seed)
    return [[x + random.Random(seed*31 + i).uniform(-noise, noise) for x in base] for i in range(n)]


@pytest.fixture(scope="session")
def face_students(admin_h):
    cname = f"{PFX}-FACE"
    requests.post(f"{API}/classes", headers=admin_h, json={"name": cname}, timeout=30)
    twins = [_mkuser(admin_h, "siswa", kelas=cname, nisn=f"TW{PFX}{i}{uuid.uuid4().hex[:3]}", phone=f"62811999{i:04d}") for i in range(2)]
    distinct = _mkuser(admin_h, "siswa", kelas=cname, nisn=f"DX{PFX}{uuid.uuid4().hex[:4]}", phone="628119990099")
    return twins + [distinct]


class TestFace:
    def test_enroll_twin_conflict_then_confirm(self, admin_h, face_students):
        t1, t2, _ = face_students
        # Enroll twin1 cleanly
        v1 = _vecs(seed=101)
        r = requests.post(f"{API}/face/enroll", headers=admin_h,
                          json={"student_id": t1["id"], "descriptors": v1}, timeout=30)
        assert r.status_code == 200, r.text
        # Twin2 with near-identical descriptors => 409
        v2 = _vecs(seed=101, noise=0.005)
        r = requests.post(f"{API}/face/enroll", headers=admin_h,
                          json={"student_id": t2["id"], "descriptors": v2}, timeout=30)
        assert r.status_code == 409, r.text
        # Confirm similar
        r = requests.post(f"{API}/face/enroll", headers=admin_h,
                          json={"student_id": t2["id"], "descriptors": v2, "confirm_similar": True}, timeout=30)
        assert r.status_code == 200, r.text

    def test_enroll_append(self, admin_h, face_students):
        _, _, dx = face_students
        v = _vecs(seed=200)
        r = requests.post(f"{API}/face/enroll", headers=admin_h,
                          json={"student_id": dx["id"], "descriptors": v}, timeout=30)
        assert r.status_code == 200, r.text
        samples0 = r.json().get("samples", 0)
        # Append more samples
        more = _vecs(seed=200, noise=0.01, n=4)
        r = requests.post(f"{API}/face/enroll", headers=admin_h,
                          json={"student_id": dx["id"], "descriptors": more, "append": True}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["samples"] >= samples0 + 4

    def test_face_scan_need_confirm_and_confirm(self, admin_h, face_students):
        t1, t2, dx = face_students
        # ambiguous descriptor between twins
        amb = _rand_vec(seed=101, noise=0.003)
        r = requests.post(f"{API}/attendance/face-scan", headers=admin_h,
                          json={"descriptor": amb}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("need_confirm") is True
        cand_ids = [c["id"] for c in data["candidates"]]
        assert t1["id"] in cand_ids and t2["id"] in cand_ids
        # confirm with correct NISN
        r = requests.post(f"{API}/attendance/face-confirm", headers=admin_h,
                          json={"nisn": t1["nisn"], "candidate_ids": cand_ids}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("confirmed") is True
        # wrong nisn => 400
        r = requests.post(f"{API}/attendance/face-confirm", headers=admin_h,
                          json={"nisn": "NOT_A_REAL_NISN_XYZ", "candidate_ids": cand_ids}, timeout=30)
        assert r.status_code == 400

    def test_face_scan_distinct_person(self, admin_h, face_students):
        _, _, dx = face_students
        # Clear today's for cleanliness
        requests.delete(f"{API}/attendance/today/all", headers=admin_h, timeout=30)
        # Use descriptor near dx (seed 200)
        v = _rand_vec(seed=200, noise=0.002)
        r = requests.post(f"{API}/attendance/face-scan", headers=admin_h,
                          json={"descriptor": v}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Should NOT need confirm; should include confidence
        assert d.get("need_confirm") is not True
        assert d.get("ok") is True
        assert "confidence" in d


# ============ SCHOOLGRAM ============
class TestSchoolgram:
    def test_class_post_tag_crosslink_and_profile(self, admin_h, class_ctx):
        # Create a 2nd class
        cname2 = f"{PFX}-SG-B"
        r = requests.post(f"{API}/classes", headers=admin_h, json={"name": cname2}, timeout=30)
        assert r.status_code in (200, 201), r.text
        class_b = r.json()
        cid_a = class_ctx["class"]["id"]
        cid_b = class_b["id"]
        # Patch profile cover/avatar/description on class A
        r = requests.patch(f"{API}/schoolgram/class/{cid_a}/profile", headers=admin_h,
                          json={"description": "Bio A", "avatar": "https://x/a.png", "cover": "https://x/c.png"}, timeout=30)
        assert r.status_code == 200
        # Post on class A tagging class B
        img = "https://picsum.photos/400"
        r = requests.post(f"{API}/schoolgram/class/{cid_a}/post", headers=admin_h,
                          json={"image": img, "caption": "halo B", "tags": [class_b["name"]]}, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # Fetch class A profile
        r = requests.get(f"{API}/schoolgram/class/{cid_a}", headers=admin_h, timeout=30)
        assert r.status_code == 200
        a_data = r.json()
        assert a_data["class"]["description"] == "Bio A"
        assert a_data["class"]["avatar"] == "https://x/a.png"
        assert a_data["class"]["cover"] == "https://x/c.png"
        assert any(p["id"] == pid for p in a_data["posts"])
        assert "like_total" in a_data
        # Fetch class B => post appears in 'tagged'
        r = requests.get(f"{API}/schoolgram/class/{cid_b}", headers=admin_h, timeout=30)
        tagged_ids = [p["id"] for p in r.json().get("tagged", [])]
        assert pid in tagged_ids
        # Feed contains class_avatar
        r = requests.get(f"{API}/schoolgram/feed", headers=admin_h, timeout=30)
        assert r.status_code == 200
        feed_item = next((p for p in r.json() if p["id"] == pid), None)
        assert feed_item is not None
        assert "class_avatar" in feed_item


# ============ POINTS / LEADERBOARD ============
class TestPoints:
    def test_award_and_leaderboard(self, admin_h, class_ctx):
        s = class_ctx["students"][0]
        r = requests.post(f"{API}/points", headers=admin_h,
                          json={"user_id": s["id"], "points": 25, "reason": "Juara test", "category": "prestasi"}, timeout=30)
        assert r.status_code == 200, r.text
        r = requests.get(f"{API}/points/leaderboard", headers=admin_h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "students" in d and "classes" in d
        hit = [x for x in d["students"] if x["user_id"] == s["id"]]
        assert hit and hit[0]["total"] >= 25


# ============ CHAT ============
class TestChat:
    def test_send_history_between_two_users(self, admin_h, class_ctx):
        a = class_ctx["students"][0]
        b = class_ctx["students"][1]
        tok_a = _login(a["_email"], a["_password"])
        tok_b = _login(b["_email"], b["_password"])
        ha = {"Authorization": f"Bearer {tok_a}", "Content-Type": "application/json"}
        hb = {"Authorization": f"Bearer {tok_b}", "Content-Type": "application/json"}
        r = requests.post(f"{API}/chat/send", headers=ha, json={"to": b["id"], "text": "hai"}, timeout=30)
        assert r.status_code == 200, r.text
        r = requests.get(f"{API}/chat/history/{a['id']}", headers=hb, timeout=30)
        assert r.status_code == 200
        texts = [m["text"] for m in r.json()]
        assert "hai" in texts
        # contacts list for A excludes self
        r = requests.get(f"{API}/chat/contacts", headers=ha, timeout=30)
        ids = [u["id"] for u in r.json()]
        assert a["id"] not in ids
