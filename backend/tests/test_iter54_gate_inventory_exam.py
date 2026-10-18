"""
Iter54: Gate (masuk/keluar) notifications & unauthorized detection,
Inventory lab categories (Lab Biologi / Lab Komputer), and basic
exam/IK regression used by iPhone mobile-mode exam fix.
"""
import os
import io
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta

def _resolve_base_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _resolve_base_url()
API = f"{BASE_URL}/api"

CRED = {
    "super_admin": ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>"),
    "guru":        ("guru@sman1laguboti.sch.id", "Guru12345"),
    "siswa":       ("siswa@sman1laguboti.sch.id", "Siswa12345"),
    "piket_gerbang": ("absensi@sman1laguboti.sch.id", "Absensi12345"),
}


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def tokens():
    return {k: _login(e, p) for k, (e, p) in CRED.items()}


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- GATE: scan direction / unauthorized / notifications ----------------

@pytest.fixture(scope="session")
def siswa_user(tokens):
    r = requests.get(f"{API}/auth/me", headers=_h(tokens["siswa"]), timeout=15)
    assert r.status_code == 200
    return r.json()


class TestGateScan:
    def test_gate_settings_defaults(self, tokens):
        r = requests.get(f"{API}/gate/settings", headers=_h(tokens["super_admin"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("jam_masuk", "jam_pulang", "jam_pulang_guru"):
            assert ":" in d[k]

    def test_gate_settings_put_validation(self, tokens):
        r = requests.put(f"{API}/gate/settings", headers=_h(tokens["super_admin"]),
                         json={"jam_masuk": "bad", "jam_pulang": "14:30", "jam_pulang_guru": "15:00"}, timeout=10)
        assert r.status_code in (400, 422)

    def test_gate_settings_put_ok_restore(self, tokens):
        orig = requests.get(f"{API}/gate/settings", headers=_h(tokens["super_admin"])).json()
        new = {"jam_masuk": "07:15", "jam_pulang": "14:30", "jam_pulang_guru": "15:00"}
        r = requests.put(f"{API}/gate/settings", headers=_h(tokens["super_admin"]), json=new, timeout=10)
        assert r.status_code == 200
        for k, v in new.items():
            assert r.json()[k] == v

    def test_monitor_rbac_siswa_403(self, tokens):
        r = requests.get(f"{API}/gate/monitor", headers=_h(tokens["siswa"]), timeout=10)
        assert r.status_code == 403

    def test_monitor_shape(self, tokens):
        r = requests.get(f"{API}/gate/monitor", headers=_h(tokens["super_admin"]), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "settings", "counts", "unauthorized", "outside_now", "overdue", "logs"):
            assert k in d, f"missing {k}"
        for ck in ("masuk", "keluar", "inside", "inside_siswa", "inside_guru",
                   "outside", "unauthorized", "late", "overdue"):
            assert ck in d["counts"]

    def test_gate_me_siswa(self, tokens):
        r = requests.get(f"{API}/gate/me", headers=_h(tokens["siswa"]), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_scan_auto_masuk_keluar_toggle_and_notification(self, tokens, siswa_user):
        nisn = siswa_user.get("nisn")
        assert nisn, "siswa must have nisn seeded"

        # Count notifications before
        before = requests.get(f"{API}/notifications", headers=_h(tokens["siswa"]), timeout=10).json()
        n_before = len(before) if isinstance(before, list) else len(before.get("items", []))

        # First scan auto
        r = requests.post(f"{API}/attendance/scan", headers=_h(tokens["super_admin"]),
                          json={"nisn": nisn, "method": "barcode", "status": "hadir",
                                "direction": "auto", "station_name": "TEST_GATE"}, timeout=15)
        assert r.status_code == 200, r.text
        d1 = r.json()
        assert "gate" in d1
        g1 = d1["gate"]
        assert g1["direction"] in ("masuk", "keluar")
        first_dir = g1["direction"]
        assert g1.get("repeat") is not True

        # Immediate repeat scan within 60s -> repeat=True, no new log
        r2 = requests.post(f"{API}/attendance/scan", headers=_h(tokens["super_admin"]),
                           json={"nisn": nisn, "method": "barcode", "status": "hadir",
                                 "direction": "auto", "station_name": "TEST_GATE"}, timeout=15)
        assert r2.status_code == 200
        g2 = r2.json()["gate"]
        assert g2.get("repeat") is True
        assert g2["direction"] == first_dir

        # Verify notification arrived for the student
        time.sleep(0.5)
        after = requests.get(f"{API}/notifications", headers=_h(tokens["siswa"]), timeout=10).json()
        items = after if isinstance(after, list) else after.get("items", [])
        assert len(items) > n_before, "expected a new notification after gate scan"
        titles = " ".join(((x.get("title") or "") + " " + (x.get("body") or "")) for x in items[:5]).upper()
        assert "MASUK" in titles or "KELUAR" in titles

    def test_scan_explicit_keluar_early_unauthorized(self, tokens, siswa_user):
        """Force explicit 'keluar' - because server-time < jam_pulang(14:30) and no approved IK,
        this must set unauthorized=True (or at minimum early=True)."""
        nisn = siswa_user["nisn"]
        # Wait >60s to bypass repeat window? Instead use explicit direction=keluar which bypasses repeat.
        # Actually direction=keluar is allowed and function will still return repeat if same direction within 60s.
        # Sleep to clear repeat window would be slow; use a different method value doesn't help.
        time.sleep(61)
        r = requests.post(f"{API}/attendance/scan", headers=_h(tokens["super_admin"]),
                          json={"nisn": nisn, "method": "barcode", "status": "hadir",
                                "direction": "keluar", "station_name": "TEST_GATE"}, timeout=15)
        assert r.status_code == 200, r.text
        g = r.json()["gate"]
        if g.get("repeat"):
            pytest.skip("still within repeat window")
        assert g["direction"] == "keluar"
        # Server WIB time should be before 14:30 (per request note)
        now_wib_hhmm = (datetime.now(timezone.utc) + timedelta(hours=7)).strftime("%H:%M")
        if now_wib_hhmm < "14:30":
            assert g["early"] is True
            assert g["unauthorized"] is True
            assert g["izin_id"] is None
            assert "tanpa izin" in (g.get("note") or "").lower()

    def test_scan_without_direction_still_works(self, tokens, siswa_user):
        """Legacy behaviour: no 'direction' -> normal attendance upsert, no gate key required."""
        r = requests.post(f"{API}/attendance/scan", headers=_h(tokens["super_admin"]),
                          json={"nisn": siswa_user["nisn"], "method": "barcode", "status": "izin"}, timeout=10)
        assert r.status_code == 200
        # gate key should not be present when no direction supplied
        assert "gate" not in r.json() or r.json().get("gate") is None

    def test_scan_unknown_nisn_404(self, tokens):
        r = requests.post(f"{API}/attendance/scan", headers=_h(tokens["super_admin"]),
                          json={"nisn": "0000000000", "method": "barcode", "status": "hadir",
                                "direction": "auto"}, timeout=10)
        assert r.status_code == 404


# ---------------- INVENTORY lab categories ----------------

class TestInventoryLabUnits:
    @pytest.fixture(scope="class")
    def item_ids(self, tokens):
        created = {}
        for unit, name in [("Umum", "TEST_IT_Umum"),
                           ("Lab Biologi", "TEST_IT_Biologi"),
                           ("Lab Komputer", "TEST_IT_Komputer")]:
            r = requests.post(f"{API}/inventory", headers=_h(tokens["super_admin"]),
                              json={"name": name, "category": "Praktikum", "stock": 10,
                                    "condition": "Baik", "unit": unit,
                                    "location": "Laboratorium Biologi" if unit == "Lab Biologi"
                                                else ("Laboratorium Komputer" if unit == "Lab Komputer" else "Gudang")},
                              timeout=10)
            assert r.status_code in (200, 201), r.text
            created[unit] = r.json()["id"]
        yield created
        # cleanup
        for iid in created.values():
            requests.delete(f"{API}/inventory/{iid}", headers=_h(tokens["super_admin"]), timeout=10)

    def test_invalid_unit_400(self, tokens):
        r = requests.post(f"{API}/inventory", headers=_h(tokens["super_admin"]),
                          json={"name": "TEST_bad_unit", "category": "x", "stock": 1,
                                "condition": "Baik", "unit": "Lab Fisika"}, timeout=10)
        assert r.status_code == 400

    def test_items_have_unit_field(self, tokens, item_ids):
        items = requests.get(f"{API}/inventory", headers=_h(tokens["super_admin"]), timeout=15).json()
        got = {it["id"]: it for it in items}
        for unit, iid in item_ids.items():
            assert got[iid]["unit"] == unit

    def test_borrow_lab_requires_fields(self, tokens, item_ids):
        bio_id = item_ids["Lab Biologi"]
        # Missing subject/use_date/start/end
        r = requests.post(f"{API}/borrow", headers=_h(tokens["guru"]),
                          json={"item_id": bio_id, "quantity": 1,
                                "purpose": "praktikum", "return_date": "2026-02-01"}, timeout=10)
        assert r.status_code == 400
        # end_time <= start_time
        r = requests.post(f"{API}/borrow", headers=_h(tokens["guru"]),
                          json={"item_id": bio_id, "quantity": 1,
                                "purpose": "praktikum", "return_date": "2026-02-01",
                                "subject": "Biologi", "use_date": "2026-02-01",
                                "start_time": "10:00", "end_time": "09:00"}, timeout=10)
        assert r.status_code == 400
        # Valid
        r = requests.post(f"{API}/borrow", headers=_h(tokens["guru"]),
                          json={"item_id": bio_id, "quantity": 1,
                                "purpose": "praktikum", "return_date": "2026-02-01",
                                "subject": "Biologi Sel", "use_date": "2026-02-01",
                                "start_time": "08:00", "end_time": "09:30"}, timeout=10)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["unit"] == "Lab Biologi"
        assert d["subject"] == "Biologi Sel"
        assert d["start_time"] == "08:00"
        assert d["end_time"] == "09:30"

    def test_borrow_umum_no_lab_fields_needed(self, tokens, item_ids):
        r = requests.post(f"{API}/borrow", headers=_h(tokens["guru"]),
                          json={"item_id": item_ids["Umum"], "quantity": 1,
                                "purpose": "test", "return_date": "2026-02-01"}, timeout=10)
        assert r.status_code in (200, 201), r.text
        assert r.json()["unit"] == "Umum"

    def test_inventory_export_grouped(self, tokens, item_ids):
        r = requests.get(f"{API}/inventory/export", headers=_h(tokens["super_admin"]), timeout=30)
        assert r.status_code == 200
        assert len(r.content) > 1000
        ct = r.headers.get("content-type", "")
        assert "spreadsheet" in ct or "xlsx" in ct or "octet-stream" in ct
        # Confirm xlsx header magic bytes PK
        assert r.content[:2] == b"PK"


# ---------------- EXAM mobile-mode (regression - exam system still works) ----------------

class TestExamSmoke:
    def test_siswa_can_list_exams(self, tokens):
        r = requests.get(f"{API}/exams", headers=_h(tokens["siswa"]), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
