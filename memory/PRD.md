# PRD — Website Sekolah SMAN 1 Laguboti + Vortex Guard

## Original problem statement
Import project dari GitHub repository https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch main21 (previously main19). Setup dan install semua dependencies-nya.
Approved plan: rename exam system to "Vortex Guard" and complete the exam features (schedule, token, MC+essay bank, shuffle, timer, nav, ragu-ragu, autosave, tab-switch guard, MC auto-grade, essay grading, recap).

## Architecture
- backend/server.py (FastAPI monolith, cookie JWT auth), email_guard.py, uploads on local disk
- frontend React (craco) + Tailwind; Vortex Guard in frontend/src/components/vortex/* and pages/VortexGuard.jsx (/vortex-guard)
- Mongo collections for exams: exams, exam_sessions (live state: answers, flags, violation_log), exam_attempts (details, essay scores)

## Users
Admin (super_admin), Guru, Siswa (+ other existing roles from repo)

## Implemented (2026-06)
- Imported branch main19 to /app, pip + yarn dependencies installed, backend .env (JWT_SECRET, ADMIN_*, empty SMTP/OpenAI)
- Admin seeded from code; test guru/siswa/class created (see test_credentials.md). Repo contains NO student data dump — 500+ students not available
- Vortex Guard: branded page + sidebar entry + class "Ujian" tab; exam editor (class, subject, schedule start/end, duration, token, max violations, shuffle toggles, MC/essay bank); take flow (token gate, fullscreen, timer, question grid, ragu-ragu, autosave+resume, confirm submit); guard violations logged with reason/time; MC auto-grade; essay grading 0–100; results modal with recap stats + live proctoring tab (8s refresh)
- Tested: backend 10/10, frontend critical flows pass (iteration_47)

## Backlog
- P1: Export nilai Excel/PDF, real-time proctor dashboard (websocket), Brevo SMTP activation
- P1: Import 500+ student accounts (needs data file from user)
- P2: AI question generation, WhatsApp notifications, item analysis & statistics

## Update 2026-06 — main21 import
- Imported branch main21, pip + yarn deps installed, backend .env (JWT_SECRET, ADMIN_*, FRONTEND_URL, empty SMTP/OpenAI)
- Seeded test accounts: guru, siswa, ketua_osis, admin_absensi + class XII IPA 1 (see test_credentials.md)
- Fixes: bulk-delete blocks super_admin (backend + modal option removed); forgot-password validates password rule first (400 message); new GET /api/health and GET /api/users/{uid}
- iteration_49: backend 10/10; frontend smoke of all batch pages passes. Deep UI flows (schoolgram follow/takedown, izin keluar gate approve, guest check-in/out, face confirm with camera) only smoke-tested
## Next
- Phase 2: Vortex Guard export Excel/PDF, real-time proctor dashboard, big token screen for projector
- Phase 3: bulk import 500+ students, Brevo, AI features, WhatsApp notifications

## Update 2026-06 — Vortex Guard Phase 2, Face/Barcode redesign, Inventory v2
- Vortex Guard: token projector screen (big token + countdown, hide/fullscreen), live proctor dashboard (4s polling, per-student state/violations/remaining time), Excel/PDF grade export per exam (creator, wali kelas, super admin). Plain token stored as `token_plain` (staff-only endpoint /exams/{id}/token)
- Face ID page redesigned (light, animated frame, big PresenceCard); log tabs Siswa/Guru; teacher records stay in teacher_attendance (/teacher-attendance)
- Barcode gate uses the same PresenceCard
- Inventory: dashboard (KPIs + charts), rooms CRUD, condition incl. Hilang, return condition (Rusak→damaged_units, Hilang→lost_units, stock not restored), activity log, QR labels print + QR/code lookup, item drawer, grid/table views
- iteration_50: backend 26/26, frontend all flows pass
## Backlog
- P1: bulk import 500+ students (needs file), Brevo email activation
- P2: AI question generator / book summary, WhatsApp notifications to parents, exam item analysis

## Update 2026-06 — main22 import + Analisis Ujian
- Imported branch main22, pip + yarn deps installed, backend .env (JWT_SECRET, ADMIN_*, FRONTEND_URL, empty SMTP/OpenAI)
- Seeded guru, siswa, ketua_osis, admin_absensi + class XII IPA 1 (test_credentials.md)
- NEW Vortex Guard Analisis Ujian: GET /api/exams/{eid}/analysis (creator/wali kelas/super admin) — stats (avg/median/max/min, peserta/belum ikut, % tuntas vs KKM), distribusi nilai 10 rentang, analisis butir PG (P kesukaran, D daya beda 27%, sebaran opsi, pengecoh lemah), rata-rata esai, flag soal bermasalah (>=5 respon); KKM per ujian (default 75); Excel export adds sheet "Analisis Butir"
- UI: ExamAnalysis.jsx modal (recharts) via "Analisis" button on exam card; KKM input in editor
- iteration_52: backend + frontend pass
## Backlog
- P1: bulk import 500+ siswa (needs file), Brevo email activation, websocket proctor dashboard
- P2: AI question generation, WhatsApp notifications, backend module split
