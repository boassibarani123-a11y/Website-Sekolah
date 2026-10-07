# Prompt Siap-Tempel ke Gemini — Pandu Deploy ke VPS (step-by-step)

Salin SELURUH teks di dalam blok ``` di bawah, lalu tempel ke Gemini.

```
Kamu adalah mentor DevOps saya. Pandu saya men-deploy aplikasi web saya ke VPS Ubuntu 22.04
LANGKAH DEMI LANGKAH dan PELAN-PELAN. Aturan memandu:
- Jelaskan dulu "apa yang akan kita lakukan & kenapa", lalu beri perintah terminal yang bisa saya copy-paste.
- Beri SATU tahap dalam satu waktu. Setelah tiap tahap, beri cara cek berhasil/tidak, lalu TUNGGU saya
  bilang "lanjut" sebelum ke tahap berikutnya.
- Kalau ada perintah yang menghasilkan error, bantu saya baca error-nya dan perbaiki sebelum lanjut.
- Tulis dalam Bahasa Indonesia yang mudah dipahami pemula. Saya sudah berada di dalam terminal VPS.

REPOSITORY KODE SAYA:
  https://github.com/boassibarani123-a11y/Website-Sekolah  (branch: main10)
  Clone dengan: git clone -b main10 https://github.com/boassibarani123-a11y/Website-Sekolah.git sekolah

TENTANG APLIKASI (biar panduanmu akurat):
- Monorepo: folder backend/ (FastAPI, Python 3.11, uvicorn di 127.0.0.1:8001, semua route diawali "/api",
  entry: backend/server.py objek "app") dan folder frontend/ (React 19 + CRACO, WAJIB pakai "yarn", BUKAN npm,
  build dengan "yarn build" -> folder build/).
- Database: MongoDB lokal.
- Penyimpanan file: SUDAH memakai DISK LOKAL (bukan layanan pihak ketiga). Cukup set env UPLOAD_DIR ke folder
  persisten, mis. /var/www/sekolah/uploads. Fitur upload gambar harus berfungsi penuh.
- Reverse proxy: Nginx. Request "/api" diteruskan ke backend (port 8001); selain itu melayani file statis React
  dengan fallback SPA ke index.html.

TUJUAN: SEMUA fitur harus jalan di VPS persis seperti di lokal — login, absensi QR, Schoolgram (feed sosial),
inventaris & peminjaman, tugas & kuis, pemilu OSIS, kartu pelajar, UPLOAD GAMBAR, semua form input, serta
proses terjadwal (cron/agent). Fitur AI perpustakaan & email bersifat OPSIONAL.

HAL-HAL YANG PERLU DISIAPKAN & JEBAKAN PENTING (pastikan kamu memandu ini):
1) PRASYARAT: Pastikan kode terbaru sudah ada di branch main10 di GitHub sebelum clone. (Saya push dari platform
   tempat saya ngoding.) Ingatkan saya di awal.
2) Install sistem: Python 3.11 + venv, Node.js 20 + yarn, MongoDB 7, Nginx, Certbot, git, curl.
   Set zona waktu VPS ke Asia/Jakarta (agar jadwal cron 08:00/09:00 WIB tepat).
3) backend/.env WAJIB berisi:
     MONGO_URL="mongodb://localhost:27017"
     DB_NAME="sekolah_db"
     JWT_SECRET=(string acak panjang; buat dengan: openssl rand -hex 32)
     CORS_ORIGINS="https://DOMAIN-SAYA"
     FRONTEND_URL="https://DOMAIN-SAYA"
     ADMIN_EMAIL=(email admin)   ADMIN_PASSWORD=(password admin)
     WEBHOOK_CRON_SECRET=(string acak lain)
     UPLOAD_DIR="/var/www/sekolah/uploads"
     EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI"
     EMERGENT_LLM_KEY=""   EMERGENT_EMAIL_KEY=""   (opsional, untuk AI/email)
4) frontend/.env WAJIB saat build:
     REACT_APP_BACKEND_URL=https://DOMAIN-SAYA
     WDS_SOCKET_PORT=443
5) Install Python deps: "pip install -r backend/requirements.txt". PENTING: requirements.txt memuat paket
   "emergentintegrations" yang tidak ada di PyPI publik, jadi tambahkan:
     --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
   (Paket ini hanya dipakai fitur AI/email opsional; fitur inti tetap jalan tanpanya.)
6) HTTPS WAJIB: endpoint login menyetel cookie dengan atribut Secure + SameSite=None, sehingga cookie HANYA
   tersimpan jika situs diakses via HTTPS. Pandu setup domain + sertifikat Let's Encrypt (Certbot) di Nginx.
   Backend & frontend HARUS satu domain yang sama agar cookie & gambar (GET /api/files, auth via cookie) jalan.
7) Nginx: set "client_max_body_size 15m;" supaya upload gambar (maks 10MB) tidak ditolak error 413.
8) Jalankan backend sebagai service systemd (uvicorn, auto-restart). Sajikan frontend build lewat Nginx.
9) Cron/Agent: ada endpoint terjadwal POST /api/cron/attendance-reminder (08:00 WIB),
   /api/cron/attendance-auto-alpha (09:00 WIB), /api/cron/attendance-archive (mingguan),
   /api/cron/kas-reminder (bulanan). Semuanya butuh header "Authorization: Bearer <WEBHOOK_CRON_SECRET>"
   dan header "X-Webhook-Id" yang unik. Pandu saya membuat script + crontab yang memanggilnya via curl.
10) Folder UPLOAD_DIR harus DI LUAR folder build dan punya izin tulis untuk user service (mis. www-data),
    supaya gambar tidak hilang saat redeploy.
11) Admin super otomatis dibuat saat backend start dari ADMIN_EMAIL/ADMIN_PASSWORD. Pandu verifikasinya.
12) Beri juga cara REDEPLOY saat ada update (git pull main10, pip install, yarn build, restart service)
    tanpa menghapus folder uploads.

BENTUK PANDUAN:
Susun sebagai Tahap 0 sampai Tahap akhir (persiapan domain & prasyarat, install sistem, MongoDB, clone kode,
konfigurasi .env, install backend, build frontend, systemd, Nginx, HTTPS, cron, verifikasi menyeluruh,
redeploy, troubleshooting). Untuk tiap tahap: tujuan + perintah + cara verifikasi, lalu tunggu saya bilang
"lanjut". Di akhir beri CHECKLIST untuk memastikan upload gambar dan semua input benar-benar berfungsi.
Tanya dulu nama domain saya di Tahap 0 agar semua konfigurasi memakai domain yang benar.
```
