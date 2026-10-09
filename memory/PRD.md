# PRD — Website Sekolah (SMA Negeri 1 Laguboti)

## Original Problem Statement
Setup/import task (NOT a new build). Clone the existing full-stack school management app from
GitHub branch `main13` (https://github.com/boassibarani123-a11y/Website-Sekolah.git) into the
Emergent environment and get it running fully end-to-end: compile + run + Super Admin login works.

## User Choices
- Branch: **main13** (confirmed, intentionally 12 commits behind `main`)
- Secrets: **generated placeholders** (random JWT, default admin), no real keys provided
- AI (OpenAI) & Email (SMTP): **OFF** — app must run without them; keys added later

## Architecture
- **Backend:** FastAPI + MongoDB (Motor). JWT auth, WebSocket chat (`/api/ws/chat` with 4s polling fallback),
  file uploads, optional OpenAI + SMTP (disabled). Single file `backend/server.py` (~4835 lines),
  all routes under single `/api` prefix via `APIRouter(prefix="/api")`.
- **Frontend:** React 19 + CRACO + Tailwind (Yarn). `apiClient.js` base = `REACT_APP_BACKEND_URL/api`.
- **DB:** local MongoDB `mongodb://localhost:27017`, DB `test_database`.
- **Super Admin** auto-seeded on boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## User Personas
- Super Admin / Kepala Sekolah / Staff TU / Guru / Siswa / Ketua OSIS / Ketua Kelas (multi-role).

## Core Requirements (static)
- Multi-role dashboard, account management, QR attendance, Schoolgram feed, inventory, assignments & quizzes,
  social fund (uang kas/dana sosial), OSIS elections, achievements gallery, announcements, student card printing (KTP),
  PPDB public registration, org structure, library, reports, calendar.

## Enhancement Request (large, multi-module) — Phased
User requested enhancements across ~17 modules. Executing in phases.

### Phase 2 — DONE & VERIFIED (2026-06, iteration_3.json: backend 6/6, frontend 100%)
- [x] Guru & Staff (/guru-staff): Grid Card view + Table view toggle, avatars, WhatsApp quick button (wa.me, 62-normalized), Penugasan detail (wali kelas + mapel).
- [x] Presensi Barcode (/attendance): full-width real-time live log table w/ LIVE indicator, 5s polling + instant update on scan, newest-row highlight.
- [x] GLOBAL jurusan removal: PPDB form/admin/export, rapor PDF, class placeholders (X.1, XI.1) — no more IPA/IPS.
- [x] Leaderboard (/leaderboard): Top-3 gamified podium + category & period (Bulan/Semester) filters (backend aggregation honors params).

### Remaining phases (backlog, user-requested)
- [ ] Admin PPDB (/admin-ppdb): detail modal + documents, manual status change + rejection note, WhatsApp notify.
- [ ] Schoolgram (/schoolgram): edit/delete own comments, Instagram-like feed polish.
- [ ] Inventory (/inventory): grid cards, borrow request flow, approval + return tracking.
- [ ] Classes/ClassDetail: sanitize HTML in task descriptions, class card info, tab layout polish.
- [ ] Reports (Rapor Digital): student search/filter + completeness indicator, semester filter + charts + wali notes.
- [ ] Jadwal (/jadwal): conflict detection on add, current-lesson highlight, weekly matrix view.
- [ ] Elections (/elections): quick-count stats, candidate cards w/ photos, status control + candidate CRUD.
- [ ] Achievements (/achievements): podium + Top 10 categories, filters, interactive gallery grid + add/edit modal.
- [ ] Announcements (/announcements): modern feed, category badges, pinned styling, filter + search.
- [ ] Feedback (/feedback): interactive cards w/ category + status badges, admin reply, filters.
- [ ] E-Voting module: student voting booth + real-time live-count dashboard for admin.

### Phase 1 — DONE &amp; VERIFIED (2026-06, iteration_2.json: backend 12/12, frontend 100%)
- [x] Login: loading spinner + clear inline error alert (data-testid login-error).
- [x] Dashboard: clickable summary stat cards + Presensi/Pengumuman widget links + clean empty states.
- [x] Master Accounts: Role + Status filter dropdowns, colored role badges, Edit modal, Delete confirmation modal, responsive table.
- [x] Account status: backend `is_active` field; deactivated users blocked at login (403).
- [x] Global: moved user widget from sidebar to top-right header (profile-button) + logout; new /profile page with Data Akademik / Data Pribadi tabs.

### Remaining phases (backlog, user-requested)
- [ ] Admin PPDB (/admin-ppdb): detail modal + documents, manual status change + rejection note, WhatsApp notify.
- [ ] Schoolgram (/schoolgram): edit/delete own comments, Instagram-like feed polish.
- [ ] Inventory (/inventory): grid cards, borrow request flow, approval + return tracking.
- [ ] Classes/ClassDetail: sanitize HTML in task descriptions, class card info, tab layout polish.
- [ ] Reports (Rapor Digital): student search/filter + completeness indicator, semester filter + charts + wali notes.
- [ ] Jadwal (/jadwal): conflict detection on add, current-lesson highlight, weekly matrix view.
- [ ] Elections (/elections): quick-count stats, candidate cards w/ photos, status control + candidate CRUD.
- [ ] Achievements (/achievements): podium + Top 10 categories, filters, interactive gallery grid + add/edit modal.
- [ ] Announcements (/announcements): modern feed, category badges, pinned styling, filter + search.
- [ ] Feedback (/feedback): interactive cards w/ category + status badges, admin reply, filters.
- [ ] E-Voting module: student voting booth + real-time live-count dashboard for admin.
- [x] Guru & Staff, Presensi live log, Jurusan removal, Leaderboard podium — see Phase 2.

## Implemented / Verified (2026-06)
- [x] Cloned `main13` into `/app`, preserved env-specific `.env` files.
- [x] Backend deps installed (`backend/requirements.txt`): pandas, openpyxl, fpdf2, openai, pyjwt, etc.
- [x] Frontend deps installed via Yarn incl. 5 historically-missing pkgs (react-easy-crop, react-barcode, html2canvas, jspdf, html5-qrcode) — all present; official registry (no dead-mirror issue).
- [x] Created `backend/.env` with generated JWT_SECRET, FRONTEND_URL, ADMIN_EMAIL/PASSWORD, blank OPENAI/SMTP.
- [x] Services run under supervisor (backend 8001, frontend 3000).
- [x] Super Admin login works (JWT role=super_admin), dashboard loads.
- [x] Confirmed NO `/api/api` double-prefix bug (13 live calls, 0 doubled).
- [x] Full-stack smoke test: backend 100%, frontend 100% (iteration_1.json).

## Backlog / Remaining (P1/P2)
- P1: Add real OpenAI key to enable AI features (Schoolgram generate, AI assistant).
- P1: Configure SMTP (SMTP_HOST/USER/PASSWORD/FROM) to enable email (password reset, attendance notices).
- P2: Consider diffing `main` vs `main13` if the newer version is desired.
- P2: Future refactor — split large `server.py` into modules.

## Notes
- AI/Email are intentionally inactive until keys added (expected, not a bug).
- Credentials recorded in `/app/memory/test_credentials.md`.
