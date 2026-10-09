# PRD — Website Sekolah (SMA Negeri 1 Laguboti)

## Original problem statement
Import project dari GitHub repository https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch main14. Setup dan install semua dependencies-nya.

## Architecture
React (CRA/craco) frontend + FastAPI backend (server.py) + MongoDB. JWT auth, super admin seeded from ADMIN_EMAIL/ADMIN_PASSWORD.

## Personas
Super Admin, Kepala Sekolah, Staff TU, Guru, Siswa, Ketua OSIS, Ketua Kelas.

## Implemented
- 2026-06: Imported branch main14, installed backend (requirements.txt) & frontend (yarn) deps, configured JWT_SECRET/FRONTEND_URL/ADMIN creds. Smoke-tested: login + 9 menus + public pages OK (100%).

## Backlog
- P1: Phase 2 — continue main13 features (details needed from user)
- P2: Enable AI (OPENAI_API_KEY) for Schoolgram generate/AI assistant; SMTP for reset password & attendance notifications
