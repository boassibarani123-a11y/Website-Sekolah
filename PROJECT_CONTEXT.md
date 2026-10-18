# PROJECT_CONTEXT — Website Sekolah SMA Negeri 1 Laguboti

Dokumen ini merangkum proyek agar pengembangan bisa dilanjutkan di workspace baru.
Tidak ada password, API key, atau rahasia lain di dokumen ini.

## 1. Fungsi Aplikasi
Sistem manajemen sekolah berbasis web dengan banyak peran: super admin, kepala sekolah, staff TU, guru/wali kelas,
siswa, ketua kelas, ketua OSIS, admin perpustakaan, dan piket gerbang. Isinya mencakup absensi, kelas,
ujian online, perpustakaan, inventaris, keuangan kelas, Schoolgram, PPDB, dan lainnya.

## 2. Teknologi
| Lapisan | Teknologi |
|---|---|
| Video conference | LiveKit open-source (self-hosted SFU), `livekit-api` (Python), `livekit-client` (JS) |
| Backend | Python 3.11, FastAPI 0.110, Motor (MongoDB async), PyJWT, bcrypt, openpyxl, python-pptx, httpx |
| Frontend | React 19, CRACO, Tailwind CSS, shadcn/ui (Radix), React Router 7, axios, framer-motion, lucide-react, html2canvas, html-to-image, jsPDF, JSZip, face-api (Face ID), html5-qrcode |
| Database | MongoDB (satu database, nama diambil dari `DB_NAME`) |
| Penyimpanan file | Disk lokal (`UPLOAD_DIR`, default `backend/uploads`), dilayani lewat `/api/files/...` |
| Auth | JWT (cookie `access_token` atau header Bearer), bcrypt, kunci login sementara setelah gagal berkali-kali |
| Package manager | `yarn` (frontend), `pip` + `requirements.txt` (backend) |

## 3. Struktur Proyek
```
backend/
  server.py            # seluruh API FastAPI (~8.400 baris, semua route berawalan /api)
  live_class.py        # Kelas Live: jadwal, token, kontrol host, WebSocket, penjadwal, absensi live, papan pemantau
  email_guard.py       # pembatas & penjaga pengiriman email
  requirements.txt     # dependensi Python (hasil pip freeze)
  .env.example         # daftar variabel lingkungan (tanpa nilai rahasia)
  tests/               # pytest per iterasi (test_iterNN_*.py)
frontend/
  package.json, yarn.lock, craco.config.js, tailwind.config.js, .env.example
  public/              # index.html, logo
  src/App.js           # daftar route
  src/pages/           # halaman (Dashboard, Attendance, Guests, QuestionBank, ExamRequests, PrintCards, ...)
  src/components/      # komponen per fitur (attendance, guests, vortex, class, piket, inventory, live/, ui/ ...)
  src/context/         # AuthContext, SettingsContext, ThemeContext
  src/lib/             # apiClient, roles, cardExport, bulkCardExport, safeHtml
  src/components/zx/   # BARU: kerangka desain Zynex (menu.js, Sidebar, Topbar, AppFooter, PublicFooter, ui.jsx)
  public/zynex-logo.png, public/zynex-wordmark.png   # BARU: logo Zynex LMS (latar transparan)
scripts/               # setup-vps.sh, update-vps.sh, setup-livekit-vps.sh, seed_live_class_test.py, md_to_pdf.py, generator PDF
docs/                  # REKAP_FITUR, PRD, ERD, BPMN, TOR
docs/design/           # BARU: PDF desain Zynes LMS (zynes.pdf) + 38 gambar mockup per fitur (img_NN_0.jpeg)
PANDUAN_DEPLOY_VPS.md/.pdf, PANDUAN_KELAS_LIVE.md
.emergent/crons.yml    # definisi cron terjadwal (lihat bagian 6)
memory/PRD.md          # riwayat pekerjaan & backlog
DEPLOY_VPS_GUIDE.md, PANDUAN_DEPLOY_VPS.md, DEPLOY_VPS_UPDATE.md, DOKUMEN_SISTEM_NOTEBOOKLM.md
```

## 4. Fitur yang Sudah Dibuat
**Dari repo asal (branch `main27`, sebelumnya `main26`):** akun multi-peran dan impor siswa massal (Excel), absensi QR/barcode dan Face ID,
monitor gerbang masuk/keluar, Izin Keluar (IK), absensi guru, rekap mingguan dan arsip Excel, kelas beserta tab materi,
jadwal, rekap absensi, papan peringkat, rapor ringkas, agenda, denah duduk, dan diskusi. Juga ada tugas, mini-quiz,
ujian online "Vortex Guard" (token, anti-curang, pengawas live, analisis butir, bank soal dari analisis, paket acak),
inventaris (QR, peminjaman), perpustakaan, uang kas dan dana sosial, Pemilu OSIS, Schoolgram (post, story, reels,
moderasi), galeri dan prestasi, PPDB, kartu pelajar, struktur organisasi, pengumuman, kritik & saran, piket guru dan
TV piket, reset password, notifikasi, kalender, analitik, serta pengaturan sekolah.

**Ditambahkan di workspace ini (2026):**
1. Peran `admin_absensi` diganti menjadi `piket_gerbang` (Piket Gerbang). Akun lama dimigrasi otomatis saat startup.
   Menu piket dibatasi dan punya dashboard sendiri.
2. Kunjungan tamu: jam kunjungan (`/api/guest-hours`), halaman publik `/info-tamu`, persetujuan kepala sekolah di
   luar jam kunjungan, catat keluar, filter dan ringkasan.
3. Rekap absensi rentang tanggal (siswa/guru) di satu halaman (`/api/attendance/recap-range`), dan halaman
   `/absensi-harian`.
4. Hapus data scan barcode/Face ID (per baris / semua hari ini), khusus super admin dan piket.
5. Bank Soal manual (`/bank-soal`) yang bisa ditarik ke ujian, quiz, dan pengajuan.
6. Pengajuan Ujian (`/pengajuan-ujian`): guru → super admin → "Buat Ujian" untuk banyak kelas sesuai jadwal guru.
   Ada juga jenis ujian (Harian/UTS/UAS/Try Out/Lainnya) dan Ujian Massal (`/api/exams/bulk`). Urutan soal dan opsi
   diacak per siswa.
7. Upload video maksimal 30MB (materi kelas, post, dan story Schoolgram) + dukungan HTTP Range.
8. Penugasan guru/staff: jabatan apa pun bisa menjadi wali kelas atau guru mapel (`teaching_duty`).
9. Upload foto profil mandiri untuk semua peran (`PATCH /api/auth/me/photo`).
10. Halaman selalu mulai dari atas saat pindah menu.
11. Cetak kartu massal ditulis ulang (per halaman A4, PDF/JPG-ZIP, sanggup 800+ kartu).
12. Filter kelas di Kelola Akun menampilkan semua kelas.

13. **Kelas Live** (video conference terjadwal, self-hosted): ruang otomatis sesuai Jadwal Pelajaran, auto-kick saat jam
    habis, host hanya guru pengampu, pemantau (wali kelas/kepsek/super admin), chat, angkat tangan, reaksi, kontrol host,
    +5 menit tanpa menggeser mapel berikutnya. Detail: `PANDUAN_KELAS_LIVE.md`.
14. **Buka/Tutup Kelas Live** seluruh sekolah + mode per kelas, tampilan "ZOOM DITUTUP".
15. **Absensi dari Live** (hadir otomatis per mapel + durasi + CSV) dan **Pemantau Kelas Live** (`/pemantau-live`).

Rekap seluruh fitur: `docs/REKAP_FITUR.md`. Riwayat lengkap ada di `memory/PRD.md`.

### 4b. Redesain UI/UX "Zynex LMS" (workspace ini, Juni 2026) — SEDANG BERJALAN
Acuan: `docs/design/zynes.pdf` (38 halaman, satu halaman per fitur). Keputusan pengguna:
- Pojok kiri atas sidebar: **hanya logo + nama sekolah** (dan tahun ajaran).
- Logo **Zynex LMS di footer seluruh halaman** (halaman dashboard: `AppFooter`; halaman publik: `PublicFooter` di `App.js`; layar TV piket: footer sendiri).
- Logo Zynex di **kartu pelajar** di samping logo sekolah (depan & belakang), **bisa dinyalakan/dimatikan** di Pengaturan → C. Kartu Pelajar
  (field settings baru `card_show_zynex`, default `true`, ada di `SettingsIn` dan `DEFAULT_SETTINGS` backend).
- Warna: **biru langit seperti PDF** (tetap memakai variabel `--brand` dari pengaturan warna tema).
- Dikerjakan dalam **7 fase**. Tidak ada fitur yang dihapus (kartu pelajar otomatis, buat akun 9 peran, layar TV piket, dll tetap ada).

Kerangka desain (`src/components/zx/` + `index.css` bagian "Zynex design system"):
sidebar putih dengan grup bernomor 01 Institusi / 02 Kehadiran / 03 Akademik & Aktivitas / 04 Layanan Sekolah (bisa dilipat),
topbar dengan breadcrumb + mode gelap + palet warna + lonceng + menu pengguna, `PageHeader`, `StatStrip` (satu kartu berisi
beberapa angka), `Panel`, `UnderlineTabs`, `StatusText`, kelas CSS `zx-card`, `zx-btn-primary`, `zx-btn-ghost`, `zx-input`, `zx-table`,
`zx-hero`. Font: Instrument Sans. Halaman lama juga "dilunakkan" otomatis lewat aturan CSS global di `.zx-main`.

Status per fase:
| Fase | Isi | Status |
|---|---|---|
| 1 | Kerangka (sidebar, topbar, footer Zynex, sistem desain) + Dashboard baru + logo Zynex di kartu pelajar + saklar | Selesai |
| 2 | Institusi: Informasi Sekolah, Struktur Organisasi, Kelola Akun, Permintaan Reset, Guru & Staff, Pengaturan, Admin PPDB, Analitik | Selesai (Presentasi & Dokumentasi masih tampilan lama, halaman berdiri sendiri) |
| 3 | Kehadiran: Absensi Barcode, Face ID, Daftar Wajah, Absensi Guru & Siswa, Absensi Guru, Pantau Gerbang, Izin Keluar, Kunjungan Tamu, Jadwal Piket (+TV), Rekap Absensi | Selesai (header, stat strip, tab; isi komponen dalam sebagian masih gaya lama) |
| 4 | Kalender, Jadwal Pelajaran, Papan Peringkat, Schoolgram, Inventaris, Perpustakaan | Sebagian (header & kartu ringkasan) |
| 5 | Kelas, Pemantau Kelas Live (sudah diubah ke tema terang), Bank Soal, Pengajuan Ujian, Vortex Guard, Rapor | Sebagian (header). **Berikutnya: kartu kelas sesuai mockup `img_28_0.jpeg`** |
| 6 | Dana Sosial, Pemilu OSIS, Prestasi, Pengumuman, Kritik & Saran | Sebagian (header & stat strip) |
| 7 | Login & halaman publik, footer publik, mobile, QA menyeluruh | Sebagian (footer publik, tombol login biru, drawer mobile) |

Uji: `test_reports/iteration_2.json` — backend 100%, frontend semua alur berjalan. Bug yang ditemukan (modal tidak menutup
layar penuh, kontras mode gelap, jam footer, posisi toast, Pemantau Live gelap, lebar Kritik & Saran) **sudah diperbaiki
tetapi belum diuji ulang** oleh agen pengujian.

## 5. Integrasi Pihak Ketiga
| Integrasi | Status | Variabel |
|---|---|---|
| AI pembuat soal / asisten (Emergent LLM key atau OpenAI) | **NONAKTIF** (kunci kosong) | `EMERGENT_LLM_KEY` atau `OPENAI_API_KEY`, `AI_MODEL`, `OPENAI_MODEL` |
| Email (Brevo API atau SMTP) | **NONAKTIF** (kunci kosong) | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` atau `SMTP_*`, `EMAIL_FROM_NAME` |
| Penyimpanan file | Disk lokal, tanpa layanan eksternal | `UPLOAD_DIR` |
| Server video Kelas Live | LiveKit self-hosted di VPS (bukan layanan cloud) | `LIVEKIT_URL`, `LIVEKIT_API_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| Pustaka `emergentintegrations` | Hanya dibutuhkan jika memakai Emergent LLM key. Install: `pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` | — |

## 6. Database (MongoDB) — informasi pemulihan
- Koneksi dari `MONGO_URL`, nama database dari `DB_NAME`. Tidak ada nilai yang di-hardcode.
- Di workspace Emergent dipakai MongoDB lokal `mongodb://localhost:27017`, berisi data uji saja (bukan produksi).
- Indeks dibuat otomatis saat startup (`users.email` unik, `users.id` unik, `attendance (student_id,date)` unik, dll).
- Super admin dibuat otomatis saat startup dari `ADMIN_EMAIL` + `ADMIN_PASSWORD`. Jika kosong, seeding dilewati.
- Koleksi yang dipakai: announcements, assignments, attendance, attendance_archives, attendance_confirm_tokens,
  attendance_stations, audit_logs, book_reviews, books, borrow_requests, candidates, chat_messages, class_agenda,
  class_announcements, class_bph, class_discussions, class_materials, class_schedule, class_seating, classes,
  cron_runs, election_config, email_logs, events, exam_attempts, exam_requests, exam_sessions, exams, face_profiles,
  feedback, files, gallery, gate_logs, gate_settings, guest_hours, guests, ik_requests, inventory, inventory_logs,
  inventory_rooms, library_config, loans, login_attempts, material_views, notifications, org_nodes, org_structures,
  password_reset_requests, password_reset_tokens, piket_shifts, points, posts, ppdb, profile_achievements,
  question_bank, quiz_attempts, quiz_sessions, quizzes, report_notes, reschedules, reservations, reset_requests,
  settings, sg_follows, social_fund, stories, subjects, submissions, teacher_attendance, teacher_attendance_history,
  timetable, uang_kas, users, votes, live_sessions, live_attendance, live_chat, live_events, live_settings.
  Diagram relasi: `docs/ERD.md`.
- Backup data produksi (jalankan di server yang punya akses ke database, **hanya membaca**):
  `mongodump --uri="$MONGO_URL" --db="$DB_NAME" --out=backup-$(date +%F)`
  Restore di server baru: `mongorestore --uri="$MONGO_URL_BARU" --nsFrom="$DB_NAME.*" --nsTo="$DB_NAME_BARU.*" backup-YYYY-MM-DD/`
- File unggahan (foto, video, lampiran) **tidak** disimpan di MongoDB, melainkan di folder `UPLOAD_DIR`.
  Folder ini harus disalin terpisah (mis. `tar czf uploads.tgz $UPLOAD_DIR`), lalu metadata di koleksi `files`
  harus cocok dengan path-nya.

## 7. Deployment
- **Railway (belum pernah dipakai di workspace ini):** di repositori ini **tidak ada** konfigurasi Railway (tidak ada `railway.json`, `Procfile`,
  `nixpacks.toml`, atau `Dockerfile`). Jika memakai Railway, siapkan:
  - Service backend: root `backend/`, start command `uvicorn server:app --host 0.0.0.0 --port $PORT`, dengan
    variabel dari `backend/.env.example`. Karena file unggahan ada di disk, pasang **Volume** dan arahkan `UPLOAD_DIR`
    ke mount path volume tersebut. Railway tidak mendukung port UDP untuk WebRTC, jadi Kelas Live tetap butuh VPS untuk
    server video (`scripts/setup-livekit-vps.sh`); backend di Railway diisi `LIVEKIT_URL=wss://live.domain` dan `LIVEKIT_API_URL=https://live.domain` (VPS itu).
  - Jalankan backend dengan 1 proses (jangan `--workers` > 1).
  - Service frontend: root `frontend/`, build `yarn install && yarn build`, sajikan folder `build/`
    (mis. `npx serve -s build -l $PORT`). Set `REACT_APP_BACKEND_URL` sebelum build.
  - MongoDB: plugin MongoDB Railway atau MongoDB Atlas. Isi `MONGO_URL` dan `DB_NAME`.
  - Semua route backend berawalan `/api`. Jika domain frontend dan backend berbeda, isi `CORS_ORIGINS` dengan domain
    frontend.
- **VPS (sudah disiapkan di repo):** `scripts/setup-vps.sh` (Nginx, systemd, MongoDB, SSL) dan
  `scripts/update-vps.sh`. Panduan: `PANDUAN_DEPLOY_VPS.md`, `DEPLOY_VPS_GUIDE.md`.
  Batas upload Nginx sudah dinaikkan ke 40MB (`client_max_body_size 40m`) untuk video 30MB.
- **Cron terjadwal** (`.emergent/crons.yml`, semua WIB). Di Railway/VPS, jalankan via cron eksternal dengan header
  `Authorization: Bearer $WEBHOOK_CRON_SECRET`:
  - `POST /api/cron/attendance-reminder` — 08:00 setiap hari
  - `POST /api/cron/attendance-auto-alpha` — 09:00 setiap hari
  - `POST /api/cron/attendance-archive` — 01:00 setiap Senin
  - `POST /api/cron/kas-reminder` — 00:00 tanggal 1
  - `POST /api/cron/piket-reminder` — setiap 15 menit

## 8. Status Pekerjaan
- **Redesain Zynex**: lihat tabel fase di bagian 4b. Langkah berikut: uji ulang perbaikan iterasi 2, lalu lanjutkan isi
  halaman fase 4–7 mengikuti mockup `docs/design/img_NN_0.jpeg` (NN = nomor halaman PDF).
- Semua fitur di atas berjalan dan sudah diuji: iterasi 60 (Piket Gerbang & tamu) lulus 100%; iterasi 61 (fitur baru)
  lulus 26/26 tes backend, dan halaman baru di frontend dicek tampil.
- Kelas Live: uji jadwal otomatis `backend/tests/live_schedule_e2e.py` lulus 18/18 (slot 2 menit dan 30 detik);
  uji UI iterasi 59 lulus. Di preview Emergent video tidak bisa mengalir (port media tidak terbuka) — berjalan penuh di VPS.
- Dokumen rekap fitur, PRD, ERD, BPMN, TOR (`docs/`) dan `PANDUAN_DEPLOY_VPS.pdf` sudah dibuat.
- AI dan email masih nonaktif sampai kunci diisi.

## 9. Melanjutkan di Workspace Baru
1. Ekstrak `project-backup.zip`, atau clone repo GitHub `boassibarani123-a11y/Website-Sekolah`.
2. Backend:
   ```
   cd backend
   cp .env.example .env    # isi nilai sebenarnya
   pip install -r requirements.txt   # jika emergentintegrations/litellm bentrok: install tanpa keduanya, lalu install emergentintegrations dari index di atas
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```
3. Frontend:
   ```
   cd frontend
   cp .env.example .env    # REACT_APP_BACKEND_URL=URL backend
   yarn install
   yarn start
   ```
4. Login memakai super admin dari `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
5. Tes backend: `cd backend && pytest tests/` (butuh server berjalan; beberapa tes memerlukan akun uji yang dibuat
   oleh tes itu sendiri).

## 10. Catatan Keamanan
- File `.env` tidak disertakan di backup. Gunakan `.env.example` sebagai acuan.
- Password super admin lama pernah tertulis di source code dan dokumen repo GitHub asal. Di backup ini sudah
  diganti dengan `<SUPER_ADMIN_PASSWORD>`, dan default di `server.py` sudah dihapus. **Segera ganti password super
  admin di produksi**, karena nilai lama sudah terlihat publik di repo GitHub.
- Beberapa file tes berisi password akun uji (bukan akun produksi). Jika akun uji tersebut ada di produksi, hapus
  atau ganti password-nya.
