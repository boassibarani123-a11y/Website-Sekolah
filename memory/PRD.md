# PRD — Website Sekolah SMAN 1 Laguboti

## Original problem statement
Import & Setup: Website Sekolah (SMAN 1 Laguboti) di VPS — import dari GitHub https://github.com/boassibarani123-a11y/Website-Sekolah.git branch `main15`, install semua dependency, jalankan penuh di browser via VPS. Stack: React (yarn build, Nginx), FastAPI (Python 3.11, uvicorn 127.0.0.1:8001), MongoDB 7.0 lokal, Nginx + Certbot HTTPS, systemd `sekolah-backend`. Fase 1–10: dependency sistem, MongoDB, clone main15, backend .env, frontend build, systemd+Nginx, HTTPS, cron (attendance-reminder 08:00, auto-alpha 09:00, archive Senin 01:00, kas-reminder tgl 1 07:00), Brevo SMTP, verifikasi browser.

## User choices
- Repo public, branch main15
- Jalankan di preview Emergent dulu, lalu script + panduan deploy VPS
- Email: Brevo free tier, kirim bertahap. WhatsApp: dilewati, diaktifkan nanti
- AI: dikosongkan dulu (fitur inti tetap jalan)
- VPS Ubuntu 22.04 + domain sudah siap

## Architecture
- backend/server.py (FastAPI monolith), email_guard.py; upload disimpan di disk lokal (UPLOAD_DIR)
- frontend React (craco), auth cookie httpOnly Secure SameSite=None (wajib HTTPS + satu domain)
- scripts/setup-vps.sh — setup VPS otomatis Fase 1–8 (main15)

## Implemented (2026-10-10)
- Kode main15 diimpor ke /app, dependency backend & frontend terpasang, .env preview dikonfigurasi
- Testing smoke: 17/17 backend lolos; login, dashboard, upload file, cron, degradasi SMTP/AI kosong OK
- scripts/setup-vps.sh dibuat

## Implemented (2026-10-10, iterasi 2)
- Redesign kartu Ruang Kelas (header gradien, statistik siswa/mapel, avatar wali kelas)
- Presensi Gerbang layar penuh: tabel riwayat scan real-time (LiveScanTable: filter status, cari, highlight baris baru, refresh 3 detik)
- Dokumen: /app/PANDUAN_DEPLOY_VPS.md (untuk Gemini), /app/DOKUMEN_SISTEM_NOTEBOOKLM.md (untuk NotebookLM)

## Implemented (2026-10-10, iterasi 3)
- Halaman detail kelas: hero baru (statistik count-up, wali kelas), tab bar sticky dengan badge jumlah, filter mapel
- Ujian: fullscreen diminta langsung saat password di-submit, overlay "Ujian Terkunci" saat keluar fullscreen/pindah tab, blok shortcut/copy/paste/back, keyboard lock (Chrome), anti double-count pelanggaran
- Piket Gerbang (/piket): CRUD shift (ulang mingguan, cek bentrok), status berbasis waktu WIB, check-in/out (dibuka 30 menit sebelum), hero live + countdown, grid mingguan
- Face recognition: /face-enroll (5 pose otomatis, tolak wajah duplikat) & /face-attendance (deteksi otomatis, mode kedip anti-foto, tabel live); backend matching numpy (threshold 0.5) di /api/attendance/face-scan; model face-api di /frontend/public/models

## Implemented (2026-10-10, iterasi 4)
- Fix: hapus akun siswa ikut menghapus data wajah; data wajah yatim (orphan) otomatis dibersihkan sebelum pencocokan & daftar
- Daftar wajah "Mode Per Kelas": otomatis pindah & mulai rekam siswa berikutnya yang belum terdaftar
- Laporan Piket Bulanan per guru (hadir, tepat, telat, menit telat, absen, jam jaga, %) + ekspor Excel

## Backlog
- P0: Jalankan setup-vps.sh di VPS, isi kredensial Brevo SMTP, uji kirim email
- P1: Integrasi WhatsApp (nanti)
- P2: Aktifkan AI perpustakaan/kuis (OpenAI key)
