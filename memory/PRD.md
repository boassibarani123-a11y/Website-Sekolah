# PRD — Website Sekolah SMAN 1 Laguboti + Vortex Guard (branch main23)

## Original problem statement
Penyelesaian Website-Sekolah (branch main23) — Fitur yang belum selesai: 1) Import Siswa Massal (Excel → 500+ akun, NIS 5 angka untuk Face ID), 2) Paket Soal Acak per tingkat kesukaran, 3) Layar Piket TV (status gerbang + jadwal piket hari ini untuk pos satpam), 4) Aktivasi Email Brevo (reset password + notifikasi siswa; tanpa kredensial = "belum dikonfigurasi"), 5–7) Tahap 3: AI soal, WhatsApp (nanti), analisis butir. Housekeeping: isi test_result.md.
User choices: repo https://github.com/boassibarani123-a11y/Website-Sekolah.git branch main23; Brevo kerangka saja; AI Claude Sonnet 4.5 via Emergent Universal Key; WhatsApp nanti; template import existing.

## Architecture
- backend/server.py (FastAPI monolith, cookie JWT), email_guard.py; MongoDB collections: users, question_bank, piket_shifts, gate_logs, password_reset_tokens, email_logs
- frontend React (CRACO) + Tailwind; Vortex Guard in components/vortex/*

## Users
Super Admin, Staff TU, Guru, Siswa, Admin Absensi/Satpam

## Implemented (2026-10-13)
- Imported main23 into /app, deps installed, .env (JWT_SECRET, ADMIN_*, FRONTEND_URL, BREVO_* empty, EMERGENT_LLM_KEY, AI_MODEL)
- Import siswa: NIS wajib tepat 5 angka; alias /api/admin/students/import(+/preview,/template); optional email akun baru; template columns unchanged (sample NIS values now 5 digits)
- Paket Soal Acak: POST /api/exams/random-package ($sample per Mudah/Sedang/Sukar, skip daya beda Jelek, shortfall warnings), GET /api/question-bank/stock; UI modal in exam editor with preview
- Layar Piket TV: GET /api/piket/tv + /piket/tv page (fullscreen, 4s polling, last data kept when offline, WIB clock)
- Email: Brevo API v3 sender with retry on 429/5xx, SMTP fallback, email_logs, status card; reset password via one-time sha256 token (30 min) /auth/forgot-password/email + /auth/reset-password + /reset-password page; exam schedule notification emails. Not configured by default → skipped without errors
- AI: _ai_text now uses Claude claude-sonnet-4-5-20250929 via Emergent key; POST /api/ai/exam-generate (PG + esai from material), GET /api/ai/status; "Buat dengan AI" in exam editor
- Seed script scripts/seed_test_data.py; iteration_55: backend 17/17, frontend 9/9 flows pass

## Implemented (2026-10-13, iterasi 2)
- Piket TV: right panel rotates (10s) to "Belum Kembali dari Izin Keluar" (ik_out in /api/piket/tv), overdue highlighted
- Absensi (Presensi Barcode & Wajah) dark theme via .att-dark scope
- Vortex Guard mobile: auto fullscreen on start + tap re-enter, portrait orientation lock (Android), Wake Lock, iPhone Guided Access note
- New school logo (transparent 1024px) + PWA icons
- scripts/update-vps.sh + DEPLOY_VPS_UPDATE.md (main23); iteration_56 all pass

## Backlog
- P1: Isi BREVO_API_KEY + BREVO_SENDER_EMAIL (verified sender) to activate email
- P1: Load real 500+ student Excel data
- P2: WhatsApp (Twilio) notifications, item analysis charts polish, backend module split
