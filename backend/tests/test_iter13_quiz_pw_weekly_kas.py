"""
Iteration 13: Class-lock enforcement for assignments/quizzes/submissions,
quiz password create/edit/remove, teacher-cannot-change-class-password,
weekly kas access & correctness, no leakage of answers/password_hash to siswa.
"""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

def _get_base():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        try:
            with open("/app/frontend/.env") as f:
                for ln in f:
                    if ln.startswith("REACT_APP_BACKEND_URL="):
                        url = ln.split("=", 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    assert url, "REACT_APP_BACKEND_URL not set"
    return url.rstrip("/")

BASE_URL = _get_base()
API = f"{BASE_URL}/api"
XI_IPA_1_ID = "97194f55-894d-44dc-957a-1c2a8522e2b0"
CLASS_PASSWORD = "kunci1"
PWD = "Demo12345"
DEMO = {
    "admin": "admin.demo@sekolahku.id",
    "guru": "guru.demo@sekolahku.id",
    "siswa": "siswa.demo@sekolahku.id",
    "kelas": "kelas.demo@sekolahku.id",
    "kepsek": "kepsek.demo@sekolahku.id",
}


def login(email, password=PWD):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def tokens():
    t = {k: login(e) for k, e in DEMO.items()}
    return t


@pytest.fixture(scope="module")
def guru_unlocked_token(tokens):
    """Unlock XI IPA 1 for guru.demo so they can create quiz/assignment there."""
    r = requests.post(f"{API}/classes/{XI_IPA_1_ID}/unlock",
                      json={"password": CLASS_PASSWORD}, headers=auth(tokens["guru"]), timeout=20)
    assert r.status_code == 200, r.text
    return tokens["guru"]


@pytest.fixture(scope="module")
def siswa_unlocked_token(tokens):
    # siswa.demo already unlocked per spec; make idempotent
    requests.post(f"{API}/classes/{XI_IPA_1_ID}/unlock",
                  json={"password": CLASS_PASSWORD}, headers=auth(tokens["siswa"]), timeout=20)
    return tokens["siswa"]


@pytest.fixture(scope="module")
def kelas_unlocked_token(tokens):
    # ketua kelas kelas.demo needs to be unlocked for weekly kas
    requests.post(f"{API}/classes/{XI_IPA_1_ID}/unlock",
                  json={"password": CLASS_PASSWORD}, headers=auth(tokens["kelas"]), timeout=20)
    return tokens["kelas"]


# ---------------- test: guru cannot change class password ----------------
class TestGuruCannotChangeClassPassword:
    def test_guru_patch_class_pw_forbidden(self, tokens):
        r = requests.patch(f"{API}/classes/{XI_IPA_1_ID}",
                           json={"password": "newpw"}, headers=auth(tokens["guru"]), timeout=20)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"


# ---------------- test: class-lock enforcement ----------------
# Use a fresh guru token NOT yet unlocked to test 423 behaviour on assignments/quizzes list.
# We re-login guru which gives a fresh token but the unlocked_classes is user-scoped (DB),
# so once guru.demo unlocks the class, they stay unlocked. So test the "locked" state using
# a user that has NOT unlocked. kepsek.demo is super-role-ish? kepsek is privileged
# for assert_class_view but still subject to class-password lock (user.role != super_admin).

class TestClassLockEnforcement:
    def test_siswa_without_unlock_sees_no_items(self, tokens):
        """Fresh siswa (new user) would be ideal; instead ensure: for a user who has
        NOT unlocked the class, list endpoints exclude that class's items.
        We'll use kepsek.demo (not super_admin, won't have unlocked)."""
        kepsek_tok = tokens["kepsek"]
        # Ensure kepsek has NOT unlocked by introspecting /auth/me
        me = requests.get(f"{API}/auth/me", headers=auth(kepsek_tok), timeout=20).json()
        if XI_IPA_1_ID in (me.get("unlocked_classes") or []):
            pytest.skip("kepsek pre-unlocked; cannot test locked list")

        # list assignments filtered by class_id -> must NOT include any assignment of this class
        r = requests.get(f"{API}/assignments", params={"class_id": XI_IPA_1_ID},
                         headers=auth(kepsek_tok), timeout=20)
        assert r.status_code == 200
        for a in r.json():
            assert a.get("class_id") != XI_IPA_1_ID, "locked class assignment leaked to kepsek"

        r = requests.get(f"{API}/quizzes", params={"class_id": XI_IPA_1_ID},
                         headers=auth(kepsek_tok), timeout=20)
        assert r.status_code == 200
        for q in r.json():
            assert q.get("class_id") != XI_IPA_1_ID, "locked class quiz leaked to kepsek"

    def test_submission_status_423_for_locked_user(self, tokens, guru_unlocked_token):
        """Create an assignment in locked class as guru (who unlocked), then request
        /submissions/status as kepsek (not unlocked) -> expect 423."""
        kepsek_tok = tokens["kepsek"]
        me = requests.get(f"{API}/auth/me", headers=auth(kepsek_tok), timeout=20).json()
        if XI_IPA_1_ID in (me.get("unlocked_classes") or []):
            pytest.skip("kepsek pre-unlocked")

        a = requests.post(f"{API}/assignments", json={
            "title": "TEST_iter13_lock_assign", "description": "x",
            "kelas": "XI IPA 1", "class_id": XI_IPA_1_ID,
            "due_date": "2026-12-31", "subject": None
        }, headers=auth(guru_unlocked_token), timeout=20)
        assert a.status_code == 200, a.text
        aid = a.json()["id"]
        try:
            r = requests.get(f"{API}/submissions/status", params={"assignment_id": aid},
                             headers=auth(kepsek_tok), timeout=20)
            assert r.status_code == 423, f"expected 423, got {r.status_code}: {r.text}"
        finally:
            requests.delete(f"{API}/assignments/{aid}", headers=auth(guru_unlocked_token), timeout=20)

    def test_super_admin_sees_all(self, tokens, guru_unlocked_token):
        """super admin never gets locked out."""
        a = requests.post(f"{API}/assignments", json={
            "title": "TEST_iter13_sa_assign", "description": "x",
            "kelas": "XI IPA 1", "class_id": XI_IPA_1_ID,
            "due_date": "2026-12-31", "subject": None
        }, headers=auth(guru_unlocked_token), timeout=20)
        aid = a.json()["id"]
        try:
            r = requests.get(f"{API}/assignments", params={"class_id": XI_IPA_1_ID},
                             headers=auth(tokens["admin"]), timeout=20)
            assert r.status_code == 200
            assert any(x["id"] == aid for x in r.json()), "super_admin should see all"
        finally:
            requests.delete(f"{API}/assignments/{aid}", headers=auth(guru_unlocked_token), timeout=20)


# ---------------- test: quiz password lifecycle ----------------
class TestQuizPassword:
    def _mk_quiz(self, tok, password=None, title="TEST_iter13_quiz"):
        body = {
            "title": title, "kelas": "XI IPA 1", "class_id": XI_IPA_1_ID,
            "questions": [{"q": "1+1?", "options": ["1", "2", "3", "4"], "answer": 1}]
        }
        if password:
            body["password"] = password
        r = requests.post(f"{API}/quizzes", json=body, headers=auth(tok), timeout=20)
        assert r.status_code == 200, r.text
        return r.json()

    def test_create_quiz_with_password_and_siswa_sees_locked(self, guru_unlocked_token, siswa_unlocked_token):
        q = self._mk_quiz(guru_unlocked_token, password="quizpw1")
        qid = q["id"]
        try:
            # Guru creator should see has_password=True, not locked, questions kept, answer field kept
            assert q["has_password"] is True
            assert q.get("locked") is False
            assert "password_hash" not in q
            assert q["questions"] and "answer" in q["questions"][0]

            # Siswa lists quizzes -> finds quiz, locked=True, questions=[], question_count=1
            r = requests.get(f"{API}/quizzes", params={"class_id": XI_IPA_1_ID},
                             headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 200
            got = [x for x in r.json() if x["id"] == qid]
            assert got, "quiz missing in siswa list"
            s_q = got[0]
            assert s_q["locked"] is True
            assert s_q["has_password"] is True
            assert s_q["questions"] == []
            assert s_q["question_count"] == 1
            assert "password_hash" not in s_q

            # attempt without unlock -> 423
            r = requests.post(f"{API}/quizzes/attempt",
                              json={"quiz_id": qid, "answers": [1]},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 423, r.text

            # wrong password -> 400
            r = requests.post(f"{API}/quizzes/{qid}/unlock",
                              json={"password": "WRONG"},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 400

            # right password -> 200, returns questions WITHOUT answer field for siswa
            r = requests.post(f"{API}/quizzes/{qid}/unlock",
                              json={"password": "quizpw1"},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["locked"] is False
            assert data["questions"] and "answer" not in data["questions"][0]
            assert "password_hash" not in data

            # attempt now works
            r = requests.post(f"{API}/quizzes/attempt",
                              json={"quiz_id": qid, "answers": [1]},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 200
            assert r.json()["score"] == 1
        finally:
            requests.delete(f"{API}/quizzes/{qid}", headers=auth(guru_unlocked_token), timeout=20)

    def test_edit_quiz_password_resets_unlocks(self, guru_unlocked_token, siswa_unlocked_token):
        q = self._mk_quiz(guru_unlocked_token, password="pw1", title="TEST_iter13_resetpw")
        qid = q["id"]
        try:
            # siswa unlocks with pw1
            r = requests.post(f"{API}/quizzes/{qid}/unlock",
                              json={"password": "pw1"},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 200

            # guru changes password -> unlocks reset
            r = requests.patch(f"{API}/quizzes/{qid}", json={"password": "pw2"},
                               headers=auth(guru_unlocked_token), timeout=20)
            assert r.status_code == 200, r.text

            # siswa attempt now locked again
            r = requests.post(f"{API}/quizzes/attempt",
                              json={"quiz_id": qid, "answers": [1]},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 423, f"expected 423 after pw change, got {r.status_code}"

            # old pw fails
            r = requests.post(f"{API}/quizzes/{qid}/unlock",
                              json={"password": "pw1"},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 400
            # new pw works
            r = requests.post(f"{API}/quizzes/{qid}/unlock",
                              json={"password": "pw2"},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 200
        finally:
            requests.delete(f"{API}/quizzes/{qid}", headers=auth(guru_unlocked_token), timeout=20)

    def test_remove_quiz_password(self, guru_unlocked_token, siswa_unlocked_token):
        q = self._mk_quiz(guru_unlocked_token, password="pw-del", title="TEST_iter13_delpw")
        qid = q["id"]
        try:
            r = requests.patch(f"{API}/quizzes/{qid}", json={"remove_password": True},
                               headers=auth(guru_unlocked_token), timeout=20)
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["has_password"] is False

            # siswa should see questions (not locked)
            r = requests.get(f"{API}/quizzes", params={"class_id": XI_IPA_1_ID},
                             headers=auth(siswa_unlocked_token), timeout=20)
            s_q = [x for x in r.json() if x["id"] == qid][0]
            assert s_q["locked"] is False
            assert s_q["has_password"] is False
            assert len(s_q["questions"]) == 1
            # answer field still hidden for siswa (student never gets answers)
            assert "answer" not in s_q["questions"][0]

            # attempt without any password works
            r = requests.post(f"{API}/quizzes/attempt",
                              json={"quiz_id": qid, "answers": [1]},
                              headers=auth(siswa_unlocked_token), timeout=20)
            assert r.status_code == 200
        finally:
            requests.delete(f"{API}/quizzes/{qid}", headers=auth(guru_unlocked_token), timeout=20)


# ---------------- test: weekly kas ----------------
class TestWeeklyKas:
    def test_siswa_forbidden(self, siswa_unlocked_token):
        r = requests.get(f"{API}/classes/{XI_IPA_1_ID}/kas/weekly",
                         headers=auth(siswa_unlocked_token), timeout=20)
        assert r.status_code == 403, r.text

    def test_guru_forbidden(self, guru_unlocked_token):
        r = requests.get(f"{API}/classes/{XI_IPA_1_ID}/kas/weekly",
                         headers=auth(guru_unlocked_token), timeout=20)
        assert r.status_code == 403

    def test_ketua_kelas_ok(self, kelas_unlocked_token):
        r = requests.get(f"{API}/classes/{XI_IPA_1_ID}/kas/weekly",
                         headers=auth(kelas_unlocked_token), timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "week_start" in d and "week_end" in d and "paid" in d and "unpaid" in d
        assert d["total"] == len(d["paid"]) + len(d["unpaid"])
        # Monday-Sunday WIB
        from datetime import date
        ws = datetime.fromisoformat(d["week_start"]).date()
        we = datetime.fromisoformat(d["week_end"]).date()
        assert ws.weekday() == 0, f"week_start should be Monday, got {ws.weekday()}"
        assert we.weekday() == 6, f"week_end should be Sunday, got {we.weekday()}"
        assert (we - ws).days == 6

    def test_super_admin_ok(self, tokens):
        r = requests.get(f"{API}/classes/{XI_IPA_1_ID}/kas/weekly",
                         headers=auth(tokens["admin"]), timeout=20)
        assert r.status_code == 200, r.text

    def test_pay_moves_student_to_paid(self, kelas_unlocked_token):
        d = requests.get(f"{API}/classes/{XI_IPA_1_ID}/kas/weekly",
                         headers=auth(kelas_unlocked_token), timeout=20).json()
        if not d["unpaid"]:
            pytest.skip("No unpaid students this week to test transition")
        student = d["unpaid"][0]
        tx = requests.post(f"{API}/classes/{XI_IPA_1_ID}/kas", json={
            "amount": 5000, "type": "masuk", "note": "TEST_iter13 weekly",
            "student_id": student["id"]
        }, headers=auth(kelas_unlocked_token), timeout=20)
        assert tx.status_code == 200, tx.text
        kid = tx.json()["id"]
        try:
            d2 = requests.get(f"{API}/classes/{XI_IPA_1_ID}/kas/weekly",
                              headers=auth(kelas_unlocked_token), timeout=20).json()
            paid_ids = {s["id"] for s in d2["paid"]}
            unpaid_ids = {s["id"] for s in d2["unpaid"]}
            assert student["id"] in paid_ids
            assert student["id"] not in unpaid_ids
        finally:
            requests.delete(f"{API}/kas/{kid}", headers=auth(kelas_unlocked_token), timeout=20)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
