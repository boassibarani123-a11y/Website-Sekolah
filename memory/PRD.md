# PRD — SMA NEGERI 1 LAGUBOTI (Website Sekolah)

## Original Problem Statement
Import existing project from GitHub (https://github.com/boassibarani123-a11y/Website-Sekolah.git, branch `main8`), set up and install all dependencies.

## Architecture
- Backend: FastAPI (`/app/backend/server.py`, ~4000 lines) + MongoDB (motor). All routes under `/api`.
- Frontend: React 19 + CRACO + Tailwind + shadcn/ui, react-router-dom 7.
- Integrations: SMANSALA LLM Key (AI features), SMANSALA email, object storage (boto3/S3), PDF/PPTX/Excel export.

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

---

## Import & Setup Log — 2026-06 (branch main9)
- Cloned `Website-Sekolah` (main9) and synced into /app (preserving .git/.emergent).
- Backend: installed emergentintegrations==0.2.1 (SMANSALA extra index) + full requirements.txt on Python 3.11. Running under supervisor on :8001.
- Frontend: `yarn install` (yarn 1.22.22) OK. Running under supervisor on :3000.
- Env: local MongoDB (DB_NAME=website_sekolah), JWT_SECRET set, FRONTEND_URL set for CORS, EMERGENT_LLM_KEY set (enables object storage + AI summaries via SMANSALA proxy). Stripe not wired in code.
- Super admin seeded automatically (see memory/test_credentials.md).
- Verified end-to-end by testing agent (iteration_28): backend 100%, frontend 100%. Object storage upload + AI book summary both working.

## Phase 1 Feature Additions — 2026-06
- Jadwal Pelajaran (timetable): per-kelas weekly schedule, anti-bentrok (class/teacher/room), /jadwal page + "Jadwal Hari Ini" dashboard widget. Backend: /api/timetable (CRUD + /today).
- Gamifikasi Poin: award points (prestasi/kedisiplinan/akademik), /leaderboard page (per siswa & per kelas) + dashboard widget. Backend: /api/points (award/me/leaderboard/history, history gated).
- PWA: manifest.json + service-worker.js (network-first, offline fallback) + icons (192/512) + SW registration. Installable on HP.
- Student ID card: removed "Kelas" field, compact white barcode box with full-fill barcode, proportional text.
- Sidebar: long school name now truncates with tooltip (title attr).
- Tested: iteration_29.json backend 100% / frontend 100%.
- Demo data created during dev: class "XII IPA 1", student Andi Pratama, sample timetable + points.

## Phase 2 — REMAINING (next session)
- P0: Schoolgram per-kelas ala Instagram (profil per kelas auto, story, sorotan/reels, post CRUD, hanya ketua_kelas yg bisa kelola schoolgram kelasnya).
- P0: Seluruh fitur AI (Asisten AI chatbot, AI generator soal quiz, AI ringkas pengumuman/notulen) — pakai EMERGENT_LLM_KEY.
- P1: Dark Mode & Tema warna sekolah.

## Phase 2 Feature Additions — 2026-06 (tested: iteration_30, backend 100% / frontend 100%)
- Schoolgram per-kelas (Instagram-style): profil tiap kelas (avatar, counts, deskripsi), story 24 jam, sorotan (highlight persist), post grid + like/comment, CRUD caption. Hak kelola: super_admin (semua kelas) & ketua_kelas (hanya kelasnya) — cross-class & siswa biasa ditolak 403. Backend: /api/schoolgram/* ; stories collection. Frontend: Schoolgram.jsx rewrite.
- Asisten AI (reuse _ai_text / EMERGENT_LLM_KEY): chatbot mengambang di semua halaman (AiAssistant.jsx, /api/ai/chat), generator soal quiz di modal Quiz (/api/ai/quiz-generate, guru/admin), peringkas pengumuman (/api/ai/summarize).
- Dark Mode & Tema: ThemeContext (localStorage 'theme-dark'), toggle di header; tema warna sekolah via --brand (remap util sky) + menu swatch untuk super_admin (PATCH settings.primary_color). Dark overrides global di index.css.
- NISN: form Kelola Akun + tombol 'Buat NISN acak otomatis' (nisn-generate). Backend sudah mendukung nisn.

## Backlog / Catatan
- server.py ~4600 baris; pertimbangkan pecah ke routers/ (schoolgram, ai, timetable, points).
- AI endpoints belum ada rate-limit/kuota.

## Import & Setup Log — 2026-06 (branch main12)
- Clone `Website-Sekolah` branch `main12` → disinkron ke /app (exclude .git/.emergent/.env/node_modules).
- Versi ini pakai STORAGE DISK LOKAL (UPLOAD_DIR) + OpenAI SDK resmi untuk AI (bukan emergentintegrations). Email via SMTP (opsional, belum dikonfigurasi).
- Backend .env dibuat: MONGO_URL, DB_NAME=website_sekolah, JWT_SECRET (generated), FRONTEND_URL (preview), ADMIN_EMAIL/PASSWORD, OPENAI_API_KEY="" (kosong — tinggal diisi kapan saja), OPENAI_MODEL=gpt-4o-mini.
- Bug fix saat import: (1) double prefix router `app.include_router(api, prefix="/api")` → `app.include_router(api)` (router sudah prefix /api; sebelumnya route jadi /api/api/* dan semua panggilan frontend 404). (2) hapus import duplikat HTTPException (ruff F811).
- requirements.txt dilengkapi: pyjwt, httpx, pandas, numpy, openpyxl, fpdf2, openai (sebelumnya hilang).
- Frontend: package.json ditambah react-easy-crop, react-barcode, html2canvas, jspdf, html5-qrcode (dipakai tapi tak terdaftar). yarn.lock dibersihkan dari mirror mati `mirrors.tencentyun.com` → `registry.yarnpkg.com`, lalu `yarn install` sukses.
- Verifikasi: backend login /api/auth/login OK, super admin ter-seed, frontend compile tanpa error (hanya lint warnings), login E2E → dashboard Super Admin tampil.
- Catatan: Fitur AI akan aktif otomatis begitu OPENAI_API_KEY diisi di backend/.env (lalu restart backend). Email reset password/rapor butuh SMTP_* diisi.

## Iterasi Perubahan Besar — 2026-06 (rencana 3 tahap, user approved; tiap tahap di-test lalu lanjut)

### TAHAP 1 — SELESAI & TERUJI (iteration_34: backend 100% / frontend 100%, no bugs)
- Rebrand EMERGENT→SMANSALA: title browser + Open Graph/Twitter meta (link preview WA) di public/index.html.
- Halaman login: hapus kartu publik "Lihat Presentasi" & "Dokumentasi Sistem" (dipindah ke sidebar Super Admin), urutan jadi Struktur Organisasi -> PPDB -> Galeri.
- Absensi disembunyikan dari siswa: menu Presensi hanya super_admin/kepsek/staff_tu/admin_absensi; backend /attendance/scan guard sama (siswa->403).
- Role baru "Admin Absensi" (admin_absensi): sidebar hanya Dashboard + Presensi + Rekap Absensi (whitelist ADMIN_ABSENSI_PATHS). Ditambah ke ROLES + dropdown Kelola Akun.
- PPDB super admin fleksibel: PUT /api/ppdb/{id} (edit penuh) + DELETE /api/ppdb/{id}; non-super hanya ubah status. UI AdminPpdb: tombol Ubah + Hapus.
- Papan Peringkat: tab "Kelola Poin" (edit/hapus entri). Backend GET /points/manage, PATCH/DELETE /points/{id}.
- Laporan Excel dirapikan (pretty_excel + weekly): palet minimal (header slate, zebra abu muda, garis aksen sky tipis), sederhana tapi tidak monoton.

### TAHAP 2 — SELESAI & TERUJI (iteration_34)
- Form Tugas kompleks (Assignments.jsx): Judul, Keterangan rich-text, Kelas, Kelas Kelompok, Mata Pelajaran, Guru, Batas Pengumpulan (datetime), Link, Semester, Status toggle, Lampiran File & Video (maks 20MB disk lokal). AssignmentIn/Update diperluas; /upload -> 20MB.
- Halaman "Daftar Guru & Staff" (/guru-staff): tabel No/Nama/NIP/Divisi/Username/Opsi (Mapel, Ubah, Reset, Hapus), filter, Export Excel (GET /api/users/staff/export/xlsx). Field `nip` ditambah ke user model.

### TAHAP 3 — BELUM DIKERJAKAN (next): Perombakan total Schoolgram
- Beranda IG: baris story semua kelas di atas + feed postingan semua kelas (1 kolom vertikal, gambar/video).
- Mobile bottom nav: Beranda (home), Reels (video kreatif kelas), Chat antar siswa (REAL-TIME websocket - pilihan user), Profil kelas.
- Profil kelas: hanya ketua_kelas bisa ubah kelasnya; siswa lain bisa lihat semua profil kelas. Super admin fleksibel.
- Gate: buka Schoolgram harus login ulang.
