# PRD — Website Sekolah SMAN 1 Laguboti + Vortex Guard

## Original problem statement
Import project dari GitHub repository https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch main19. Setup dan install semua dependencies-nya.
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
