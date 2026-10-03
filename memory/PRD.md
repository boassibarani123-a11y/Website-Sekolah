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

## Added (2026-06, Rekap Absensi Mingguan + Auto-Archive + Excel polish)
- **Student ID card** (`components/StudentIdCard.jsx`): QR enlarged to 72px at top-right, NISN barcode widened (barWidth=2, h=30) spanning the card bottom, VERIFIED tag left — matches requested layout.
- **Weekly Attendance Recap** (`pages/AttendanceRecap.jsx`, route `/attendance-recap`, nav gated to super_admin/kepsek/guru/staff_tu): hero, week navigation (prev/next/Minggu Ini), 5 summary cards, colored H/I/S/A matrix (Senin–Minggu + per-student totals), Export Excel, "Arsipkan & Bersihkan".
- **Storage Rekap Absensi Siswa**: archived weekly Excel files stored in Mongo (`attendance_archives`, xlsx as base64) with metadata; list/download/delete endpoints (download/list for super_admin/kepsek/guru/staff_tu; delete for super_admin/kepsek/staff_tu).
- **Auto backup (cron)**: `.emergent/crons.yml` runs `POST /api/cron/attendance-archive` every Monday 01:00 Asia/Jakarta → `run_attendance_weekly_archive` archives every COMPLETED week (date ≤ last Sunday) into Storage then PURGES those attendance records; current in-progress week kept live. Manual trigger `POST /api/attendance/archive-now` (caller scope). Webhook secured via `WEBHOOK_CRON_SECRET` (bearer, constant-time) + `cron_runs` idempotency.
- **Weekly Excel** (`weekly_attendance_excel`): branded matrix sheet, colored status cells, daily totals footer, legend, frozen panes.
- **Excel neatness fix** (`pretty_excel`): summary now full-width connected bands with labels merged across first half (no more truncation e.g. "Pengeluaran (Rp)"), values aligned; "Belum ada data" placeholder when empty; wider column A; brand = "SMA NEGERI 1 LAGUBOTI". Fixes Inventory & Dana Sosial exports.
- New backend endpoints: GET `/attendance/week`, GET `/attendance/week/export`, GET `/attendance/archives`, GET `/attendance/archives/{id}/download`, DELETE `/attendance/archives/{id}`, POST `/attendance/archive-now`, POST `/cron/attendance-archive`.
- Verified: testing agent iteration_20 — backend 12/12, frontend 100% (full archive+purge cycle, cron auth/idempotency, role 403s, Excel structure, card layout). Regression: `/app/backend/tests/test_iter20_weekly_attendance.py`.
- Note: archive xlsx stored as base64 in Mongo (fine for weekly cadence/MVP); migrate to object storage if volume grows.

## Added (2026-06, Presentation rewrite + Excel margins + Public Profile)
- **Presentation deck rewritten** (`pages/Presentation.jsx`): now 17 elegant slides covering ALL features, each with a "MASALAH YANG KAMI JAWAB" problem→solution banner. New slides: Rekap Mingguan & Auto-Arsip, Rapor Digital, Dana Sosial, Perpustakaan Pintar, Pemilu OSIS, Komunikasi & Budaya. Deck mechanics (nav/print/PPTX link) unchanged.
- **All Excel exports** now have a clean whitespace margin (empty column A + top row 1; content starts at B2) and a unified sky/slate theme via refactored `pretty_excel` (CO=2 offset, PageMargins, print centered). Same treatment applied to `weekly_attendance_excel`. Affects inventory, dana sosial, uang kas, users, attendance daily & weekly exports.
- **Login page** (`pages/Login.jsx`): school-info card moved to the TOP of the left panel (under logo) with a public **"Lihat Profil Sekolah"** button; headline/description moved below.
- **Public Profile** (`pages/PublicProfile.jsx`, route `/profil-sekolah`): unauthenticated visitors can view school hero, facts, Tentang, Visi/Misi, Sejarah, Tujuan, alamat & kontak, with Masuk CTA.
- Verified: testing agent iteration_21 — backend 7/7, frontend 10/10, no bugs. Regression suites green (19/19) after updating iter20 asserts to B2/row-5 offsets.

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

## Added (2026-10-03, Import branch main6 + Deployment-ready reset)
- **Import**: Project di-import dari GitHub `Website-Sekolah` branch `main6`; dependencies backend (pip) & frontend (yarn) terinstal; env ditambah: JWT_SECRET, WEBHOOK_CRON_SECRET, EMERGENT_LLM_KEY.
- **Email aktif**: EMERGENT_EMAIL_KEY + EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI" + FRONTEND_URL di backend/.env — forgot-password & pengumuman mengirim email sungguhan via proxy Emergent (terbukti HTTP 202 + log "Reset email sent").
- **Login page**: bagian "Coba Akun Demo" dihapus total; tombol publik (Presentasi, Struktur Organisasi, Dokumentasi, Galeri, PPDB) naik tepat di bawah form login; headline "Satu Platform. Tujuh Peran. Sekolah Modern." + deskripsi pindah ke atas kartu info sekolah.
- **Barcode kartu pelajar** diperbesar (front: height 40, barWidth 2.5 → SVG ~229×44px, memenuhi kotak putih).
- **Reset total**: semua koleksi MongoDB dikosongkan; seeding demo (akun, buku, kelas, roster, pengumuman, event) DIHAPUS dari `_seed()` di server.py — hanya super admin yang di-seed. Situs siap deploy; super admin mengisi data satu per satu.
- Verified: testing agent iteration_22 — backend 16/16, frontend 100% (login layout, barcode 229×44, 12 protected pages empty-state aman, PPDB publik, forgot-password email terkirim). Regression: /app/backend/tests/test_iter22_fresh_reset.py.

## Added (2026-10-03, Absensi Otomatis: Reminder 08:00 + Auto-Alpa 09:00 + WA wajib)
- **Reminder absensi (cron 08:00 WIB, Sen–Sab)**: `POST /api/cron/attendance-reminder` — setiap siswa yang belum absen mendapat EMAIL berisi tombol "Saya Sakit" / "Saya Izin" + notifikasi aplikasi (link `/konfirmasi-absensi?token=...`). Token sekali pakai per siswa per hari (`attendance_confirm_tokens`), idempoten (tidak kirim ulang di hari sama).
- **Konfirmasi satu-klik**: `GET /api/attendance/confirm?token&status=sakit|izin` (publik) mencatat kehadiran (method `email`, scanned_by "Konfirmasi Siswa (Email)") lalu redirect 303 ke halaman publik `/konfirmasi-absensi` (pages/AttendanceConfirmed.jsx) dengan status ok/used/already/expired/invalid. Jika siswa sudah scan, status tidak ditimpa (result=already).
- **Auto-Alpa (cron 09:00 WIB, Sen–Sab)**: `POST /api/cron/attendance-auto-alpha` — siswa tanpa scan/konfirmasi otomatis tercatat `alpa` (method `sistem`) + notifikasi. Kedua cron pakai bearer WEBHOOK_CRON_SECRET + idempotensi run_id via helper `_cron_guard`; dijadwalkan di `.emergent/crons.yml` (timezone Asia/Jakarta).
- **Nomor WhatsApp wajib untuk akun siswa**: field `phone` di UserCreate/UserUpdate + doc user; `create_user` menolak 400 jika siswa tanpa WA / format salah (`^\+?[0-9][0-9 ()-]{7,17}$`); frontend MasterAccounts punya input "Nomor WhatsApp Aktif (wajib)" (data-testid `new-account-phone`). Hanya disimpan di database (tidak ada pengiriman WA).
- **Barcode kartu pelajar** diperkecil sedikit (front: height 34, barWidth 2.1). Ekspor Excel absensi mengenal metode "Konfirmasi Email" & "Otomatis (Sistem)".
- Verified: testing agent iteration_23 — backend 18/18, frontend 100% (halaman konfirmasi, tombol email, input WA, barcode, regresi). Regression: /app/backend/tests/test_iter23_attendance_cron_wa.py.

## Added (2026-10-03, Galeri Prestasi di Profil Sekolah + Dokumen Sistem lengkap)
- **Galeri Prestasi (halaman publik /profil-sekolah)**: kontainer baru "Galeri Prestasi Sekolah" (PublicProfile.jsx — komponen AchievementsGallery + AchievementModal). Publik melihat kartu prestasi (foto, tingkat Sekolah→Internasional, tahun, deskripsi) atau 3 slot kosong "Prestasi segera hadir" bila belum ada. Pengelolaan (tambah/edit/hapus + upload foto) HANYA untuk super_admin (deteksi via useAuth).
- **Backend**: koleksi `profile_achievements` + `GET /api/profile-achievements` (publik), `POST/PATCH/DELETE /api/profile-achievements[/{id}]` (require_roles super_admin). 
- **Dokumen sistem (Documentation.jsx) diperluas ke Versi 2.0**: TOR (ruang lingkup & peran diperbarui, +Admin Perpus, +batasan email/cron), PRD (tabel fungsional baru B.7 Absensi Otomatis, B.8 Autentikasi/Akun WA, B.9 Perpustakaan, B.10 PPDB/OSIS/Dana Sosial, B.11 Rapor/Tugas/Galeri), dan BPMN kini 14 alur (C.1..C.14) mencakup seluruh fitur: absensi QR, absensi otomatis, kas, kelas/BPH, inventaris, ujian anti-cheat, autentikasi/akun, PPDB, perpustakaan, pemilu OSIS, dana sosial, tugas/quiz, rapor, galeri prestasi.
- Verified: testing agent iteration_24 — backend 6/6 (CRUD + 401/403/404 role enforcement), frontend 100% (guest 3 slot kosong tanpa tombol, super admin tambah/edit/hapus, /dokumentasi 14 BPMN tanpa error). Regression: /app/backend/tests/test_iter24_profile_achievements.py.

## Added (2026-10-03, Demo isi Galeri Prestasi + Reset final siap deploy)
- Galeri Prestasi sempat diisi 3 pencapaian nyata terverifikasi: (1) 47 siswa lolos PTN & kampus favorit via SNBP 2026 (Nasional), (2) Juara IV Lomba Cerdas Cermat SMA/SMK/MA se-Kabupaten Toba 2023 (PT Inalum × IT Del), (3) Terakreditasi A (Nasional) — untuk membuktikan fitur tampil bagus (screenshot terverifikasi).
- **Reset final**: seluruh koleksi dikosongkan lagi — tersisa hanya super admin + settings (profil sekolah). Situs 100% bersih, siap deploy; super admin mengisi semua data (akun, kelas, prestasi, dst.) sendiri. Login super admin terverifikasi 200 setelah reset.

## Added (2026-10-03, Panduan Cepat Super Admin)
- Halaman Dokumentasi kini punya section "Panduan Cepat Super Admin — Mulai dari Nol" (12 langkah bernomor dengan badge menu: login → pengaturan → kelas → akun guru → akun siswa+WA → cetak kartu → perpustakaan → galeri prestasi → pengumuman/kalender → struktur organisasi → operasional harian → otomatisasi cron). Tampil sebelum Bagian A TOR, ikut tercetak saat unduh PDF. Diverifikasi via screenshot (12 step render).
- Banner "Panduan Super Admin — Mulai dari Nol" di dasbor super admin (Dashboard.jsx, khusus role super_admin, data-testid `admin-guide-link`) menuju `/dokumentasi#panduan`; Documentation.jsx kini mendukung auto-scroll ke anchor hash (useLocation + scrollIntoView).
