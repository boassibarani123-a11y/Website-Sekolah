# PANDUAN DEPLOY — Website SMA Negeri 1 Laguboti ke VPS Ubuntu 22.04
(Siap ditempel ke Gemini sebagai konteks. Posisi Anda: SUDAH berada di terminal VPS.)

## 0. Konteks untuk AI asisten (Gemini)
Saya sudah login ke terminal VPS Ubuntu 22.04 (akses sudo). Domain saya sudah diarahkan (A-record) ke IP VPS ini.
Saya ingin men-deploy website sekolah full-stack dari GitHub:
- Repo: https://github.com/boassibarani123-a11y/Website-Sekolah.git
- Branch: main15
- Frontend: React (CRA + craco, build statis pakai yarn) → dilayani Nginx
- Backend: FastAPI (Python 3.11, uvicorn) → 127.0.0.1:8001, semua endpoint berawalan /api
- Database: MongoDB 7.0 lokal (bind 127.0.0.1)
- Reverse proxy: Nginx + HTTPS Let's Encrypt (Certbot)
- Process manager: systemd service `sekolah-backend`
- Cron: 4 endpoint terjadwal dipanggil via curl dengan header `Authorization: Bearer <WEBHOOK_CRON_SECRET>` + `X-Webhook-Id`
- Email: Brevo SMTP (smtp-relay.brevo.com:587). AI (OpenAI) dikosongkan. WhatsApp nonaktif.
- Login memakai cookie httpOnly `Secure` + `SameSite=None` → WAJIB HTTPS dan frontend+backend SATU domain.
Bantu saya langkah demi langkah, cek output tiap langkah, dan bantu troubleshooting jika ada error.

Ganti semua `sekolah.domainanda.com` dengan domain Anda.

---

## CARA CEPAT (script otomatis, disarankan)
Prasyarat: dari Emergent klik **Save to GitHub** → push ke branch `main15` (agar file `scripts/setup-vps.sh` dan perbaikan UI terbaru ikut).

```bash
cd ~
git clone -b main15 https://github.com/boassibarani123-a11y/Website-Sekolah.git tmp-sekolah
sudo DOMAIN=sekolah.domainanda.com \
  CERT_EMAIL=email.anda@gmail.com \
  ADMIN_EMAIL=admin@domainanda.com \
  ADMIN_PASSWORD='PasswordKuatBaru!2026' \
  SMTP_USER='login-smtp-brevo@smtp-brevo.com' \
  SMTP_PASSWORD='xsmtpsib-xxxxxxxx' \
  SMTP_FROM='noreply@domainanda.com' \
  bash tmp-sekolah/scripts/setup-vps.sh
rm -rf ~/tmp-sekolah
```
Script menjalankan Fase 1–8 di bawah secara otomatis (secret JWT & cron dibuat acak). Jika gagal di tengah, aman dijalankan ulang.

---

## CARA MANUAL (langkah per langkah)

### Fase 1 — Dependency sistem
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common gnupg curl git nginx
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
sudo timedatectl set-timezone Asia/Jakarta
python3.11 --version && node -v && yarn -v && timedatectl | grep "Time zone"
```

### Fase 2 — MongoDB 7.0
```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager    # harus: active (running)
grep bindIp /etc/mongod.conf               # harus: 127.0.0.1
```

### Fase 3 — Ambil kode
```bash
sudo mkdir -p /var/www && sudo chown -R $USER:$USER /var/www
cd /var/www && git clone -b main15 https://github.com/boassibarani123-a11y/Website-Sekolah.git sekolah
mkdir -p /var/www/sekolah/uploads
```

### Fase 4 — Backend
```bash
openssl rand -hex 32   # salin → JWT_SECRET
openssl rand -hex 32   # salin → WEBHOOK_CRON_SECRET
nano /var/www/sekolah/backend/.env
```
Isi:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sekolah_db"
JWT_SECRET="<hasil openssl 1>"
WEBHOOK_CRON_SECRET="<hasil openssl 2>"
CORS_ORIGINS="https://sekolah.domainanda.com"
FRONTEND_URL="https://sekolah.domainanda.com"
ADMIN_EMAIL="admin@domainanda.com"
ADMIN_PASSWORD="PasswordKuatBaru!2026"
UPLOAD_DIR="/var/www/sekolah/uploads"
EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="<login SMTP Brevo>"
SMTP_PASSWORD="<SMTP key Brevo>"
SMTP_FROM="<email pengirim terverifikasi di Brevo>"
```
```bash
chmod 600 /var/www/sekolah/backend/.env
cd /var/www/sekolah/backend
python3.11 -m venv venv && ./venv/bin/pip install --upgrade pip && ./venv/bin/pip install -r requirements.txt
```
Catatan: super admin dibuat otomatis saat backend pertama kali start (dari ADMIN_EMAIL/ADMIN_PASSWORD).

### Fase 5 — Frontend
```bash
cat > /var/www/sekolah/frontend/.env <<'ENV'
REACT_APP_BACKEND_URL=https://sekolah.domainanda.com
WDS_SOCKET_PORT=443
ENV
cd /var/www/sekolah/frontend && yarn install && yarn build
```
Jika build kehabisan RAM (VPS 1GB): buat swap 2GB → `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`.

### Fase 6 — systemd + Nginx
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
sudo chown -R www-data:www-data /var/www/sekolah/uploads /var/www/sekolah/backend
sudo systemctl daemon-reload && sudo systemctl enable --now sekolah-backend
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/settings   # harus 200
```
```bash
sudo tee /etc/nginx/sites-available/sekolah >/dev/null <<'NGINX'
server {
    listen 80;
    server_name sekolah.domainanda.com;
    client_max_body_size 15m;
    root /var/www/sekolah/frontend/build;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
    location / { try_files $uri $uri/ /index.html; }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/sekolah /etc/nginx/sites-enabled/sekolah
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Fase 7 — HTTPS (wajib)
```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sekolah.domainanda.com --redirect -m email.anda@gmail.com --agree-tos -n
```

### Fase 8 — Cron terjadwal (WIB)
```bash
SECRET=$(grep WEBHOOK_CRON_SECRET /var/www/sekolah/backend/.env | cut -d'"' -f2)
sudo tee /usr/local/bin/sekolah-cron.sh >/dev/null <<SH
#!/usr/bin/env bash
curl -s -X POST "http://127.0.0.1:8001/api/cron/\$1" -H "Authorization: Bearer $SECRET" -H "X-Webhook-Id: \$1-\$(date +%Y%m%d%H%M)" -H "Content-Type: application/json" -d '{}' >> /var/log/sekolah-cron.log 2>&1
SH
sudo chmod 700 /usr/local/bin/sekolah-cron.sh
( sudo crontab -l 2>/dev/null; cat <<'CRON'
0 8 * * *   /usr/local/bin/sekolah-cron.sh attendance-reminder
0 9 * * *   /usr/local/bin/sekolah-cron.sh attendance-auto-alpha
0 1 * * 1   /usr/local/bin/sekolah-cron.sh attendance-archive
0 7 1 * *   /usr/local/bin/sekolah-cron.sh kas-reminder
CRON
) | sudo crontab -
sudo /usr/local/bin/sekolah-cron.sh kas-reminder && tail -1 /var/log/sekolah-cron.log   # harus {"ok":true}
```

### Fase 9 — Brevo SMTP
1. Daftar di brevo.com → Settings → **SMTP & API** → tab SMTP → salin *Login* (SMTP_USER) & buat *SMTP key* (SMTP_PASSWORD).
2. Senders & IP → tambah & verifikasi email pengirim (SMTP_FROM). Untuk deliverability terbaik, autentikasi domain (SPF/DKIM) di menu Domains.
3. Isi ke backend/.env lalu `sudo systemctl restart sekolah-backend`.
4. Kuota free: 300 email/hari → untuk 900 akun kirim bertahap 3 hari.

### Fase 10 — Verifikasi di browser
- https://domain → halaman login + logo tampil
- Login super admin → dashboard
- Informasi Sekolah → upload galeri → reload → gambar tetap ada
- Presensi Barcode → colok scanner USB → scan kartu → muncul MASUK + baris di tabel
- Kuis, Pemilu OSIS, Kartu Pelajar, tambah siswa/inventaris tersimpan
- Pengaturan → Kirim Email Tes

---

## Setup perangkat Scanner Barcode di gerbang
- Scanner USB/Bluetooth tipe **HID keyboard (keyboard-wedge)** — default hampir semua scanner. Tidak perlu driver.
- Pastikan scanner diset mengirim **Enter (CR) suffix** setelah kode (default pabrik umumnya sudah).
- Di laptop gerbang: login akun **Admin Absensi** → buka menu **Presensi Barcode** → klik **Layar Penuh**.
- Scanner langsung aktif selama: tab browser itu sedang aktif/fokus, dan kursor TIDAK sedang di kolom input teks.
- Banyak gerbang: tiap laptop menyimpan nama stasiun sendiri (Gerbang 1, 2, …) – atur di panel Stasiun.
- Barcode di Kartu Pelajar berisi NISN siswa.
- Tips kiosk: Chrome `--kiosk https://domain/attendance`, matikan sleep/screen saver laptop.

## Update / redeploy
```bash
cd /var/www/sekolah && sudo -u www-data git pull origin main15 || (sudo chown -R $USER /var/www/sekolah && git pull origin main15)
./backend/venv/bin/pip install -r backend/requirements.txt
sudo chown -R www-data:www-data backend uploads && sudo systemctl restart sekolah-backend
cd frontend && yarn install && yarn build && sudo systemctl reload nginx
```
Folder `uploads/` tidak tersentuh → gambar aman.

## Backup database harian (disarankan)
```bash
sudo mkdir -p /var/backups/sekolah
( sudo crontab -l; echo '30 2 * * * mongodump --db sekolah_db --archive=/var/backups/sekolah/db-$(date +\%F).gz --gzip && find /var/backups/sekolah -mtime +14 -delete' ) | sudo crontab -
```

## Troubleshooting
| Gejala | Penyebab / solusi |
|---|---|
| 502 Bad Gateway | backend mati → `sudo journalctl -u sekolah-backend -n 80 --no-pager` |
| Login berhasil tapi terlempar ke login lagi | belum HTTPS / domain frontend ≠ REACT_APP_BACKEND_URL |
| Upload gagal 413 | `client_max_body_size` Nginx kurang |
| Gambar 401 | cookie tak terkirim → cek HTTPS & satu domain |
| Upload gagal Permission denied | `sudo chown -R www-data:www-data /var/www/sekolah/uploads` |
| Cron tidak jalan | cek `/var/log/sekolah-cron.log`, secret harus sama dengan .env |
| Email tidak terkirim | cek SMTP key Brevo, sender sudah diverifikasi, port 587 tidak diblok provider VPS |
| Scanner tidak terbaca | klik area kosong halaman (fokus keluar dari input), pastikan suffix Enter aktif |
| `yarn build` killed | RAM kurang → tambah swap |
