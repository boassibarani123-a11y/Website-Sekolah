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
Testing agent iteration_17 + iteration_18: backend 100%, frontend 100%, no issues.
Regression suites: /app/backend/tests/test_iter17_laguboti_settings.py, /app/backend/tests/test_iter18_pptx_gallery.py.

## Added (2026-06, iteration 2)
- Unduh Presentasi (.pptx): public endpoint GET /api/presentation/pptx (python-pptx, 10 themed slides — cover, ringkasan+tujuan, peran+hak akses, 5 fitur utama, modul pendukung, penutup); download button on /presentasi for all roles.
- Logo Sekolah: confirmed wired into login, sidebar, kartu pelajar (MyCard & PrintCards via settings.school_logo_url) — admin uploads in Settings.
- Galeri Prestasi & Kegiatan: gallery collection + CRUD (GET public; POST/PATCH super_admin/kepsek/staff_tu/ketua_osis; DELETE super_admin/kepsek); public page /galeri with category filters + link from login; admin management embedded in /achievements.
- Settings: academic_year field (used in PPTX cover).

## Credentials
Super admin: boassibarani123@gmail.com / Boas12345io

## Added (2026-06, Perpustakaan Pintar / Smart Library)
- New role **admin_perpus** ("Admin Perpustakaan") wired into role labels (sidebar, Dashboard, Inventory) + demo account `perpus.demo@sekolahku.id / Demo12345`.
- Frontend `/library` built on the pre-existing backend API (`/api/books`, `/api/loans`, `/api/reservations`, `/api/books/{id}/review`, `/api/books/{id}/ai-summary`, `/api/library/{config,stats,popular,ai-recommendations,loans/export}`).
- Admin Perpus/super_admin only: Ringkasan (stats + popular + category chart), Kelola Buku (CRUD modal), Sirkulasi (lend-on-behalf desk, active loans, return, Excel export, return history), Reservasi (queue mgmt), Pengaturan (loan_days/max_books/fine_per_day).
- Students & other roles: Katalog (search/filter/available toggle + AI recommendations), book detail modal (borrow/reserve, AI summary, star reviews), Pinjaman Saya (return with fine calc), Reservasi.
- Files: pages/Library.jsx, pages/LibraryAdmin.jsx, components/library/{shared.jsx,BookDetailModal.jsx}; route in App.js + sidebar entry in DashboardLayout.jsx.
- Verified: testing agent iteration_19 — backend 17/17, frontend 100% core flows (role enforcement confirmed via UI tab-hiding + API 403 for siswa). Regression suite: /app/backend/tests/test_iter19_library.py.

## Backlog / Next
- P2: split server.py into routers.
- P2: guard harmless 401 on first login render.
