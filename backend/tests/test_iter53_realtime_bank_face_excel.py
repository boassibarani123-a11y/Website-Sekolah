"""Iter53 — realtime proctor SSE, Bank Soal CRUD/ACL, Face confirm 5-digit, Excel pretty exports."""
import io
import os
import re
import time
import json
import pytest
import requests
from openpyxl import load_workbook

def _get_base():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        # Load from frontend/.env (test runs outside frontend container)
        try:
            with open("/app/frontend/.env") as f:
                for ln in f:
                    if ln.startswith("REACT_APP_BACKEND_URL="):
                        v = ln.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    assert v, "REACT_APP_BACKEND_URL missing"
    return v.rstrip("/")

BASE_URL = _get_base()
API = f"{BASE_URL}/api"

CREDS = {
    "super_admin": ("boassibarani123@gmail.com", "Boas12345io"),
    "guru":        ("guru@sman1laguboti.sch.id", "Guru12345"),
    "siswa":       ("siswa@sman1laguboti.sch.id", "Siswa12345"),
    "admin_absensi": ("absensi@sman1laguboti.sch.id", "Absensi12345"),
}


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=20)
    assert r.status_code == 200, f"login {email} failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def tokens():
    return {k: _login(*v) for k, v in CREDS.items()}


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- BANK SOAL ----------
class TestBankSoal:
    def test_list_bank_siswa_forbidden(self, tokens):
        r = requests.get(f"{API}/question-bank", headers=_h(tokens["siswa"]))
        assert r.status_code == 403

    def test_list_bank_guru(self, tokens):
        r = requests.get(f"{API}/question-bank", headers=_h(tokens["guru"]))
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "subjects" in data
        assert isinstance(data["items"], list)

    def test_from_exam_and_use_and_delete_cycle(self, tokens):
        # find existing exam owned by guru (Uji Analisis / token VG2026)
        r = requests.get(f"{API}/exams", headers=_h(tokens["guru"]))
        assert r.status_code == 200
        exams = r.json()
        assert exams, "no exams for guru"
        ex = next((e for e in exams if e.get("title") == "Uji Analisis"), exams[0])
        # Save first question to bank
        r = requests.post(f"{API}/question-bank/from-exam",
                          headers=_h(tokens["guru"]),
                          json={"exam_id": ex["id"], "q_indices": [0]})
        assert r.status_code == 200
        body = r.json()
        assert "saved" in body and "skipped" in body
        # dedupe: resend should skip
        r2 = requests.post(f"{API}/question-bank/from-exam",
                           headers=_h(tokens["guru"]),
                           json={"exam_id": ex["id"], "q_indices": [0]})
        assert r2.status_code == 200
        assert r2.json()["saved"] == 0
        assert r2.json()["skipped"] >= 1

    def test_use_increments_count(self, tokens):
        r = requests.get(f"{API}/question-bank", headers=_h(tokens["guru"]))
        items = r.json()["items"]
        if not items:
            pytest.skip("no bank items")
        bid = items[0]["id"]
        before = items[0].get("used_count", 0)
        r2 = requests.post(f"{API}/question-bank/use",
                           headers=_h(tokens["guru"]), json={"ids": [bid]})
        assert r2.status_code == 200
        used = r2.json()
        assert isinstance(used, list) and used
        q = used[0]
        for k in ("type", "q", "options", "answer"):
            assert k in q
        r3 = requests.get(f"{API}/question-bank", headers=_h(tokens["guru"]))
        after = next(x["used_count"] for x in r3.json()["items"] if x["id"] == bid)
        assert after == before + 1

    def test_delete_bank_item(self, tokens):
        # Create a temporary item then delete it
        r = requests.get(f"{API}/exams", headers=_h(tokens["guru"]))
        exams = r.json()
        ex = next((e for e in exams if e.get("title") == "Uji Analisis"), exams[0])
        requests.post(f"{API}/question-bank/from-exam",
                      headers=_h(tokens["guru"]),
                      json={"exam_id": ex["id"], "q_indices": list(range(5))})
        r = requests.get(f"{API}/question-bank", headers=_h(tokens["guru"]))
        items = r.json()["items"]
        if len(items) < 2:
            pytest.skip("not enough items to safely delete")
        victim = items[0]["id"]
        rd = requests.delete(f"{API}/question-bank/{victim}", headers=_h(tokens["guru"]))
        assert rd.status_code == 200
        # verify gone
        r2 = requests.get(f"{API}/question-bank", headers=_h(tokens["guru"]))
        assert victim not in {i["id"] for i in r2.json()["items"]}

    def test_siswa_cannot_use(self, tokens):
        r = requests.post(f"{API}/question-bank/use",
                          headers=_h(tokens["siswa"]), json={"ids": ["x"]})
        assert r.status_code == 403


# ---------- LIVE PROCTOR ----------
class TestLiveProctor:
    def _find_exam(self, tok):
        r = requests.get(f"{API}/exams", headers=_h(tok))
        exs = r.json()
        return next((e for e in exs if e.get("title") == "Uji Analisis"), exs[0])

    def test_live_endpoint_shape(self, tokens):
        ex = self._find_exam(tokens["guru"])
        r = requests.get(f"{API}/exams/{ex['id']}/live", headers=_h(tokens["guru"]))
        assert r.status_code == 200
        data = r.json()
        for k in ("exam", "server_now", "students", "counts"):
            assert k in data
        assert set(data["counts"].keys()) >= {"belum", "mengerjakan", "melanggar", "selesai"}

    def test_live_siswa_forbidden(self, tokens):
        ex = self._find_exam(tokens["guru"])
        r = requests.get(f"{API}/exams/{ex['id']}/live", headers=_h(tokens["siswa"]))
        assert r.status_code == 403

    def test_live_stream_sse_first_frame(self, tokens):
        ex = self._find_exam(tokens["guru"])
        url = f"{API}/exams/{ex['id']}/live/stream"
        with requests.get(url, headers=_h(tokens["guru"]), stream=True, timeout=15) as r:
            assert r.status_code == 200
            assert "text/event-stream" in r.headers.get("content-type", "")
            # read up to ~4s for first live event
            buf, start = b"", time.time()
            got_live, got_retry = False, False
            for chunk in r.iter_content(chunk_size=256):
                if chunk:
                    buf += chunk
                    s = buf.decode("utf-8", errors="ignore")
                    if "retry:" in s:
                        got_retry = True
                    if "event: live" in s:
                        got_live = True
                        break
                if time.time() - start > 6:
                    break
            assert got_retry, "missing retry: directive"
            assert got_live, f"no live event in SSE within 6s. buf={buf[:400]}"

    def test_live_stream_siswa_forbidden(self, tokens):
        ex = self._find_exam(tokens["guru"])
        r = requests.get(f"{API}/exams/{ex['id']}/live/stream",
                         headers=_h(tokens["siswa"]), stream=True, timeout=10)
        assert r.status_code == 403
        r.close()


# ---------- FACE CONFIRM ----------
class TestFaceConfirm:
    def test_face_confirm_4_digits_rejected(self, tokens):
        r = requests.post(f"{API}/attendance/face-confirm",
                          headers=_h(tokens["admin_absensi"]),
                          json={"descriptor": [0.0] * 128, "digits": "1234"})
        assert r.status_code == 422, f"expected 422, got {r.status_code} {r.text[:200]}"

    def test_face_confirm_6_digits_rejected(self, tokens):
        r = requests.post(f"{API}/attendance/face-confirm",
                          headers=_h(tokens["admin_absensi"]),
                          json={"descriptor": [0.0] * 128, "digits": "123456"})
        assert r.status_code == 422

    def test_face_confirm_5_digits_shape_ok(self, tokens):
        # Will likely 404 "Belum ada wajah..." or "Wajah tidak dikenali" -
        # we only verify 422 is NOT raised for 5-digit input.
        r = requests.post(f"{API}/attendance/face-confirm",
                          headers=_h(tokens["admin_absensi"]),
                          json={"descriptor": [0.0] * 128, "digits": "12345"})
        assert r.status_code != 422

    def test_face_scan_needs_confirm_message_mentions_5(self):
        # Only reachable when 2+ candidates match. Verify server source string contains
        # the "5 angka NIS" phrase (code-level assertion).
        with open("/app/backend/server.py", encoding="utf-8") as f:
            src = f.read()
        assert "5 angka NIS" in src


# ---------- EXCEL PRETTY EXPORTS ----------
EXPORT_ENDPOINTS = [
    ("users_staff", "/users/staff/export/xlsx", "super_admin", None),
    ("users",       "/users/export",            "super_admin", None),
    ("attendance",  "/attendance/export",       "super_admin", None),
    ("attendance_week", "/attendance/week/export", "super_admin", None),
    ("social_fund", "/social-fund/export",      "super_admin", None),
    ("inventory",   "/inventory/export",        "super_admin", None),
    ("ppdb",        "/ppdb/export/xlsx",        "super_admin", None),
    ("library",     "/library/loans/export",    "super_admin", None),
    ("piket",       "/piket/report/export",     "super_admin", {"month": time.strftime("%Y-%m")}),
]


@pytest.mark.parametrize("name,path,role,params", EXPORT_ENDPOINTS, ids=[e[0] for e in EXPORT_ENDPOINTS])
def test_pretty_excel_structure(tokens, name, path, role, params):
    r = requests.get(f"{API}{path}", headers=_h(tokens[role]), params=params or {}, timeout=60)
    assert r.status_code == 200, f"{name}: {r.status_code} {r.text[:300]}"
    assert "spreadsheet" in r.headers.get("content-type", ""), f"{name} not xlsx"
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    # Row 2 = title (LAPORAN ... or REKAP/DAFTAR)
    titles = [str(c.value or "").upper() for c in ws[2]]
    joined = " ".join(titles)
    assert any(w in joined for w in ("LAPORAN", "REKAP", "DAFTAR")), f"{name}: title row2 = {titles[:3]}"
    # Row 6 header fill 2F6FD6 (XL_BLUE) - weekly matrix exports place header on row 5
    hdr_row = None
    for cand in (6, 5):
        cells = [c for c in ws[cand] if c.value]
        if cells:
            fills = {str(c.fill.fgColor.rgb or "")[-6:].upper() for c in cells}
            if "2F6FD6" in fills:
                hdr_row = cand
                break
    assert hdr_row is not None, f"{name}: no blue (2F6FD6) header in row 5 or 6"


def test_exam_xlsx_has_two_sheets(tokens):
    r = requests.get(f"{API}/exams", headers=_h(tokens["guru"]))
    ex = next((e for e in r.json() if e.get("title") == "Uji Analisis"), r.json()[0])
    rx = requests.get(f"{API}/exams/{ex['id']}/export?format=xlsx", headers=_h(tokens["guru"]), timeout=60)
    assert rx.status_code == 200
    wb = load_workbook(io.BytesIO(rx.content))
    names = wb.sheetnames
    assert "Nilai Ujian" in names and "Analisis Butir" in names, f"sheets={names}"


def test_users_import_template_plain(tokens):
    r = requests.get(f"{API}/users/import/template", headers=_h(tokens["super_admin"]), timeout=20)
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb.active
    headers = [c.value for c in ws[1]]
    assert headers[0] == "Nama", f"template header row1 should start with Nama, got {headers}"
    assert "NIS" in headers and "Kelas" in headers
    # Not the pretty report style (row 2 shouldn't be a LAPORAN title)
    row2 = [c.value for c in ws[2]]
    assert row2[0] and "LAPORAN" not in str(row2[0]).upper()
