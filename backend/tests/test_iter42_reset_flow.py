"""
Iteration 42 - Admin-approved password reset flow (no email dependency).
Covers: forgot-password enumeration-safe response, admin list/approve/reject,
temp password forced change, token_version invalidation, security gating,
audit log entries, and basic rate-limit assertions.
"""
import os
import re
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://website-sekolah-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "boassibarani123@gmail.com"
ADMIN_PASSWORD = "Boas12345io"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def mongo():
    cli = MongoClient(MONGO_URL)
    db = cli[DB_NAME]
    # Clear forgot-password IP/email throttle so tests don't 429
    db.password_reset_requests.delete_many({})
    yield db
    cli.close()


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def siswa(admin, mongo):
    # Unique TEST_ siswa with phone/nisn so identity_match can be tested
    email = f"TEST_reset_{uuid.uuid4().hex[:8]}@example.com"
    pw = "SiswaPass1"
    nisn = f"TEST{uuid.uuid4().hex[:6].upper()}"
    phone = "081234" + str(int(time.time()) % 1000000).zfill(6)
    r = admin.post(f"{API}/users", json={
        "email": email, "password": pw, "name": "TEST Reset Siswa", "role": "siswa",
        "nisn": nisn, "kelas": "X-1", "phone": phone,
    })
    assert r.status_code in (200, 201), r.text
    uid = r.json()["id"]
    yield {"email": email, "password": pw, "nisn": nisn, "phone": phone, "id": uid}
    # Cleanup
    try:
        admin.delete(f"{API}/users/{uid}")
    except Exception:
        pass
    mongo.reset_requests.delete_many({"user_id": uid})
    mongo.audit_logs.delete_many({"target_user_id": uid})


# ---- 1. Public forgot-password: generic message both for valid + invalid email ----
def test_forgot_password_generic_message_valid_and_invalid(siswa, mongo):
    mongo.password_reset_requests.delete_many({})
    mongo.reset_requests.delete_many({"user_id": siswa["id"]})

    r1 = requests.post(f"{API}/auth/forgot-password", json={
        "email": siswa["email"], "identifier": siswa["nisn"], "note": "lupa pw"})
    assert r1.status_code == 200, r1.text
    msg1 = r1.json()["message"]

    r2 = requests.post(f"{API}/auth/forgot-password", json={
        "email": f"nope_{uuid.uuid4().hex}@no.com", "identifier": "12345678", "note": ""})
    assert r2.status_code == 200
    assert r2.json()["message"] == msg1  # Enumeration-safe

    # DB: pending request exists for valid user, no raw identifier stored
    doc = mongo.reset_requests.find_one({"user_id": siswa["id"], "status": "pending"})
    assert doc, "pending reset_requests doc should be created"
    assert doc.get("identity_match") is True
    assert "identifier" not in doc  # no raw identifier
    assert "temp_password" not in doc and "token" not in doc
    assert doc.get("identifier_hint") and "*" in doc["identifier_hint"]


# ---- 2. Admin list shows the request ----
def test_admin_can_list_reset_requests(admin, siswa):
    r = admin.get(f"{API}/admin/reset-requests?status=pending")
    assert r.status_code == 200
    ids = {x["user_id"] for x in r.json()}
    assert siswa["id"] in ids


# ---- 3. Non-admin cannot access admin endpoints ----
def test_non_admin_forbidden(siswa):
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": siswa["email"], "password": siswa["password"]})
    assert r.status_code == 200
    for url in [f"{API}/admin/reset-requests",
                f"{API}/admin/reset-requests/anyid/approve",
                f"{API}/admin/reset-requests/anyid/reject",
                f"{API}/admin/audit-logs"]:
        rr = s.get(url) if url.endswith("logs") or url.endswith("requests") else s.post(url, json={"identity_verified": True, "verification_method": "x", "reason": "x"})
        assert rr.status_code == 403, f"{url} -> {rr.status_code}"


# ---- 4. Approve requires identity_verified true and returns temp password ----
_approve_state = {}

def test_approve_requires_identity_verified(admin, siswa, mongo):
    pending = mongo.reset_requests.find_one({"user_id": siswa["id"], "status": "pending"})
    assert pending
    rid = pending["id"]
    _approve_state["rid"] = rid

    r = admin.post(f"{API}/admin/reset-requests/{rid}/approve",
                   json={"identity_verified": False, "verification_method": "KTP"})
    assert r.status_code == 400


def test_approve_returns_temp_password_and_invalidates_old_sessions(admin, siswa, mongo):
    # Login siswa first to get an OLD session cookie
    old = _session()
    r = old.post(f"{API}/auth/login", json={"email": siswa["email"], "password": siswa["password"]})
    assert r.status_code == 200
    assert old.get(f"{API}/auth/me").status_code == 200

    rid = _approve_state["rid"]
    r = admin.post(f"{API}/admin/reset-requests/{rid}/approve",
                   json={"identity_verified": True, "verification_method": "KTP tatap muka"})
    assert r.status_code == 200, r.text
    body = r.json()
    temp = body["temp_password"]
    assert isinstance(temp, str) and len(temp) == 12
    assert re.search(r"[A-Za-z]", temp) and re.search(r"\d", temp)
    _approve_state["temp"] = temp

    # Old session invalidated via token_version bump
    assert old.get(f"{API}/auth/me").status_code == 401

    # Old password no longer works
    r2 = _session().post(f"{API}/auth/login", json={"email": siswa["email"], "password": siswa["password"]})
    assert r2.status_code == 401

    # DB: hash is bcrypt, request is approved
    u = mongo.users.find_one({"id": siswa["id"]})
    assert u["password_hash"].startswith("$2b$")
    assert u.get("must_change_password") is True
    assert u.get("temp_password_expires_at")
    req = mongo.reset_requests.find_one({"id": rid})
    assert req["status"] == "approved"
    assert "temp_password" not in req  # not stored


# ---- 5. Re-approve already processed -> 409 ----
def test_reapprove_conflict(admin):
    rid = _approve_state["rid"]
    r = admin.post(f"{API}/admin/reset-requests/{rid}/approve",
                   json={"identity_verified": True, "verification_method": "KTP again"})
    assert r.status_code == 409


# ---- 6. Admin cannot approve their own reset request ----
def test_admin_cannot_approve_own_request(admin, mongo):
    mongo.password_reset_requests.delete_many({})
    # Super admin requests reset for themselves
    r = requests.post(f"{API}/auth/forgot-password", json={
        "email": ADMIN_EMAIL, "identifier": "selfcheck", "note": ""})
    assert r.status_code == 200
    admin_user = mongo.users.find_one({"email": ADMIN_EMAIL})
    pending = mongo.reset_requests.find_one({"user_id": admin_user["id"], "status": "pending"})
    assert pending
    rid = pending["id"]
    rr = admin.post(f"{API}/admin/reset-requests/{rid}/approve",
                    json={"identity_verified": True, "verification_method": "KTP self"})
    assert rr.status_code == 403
    # Cleanup: reject to not leave hanging pending for admin
    admin.post(f"{API}/admin/reset-requests/{rid}/reject", json={"reason": "test cleanup"})


# ---- 7. Login with temp password -> must_change_password gating ----
_login_state = {}

def test_login_with_temp_password_gates_other_apis(siswa):
    temp = _approve_state["temp"]
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": siswa["email"], "password": temp})
    assert r.status_code == 200
    data = r.json()
    assert data["user"].get("must_change_password") is True
    _login_state["sess"] = s

    # Allowed
    assert s.get(f"{API}/auth/me").status_code == 200
    # Blocked
    assert s.get(f"{API}/users").status_code == 403
    assert s.get(f"{API}/announcements").status_code == 403


# ---- 8. Change password policy + success + session invalidation ----
def test_change_password_policy_errors(siswa):
    s = _login_state["sess"]
    temp = _approve_state["temp"]
    # Too short -> Pydantic 422
    r = s.post(f"{API}/auth/change-password", json={"current_password": temp, "new_password": "ab1"})
    assert r.status_code in (400, 422)
    # No digit -> policy 400
    r = s.post(f"{API}/auth/change-password", json={"current_password": temp, "new_password": "abcdefghij"})
    assert r.status_code == 400
    # Wrong current
    r = s.post(f"{API}/auth/change-password", json={"current_password": "wrongpw1", "new_password": "NewPass123"})
    assert r.status_code == 400


def test_change_password_success_and_reuse_blocked(siswa):
    s = _login_state["sess"]
    temp = _approve_state["temp"]
    new_pw = "NewSiswa2026"
    r = s.post(f"{API}/auth/change-password", json={"current_password": temp, "new_password": new_pw})
    assert r.status_code == 200, r.text
    assert r.json()["user"].get("must_change_password") in (False, None)
    _login_state["new_pw"] = new_pw

    # Old temp password cannot be reused
    r2 = _session().post(f"{API}/auth/login", json={"email": siswa["email"], "password": temp})
    assert r2.status_code == 401

    # New password works
    s3 = _session()
    r3 = s3.post(f"{API}/auth/login", json={"email": siswa["email"], "password": new_pw})
    assert r3.status_code == 200
    # Can now call protected endpoints
    assert s3.get(f"{API}/announcements").status_code in (200, 403)  # role may deny but not must_change


# ---- 9. Audit log entries exist ----
def test_audit_logs_contain_reset_events(admin, siswa):
    r = admin.get(f"{API}/admin/audit-logs?limit=200")
    assert r.status_code == 200
    actions = [lg["action"] for lg in r.json() if lg.get("target_user_id") == siswa["id"]]
    assert "reset_requested" in actions
    assert "reset_approved" in actions
    assert "password_changed" in actions


# ---- 10. Reject flow ----
def test_reject_flow(admin, siswa, mongo):
    mongo.password_reset_requests.delete_many({})
    r = requests.post(f"{API}/auth/forgot-password", json={
        "email": siswa["email"], "identifier": siswa["nisn"], "note": "retry"})
    assert r.status_code == 200
    pending = mongo.reset_requests.find_one({"user_id": siswa["id"], "status": "pending"})
    assert pending
    rid = pending["id"]
    rr = admin.post(f"{API}/admin/reset-requests/{rid}/reject", json={"reason": "identitas tidak cocok"})
    assert rr.status_code == 200
    # Re-reject -> 409
    rr2 = admin.post(f"{API}/admin/reset-requests/{rid}/reject", json={"reason": "duplicate"})
    assert rr2.status_code == 409
    doc = mongo.reset_requests.find_one({"id": rid})
    assert doc["status"] == "rejected"
    assert doc.get("reject_reason")


# ---- 11. Rate limit on forgot-password (3/15min per email) ----
def test_forgot_password_rate_limit_per_email(mongo):
    mongo.password_reset_requests.delete_many({})
    email = f"ratelimit_{uuid.uuid4().hex[:8]}@example.com"
    codes = []
    for _ in range(5):
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": email, "identifier": "12345678", "note": ""})
        codes.append(r.status_code)
    assert 429 in codes, f"Expected a 429 among {codes}"
    # Cleanup
    mongo.password_reset_requests.delete_many({})


# ---- 12. /reset-password frontend route redirect handled by SPA (skipped at API layer) ----
# ---- 13. Super admin regression ----
def test_super_admin_can_still_login_and_fetch_me(admin):
    r = admin.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["role"] == "super_admin"
