# PRD — Website Sekolah (SMA Negeri 1 Laguboti)

## Original problem statement
Import project dari GitHub repository https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch main14. Setup dan install semua dependencies-nya.

## Architecture
React (CRA/craco) frontend + FastAPI backend (server.py) + MongoDB. JWT auth, super admin seeded from ADMIN_EMAIL/ADMIN_PASSWORD.

## Personas
Super Admin, Kepala Sekolah, Staff TU, Guru, Siswa, Ketua OSIS, Ketua Kelas.

## Implemented
- 2026-06: Imported branch main14, installed backend (requirements.txt) & frontend (yarn) deps, configured JWT_SECRET/FRONTEND_URL/ADMIN creds. Smoke-tested: login + 9 menus + public pages OK (100%).

- 2026-06 (Fase 3 backlog, iteration_6: backend 29/29, frontend 100%):
  - Already present from main13/14: Jadwal (bentrok/live/matrix), Inventaris pinjam-setuju-kembali + terlambat, edit/hapus komentar Schoolgram.
  - Kritik & Saran: status (baru/diproses/selesai), balasan admin + notifikasi, filter/cari, "Masukan Saya" (GET /feedback/mine, PATCH /feedback/{id}).
  - Pengumuman: cari + filter kategori/lingkup.
  - Admin PPDB: status Review, alasan penolakan wajib, thumbnail berkas.
  - Pemilu: edit kandidat (PATCH /candidates/{id}), bilik suara + konfirmasi, pemenang saat selesai, ketua_kelas/ketua_osis boleh memilih.
  - Rapor: filter semester (Ganjil Jul–Des / Genap Jan–Jun), /reports-summary kelengkapan, cari/filter kelas, grafik recharts, catatan wali (PUT /reports/{sid}/note).
  - Prestasi: podium top-3 + peringkat 4–10, filter galeri, edit galeri.
  - Tugas: deskripsi HTML disanitasi (DOMPurify, lib/safeHtml.jsx).
  - Inventaris: filter status permintaan.
- 2026-06 (iteration_7, backend 14/14, frontend 100%): Admin-approved password reset without email. /auth/forgot-password -> reset_requests (pending, identity_match vs NISN/NIP/WA, masked hint). Super admin /reset-requests approves (identity checkbox + method) -> 12-char temp password shown once, 30-min expiry, must_change_password, token_version bump (session invalidation). /change-password forced page. Login lockout 5 fails/15 min, forgot rate limit 3/15min email & 10/h IP, audit_logs. Removed email reset token flow + ResetPassword.jsx. Email notifications code (PPDB/grade/rapor) + /email/status, /email/test + Settings card (SMTP not configured).

## Backlog
- P1: Email SMTP (Gmail) — code ready (PPDB status, nilai, rapor, presensi); waiting for user's Gmail App Password. SMTP not used for password reset anymore.
- P1: AI (OpenAI) — waiting for user's key choice.
- P2: Live-count layar penuh untuk proyektor saat pemilu
- P2: Ekspor rapor dengan grafik & catatan wali ke PDF
- P2: Enable AI (OPENAI_API_KEY) for Schoolgram generate/AI assistant; SMTP for reset password & attendance notifications
