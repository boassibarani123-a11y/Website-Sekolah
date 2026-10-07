# Panduan Deploy ke VPS (Ubuntu 22.04) — SMA NEGERI 1 LAGUBOTI

Semua yang berjalan di lokal akan berjalan di VPS: login, absensi QR, Schoolgram,
inventaris, tugas & kuis, pemilu OSIS, kartu pelajar, **upload gambar (disk lokal)**,
fitur AI perpustakaan, email, dan **cron/agent** terjadwal.

Ganti `sekolah.contoh.com` dengan domain kamu. Jalankan sebagai user dengan sudo.

---

## ⚠️ PRASYARAT WAJIB — Sinkronkan kode terbaru ke GitHub dulu

Semua perbaikan terbaru (penyimpanan upload ke **disk lokal**, logo transparan,
validasi kuis, galeri sekolah) ada di workspace Emergent. Branch GitHub `main10`
BELUM berisi perubahan ini sampai kamu mendorongnya.

**Di Emergent, klik tombol "Save to GitHub" dan push ke branch `main10` TERLEBIH DAHULU.**
Kalau VPS menarik kode sebelum ini, upload gambar akan tetap memakai layanan Emergent (salah).
(Butuh bantuan soal fitur Save to GitHub? Tanyakan saya, nanti saya arahkan.)

---

## Tahap 1 — Install dependensi sistem

```bash
sudo apt update && sudo apt upgrade -y
# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip git nginx curl
# Node.js 20 + Yarn
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
# Zona waktu WIB (agar jadwal cron 08:00/09:00 sesuai)
sudo timedatectl set-timezone Asia/Jakarta
```

## Tahap 2 — Install MongoDB

```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager   # pastikan active (running)
```
MongoDB bind default ke 127.0.0.1 (aman, tidak terbuka ke internet).

## Tahap 3 — Ambil kode dari GitHub (branch main10)

```bash
sudo mkdir -p /var/www && sudo chown -R $USER:$USER /var/www
cd /var/www
git clone -b main10 https://github.com/boassibarani123-a11y/Website-Sekolah.git sekolah
cd sekolah
# folder upload persisten (DI LUAR folder build, tidak hilang saat redeploy)
mkdir -p /var/www/sekolah/uploads
```

## Tahap 4 — Konfigurasi & install BACKEND

Buat file `/var/www/sekolah/backend/.env`:
```bash
cat > /var/www/sekolah/backend/.env <<'ENV'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sekolah_db"
JWT_SECRET="GANTI_DENGAN_STRING_ACAK_PANJANG"
CORS_ORIGINS="https://sekolah.contoh.com"
FRONTEND_URL="https://sekolah.contoh.com"
ADMIN_EMAIL="boassibarani123@gmail.com"
ADMIN_PASSWORD="Boas12345io"
WEBHOOK_CRON_SECRET="GANTI_DENGAN_STRING_ACAK_LAIN"
UPLOAD_DIR="/var/www/sekolah/uploads"
EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI"
EMERGENT_LLM_KEY=""
EMERGENT_EMAIL_KEY=""
ENV
# Generate secret acak (jalankan 2x, tempel ke JWT_SECRET & WEBHOOK_CRON_SECRET):
openssl rand -hex 32
```
> Catatan: `UPLOAD_DIR` membuat semua upload gambar tersimpan di disk VPS — **tanpa layanan Emergent**.
> `EMERGENT_LLM_KEY` opsional: isi hanya jika mau fitur AI perpustakaan & email. Fitur inti tidak butuh ini.

Install dependensi Python:
```bash
cd /var/www/sekolah/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
deactivate
```
> `--extra-index-url` wajib karena paket `emergentintegrations` tidak ada di PyPI publik.

## Tahap 5 — Build FRONTEND

```bash
cat > /var/www/sekolah/frontend/.env <<'ENV'
REACT_APP_BACKEND_URL=https://sekolah.contoh.com
WDS_SOCKET_PORT=443
ENV
cd /var/www/sekolah/frontend
yarn install
yarn build        # hasil: /var/www/sekolah/frontend/build
```

## Tahap 6 — Service systemd untuk backend (uvicorn)

```bash
sudo tee /etc/systemd/system/sekolah-backend.service >/dev/null <<'UNIT'
[Unit]
Description=Sekolah FastAPI Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/sekolah/backend
ExecStart=/var/www/sekolah/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

# izin agar www-data bisa baca kode & tulis folder upload
sudo chown -R www-data:www-data /var/www/sekolah/uploads
sudo chown -R www-data:www-data /var/www/sekolah/backend
sudo systemctl daemon-reload
sudo systemctl enable --now sekolah-backend
sudo systemctl status sekolah-backend --no-pager
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/settings   # harap 200
```

## Tahap 7 — Konfigurasi Nginx (proxy /api + serve build + SPA fallback)

```bash
sudo tee /etc/nginx/sites-available/sekolah >/dev/null <<'NGINX'
server {
    listen 80;
    server_name sekolah.contoh.com;

    client_max_body_size 15m;          # agar upload gambar (maks 10MB) tidak 413
    root /var/www/sekolah/frontend/build;
    index index.html;

    # API -> backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # React SPA (semua rute lain -> index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/sekolah /etc/nginx/sites-enabled/sekolah
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## Tahap 8 — HTTPS (WAJIB, karena cookie login butuh Secure/HTTPS)

Arahkan dulu A-record domain ke IP VPS, lalu:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sekolah.contoh.com --redirect -m email@kamu.com --agree-tos -n
sudo systemctl reload nginx
```
> Tanpa HTTPS, login dan tampilan gambar GAGAL karena cookie `access_token` memakai
> `Secure` + `SameSite=None`. Backend & frontend WAJIB satu domain yang sama.

## Tahap 9 — Cron / Agent terjadwal

Endpoint cron butuh header `Authorization: Bearer <WEBHOOK_CRON_SECRET>` dan `X-Webhook-Id` unik.
Buat script lalu jadwalkan via crontab:
```bash
sudo tee /usr/local/bin/sekolah-cron.sh >/dev/null <<'SH'
#!/usr/bin/env bash
SECRET="GANTI_SAMA_DENGAN_WEBHOOK_CRON_SECRET"
BASE="http://127.0.0.1:8001/api/cron"
hit () {
  curl -s -X POST "$BASE/$1" \
    -H "Authorization: Bearer $SECRET" \
    -H "X-Webhook-Id: $1-$(date +%Y%m%d%H%M)" \
    -H "Content-Type: application/json" -d '{}' >/dev/null
}
hit "$1"
SH
sudo chmod +x /usr/local/bin/sekolah-cron.sh

# Pasang jadwal (zona waktu VPS = Asia/Jakarta)
( crontab -l 2>/dev/null; cat <<'CRON'
0 8 * * *   /usr/local/bin/sekolah-cron.sh attendance-reminder
0 9 * * *   /usr/local/bin/sekolah-cron.sh attendance-auto-alpha
0 1 * * 1   /usr/local/bin/sekolah-cron.sh attendance-archive
0 7 1 * *   /usr/local/bin/sekolah-cron.sh kas-reminder
CRON
) | crontab -
crontab -l   # verifikasi
```

## Tahap 10 — Finalisasi logo & verifikasi

Logo sudah di `frontend/public/school-logo.png` dan tampil otomatis (path `/school-logo.png`).
Jika perlu set ulang di database:
```bash
mongosh sekolah_db --eval 'db.settings.updateOne({_id:"singleton"},{$set:{school_logo_url:"/school-logo.png"}},{upsert:true})'
```

Checklist uji di browser `https://sekolah.contoh.com`:
- [ ] Buka situs → halaman login tampil + logo muncul
- [ ] Login super admin (boassibarani123@gmail.com / Boas12345io) → masuk dashboard
- [ ] Informasi Sekolah → Edit → **upload gambar galeri** → Simpan → reload → gambar tetap ada
- [ ] Buat & kerjakan Kuis → nilai benar
- [ ] Pemilu OSIS → voting berhasil
- [ ] Kartu Pelajar tampil dengan logo
- [ ] Semua form input (tambah siswa, inventaris, dll) tersimpan

## Tahap 11 — Redeploy saat ada update

```bash
cd /var/www/sekolah
git pull origin main10
# backend
source backend/venv/bin/activate && pip install -r backend/requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ && deactivate
sudo systemctl restart sekolah-backend
# frontend
cd frontend && yarn install && yarn build && sudo systemctl reload nginx
```
Folder `/var/www/sekolah/uploads` tidak tersentuh saat redeploy → gambar aman.

---

## Troubleshooting cepat
- **Upload 413 (Request Entity Too Large)** → naikkan `client_max_body_size` di Nginx.
- **Login tidak nyangkut / cookie hilang** → pastikan HTTPS aktif & domain backend=frontend sama.
- **Gambar 401** → cookie tidak terkirim; cek HTTPS & domain sama.
- **502 Bad Gateway** → `sudo systemctl status sekolah-backend`, cek `journalctl -u sekolah-backend -n 50`.
- **CORS error** → pastikan `CORS_ORIGINS` di backend/.env = domain HTTPS kamu.
- **Fitur AI error 400** → isi `EMERGENT_LLM_KEY` (opsional); fitur inti tetap jalan tanpanya.
