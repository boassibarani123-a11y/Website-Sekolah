# Update / Deploy ke VPS — branch main23

Repo: https://github.com/boassibarani123-a11y/Website-Sekolah.git · branch `main23`
Lokasi aplikasi di VPS: `/var/www/sekolah` (service `sekolah-backend`, Nginx, MongoDB).

> Wajib: dorong kode terbaru dari Emergent ke GitHub dulu (tombol **Save to GitHub** → branch `main23`).

## A. Cara singkat (VPS sudah pernah dipasang) — cukup tempel di terminal VPS

```bash
cd /var/www/sekolah && sudo git fetch origin main23 && sudo git checkout -B main23 origin/main23 && sudo git reset --hard origin/main23 && sudo BRANCH=main23 bash scripts/update-vps.sh
```

Script ini: backup database → tarik kode main23 → menambah key .env baru (tanpa mengubah nilai lama) →
install backend → build frontend → restart service → cek `/api/health`.

## B. Belum pernah dipasang (VPS baru, Ubuntu 22.04)

```bash
sudo apt update && sudo apt install -y git
sudo git clone -b main23 https://github.com/boassibarani123-a11y/Website-Sekolah.git /var/www/sekolah
cd /var/www/sekolah
sudo BRANCH=main23 DOMAIN=sekolah.domainanda.com CERT_EMAIL=anda@mail.com \
     ADMIN_EMAIL=admin@domainanda.com ADMIN_PASSWORD='GantiPasswordKuat123' bash scripts/setup-vps.sh
sudo BRANCH=main23 bash scripts/update-vps.sh
```

## C. Langkah demi langkah (manual)

1. Masuk folder: `cd /var/www/sekolah`
2. Backup DB: `sudo mongodump --db sekolah_db --out /var/backups/sekolah/$(date +%F)`
3. Tarik kode: `sudo git fetch origin main23 && sudo git checkout -B main23 origin/main23 && sudo git reset --hard origin/main23`
4. Edit env bila perlu: `sudo nano backend/.env` — tambahkan:
   - `BREVO_API_KEY="..."` dan `BREVO_SENDER_EMAIL="pengirim@terverifikasi"` (email Brevo; kosong = belum dikonfigurasi)
   - `EMERGENT_LLM_KEY="..."` dan `AI_MODEL="claude-sonnet-4-5-20250929"` (fitur AI soal)
5. Backend: `sudo backend/venv/bin/pip install -r backend/requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`
6. Restart: `sudo chown -R www-data:www-data backend uploads && sudo systemctl restart sekolah-backend`
7. Frontend: `cd frontend && sudo yarn install && sudo yarn build && sudo systemctl reload nginx`
8. Cek: `curl http://127.0.0.1:8001/api/health` → `{"status":"ok"}`

## Masalah umum
- 502 Bad Gateway → `sudo journalctl -u sekolah-backend -n 50`
- Tampilan lama → tekan Ctrl+F5 / hapus cache PWA di HP (service worker)
- `dubious ownership` → `sudo git config --global --add safe.directory /var/www/sekolah`
