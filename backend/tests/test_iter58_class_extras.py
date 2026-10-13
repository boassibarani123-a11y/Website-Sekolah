"""Backend tests for iteration 58: 8 new class detail features.
Features: Materi, Jadwal, Rekap Absensi, Rapor, Peringkat, Agenda/Pengumuman, Denah, Diskusi.
"""
import os
import pytest
import requests

# load REACT_APP_BACKEND_URL from frontend/.env
_env_path = "/app/frontend/.env"
if os.path.exists(_env_path):
    for ln in open(_env_path):
        if ln.startswith("REACT_APP_BACKEND_URL="):
            os.environ["REACT_APP_BACKEND_URL"] = ln.split("=", 1)[1].strip()

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
CID = "06ffd680-fae9-4658-8987-fe5d32ec50d3"  # seeded XII IPA 1

ADMIN = ("boassibarani123@gmail.com", "Boas12345io")
GURU = ("guru.test@sman1laguboti.sch.id", "Guru12345")
SISWA = ("siswa.test@sman1laguboti.sch.id", "Siswa12345")


def _login(email, pw):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_tok():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def guru_tok():
    return _login(*GURU)


@pytest.fixture(scope="module")
def siswa_tok():
    return _login(*SISWA)


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- find a valid class id dynamically (prefer seeded CID if present) ---
@pytest.fixture(scope="module")
def cid(admin_tok):
    r = requests.get(f"{BASE}/api/classes", headers=_h(admin_tok), timeout=15)
    assert r.status_code == 200
    classes = r.json()
    for c in classes:
        if c.get("id") == CID:
            return CID
    # fallback: first class without password
    for c in classes:
        if not c.get("password"):
            return c["id"]
    return classes[0]["id"] if classes else CID


# ======================= MATERI =======================
class TestMateri:
    def test_list_materi_admin(self, admin_tok, cid):
        r = requests.get(f"{BASE}/api/classes/{cid}/materials", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_siswa_cannot_create_materi(self, siswa_tok, cid):
        r = requests.post(f"{BASE}/api/classes/{cid}/materials",
                          json={"title": "TEST_x", "subject": "Matematika"},
                          headers=_h(siswa_tok), timeout=15)
        assert r.status_code in (401, 403)

    def test_admin_create_delete_materi(self, admin_tok, cid):
        payload = {"title": "TEST_Materi_Matematika", "subject": "Matematika",
                   "description": "Bab 1", "link": "https://example.com/pdf"}
        r = requests.post(f"{BASE}/api/classes/{cid}/materials", json=payload,
                          headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        mid = r.json()["id"]
        assert r.json()["title"] == payload["title"]
        # verify list contains
        lst = requests.get(f"{BASE}/api/classes/{cid}/materials",
                           headers=_h(admin_tok), timeout=15).json()
        assert any(x["id"] == mid for x in lst)
        # delete
        d = requests.delete(f"{BASE}/api/materials/{mid}", headers=_h(admin_tok), timeout=15)
        assert d.status_code == 200
        lst2 = requests.get(f"{BASE}/api/classes/{cid}/materials",
                            headers=_h(admin_tok), timeout=15).json()
        assert not any(x["id"] == mid for x in lst2)


# ======================= JADWAL =======================
class TestJadwal:
    def test_list(self, admin_tok, cid):
        r = requests.get(f"{BASE}/api/classes/{cid}/schedule", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_siswa_forbidden(self, siswa_tok, cid):
        r = requests.post(f"{BASE}/api/classes/{cid}/schedule",
                          json={"day": 1, "start": "07:00", "end": "08:00", "subject": "Matematika"},
                          headers=_h(siswa_tok), timeout=15)
        assert r.status_code in (401, 403)

    def test_create_delete(self, admin_tok, cid):
        r = requests.post(f"{BASE}/api/classes/{cid}/schedule",
                          json={"day": 1, "start": "07:00", "end": "08:30",
                                "subject": "Matematika", "teacher_name": "Pak Boas", "room": "R-101"},
                          headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        sid = r.json()["id"]
        assert r.json()["day"] == 1
        d = requests.delete(f"{BASE}/api/schedule/{sid}", headers=_h(admin_tok), timeout=15)
        assert d.status_code == 200


# ======================= REKAP ABSENSI =======================
def test_rekap_absensi(admin_tok, cid):
    r = requests.get(f"{BASE}/api/classes/{cid}/attendance-recap",
                     headers=_h(admin_tok), timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "rows" in j and "class_name" in j
    assert isinstance(j["rows"], list)
    if j["rows"]:
        row = j["rows"][0]
        for k in ("student_id", "name", "hadir", "izin", "sakit", "alpa", "total", "percent"):
            assert k in row

def test_rekap_absensi_date_filter(admin_tok, cid):
    r = requests.get(f"{BASE}/api/classes/{cid}/attendance-recap?start=2025-01-01&end=2026-12-31",
                     headers=_h(admin_tok), timeout=20)
    assert r.status_code == 200


# ======================= RAPOR =======================
def test_report_card(admin_tok, cid):
    r = requests.get(f"{BASE}/api/classes/{cid}/report-card",
                     headers=_h(admin_tok), timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "rows" in j and "subjects" in j
    if j["rows"]:
        row = j["rows"][0]
        for k in ("student_id", "name", "tugas", "quiz", "ujian", "kehadiran", "nilai"):
            assert k in row

def test_report_card_subject_filter(admin_tok, cid):
    r = requests.get(f"{BASE}/api/classes/{cid}/report-card?subject=Matematika",
                     headers=_h(admin_tok), timeout=30)
    assert r.status_code == 200
    assert r.json().get("subject") == "Matematika"


# ======================= PERINGKAT =======================
def test_leaderboard(admin_tok, cid):
    r = requests.get(f"{BASE}/api/classes/{cid}/leaderboard",
                     headers=_h(admin_tok), timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "rows" in j
    ranks = [row["rank"] for row in j["rows"]]
    assert ranks == sorted(ranks)
    for row in j["rows"]:
        assert "poin" in row


# ======================= AGENDA & PENGUMUMAN =======================
class TestAgenda:
    def test_announcements_crud(self, admin_tok, cid):
        r = requests.post(f"{BASE}/api/classes/{cid}/announcements",
                          json={"title": "TEST_ann", "body": "halo", "pinned": True},
                          headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        assert r.json()["pinned"] is True
        lst = requests.get(f"{BASE}/api/classes/{cid}/announcements",
                           headers=_h(admin_tok), timeout=15).json()
        assert any(x["id"] == aid for x in lst)
        d = requests.delete(f"{BASE}/api/class-announcements/{aid}",
                            headers=_h(admin_tok), timeout=15)
        assert d.status_code == 200

    def test_agenda_crud(self, admin_tok, cid):
        r = requests.post(f"{BASE}/api/classes/{cid}/agenda",
                          json={"title": "TEST_ev", "date": "2026-02-10",
                                "time": "08:00", "kind": "ujian"},
                          headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        d = requests.delete(f"{BASE}/api/class-agenda/{eid}",
                            headers=_h(admin_tok), timeout=15)
        assert d.status_code == 200

    def test_siswa_cannot_create_announcement(self, siswa_tok, cid):
        r = requests.post(f"{BASE}/api/classes/{cid}/announcements",
                          json={"title": "TEST_x"}, headers=_h(siswa_tok), timeout=15)
        assert r.status_code in (401, 403)


# ======================= DENAH =======================
class TestDenah:
    def test_get_default(self, admin_tok, cid):
        r = requests.get(f"{BASE}/api/classes/{cid}/seating",
                         headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "layout" in j and "students" in j
        assert "rows" in j["layout"] and "cols" in j["layout"]

    def test_siswa_cannot_put(self, siswa_tok, cid):
        r = requests.put(f"{BASE}/api/classes/{cid}/seating",
                         json={"rows": 4, "cols": 5, "seats": {}},
                         headers=_h(siswa_tok), timeout=15)
        assert r.status_code in (401, 403)

    def test_put_and_persist(self, admin_tok, cid):
        # fetch students first to grab a valid id (if any)
        g = requests.get(f"{BASE}/api/classes/{cid}/seating",
                         headers=_h(admin_tok), timeout=15).json()
        students = g.get("students", [])
        seats = {}
        if students:
            seats["0-0"] = students[0]["id"]
        r = requests.put(f"{BASE}/api/classes/{cid}/seating",
                         json={"rows": 4, "cols": 5, "seats": seats},
                         headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["rows"] == 4 and r.json()["cols"] == 5
        # reload persist
        g2 = requests.get(f"{BASE}/api/classes/{cid}/seating",
                          headers=_h(admin_tok), timeout=15).json()
        assert g2["layout"]["rows"] == 4
        assert g2["layout"]["cols"] == 5
        if students:
            assert g2["layout"]["seats"].get("0-0") == students[0]["id"]


# ======================= DISKUSI =======================
class TestDiskusi:
    def test_siswa_can_create_and_reply(self, siswa_tok, cid, admin_tok):
        r = requests.post(f"{BASE}/api/classes/{cid}/discussions",
                          json={"title": "TEST_q", "body": "Pertanyaan?",
                                "subject": "Matematika"},
                          headers=_h(siswa_tok), timeout=15)
        assert r.status_code == 200, r.text
        did = r.json()["id"]
        # reply by same siswa
        rp = requests.post(f"{BASE}/api/discussions/{did}/reply",
                           json={"body": "jawaban"}, headers=_h(siswa_tok), timeout=15)
        assert rp.status_code == 200
        # list and verify reply_count
        lst = requests.get(f"{BASE}/api/classes/{cid}/discussions",
                           headers=_h(siswa_tok), timeout=15).json()
        row = next((x for x in lst if x["id"] == did), None)
        assert row and row["reply_count"] >= 1
        # super admin can delete
        d = requests.delete(f"{BASE}/api/discussions/{did}",
                            headers=_h(admin_tok), timeout=15)
        assert d.status_code == 200


# ======================= Regression on existing tabs =======================
def test_existing_class_endpoints_still_work(admin_tok, cid):
    # Just ping common endpoints that back the existing tabs
    for path in ("/api/classes", f"/api/classes/{cid}"):
        r = requests.get(f"{BASE}{path}", headers=_h(admin_tok), timeout=15)
        assert r.status_code in (200, 404), f"{path} -> {r.status_code}"
