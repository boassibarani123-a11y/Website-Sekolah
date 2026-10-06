# Prompt untuk Gemini — Panduan Deploy Aplikasi Sekolah ke VPS

Salin SELURUH teks di dalam blok di bawah ini dan tempel ke Gemini.
Isinya sudah memuat semua fakta teknis aplikasi + jebakan (gotchas) penting
supaya hasil panduannya akurat dan semua fitur (terutama **upload gambar** dan
**semua input**) berjalan normal di VPS.

---

```
Kamu adalah seorang DevOps Engineer senior. Buatkan saya PANDUAN DEPLOY LANGKAH-DEMI-LANGKAH
yang sangat detail dan bisa langsung saya ikuti untuk men-deploy aplikasi web saya ke sebuah
VPS Linux (Ubuntu 22.04). Tujuan utama: SEMUA fungsi, fitur, dan proses latar belakang
berjalan normal — TERUTAMA fitur UPLOAD GAMBAR dan semua FORM INPUT. Tulis dalam Bahasa Indonesia,
berurutan per tahap, lengkap dengan perintah terminal dan isi file konfigurasi yang bisa saya copy-paste.

=== ARSITEKTUR APLIKASI ===
- Monorepo dengan 2 bagian:
  - backend/  -> FastAPI (Python 3.11), dijalankan dengan uvicorn di 0.0.0.0:8001.
                 Semua route backend diawali prefix "/api". Entry point: backend/server.py (objek "app").
  - frontend/ -> React 19 + CRACO (react-scripts 5), package manager WAJIB "yarn" (JANGAN npm).
                 Build dengan "yarn build" menghasilkan folder build/ statis.
- Database: MongoDB (lokal di VPS).
- Reverse proxy: Nginx. Aturan routing: request diawali "/api" diteruskan ke backend (port 8001),
  selain itu melayani file statis hasil build React (dengan fallback ke index.html untuk SPA routing).

=== ENVIRONMENT VARIABLES ===
backend/.env (WAJIB):
  MONGO_URL="mongodb://localhost:27017"
  DB_NAME="sekolah_db"
  JWT_SECRET="(string acak panjang, generate sendiri)"
  CORS_ORIGINS="https://domain-saya.com"
  FRONTEND_URL="https://domain-saya.com"
  ADMIN_EMAIL="(email admin)"
  ADMIN_PASSWORD="(password admin)"
  WEBHOOK_CRON_SECRET="(string acak untuk mengamankan endpoint cron)"
  # Opsional (fitur AI & email), lihat bagian JEBAKAN:
  EMERGENT_LLM_KEY=""
  EMERGENT_EMAIL_KEY=""
  EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI"
frontend/.env (WAJIB saat build):
  REACT_APP_BACKEND_URL="https://domain-saya.com"
  WDS_SOCKET_PORT=443

=== DEPENDENSI ===
- Backend: "pip install -r backend/requirements.txt".
  PENTING: requirements.txt memuat paket bernama "emergentintegrations" yang TIDAK ada di PyPI publik.
  Paket ini butuh index tambahan:
    pip install -r backend/requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
  (Lihat JEBAKAN #2 kalau saya ingin lepas dari paket ini sepenuhnya.)
- Frontend: "yarn install" lalu "yarn build".

=== JEBAKAN PENTING YANG WAJIB KAMU TANGANI DI PANDUAN ===

1) UPLOAD GAMBAR / PENYIMPANAN FILE (paling kritikal, harus kamu beri solusi konkret):
   Saat ini endpoint POST /api/upload dan GET /api/files/{path} di backend/server.py
   MENYIMPAN file ke OBJECT STORAGE TERKELOLA milik pihak ketiga melalui proxy
   "https://integrations.emergentagent.com/objstore/..." yang diautentikasi memakai EMERGENT_LLM_KEY
   (fungsi put_object/get_object/init_storage). Di VPS milik saya sendiri, ketergantungan ini
   TIDAK BOLEH dipakai karena bisa gagal/putus. Berikan saya langkah mengganti penyimpanan ke
   DISK LOKAL VPS (opsi paling sederhana) ATAU MinIO/S3. Untuk opsi disk lokal, jelaskan:
     - Buat folder persisten mis. /var/www/uploads dan simpan file ke sana (pakai path unik/uuid).
     - Ubah put_object()/get_object() agar menulis/membaca dari disk, bukan ke proxy Emergent.
     - Sajikan file lewat Nginx atau tetap lewat GET /api/files (streaming dari disk).
     - Pastikan permission folder benar (user service bisa menulis) dan ada di luar folder build
       agar tidak hilang saat redeploy.
   Tunjukkan contoh kode pengganti put_object/get_object versi disk lokal secara lengkap.

2) FITUR AI & EMAIL (opsional tapi jelaskan):
   - Fitur AI (mis. POST /api/ai/quiz-generate) dan email reset password memakai library
     "emergentintegrations" + EMERGENT_LLM_KEY / EMERGENT_EMAIL_KEY (proxy Emergent).
   - Beri 2 skenario: (a) biarkan memakai EMERGENT_LLM_KEY jika masih valid & VPS bisa akses internet
     ke proxy Emergent; atau (b) ganti ke SDK provider resmi (OpenAI/Gemini) dengan API key sendiri,
     dan ganti email ke SMTP/Resend sendiri. Jelaskan konsekuensi masing-masing. Fitur inti aplikasi
     (login, absensi, inventaris, tugas, kuis, pemilu, kartu pelajar) TIDAK butuh ini dan harus tetap jalan.

3) COOKIE LOGIN BUTUH HTTPS:
   Endpoint /api/auth/login menyetel cookie "access_token" dengan atribut Secure=True dan SameSite=None.
   Artinya cookie HANYA tersimpan di browser bila situs diakses lewat HTTPS. Maka panduan WAJIB
   menyertakan setup domain + sertifikat SSL (Let's Encrypt/Certbot) di Nginx. Tanpa HTTPS, login dan
   tampilan gambar (yang diautentikasi lewat cookie di GET /api/files) akan gagal. Jelaskan juga bahwa
   backend dan frontend harus berada di DOMAIN YANG SAMA agar cookie terkirim (hindari masalah lintas-domain).

4) LOGO SEKOLAH & PENGATURAN:
   Logo sekolah disimpan di frontend/public/school-logo.png dan nilai setting "school_logo_url" di database.
   Setelah deploy, pastikan nilai school_logo_url menunjuk ke domain VPS (atau pakai path relatif "/school-logo.png").
   Jelaskan cara memperbaruinya (lewat halaman Pengaturan sebagai super admin, atau update dokumen settings di Mongo).

5) CRON / TUGAS TERJADWAL ("agent"):
   Aplikasi punya endpoint terjadwal di /api/cron/* (mis. attendance-archive, attendance-reminder,
   attendance-auto-alpha, kas-reminder) yang diamankan dengan WEBHOOK_CRON_SECRET. Di platform lama
   dijalankan oleh scheduler bawaan (lihat berkas .emergent/crons.yml sebagai acuan jadwal). Di VPS,
   buatkan systemd timer ATAU crontab yang memanggil endpoint-endpoint ini via curl pada jadwal yang sesuai,
   menyertakan secret-nya. Tampilkan contoh crontab + perintah curl-nya.

6) MANAJEMEN PROSES & AUTO-START:
   Gunakan systemd (atau supervisor) untuk menjalankan uvicorn backend sebagai service yang auto-restart,
   dan Nginx untuk menyajikan frontend. Sertakan contoh unit systemd lengkap untuk backend.

7) MONGO & ADMIN SEED:
   Backend otomatis membuat akun super admin saat start dari ADMIN_EMAIL/ADMIN_PASSWORD. Jelaskan cara
   mengamankan MongoDB (bind 127.0.0.1, aktifkan auth bila perlu) dan cara verifikasi seed admin berhasil.

8) UKURAN UPLOAD:
   Backend membatasi file maksimal 10MB. Set juga "client_max_body_size 10m;" (atau lebih) di Nginx
   agar upload gambar tidak ditolak 413.

=== BENTUK OUTPUT YANG SAYA INGINKAN ===
Susun sebagai TAHAPAN berurutan, contoh:
  Tahap 0 — Persiapan VPS & domain
  Tahap 1 — Install dependensi sistem (Python 3.11, Node LTS + yarn, MongoDB, Nginx, Certbot)
  Tahap 2 — Ambil kode & struktur folder di server
  Tahap 3 — Konfigurasi backend/.env & frontend/.env
  Tahap 4 — GANTI penyimpanan upload ke disk lokal (sertakan kode pengganti) [JEBAKAN #1]
  Tahap 5 — Install dependensi backend & frontend, build frontend
  Tahap 6 — Service systemd untuk backend (uvicorn)
  Tahap 7 — Konfigurasi Nginx (reverse proxy /api + serve build + SPA fallback + client_max_body_size)
  Tahap 8 — HTTPS dengan Certbot (Let's Encrypt) [JEBAKAN #3]
  Tahap 9 — Cron/systemd timer untuk endpoint /api/cron/* [JEBAKAN #5]
  Tahap 10 — Verifikasi menyeluruh (login, upload gambar, submit form, kuis, pemilu, kartu pelajar)
  Tahap 11 — Troubleshooting umum (413 upload, cookie tak tersimpan, CORS, 502 backend)

Untuk setiap tahap: beri perintah persis, isi file konfigurasi lengkap, dan satu cara verifikasi cepat.
Di akhir, beri CHECKLIST singkat untuk memastikan upload gambar dan semua input benar-benar berfungsi.
Jangan memakai layanan terkelola Emergent apa pun untuk penyimpanan file pada panduan akhir.
```

---

## Catatan tambahan (untuk kamu, bukan untuk ditempel)

- Jebakan #1 (object storage) adalah hal paling penting agar **upload gambar** jalan di VPS.
  Saat ini kodenya terikat ke proxy Emergent (`backend/server.py` fungsi `put_object` /
  `get_object` / `init_storage`). Jika ingin, saya bisa langsung menuliskan versi **penyimpanan disk lokal**
  di kode supaya tinggal deploy — cukup minta saya.
- Jebakan #3 (cookie `Secure`+`SameSite=None`) artinya VPS **wajib HTTPS**; tanpa itu login & gambar gagal.
- Fitur AI/email memakai `EMERGENT_LLM_KEY`; fitur inti sekolah tidak membutuhkannya.
