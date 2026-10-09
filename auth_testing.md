# Auth Testing Playbook (admin-approved reset, no email)

1. MongoDB: `db.users.findOne({role:"super_admin"},{password_hash:1})` hash starts with `$2b$`. Indexes: users.email unique, login_attempts.identifier unique, reset_requests.id unique, audit_logs.created_at.
2. Login: POST /api/auth/login sets httpOnly `access_token` cookie (contains `tv` token_version claim); GET /api/auth/me works with cookie.
3. Forgot: POST /api/auth/forgot-password always returns same generic message (no enumeration); creates pending reset_requests doc with identity_match + masked identifier_hint (no raw identifier, no token stored).
4. Approve (super_admin only): returns temp_password once (12 chars), sets must_change_password, temp_password_expires_at (+30 min), increments token_version (old sessions -> 401). Re-approve -> 409. Old password -> 401.
5. Login with temp password -> user.must_change_password true; any API except /auth/me, /auth/logout, /auth/change-password, /settings -> 403.
6. Change password (min 8, letters+digits, not same as old) -> new cookie; temp password reuse -> 401.
7. Non-admin calling /api/admin/* -> 403. Rate limits: forgot 3/15min per email, 10/hour per IP -> 429; login 5 fails -> 429 lock.
8. Audit log: /api/admin/audit-logs lists reset_requested, reset_approved/rejected, password_changed, login_locked.
