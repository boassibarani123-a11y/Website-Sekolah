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
- P2: Remove now-unused /api/chats backend routes (UI removed).

## Revisions (2026-06) — 19 user-reported fixes
- Storage upload reliability: put_object/init_storage now retry transient 500/503/404 (root cause of "Storage tidak tersedia" / all upload failures) — fixes Schoolgram, Announcements, Pemilu photo, logo upload, all image uploads.
- Removed QR attendance (camera) → barcode/manual NISN only; removed QR from student card; barcode resized smaller.
- Student card: removed Jurusan; "Berlaku" now "Sampai Lulus SMA"; kelas shows.
- Added Admin Perpustakaan role; removed Orang Tua role + Chat Wali-Ortu feature.
- Pemilu: "anggota" cannot be candidate (backend 400 + UI dropdown Ketua/Wakil only).
- Kritik & Saran: reviewer can delete items (DELETE /api/feedback/{id}).
- Dana Sosial: integer-only amount input with 000.000 thousand separators.
- Org Structure: vertical indented layout + PNG/PDF export fixed (html2canvas useCORS).
- Student accounts: Export Excel hidden from siswa on attendance.
- Barcode attendance: auto-submits on scan (no manual Enter needed).
- Verified: 12/12 backend regression + frontend flows (iteration_4).
- Not applicable: loan due-date-before-today (no manual date field in lending UI). AI book summary works from metadata by design.
