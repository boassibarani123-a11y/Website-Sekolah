# PRD — SMA NEGERI 1 LAGUBOTI (Sistem Manajemen Sekolah Terpadu)

## Original Problem Statement
GitHub import of Website-Sekolah (branch main3), then: rebrand SEKOLAHKU → SMA NEGERI 1 LAGUBOTI across documents; add "Lihat Presentasi" button on login; add slides (Tugas & Mini-Quiz, PPDB, Kartu Pelajar); add print stylesheet for PDF handout; let super admin edit login page text; show school info on login; expand Informasi Sekolah with the full real school profile.

## Architecture
- Backend: FastAPI + MongoDB (settings stored as singleton doc `_id='singleton'`, seeded from DEFAULT_SETTINGS).
- Frontend: React + Tailwind + shadcn; global SettingsProvider exposes settings to all pages (public + protected).

## User Personas
Super Admin, Kepala Sekolah, Staff TU, Guru, Siswa, Ketua Kelas, Bendahara, Ketua OSIS, Orang Tua.

## Implemented (2026-06)
- Rebrand to SMA NEGERI 1 LAGUBOTI (Login, PublicOrg, PpdbPublic, Reports, Documentation, Presentation, StudentIdCard, backend PDFs/email brand) — mostly driven by editable settings.
- Login page: dynamic branding + editable text (login_badge/headline/description/welcome_title/welcome_subtitle/footer), school-info summary card, "Lihat Presentasi" button.
- Settings page: new "D. Teks Halaman Login" editor section.
- Presentation: 11 slides incl. Tugas & Mini-Quiz, PPDB Online, Kartu Pelajar; dynamic school name; "Cetak PDF" print button + `@media print` stylesheet (one slide per A4 landscape page).
- Informasi Sekolah: full profile (profil & alamat, kepala sekolah, sejarah + 14 periode, visi, misi, tujuan, berwawasan lingkungan, tujuan jangka pendek/menengah/panjang, sasaran) with admin edit mode. All real Laguboti data seeded in DEFAULT_SETTINGS.
- Backend SettingsIn extended with all new fields; GET public, PATCH super_admin-only.

## Verified
Testing agent iteration_17: backend 100%, frontend 100%, no issues. Regression suite: /app/backend/tests/test_iter17_laguboti_settings.py.

## Credentials
Super admin: boassibarani123@gmail.com / Boas12345io

## Backlog / Next
- P2: split server.py into routers.
- P2: guard harmless 401 on first login render.
