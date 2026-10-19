# Panduan Deploy Ulang / Update VPS — branch main29

Website SMA Negeri 1 Laguboti (sman1laguboti.web.id). Panduan ini dipakai SETELAH kode di-push ke GitHub
`boassibarani123-a11y/Website-Sekolah`, branch `main29`. Tidak ada password atau API key di dokumen ini.

## 0. Urutan kerja
1. Push kode dari Emergent ke GitHub: tombol "Save to GitHub" → pilih repo `Website-Sekolah` → buat branch `main29`.
2. Cek di github.com bahwa branch `main29` sudah ada dan berisi file `PANDUAN_UPDATE_VPS_MAIN29.md`.
3. Baru setelah itu jalankan langkah di bawah ini di terminal VPS.

## 1. Apa yang perlu sudah terpasang di VPS
Jika VPS sudah pernah dipasang dengan `scripts/setup-vps.sh`, semua ini sudah ada. Cek dengan perintah di sebelahnya.

| Komponen | Versi | Cek |
|---|---|---|
| Ubuntu | 22.04 | `lsb_release -a` |
| Python | 3.11 + venv | `python3.11 --version` |
| Node.js | 20 | `node -v` |
| Yarn | 1.x | `yarn -v` |
| MongoDB | 7.0 | `systemctl is-active mongod` |
| Nginx | apa saja | `systemctl is-active nginx` |
| Certbot (SSL) | apa saja | `sudo certbot certificates` |
| LiveKit server | dari setup-livekit-vps.sh | `systemctl is-active livekit` |
| Git | apa saja | `git --version` |

Kalau ada yang belum terpasang (VPS baru), pakai bagian 6 "Pasang dari nol".

## 2. Update cepat (VPS lama) — cara yang disarankan
```
cd /var/www/sekolah
sudo git fetch origin main29
sudo git checkout -B main29 origin/main29
sudo BRANCH=main29 bash scripts/update-vps.sh
```
Script ini otomatis:
1. Backup database ke `/var/backups/sekolah/TANGGAL` (mongodump, hanya membaca).
2. Mengambil kode branch main29 (`git reset --hard` — perubahan manual di folder kode VPS akan tertimpa).
3. Menambah variabel .env yang belum ada (nilai lama TIDAK diubah).
4. `pip install -r requirements.txt` di venv backend, lalu restart `sekolah-backend`.
5. `yarn install` + `yarn build` frontend, lalu reload Nginx.
6. Cek kesehatan `http://127.0.0.1:8001/api/health`.

Catatan: perintah `git checkout` pertama perlu karena versi `update-vps.sh` yang lama di VPS masih default main23.

## 3. Isi .env backend di VPS
File: `/var/www/sekolah/backend/.env` (izin 600). Edit: `sudo nano /var/www/sekolah/backend/.env`.
Variabel yang dibutuhkan (isi nilai asli; jangan dibagikan):

| Variabel | Isi |
|---|---|
| MONGO_URL | `mongodb://localhost:27017` |
| DB_NAME | nama database produksi (jangan diganti, nanti data terlihat kosong) |
| JWT_SECRET | teks acak panjang (jangan diganti kecuali mau semua user login ulang) |
| CORS_ORIGINS | `https://sman1laguboti.web.id` |
| FRONTEND_URL | `https://sman1laguboti.web.id` |
| ADMIN_EMAIL / ADMIN_PASSWORD | akun super admin (dibuat sekali saat startup) |
| WEBHOOK_CRON_SECRET | teks acak, dipakai cron |
| UPLOAD_DIR | `/var/www/sekolah/uploads` |
| LIVEKIT_URL | `wss://sman1laguboti.web.id` |
| LIVEKIT_API_URL | `http://127.0.0.1:7880` |
| LIVEKIT_API_KEY / LIVEKIT_API_SECRET | dari `/etc/livekit/livekit.yaml` bagian `keys:` (format `KEY: SECRET`) |
| BREVO_API_KEY, BREVO_SENDER_EMAIL | opsional, untuk email |
| EMERGENT_LLM_KEY | opsional, untuk AI |

Setelah mengubah .env: `sudo systemctl restart sekolah-backend`.

Frontend: file `/var/www/sekolah/frontend/.env` berisi `REACT_APP_BACKEND_URL=https://sman1laguboti.web.id`.
Setelah mengubahnya wajib build ulang: `cd /var/www/sekolah/frontend && yarn build && sudo systemctl reload nginx`.

## 4. Kelas Live: teruskan /twirp ke LiveKit (sekali saja)
Video sudah jalan lewat `/rtc`, tapi kontrol ruang (mute/kick dari server) butuh `/twirp`.
Buka konfigurasi Nginx situs: `sudo nano /etc/nginx/sites-available/sekolah`, lalu di dalam blok
`server { ... }` yang memakai SSL tambahkan:
```
location /twirp/ {
    proxy_pass http://127.0.0.1:7880;
    proxy_set_header Host $host;
}
```
Jika blok `location /rtc` sudah ada, letakkan tepat di bawahnya. Lalu:
```
sudo nginx -t && sudo systemctl reload nginx
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://sman1laguboti.web.id/twirp/livekit.RoomService/ListRooms -H "Content-Type: application/json" -d '{}'
```
Hasil 401 = sudah diteruskan ke LiveKit (benar). Hasil 405 = belum.

Port yang harus terbuka di firewall VPS dan di panel cloud: TCP 80, 443, 7881, 5349; UDP 3478 dan 50000-60000.
```
sudo ufw allow 7881/tcp && sudo ufw allow 5349/tcp && sudo ufw allow 3478/udp && sudo ufw allow 50000:60000/udp
```

## 5. Cek setelah update
```
systemctl is-active sekolah-backend nginx mongod livekit
curl -s http://127.0.0.1:8001/api/health
sudo journalctl -u sekolah-backend -n 50 --no-pager
git -C /var/www/sekolah log -1 --oneline
```
Di browser: login super admin, buka Absensi Barcode dan Absensi Face ID (tema terang, kotak hadir di atas),
lalu coba satu sesi Kelas Live dari dua perangkat.

Jika `pip install` gagal dengan "ResolutionImpossible ... litellm": pastikan branch main29 sudah terambil
(baris `litellm @ ...whl` tidak boleh berisi `#sha256=`). Jalankan ulang:
```
/var/www/sekolah/backend/venv/bin/pip install -r /var/www/sekolah/backend/requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

## 6. Pasang dari nol (VPS baru)
```
sudo apt update && sudo apt install -y git
sudo git clone -b main29 https://github.com/boassibarani123-a11y/Website-Sekolah.git /var/www/sekolah
cd /var/www/sekolah
sudo bash scripts/setup-vps.sh sman1laguboti.web.id
sudo bash scripts/setup-livekit-vps.sh sman1laguboti.web.id
```
`setup-vps.sh` memasang Python 3.11, Node 20, Yarn, MongoDB 7, Nginx, systemd service, SSL, dan cron.
`setup-livekit-vps.sh` memasang server video + TURN dan menuliskan kunci LiveKit ke .env backend.
Setelah itu periksa bagian 3 (.env) dan bagian 4 (/twirp).

Pindah data dari server lama (hanya membaca di server lama):
```
mongodump --db NAMA_DB --out /tmp/backup-db
sudo tar czf /tmp/uploads.tgz -C /var/www/sekolah uploads
```
Salin kedua file ke VPS baru (scp), lalu:
```
mongorestore --db NAMA_DB /tmp/backup-db/NAMA_DB
sudo tar xzf /tmp/uploads.tgz -C /var/www/sekolah && sudo chown -R www-data:www-data /var/www/sekolah/uploads
```

## 7. Cron terjadwal (sudah dipasang setup-vps.sh)
Semua memakai header `Authorization: Bearer WEBHOOK_CRON_SECRET` ke `https://sman1laguboti.web.id`:
- 08:00 WIB setiap hari: `POST /api/cron/attendance-reminder`
- 09:00 WIB setiap hari: `POST /api/cron/attendance-auto-alpha`
- 01:00 WIB setiap Senin: `POST /api/cron/attendance-archive`
- 07:00 WIB tanggal 1: `POST /api/cron/kas-reminder`
- setiap 15 menit: `POST /api/cron/piket-reminder`
Cek: `sudo crontab -l`.

## 8. Kembali ke versi sebelumnya (jika ada masalah)
```
cd /var/www/sekolah && sudo BRANCH=main27 bash scripts/update-vps.sh
```
Data database tidak berubah oleh rollback; backup otomatis ada di `/var/backups/sekolah/`.
