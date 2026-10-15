# PRD — Website-Sekolah (SMA NEGERI 1 LAGUBOTI)

## Original Problem Statement
Import project dari GitHub repository https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch main25. Setup dan install semua dependencies-nya. (Approved plan adds: rename Admin Absensi → Piket Gerbang with limited menu, single-page rekap guru/siswa, guest visits with kepsek approval outside visiting hours.)

## Architecture
FastAPI (`backend/server.py`) + React 19/CRACO/Tailwind/shadcn + MongoDB. JWT auth. Local disk uploads. AI (EMERGENT_LLM_KEY) and email (BREVO) intentionally empty → inactive.

## Personas
Super admin, Piket Gerbang, Kepala Sekolah (approver), guru/siswa/other existing roles.

## Implemented (2026-06)
- Imported branch main25 as-is; backend deps installed (requirements regenerated), frontend via yarn.
- Role `admin_absensi` → `piket_gerbang` ("Piket Gerbang") everywhere + startup migration of existing users.
- Piket menu restricted to: Dashboard, Absensi Barcode, Absensi Face ID, Absensi Guru & Siswa (`/absensi-harian`), IK, Rekap Absensi, Kunjungan Tamu; other routes redirect to `/`.
- Piket dashboard with big tiles + today's summary.
- Rekap: `GET /api/attendance/recap-range` + `RecapRange` component (student table first, toggle to teacher table, date range, H/I/S/A).
- Guests: visiting hours (`/api/public/guest-hours`, `PUT /api/guest-hours` super admin), public `/info-tamu`, auto status by hours, outside-hours approval request → kepsek/super admin in-app notification → `POST /api/guests/{id}/decision`; checkout, search/filter, summary.
- Testing iteration_60: backend 13/13, frontend 100%.

## Implemented — Iteration 2 (2026-06), verified iteration_61 (backend 26/26, frontend 100%)
- Delete scan data (per row / all today, siswa & guru) for super_admin + piket_gerbang on Barcode & Face ID pages.
- Bank Soal page (/bank-soal) manual CRUD (mapel, tipe, kesukaran, untuk ujian/quiz); pick from bank in exam editor, quiz modal, exam composer.
- Pengajuan Ujian (/pengajuan-ujian): guru prepares questions + schedule + classes → submit → super admin reviews, sets token, "Buat Ujian" creates one exam per class (owner = guru) or rejects with note; notifications.
- Exam types (Harian/UTS/UAS/Try Out/Lainnya), mapel dropdown, Ujian Massal (POST /api/exams/bulk); questions/options shuffled per student.
- Video upload (30MB) for class materials (inline player) & Schoolgram post/story; /api/files Range support. setup-vps.sh client_max_body_size 40m.
- Guru & Staff assignment: any staff role can be wali kelas/guru mapel (teaching_duty flag) via PUT /api/users/{id}/assignment.
- Self profile photo upload for all roles (PATCH /api/auth/me/photo).
- Scroll-to-top on every route change.
- Bulk ID card print rewritten: paginated A4 pages (8 cards), per-page PDF/JPG(ZIP) export via html-to-image (scales to 800+ cards), fixed print CSS.
- Kelola Akun class filter includes all classes (X.5).

## Backlog
- P1: Enable AI question-gen & email when keys provided; email/WhatsApp notify kepsek for guest requests.
- P1: Documents (rekap fitur, ERD, PRD, BPMN, TOR) + PDF panduan deploy VPS — deferred by user until more features are added.
- P2: Guest photo/KTP, guest badge printing improvements, Excel/PDF export of rekap & guest visits.
