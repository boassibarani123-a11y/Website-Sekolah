# PRD — SMA NEGERI 1 LAGUBOTI (Website Sekolah)

## Original Problem Statement
Import existing project from GitHub (https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch `main8`), set up and install all dependencies.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`, ~4000 lines) + MongoDB (motor). All routes under `/api`.
- Frontend: React 19 + CRACO + Tailwind + shadcn/ui, react-router-dom 7.
- Integrations: Emergent LLM Key (AI features), Emergent email, object storage (boto3/S3), PDF/PPTX/Excel export.

## User Personas
- Super Admin (school management), Teachers, Students (roles enforced via JWT).

## Core Requirements (static)
- Multi-role school management: QR attendance, Schoolgram, inventory, assignments & quizzes, class fund (uang kas), social fund, OSIS elections, student ID cards (KTP print), library, PPDB (new-student registration), org structure, documentation.

## Import Setup Done (2026-06)
- Copied backend + frontend + scripts + tests from repo branch `main8` into `/app`.
- Created `/app/backend/.env` with protected vars preserved (MONGO_URL, DB_NAME) + added JWT_SECRET, FRONTEND_URL, EMAIL_FROM_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, EMERGENT_LLM_KEY.
- Installed backend deps (pip incl. emergentintegrations==0.2.1) and frontend deps (yarn).
- Super admin seeded on startup: boassibarani123@gmail.com / Boas12345io.
- Full testing passed: backend 36/36 pytest, frontend navigation + public pages 100%, no bugs.

## Backlog (non-blocking, from code review)
- P2: Split server.py into routers/modules.
- P2: PPDB form — replace native date picker with locale-aware/shadcn calendar.
- P2: Gate public `/ppdb` axios calls behind auth state to avoid noisy 401s.
