# 🏫 Website Sistem Informasi & Manajemen SMA Negeri 1 Laguboti

Sistem manajemen sekolah berbasis *Full-Stack Web Application* yang terintegrasi untuk menangani presensi digital (Barcode & AI Face Recognition), sistem ujian online anti-kecurangan, manajemen piket & kas, jadwal kelas live, serta pengiriman notifikasi/sistem pengingat otomatis.

---

## 📌 Fitur Utama

- **Presensi Digital & AI**: Presensi menggunakan barcode (Scan NISN) dan AI Face Recognition berbasis browser (`face-api.js` + `numpy`).
- **Piket Gerbang & Jadwal**: Manajemen shift piket guru, pengingat otomatis via Email (Brevo SMTP) & Notifikasi.
- **Ujian Online Anti-Nyontek**: Penguncian layar penuh (*Fullscreen lock*) & deteksi kecurangan interaktif.
- **Kelas Live (Opsional)**: Video conference terintegrasi menggunakan LiveKit server.
- **Sistem Otomatisasi (Cron)**: Pengingat absensi, auto-alpha, arsip data, pengingat kas, dan pengingat shift piket.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend**: React (CRA + Craco), Tailwind CSS / UI Framework, Yarn.
- **Backend**: Python 3.11, FastAPI, Uvicorn, Systemd service.
- **Database**: MongoDB 7.0 (Lokal / Self-hosted).
- **Reverse Proxy & SSL**: Nginx, Let's Encrypt (Certbot HTTPS).
- **Email Service**: Brevo (SMTP Relay).

---

## 🚀 Panduan Instalasi Lokal (Development)

### Prasyarat
- Python >= 3.11
- Node.js >= 20 & Yarn
- MongoDB Server 7.0 berjalan di `localhost:27017`

### 1. Clone Repositori
```bash
git clone -b main26 https://github.com/boassibarani123-a11y/Website-Sekolah.git
cd Website-Sekolah
```

### 2. Setup Backend (FastAPI)
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate  # Untuk Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

Buat file `.env` di dalam folder `backend/`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sekolah_db"
JWT_SECRET="kunci_jwt_rahasia_anda"
WEBHOOK_CRON_SECRET="kunci_cron_rahasia_anda"
CORS_ORIGINS="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
ADMIN_EMAIL="admin@domain.com"
ADMIN_PASSWORD="PasswordAdmin123!"
UPLOAD_DIR="./uploads"
EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="user_brevo"
SMTP_PASSWORD="password_brevo"
SMTP_FROM="noreply@domain.com"
```

Jalankan backend server:
```bash
uvicorn server:app --reload --port 8001
```

### 3. Setup Frontend (React)
```bash
cd ../frontend
yarn install
```

Buat file `.env` di dalam folder `frontend/`:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Jalankan frontend:
```bash
yarn start
```
Aplikasi lokal dapat diakses melalui `http://localhost:3000`.

---

## 🌐 Panduan Deployment VPS (Production - Ubuntu 22.04)

### Metode 1: Opsi Cepat (Otomatis via Script)

1. Pastikan domain A-Record sudah mengarah ke IP VPS.
2. Login ke terminal VPS (akses sudo), lalu jalankan perintah berikut:

```bash
cd ~
git clone -b main26 https://github.com/boassibarani123-a11y/Website-Sekolah.git tmp-sekolah

sudo DOMAIN=sekolah.domainanda.com \
CERT_EMAIL=email.anda@gmail.com \
ADMIN_EMAIL=admin@domainanda.com \
ADMIN_PASSWORD='PasswordKuatBaru!2026' \
SMTP_USER='login-smtp-brevo@smtp-brevo.com' \
SMTP_PASSWORD='xsmtpsib-xxxxxxxx' \
SMTP_FROM='noreply@domainanda.com' \
bash tmp-sekolah/scripts/setup-vps.sh

rm -rf tmp-sekolah
```

---

### Metode 2: Opsi Manual (Step-by-Step)

<details>
<summary><b>Klik untuk melihat langkah-langkah deployment manual</b></summary>

#### Langkah 1: Install Dependency Sistem & Setup Waktu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common gnupg curl git nginx
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash
sudo apt install -y nodejs
sudo npm install -g yarn
sudo timedatectl set-timezone Asia/Jakarta
```

#### Langkah 2: Install MongoDB 7.0
```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

#### Langkah 3: Clone Repository & Setup Folder
```bash
sudo mkdir -p /var/www && sudo chown -R $USER:$USER /var/www
cd /var/www && git clone -b main26 https://github.com/boassibarani123-a11y/Website-Sekolah.git sekolah
mkdir -p /var/www/sekolah/uploads
```

#### Langkah 4: Setup Backend
1. Generate Secret Key:
   ```bash
   openssl rand -hex 32  # Untuk JWT_SECRET
   openssl rand -hex 32  # Untuk WEBHOOK_CRON_SECRET
   ```
2. Buat file `/var/www/sekolah/backend/.env` dan isi sesuai kredensial server/SMTP Brevo Anda.
3. Install Python Environment:
   ```bash
   cd /var/www/sekolah/backend
   python3.11 -m venv venv
   ./venv/bin/pip install --upgrade pip
   ./venv/bin/pip install -r requirements.txt
   ```

#### Langkah 5: Build Frontend
```bash
cat > /var/www/sekolah/frontend/.env <<'ENV'
REACT_APP_BACKEND_URL=https://sekolah.domainanda.com
WDS_SOCKET_PORT=443
ENV

cd /var/www/sekolah/frontend && yarn install && yarn build
```

#### Langkah 6: Konfigurasi Systemd & Nginx
1. Buat Service Backend (`/etc/systemd/system/sekolah-backend.service`):
   ```ini
   [Unit]
   Description=Sekolah FastAPI Backend
   After=network.target mongod.service

   [Service]
   User=www-data
   Group=www-data
   WorkingDirectory=/var/www/sekolah/backend
   ExecStart=/var/www/sekolah/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 1
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```
2. Atur Hak Akses & Jalankan Service:
   ```bash
   sudo chown -R www-data:www-data /var/www/sekolah/uploads /var/www/sekolah/backend
   sudo systemctl daemon-reload && sudo systemctl enable --now sekolah-backend
   ```
3. Konfigurasi Nginx Server Block & Aktifkan HTTPS via Certbot.

#### Langkah 7: Setup Cron Automation (WIB)
Buat skrip runner cron di `/usr/local/bin/sekolah-cron.sh` dan daftarkan ke crontab untuk menjalankan endpoint otomatis (absensi, arsip, reminder piket, dan kas).

</details>

---

## 🔄 Pembaruan / Redeploy Aplikasi

Untuk memperbarui aplikasi ke versi terbaru dari branch `main26`:

```bash
cd /var/www/sekolah
sudo -u www-data git pull origin main26 || (sudo chown -R $USER /var/www/sekolah && git pull origin main26)
./backend/venv/bin/pip install -r backend/requirements.txt
sudo chown -R www-data:www-data backend uploads && sudo systemctl restart sekolah-backend
cd frontend && yarn install && yarn build && sudo systemctl reload nginx
```

---

## 💾 Backup Database Otomatis

Tambahkan perintah berikut ke crontab (`crontab -e`) untuk melakukan backup MongoDB setiap jam 02:30 WIB:
```cron
30 2 mongodump --db sekolah_db --archive=/var/backups/sekolah/db-$(date +\%F).gz --gzip && find /var/backups/sekolah -mtime +14 -delete
```