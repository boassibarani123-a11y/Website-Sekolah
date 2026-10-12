"""Iteration 20 regression: Weekly Attendance Recap, Auto-Archive, Cron Webhook, Excel polish."""
import os, io, uuid, pytest, requests
from datetime import datetime, timedelta, date
from openpyxl import load_workbook
from pymongo import MongoClient

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "https://sekolah-web-14.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
WEBHOOK_SECRET = "lgbt1-att-archive-9f3a7c2e8b14d65fae02cronsecret"

TU = {"email": "tu.demo@sekolahku.id", "password": "Demo12345"}
SISWA = {"email": "siswa.demo@sekolahku.id", "password": "Demo12345"}
SISWA_NISN = "0099887766"

mongo = MongoClient(MONGO_URL)[DB_NAME]


def login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return r.json()["token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def tu_tok():
    return login(TU)


@pytest.fixture(scope="module")
def siswa_tok():
    return login(SISWA)


# ---- Weekly recap API ----
def test_week_default_current(tu_tok):
    r = requests.get(f"{API}/attendance/week", headers=auth(tu_tok), timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    for k in ("start", "end", "days", "day_labels", "label", "students", "daily", "totals", "record_count"):
        assert k in j, f"missing key {k}"
    assert len(j["days"]) == 7
    assert j["day_labels"][0] == "Senin"
    # start is a Monday
    start = date.fromisoformat(j["start"])
    assert start.weekday() == 0


def test_week_custom_start(tu_tok):
    some_mon = (date.today() - timedelta(days=date.today().weekday() + 14)).isoformat()
    r = requests.get(f"{API}/attendance/week", headers=auth(tu_tok), params={"start": some_mon}, timeout=30)
    assert r.status_code == 200
    assert r.json()["start"] == some_mon


def test_scan_siswa_then_week_shows(tu_tok):
    # scan today for siswa.demo
    r = requests.post(f"{API}/attendance/scan", headers=auth(tu_tok),
                      json={"nisn": SISWA_NISN, "status": "hadir", "method": "manual"}, timeout=30)
    assert r.status_code == 200, r.text
    r = requests.get(f"{API}/attendance/week", headers=auth(tu_tok), timeout=30)
    j = r.json()
    today_iso = date.today().isoformat()
    hits = [s for s in j["students"] if s["marks"].get(today_iso) == "hadir"]
    assert hits, "scanned student should appear as hadir today"
    assert j["totals"]["hadir"] >= 1
    assert j["record_count"] >= 1


def test_week_export_xlsx(tu_tok):
    r = requests.get(f"{API}/attendance/week/export", headers=auth(tu_tok), timeout=30)
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers.get("content-type", "")
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    # title bar
    assert "LAGUBOTI" in str(ws["B2"].value).upper()
    # we expect at least Nama, Kelas and 7 day columns + totals somewhere
    headers_row = [c.value for c in ws[5]] if ws.max_row >= 5 else []
    joined = " ".join(str(x) for x in headers_row if x)
    assert "Nama" in joined or "Senin" in joined


# ---- Archive + purge cycle ----
@pytest.fixture
def inserted_prior_week_doc():
    """Insert a demo-scope attendance in a prior completed week."""
    today = date.today()
    prior_mon = today - timedelta(days=today.weekday() + 14)  # 2 weeks ago Monday
    doc = {
        "id": f"TEST_{uuid.uuid4()}",
        "student_id": f"TEST_sid_{uuid.uuid4()}",
        "student_name": "TEST Prior Student",
        "kelas": "X-A",
        "date": prior_mon.isoformat(),
        "status": "hadir",
        "scanned_at": datetime.utcnow().isoformat(),
        "method": "manual",
        "is_demo": True,
    }
    mongo.attendance.insert_one(dict(doc))
    yield doc
    mongo.attendance.delete_one({"id": doc["id"]})
    # cleanup archive if any (for demo scope + that period)
    mongo.attendance_archives.delete_many({"is_demo": True, "period_start": prior_mon.isoformat()})


def test_archive_now_cycle(tu_tok, inserted_prior_week_doc):
    doc = inserted_prior_week_doc
    # before: record exists
    assert mongo.attendance.find_one({"id": doc["id"]}) is not None

    r = requests.post(f"{API}/attendance/archive-now", headers=auth(tu_tok), timeout=60)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["count"] >= 1

    # archive appears
    r = requests.get(f"{API}/attendance/archives", headers=auth(tu_tok), timeout=30)
    assert r.status_code == 200
    arcs = r.json()
    match = [a for a in arcs if a["period_start"] == doc["date"]]
    assert match, f"expected archive for {doc['date']} in archives list"
    aid = match[0]["id"]

    # prior-week record purged
    assert mongo.attendance.find_one({"id": doc["id"]}) is None

    # download works
    r = requests.get(f"{API}/attendance/archives/{aid}/download", headers=auth(tu_tok), timeout=30)
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers.get("content-type", "")
    wb = load_workbook(io.BytesIO(r.content))
    assert wb.active.max_row > 3


# ---- Cron webhook ----
def test_cron_webhook_requires_auth():
    r = requests.post(f"{API}/cron/attendance-archive",
                      headers={"X-Webhook-Id": f"TEST_{uuid.uuid4()}"},
                      json={"event": "weekly", "run_id": "x"}, timeout=30)
    assert r.status_code == 401


def test_cron_webhook_bad_secret():
    r = requests.post(f"{API}/cron/attendance-archive",
                      headers={"Authorization": "Bearer wrong", "X-Webhook-Id": f"TEST_{uuid.uuid4()}"},
                      json={"event": "weekly", "run_id": "x"}, timeout=30)
    assert r.status_code == 401


def test_cron_webhook_missing_run_id():
    r = requests.post(f"{API}/cron/attendance-archive",
                      headers={"Authorization": f"Bearer {WEBHOOK_SECRET}"},
                      json={"event": "weekly"}, timeout=30)
    assert r.status_code == 400


def test_cron_webhook_ok_and_duplicate():
    rid = f"TEST_{uuid.uuid4()}"
    try:
        r = requests.post(f"{API}/cron/attendance-archive",
                          headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": rid},
                          json={"event": "weekly", "run_id": rid}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # duplicate
        r2 = requests.post(f"{API}/cron/attendance-archive",
                           headers={"Authorization": f"Bearer {WEBHOOK_SECRET}", "X-Webhook-Id": rid},
                           json={"event": "weekly", "run_id": rid}, timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True
    finally:
        mongo.cron_runs.delete_many({"run_id": rid})


# ---- Role enforcement ----
def test_siswa_forbidden_archives(siswa_tok):
    r = requests.get(f"{API}/attendance/archives", headers=auth(siswa_tok), timeout=30)
    assert r.status_code == 403
    r = requests.post(f"{API}/attendance/archive-now", headers=auth(siswa_tok), timeout=30)
    assert r.status_code == 403
    r = requests.get(f"{API}/attendance/archives/nonexistent/download", headers=auth(siswa_tok), timeout=30)
    assert r.status_code == 403


# ---- Inventory & Dana Sosial neat Excel ----
def test_inventory_export_neat(tu_tok):
    r = requests.get(f"{API}/inventory/export", headers=auth(tu_tok), timeout=30)
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    assert "LAGUBOTI" in str(ws["B2"].value).upper()
    # column A width >=18
    assert ws.column_dimensions["B"].width >= 18
    # check summary labels present fully
    text = " ".join(str(c.value) for row in ws.iter_rows() for c in row if c.value)
    assert "Total Item" in text or "Belum ada data" in text


def test_social_fund_export_neat(tu_tok):
    r = requests.get(f"{API}/social-fund/export", headers=auth(tu_tok), timeout=30)
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    assert "LAGUBOTI" in str(ws["B2"].value).upper()
    text = " ".join(str(c.value) for row in ws.iter_rows() for c in row if c.value)
    # summary labels must not be truncated
    for lab in ["Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo Akhir (Rp)", "Total Transaksi"]:
        assert lab in text, f"missing/truncated label '{lab}'"
