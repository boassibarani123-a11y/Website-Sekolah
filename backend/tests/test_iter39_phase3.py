"""Phase 3 backend tests: Schoolgram comments ownership, Jadwal conflict,
Inventory overdue, PPDB detail, Elections status gating + stats."""
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests


def _load_env():
    f = Path("/app/frontend/.env")
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_env()
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {_login(ADMIN_EMAIL, ADMIN_PASSWORD)}"})
    return s


@pytest.fixture
def throwaway_siswa_factory(admin):
    created = []

    def _make(**overrides):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "email": f"TEST_siswa_{suffix}@example.com",
            "password": "Pass1234!",
            "name": f"TEST Siswa {suffix}",
            "role": "siswa",
            "phone": "081234567890",
            "nisn": f"99{suffix}",
            "kelas": "X-1",
        }
        payload.update(overrides)
        r = admin.post(f"{API}/users", json=payload)
        assert r.status_code == 200, r.text
        u = r.json()
        created.append((u["id"], payload["email"], payload["password"]))
        return u, payload["email"], payload["password"]

    yield _make

    for uid, _, _ in created:
        admin.delete(f"{API}/users/{uid}")


def _session_for(email, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {_login(email, password)}"})
    return s


# ---------- Schoolgram comment ownership ----------
class TestSchoolgramCommentsOwnership:
    def test_edit_and_delete_ownership(self, admin, throwaway_siswa_factory):
        # Need a kelas "X-1" to exist so throwaway siswa can be created there,
        # and a post. Super admin can post.
        suffix = uuid.uuid4().hex[:6]
        # Ensure a class named X-1 exists
        existing = admin.get(f"{API}/classes").json()
        klass = next((c for c in existing if c.get("name") == "X-1"), None)
        created_class_id = None
        if not klass:
            r = admin.post(f"{API}/classes", json={"name": "X-1", "subjects": []})
            assert r.status_code == 200, r.text
            klass = r.json()
            created_class_id = klass["id"]

        # Create a post as super admin (allowed)
        r = admin.post(f"{API}/posts", json={"image": "data:image/png;base64,AAA", "caption": f"TEST post {suffix}"})
        assert r.status_code == 200, r.text
        post = r.json()
        pid = post["id"]

        # Siswa A comments
        _, email_a, pw_a = throwaway_siswa_factory()
        sa = _session_for(email_a, pw_a)
        r = sa.post(f"{API}/posts/{pid}/comment", json={"text": "halo dari A"})
        assert r.status_code == 200, r.text
        c = r.json()
        assert c.get("user_id")  # should be set per server.py
        cid = c["id"]

        # Siswa B tries to EDIT A's comment -> 403
        _, email_b, pw_b = throwaway_siswa_factory()
        sb = _session_for(email_b, pw_b)
        r = sb.patch(f"{API}/posts/{pid}/comment/{cid}", json={"text": "hack"})
        assert r.status_code == 403, r.text

        # Siswa B tries to DELETE A's comment -> 403
        r = sb.delete(f"{API}/posts/{pid}/comment/{cid}")
        assert r.status_code == 403, r.text

        # Owner A edits -> 200, marks edited
        r = sa.patch(f"{API}/posts/{pid}/comment/{cid}", json={"text": "halo dari A (updated)"})
        assert r.status_code == 200, r.text
        assert r.json().get("edited") is True
        assert r.json().get("text") == "halo dari A (updated)"

        # Super admin can DELETE anyone's comment (owner-or-admin)
        r = admin.delete(f"{API}/posts/{pid}/comment/{cid}")
        assert r.status_code == 200, r.text

        # Verify comment gone
        posts = admin.get(f"{API}/posts").json()
        p = next(x for x in posts if x["id"] == pid)
        assert all(x["id"] != cid for x in p.get("comments", []))

        # Cleanup
        admin.delete(f"{API}/schoolgram/post/{pid}")
        if created_class_id:
            admin.delete(f"{API}/classes/{created_class_id}")


# ---------- Jadwal conflict ----------
class TestJadwalConflict:
    def test_conflict_same_room_overlap(self, admin):
        existing = admin.get(f"{API}/classes").json()
        klass = next((c for c in existing if c.get("name") == "X-1"), None)
        created_class_id = None
        if not klass:
            r = admin.post(f"{API}/classes", json={"name": "X-1", "subjects": []})
            assert r.status_code == 200, r.text
            klass = r.json()
            created_class_id = klass["id"]

        suffix = uuid.uuid4().hex[:4]
        room = f"R{suffix}"
        base = {
            "class_id": klass["id"],
            "day": "Senin",
            "start_time": "08:00",
            "end_time": "09:00",
            "subject": f"TEST-{suffix}",
            "teacher_id": None,
            "room": room,
        }
        r1 = admin.post(f"{API}/timetable", json=base)
        assert r1.status_code == 200, r1.text
        tid1 = r1.json()["id"]

        # Overlapping same room, same class -> conflict 409 (class conflict triggers first)
        r2 = admin.post(f"{API}/timetable", json={**base, "start_time": "08:30", "end_time": "09:30",
                                                   "subject": f"TEST2-{suffix}"})
        assert r2.status_code == 409, r2.text

        # Different class but same room overlapping -> still conflict
        suffix2 = uuid.uuid4().hex[:4]
        other = next((c for c in existing if c.get("name") != klass["name"]), None)
        created_other_id = None
        if not other:
            r = admin.post(f"{API}/classes", json={"name": f"TESTCLS-{suffix2}", "subjects": []})
            assert r.status_code == 200, r.text
            other = r.json()
            created_other_id = other["id"]
        r3 = admin.post(f"{API}/timetable", json={**base, "class_id": other["id"],
                                                   "start_time": "08:30", "end_time": "09:30",
                                                   "subject": f"TEST3-{suffix}"})
        assert r3.status_code == 409, r3.text

        # Non-overlapping, same room -> OK
        r4 = admin.post(f"{API}/timetable", json={**base, "start_time": "09:00", "end_time": "10:00",
                                                   "subject": f"TEST4-{suffix}"})
        assert r4.status_code == 200, r4.text
        tid4 = r4.json()["id"]

        # cleanup
        admin.delete(f"{API}/timetable/{tid1}")
        admin.delete(f"{API}/timetable/{tid4}")
        if created_other_id:
            admin.delete(f"{API}/classes/{created_other_id}")
        if created_class_id:
            admin.delete(f"{API}/classes/{created_class_id}")

    def test_today_live_schedule(self, admin):
        """Verify that a schedule for TODAY spanning current time is retrievable."""
        existing = admin.get(f"{API}/classes").json()
        klass = next((c for c in existing if c.get("name") == "X-1"), None)
        created_class_id = None
        if not klass:
            r = admin.post(f"{API}/classes", json={"name": "X-1", "subjects": []})
            assert r.status_code == 200
            klass = r.json()
            created_class_id = klass["id"]

        DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
        now_wib = datetime.now(timezone.utc) + timedelta(hours=7)
        idx = now_wib.weekday()
        if idx > 5:
            pytest.skip("Minggu — no live schedule")
        day = DAYS[idx]
        # UI isLive logic is frontend-only; we just verify today's schedule
        # can be created & retrieved. Use fixed safe window.
        start = "10:00"
        end = "11:00"

        suffix = uuid.uuid4().hex[:4]
        r = admin.post(f"{API}/timetable", json={
            "class_id": klass["id"], "day": day, "start_time": start, "end_time": end,
            "subject": f"LIVE-{suffix}", "teacher_id": None, "room": f"LR{suffix}",
        })
        assert r.status_code == 200, r.text
        tid = r.json()["id"]

        r2 = admin.get(f"{API}/timetable", params={"class_id": klass["id"]})
        assert r2.status_code == 200
        items = r2.json()
        match = next((x for x in items if x["id"] == tid), None)
        assert match is not None
        assert match["day"] == day
        assert match["start_time"] == start

        admin.delete(f"{API}/timetable/{tid}")
        if created_class_id:
            admin.delete(f"{API}/classes/{created_class_id}")


# ---------- Inventory overdue ----------
class TestInventoryOverdue:
    def test_borrow_approve_past_return_date(self, admin, throwaway_siswa_factory):
        # Create an inventory item
        suffix = uuid.uuid4().hex[:4]
        r = admin.post(f"{API}/inventory", json={"name": f"TEST Item {suffix}", "stock": 10, "category": "TEST"})
        assert r.status_code == 200, r.text
        iid = r.json()["id"]

        # Siswa requests borrow with past return_date
        _, email, pw = throwaway_siswa_factory()
        s = _session_for(email, pw)
        past = (datetime.utcnow() - timedelta(days=2)).date().isoformat()
        r = s.post(f"{API}/borrow", json={"item_id": iid, "quantity": 1, "purpose": "TEST",
                                           "return_date": past})
        assert r.status_code == 200, r.text
        bid = r.json()["id"]

        # Approve
        r = admin.patch(f"{API}/borrow/{bid}", params={"status": "Disetujui"})
        assert r.status_code == 200, r.text

        # Verify list reflects approved + past return_date (frontend derives 'Terlambat')
        r = admin.get(f"{API}/borrow")
        assert r.status_code == 200
        br = next((x for x in r.json() if x["id"] == bid), None)
        assert br is not None
        assert br["status"] == "Disetujui"
        assert br["return_date"] == past

        # cleanup
        admin.patch(f"{API}/borrow/{bid}", params={"status": "Dikembalikan"})
        admin.delete(f"{API}/inventory/{iid}")


# ---------- PPDB detail ----------
class TestPpdbDetail:
    def test_status_notes_update_without_jurusan(self, admin):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "full_name": f"TEST PPDB {suffix}",
            "address": "Jl. Test",
            "phone": "081200000001",
            "parent_name": "Ortu Test",
            "parent_phone": "081200000002",
            "parent_email": "tp@example.com",
            "prev_school": "SMP TEST",
            "nem_avg": 85.0,
        }
        r = requests.post(f"{API}/ppdb/register", json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]

        # Update status via PATCH ?status=
        for st in ("lolos", "tidak_lolos", "pending"):
            r = admin.patch(f"{API}/ppdb/{pid}", params={"status": st})
            assert r.status_code == 200, r.text
            g = admin.get(f"{API}/ppdb/{pid}").json()
            assert g["status"] == st

        # Update notes
        r = admin.patch(f"{API}/ppdb/{pid}", params={"notes": "catatan ujian"})
        assert r.status_code == 200
        g = admin.get(f"{API}/ppdb/{pid}").json()
        assert g.get("notes") == "catatan ujian"
        assert g.get("parent_phone") == "081200000002"
        # no jurusan
        assert g.get("jurusan_pilihan", "") in ("", None)

        admin.delete(f"{API}/ppdb/{pid}")


# ---------- Elections ----------
class TestElections:
    def test_status_gates_voting_and_stats(self, admin, throwaway_siswa_factory):
        # Record current status to restore
        r = admin.get(f"{API}/election/status")
        assert r.status_code == 200
        prev_status = r.json().get("status", "belum")

        created_cands = []
        try:
            # Set status 'belum' and verify voting is blocked
            r = admin.patch(f"{API}/election/status", params={"status": "belum"})
            assert r.status_code == 200
            assert r.json()["status"] == "belum"

            # Add candidate (ketua)
            suffix = uuid.uuid4().hex[:4]
            r = admin.post(f"{API}/candidates", json={"name": f"TEST Cand A {suffix}",
                                                       "position": "ketua",
                                                       "vision": "V", "mission": "M"})
            assert r.status_code == 200, r.text
            cand_a = r.json()
            created_cands.append(cand_a["id"])

            r = admin.post(f"{API}/candidates", json={"name": f"TEST Cand B {suffix}",
                                                       "position": "ketua",
                                                       "vision": "V2", "mission": "M2"})
            assert r.status_code == 200
            cand_b = r.json()
            created_cands.append(cand_b["id"])

            # Create a siswa
            _, email, pw = throwaway_siswa_factory()
            s = _session_for(email, pw)

            # Try voting while 'belum' -> 400
            r = s.post(f"{API}/vote/{cand_a['id']}")
            assert r.status_code == 400, r.text

            # Switch to 'berlangsung'
            r = admin.patch(f"{API}/election/status", params={"status": "berlangsung"})
            assert r.status_code == 200

            # Stats before vote
            r = admin.get(f"{API}/election/stats")
            assert r.status_code == 200
            stats_before = r.json()
            votes_before = stats_before["total_votes"]
            dpt = stats_before["dpt"]
            assert dpt >= 1

            # Vote succeeds
            r = s.post(f"{API}/vote/{cand_a['id']}")
            assert r.status_code == 200, r.text

            # Can't double-vote for same position
            r = s.post(f"{API}/vote/{cand_b['id']}")
            assert r.status_code == 400

            # Stats updated
            r = admin.get(f"{API}/election/stats")
            stats_after = r.json()
            assert stats_after["total_votes"] == votes_before + 1
            assert stats_after["participation"] >= stats_before["participation"]
            cand_map = {c["id"]: c for c in stats_after["candidates"]}
            assert cand_map[cand_a["id"]]["vote_count"] >= 1

            # Switch to 'selesai' -> vote blocked for another siswa
            r = admin.patch(f"{API}/election/status", params={"status": "selesai"})
            assert r.status_code == 200
            _, e2, p2 = throwaway_siswa_factory()
            s2 = _session_for(e2, p2)
            r = s2.post(f"{API}/vote/{cand_b['id']}")
            assert r.status_code == 400

            # Invalid status
            r = admin.patch(f"{API}/election/status", params={"status": "foo"})
            assert r.status_code == 400
        finally:
            # cleanup candidates & restore status
            for cid in created_cands:
                admin.delete(f"{API}/candidates/{cid}")
            # purge votes created in test by deleting voters (siswa fixture handles it)
            admin.patch(f"{API}/election/status", params={"status": prev_status})
