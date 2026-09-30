# SEKOLAHKU — Product Requirements Document

## Original Problem Statement
Build a comprehensive school management web application (originally requested in Laravel; implemented on the supported stack: React + FastAPI + MongoDB with identical features and design). Sky Blue + Clean White + Dark accents. Bahasa Indonesia UI.

Special user note: Super Admin creating a student account MUST auto-generate a permanent QR code and an attractive printable Student ID Card in KTP dimensions (85.6 × 53.98 mm).

## Architecture
- **Backend**: FastAPI (Python) + Motor/MongoDB, JWT auth via bcrypt + httpOnly cookies
- **Frontend**: React 19 + React Router 7, Tailwind, shadcn primitives, sonner, lucide-react, qrcode.react, html5-qrcode
- **Auth**: 7 roles with RBAC (super_admin, kepsek, staff_tu, guru, siswa, ketua_osis, ketua_kelas)

## User Personas & Roles
1. Super Admin — full access + Master Account page
2. Kepsek — read/monitor + review feedback
3. Staff TU — attendance ops, inventory, approve borrow
4. Guru — assignments, quizzes, attendance, schoolgram
5. Siswa — scan attendance, submit assignments, take quizzes, vote OSIS, borrow items, kas, feedback
6. Ketua OSIS — announcements, social fund, elections, schoolgram
7. Ketua Kelas — kas, class announcements, schoolgram

## Implemented (Feb 2026)
- [x] JWT auth + bcrypt + cookie session + admin seeding (owner: cassandramarsada@gmail.com)
- [x] Master Account Management (create/edit/delete users, auto QR + printable KTP card)
- [x] Printable Student ID Card (KTP 340×215px, gradient sky-blue, front side w/ photo + QR)
- [x] QR Attendance (webcam scanner + manual input + status hadir/izin/sakit/alpa + real-time counters)
- [x] Excel export for attendance & social fund (openpyxl)
- [x] Schoolgram feed (image upload base64, likes, comments, role-gated posting)
- [x] Inventory & Borrowing Hub (staff approval workflow)
- [x] Assignments (create by teacher, submit by student, grade)
- [x] Mini-Quizzes (multiple-choice with auto-scoring)
- [x] Uang Kas per kelas
- [x] Social Fund (OSIS)
- [x] OSIS Elections (candidates by position: ketua/wakil/anggota, 1-vote-per-position enforcement)
- [x] Achievement leaderboards (most diligent, top academic)
- [x] Announcements board
- [x] Feedback/kritik/saran with anonymous option
- [x] Responsive sidebar navigation + mobile drawer

## Prioritized Backlog (P1)
- Password reset via email (Emergent email)
- Real object-storage upload for Schoolgram (replace base64)
- Advanced analytics dashboard for Kepsek (charts)
- Teacher attendance & payroll integration
- Real-time notifications (SSE/WebSocket) for approvals & likes
- Multi-school (tenant) support

## Credentials
See `/app/memory/test_credentials.md`

## Update (Feb 2026 - Phase 2)
- [x] Object Storage: `/api/upload` + `/api/files/{path}` via Emergent object storage
  - Schoolgram, Kartu Pelajar photos, Kandidat OSIS photos sekarang pakai storage nyata (bukan base64)
- [x] Real-time Notifications: bell di header, polling 15s, auto-notify saat
  - Peminjaman disetujui/ditolak/dikembalikan → siswa pemohon
  - Tugas dinilai → siswa
  - Pengumuman baru → semua siswa
- [x] Dashboard Analitik Kepsek (`/analytics`): tren presensi 7-hari (LineChart), distribusi nilai quiz (BarChart), ranking kelas paling aktif
- [x] Password Reset Flow: `/forgot-password` + `/reset-password` + email HTML via Emergent Email + rate limit 5×/15min + token hash + 1-jam expiry

## Update (Feb 2026 - Phase 3)
- [x] Cetak Kartu Massal (`/print-cards?kelas=X`): 8 KTP per lembar A4, tombol "Cetak Kartu Massal" di Kelola Akun
- [x] Rapor Digital (`/reports`): guru/kepsek/super_admin lihat & kirim; siswa & orang_tua lihat sendiri; email HTML ke `parent_email`
- [x] Chat Wali-Ortu (`/chats`): thread per-siswa, RBAC (guru wali kelas ↔ orang_tua terhubung), polling 10 detik, unread badge, notifikasi
- [x] Role baru: `orang_tua` (perlu `student_id` link), field ortu (`parent_name`, `parent_email`, `parent_phone`) di profil siswa

## Update (Feb 2026 - Phase 4)
- [x] Foto Presensi Absen: webcam snapshot otomatis di-upload ke object storage saat scan QR; disimpan pada dokumen attendance; ditampilkan di log presensi sebagai thumbnail bukti anti-titipan
- [x] Ekspor Rapor PDF Batch: `GET /api/reports/batch/zip?kelas=X` generate PDF per-siswa via fpdf2 dan bundle ZIP; tombol di halaman Reports
- [x] Video Call Ortu: tombol "Video Call" di header thread chat membuka Jitsi Meet iframe (`meet.jit.si/SEKOLAHKU-{studentId}`) — room unik per siswa, tanpa API key
- [x] Kalender Sekolah `/calendar`: grid bulanan + list event, 4 tipe (event/ujian/libur/rapat), kelas-specific atau seluruh sekolah, notifikasi otomatis ke siswa & orang_tua saat event dibuat

## Update (Feb 2026 - Phase 5)
- [x] Modul PPDB Online:
  - `/ppdb` (public): form pendaftaran calon siswa dengan upload foto + berkas (ijazah/rapor/KK), auto-generate nomor pendaftaran
  - `/admin-ppdb` (super_admin/kepsek/staff_tu): dashboard pendaftar dengan filter, detail modal, approve/reject satu-klik
  - Auto-Seleksi dengan threshold NEM & kapasitas kuota — sortir dari NEM tertinggi, tandai LOLOS/TIDAK LOLOS otomatis
  - Notifikasi ke admin/kepsek saat ada pendaftar baru
  - CTA "Daftar PPDB" di halaman Login
- [x] Excel Reports Bertema SEKOLAHKU:
  - Helper `pretty_excel()` dengan title bar sky-blue, subtitle slate-900, header row berwarna, alternating rows, section RINGKASAN
  - Refactor: attendance/export, social-fund/export dengan format baru
  - Endpoint baru: /api/kas/export, /api/inventory/export, /api/users/export, /api/ppdb/export/xlsx
  - Tombol Export Excel di halaman Uang Kas, Inventaris, Admin PPDB
