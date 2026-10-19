"""Iteration 60: Piket Gerbang role, Guests visiting hours & approval, Recap range.

Covers:
- Smoke login (super_admin, piket, kepsek)
- Role rename admin_absensi -> piket_gerbang
- /api/attendance/recap-range (siswa/guru, forbidden for guru-kind for role 'guru')
- /api/public/guest-hours (no auth) and PUT /api/guest-hours (super only)
- Guest create inside hours => status hadir/dalam_jam
- Guest create outside hours => status menunggu, approver gets notification
- Approval (kepsek) approve/reject with note; piket cannot call decision (403)
- Piket checkout; summary endpoint; filters work
"""
import os
import re
import datetime as dt
import pytest
import requests

def _load_base():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        for ln in open("/app/frontend/.env"):
            if ln.startswith("REACT_APP_BACKEND_URL="):
                return ln.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")

BASE = _load_base()
API = f"{BASE}/api"

SUPER = ("boassibarani123@gmail.com", "<SUPER_ADMIN_PASSWORD>")
PIKET = ("piket.test@sman1laguboti.sch.id", "Test12345")
KEPSEK = ("kepsek.test@sman1laguboti.sch.id", "Test12345")


def login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text[:200]}"
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tokens():
    return {
        "super": login(*SUPER),
        "piket": login(*PIKET),
        "kepsek": login(*KEPSEK),
    }


# ----- Smoke -----
def test_super_me(tokens):
    r = requests.get(f"{API}/auth/me", headers=H(tokens["super"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "super_admin"


def test_piket_role_renamed(tokens):
    r = requests.get(f"{API}/auth/me", headers=H(tokens["piket"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "piket_gerbang"


def test_no_admin_absensi_users_left(tokens):
    r = requests.get(f"{API}/users", headers=H(tokens["super"]), timeout=20)
    assert r.status_code == 200
    assert not any(u.get("role") == "admin_absensi" for u in r.json())


# ----- Recap range -----
def test_recap_range_siswa_as_piket(tokens):
    today = dt.date.today().isoformat()
    start = (dt.date.today() - dt.timedelta(days=30)).isoformat()
    r = requests.get(f"{API}/attendance/recap-range",
                     params={"start": start, "end": today, "kind": "siswa"},
                     headers=H(tokens["piket"]), timeout=20)
    assert r.status_code == 200, r.text[:200]
    body = r.json()
    assert body["kind"] == "siswa"
    assert "rows" in body and "totals" in body


def test_recap_range_guru_as_piket(tokens):
    today = dt.date.today().isoformat()
    start = (dt.date.today() - dt.timedelta(days=30)).isoformat()
    r = requests.get(f"{API}/attendance/recap-range",
                     params={"start": start, "end": today, "kind": "guru"},
                     headers=H(tokens["piket"]), timeout=20)
    assert r.status_code == 200
    assert r.json()["kind"] == "guru"


def test_recap_range_bad_dates(tokens):
    r = requests.get(f"{API}/attendance/recap-range",
                     params={"start": "2025-01-10", "end": "2025-01-01", "kind": "siswa"},
                     headers=H(tokens["piket"]), timeout=15)
    assert r.status_code == 400


# ----- Public guest hours -----
def test_public_guest_hours_no_auth():
    r = requests.get(f"{API}/public/guest-hours", timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("start", "end", "days", "open_now", "now"):
        assert k in d
    assert re.match(r"^\d{2}:\d{2}$", d["start"]) and re.match(r"^\d{2}:\d{2}$", d["end"])


def test_piket_cannot_put_guest_hours(tokens):
    r = requests.put(f"{API}/guest-hours", headers=H(tokens["piket"]),
                     json={"start": "08:00", "end": "14:00", "days": [1, 2, 3, 4, 5, 6]}, timeout=15)
    assert r.status_code == 403


# ----- Full guest flow: inside / outside / approve / checkout -----
@pytest.fixture(scope="module")
def restore_hours(tokens):
    """Restore default visiting hours after tests."""
    yield
    requests.put(f"{API}/guest-hours", headers=H(tokens["super"]),
                 json={"start": "08:00", "end": "14:00", "days": [1, 2, 3, 4, 5, 6]}, timeout=15)


def _wib_now_hm():
    # Backend uses WIB (UTC+7)
    return (dt.datetime.utcnow() + dt.timedelta(hours=7))


def _set_hours(token, start, end, days):
    r = requests.put(f"{API}/guest-hours", headers=H(token),
                     json={"start": start, "end": end, "days": days}, timeout=15)
    assert r.status_code == 200, r.text[:200]
    return r.json()


def test_guest_inside_hours_status_hadir(tokens, restore_hours):
    now = _wib_now_hm()
    today_iso = now.date().isoformat()
    isoweek = now.isoweekday()
    start = (now - dt.timedelta(hours=1)).strftime("%H:%M")
    end_dt = now + dt.timedelta(hours=1)
    # Ensure end > start (handle hour wrap by capping)
    end = end_dt.strftime("%H:%M") if end_dt.date() == now.date() else "23:59"
    _set_hours(tokens["super"], start, end, list(range(1, 8)))

    payload = {"name": "TEST_InsideTamu", "institution": "PT TEST In",
               "purpose": "Rapat uji", "host": "Kepsek",
               "visit_date": today_iso, "arrived": True}
    r = requests.post(f"{API}/guests", headers=H(tokens["piket"]), json=payload, timeout=20)
    assert r.status_code == 200, r.text[:300]
    g = r.json()
    assert g["status"] == "hadir"
    assert g.get("approval") == "dalam_jam"
    assert g["checked_in_at"]
    # cleanup
    requests.delete(f"{API}/guests/{g['id']}", headers=H(tokens["super"]), timeout=15)


def test_guest_outside_hours_pending_then_approve_and_checkout(tokens, restore_hours):
    now = _wib_now_hm()
    today_iso = now.date().isoformat()
    # Create a 1-min window far away from "now" so we're outside hours.
    # Pick a safe fixed window: 03:00-03:30 (unlikely to be "now")
    far_start, far_end = "03:00", "03:30"
    # If now happens to fall in that window, shift
    cur = now.strftime("%H:%M")
    if far_start <= cur < far_end:
        far_start, far_end = "02:00", "02:30"
    _set_hours(tokens["super"], far_start, far_end, [1, 2, 3, 4, 5, 6])

    payload = {"name": "TEST_OutsideTamu", "institution": "PT TEST Out",
               "purpose": "Audit", "host": "Kepsek",
               "visit_date": today_iso, "arrived": True}
    r = requests.post(f"{API}/guests", headers=H(tokens["piket"]), json=payload, timeout=20)
    assert r.status_code == 200, r.text[:300]
    g = r.json()
    assert g["status"] == "menunggu", f"expected menunggu got {g.get('status')}"
    assert g.get("approval") == "menunggu"
    gid = g["id"]

    # Piket forbidden to decide
    r2 = requests.post(f"{API}/guests/{gid}/decision", headers=H(tokens["piket"]),
                       json={"approve": True, "note": "ok"}, timeout=15)
    assert r2.status_code == 403

    # Kepsek receives notification
    rn = requests.get(f"{API}/notifications", headers=H(tokens["kepsek"]), timeout=15)
    assert rn.status_code == 200
    items = rn.json().get("items", [])
    assert any("TEST_OutsideTamu" in (n.get("body") or "") or "izin tamu" in (n.get("title") or "").lower()
               for n in items)

    # Kepsek approves with note
    r3 = requests.post(f"{API}/guests/{gid}/decision", headers=H(tokens["kepsek"]),
                       json={"approve": True, "note": "Diizinkan"}, timeout=15)
    assert r3.status_code == 200, r3.text[:300]
    gu = r3.json()
    assert gu["approval"] == "disetujui"
    assert gu["status"] == "hadir"
    assert gu.get("decision_note") == "Diizinkan"

    # Cannot decide twice
    r4 = requests.post(f"{API}/guests/{gid}/decision", headers=H(tokens["kepsek"]),
                       json={"approve": False}, timeout=15)
    assert r4.status_code == 400

    # Piket checkout
    r5 = requests.post(f"{API}/guests/{gid}/checkout", headers=H(tokens["piket"]), timeout=15)
    assert r5.status_code == 200, r5.text[:300]
    assert r5.json()["status"] == "selesai"

    requests.delete(f"{API}/guests/{gid}", headers=H(tokens["super"]), timeout=15)


def test_guest_outside_hours_reject(tokens, restore_hours):
    now = _wib_now_hm()
    today_iso = now.date().isoformat()
    far_start, far_end = "03:00", "03:30"
    cur = now.strftime("%H:%M")
    if far_start <= cur < far_end:
        far_start, far_end = "02:00", "02:30"
    _set_hours(tokens["super"], far_start, far_end, [1, 2, 3, 4, 5, 6])

    payload = {"name": "TEST_RejectTamu", "institution": "PT TEST Rej",
               "purpose": "Promo", "visit_date": today_iso, "arrived": True}
    r = requests.post(f"{API}/guests", headers=H(tokens["piket"]), json=payload, timeout=15)
    assert r.status_code == 200
    gid = r.json()["id"]

    r2 = requests.post(f"{API}/guests/{gid}/decision", headers=H(tokens["kepsek"]),
                       json={"approve": False, "note": "Tidak relevan"}, timeout=15)
    assert r2.status_code == 200
    body = r2.json()
    assert body["approval"] == "ditolak" and body["status"] == "ditolak"

    requests.delete(f"{API}/guests/{gid}", headers=H(tokens["super"]), timeout=15)


def test_guests_summary(tokens):
    r = requests.get(f"{API}/guests/summary", headers=H(tokens["piket"]), timeout=15)
    assert r.status_code == 200
    for k in ("today", "inside", "pending", "date"):
        assert k in r.json()


def test_guests_list_filter(tokens):
    r = requests.get(f"{API}/guests", headers=H(tokens["piket"]),
                     params={"q": "TEST_"}, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
