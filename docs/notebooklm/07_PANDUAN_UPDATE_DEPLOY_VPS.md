# 07 — PANDUAN UPDATE VPS ke Branch main17 (Website SMA Negeri 1 Laguboti)
Dokumen ini bisa ditempel langsung ke Gemini/ChatGPT. Bagian 0 menjelaskan konteksnya ke AI asisten.

---

## 0. KONTEKS UNTUK AI ASISTEN (WAJIB DIBACA OLEH AI)
Saya **sudah login di terminal VPS Ubuntu 22.04** (punya akses sudo). Website sekolah saya **SUDAH BERJALAN** di
`https://sman1laguboti.web.id` (versi lama dari branch main15/main16). Saya **TIDAK ingin install ulang dari nol**.
Saya hanya ingin **UPDATE kode ke branch `main17`** dan tetap mempertahankan data, akun, foto, SSL, dan pengaturan.

Fakta server (hasil setup sebelumnya, jangan diubah):
| Komponen | Lokasi / nama |
|---|---|
| Folder aplikasi (git clone) | `/var/www/sekolah` |
| Repo GitHub | `https://github.com/boassibarani123-a11y/Website-Sekolah.git` |
| Branch tujuan | `main17` |
| Backend | FastAPI Python 3.11, virtualenv `/var/www/sekolah/backend/venv`, jalan di `127.0.0.1:8001` |
| Service backend | systemd **`sekolah-backend`** (user `www-data`) |
| Frontend | React, hasil build statis di `/var/www/sekolah/frontend/build`, dilayani Nginx |
| Nginx | `/etc/nginx/sites-available/sekolah` (HTTPS Let's Encrypt sudah aktif) |
| Database | MongoDB 7 lokal, nama DB ada di `backend/.env` (biasanya `sekolah_db`) |
| File upload (foto) | `/var/www/sekolah/uploads` (diatur `UPLOAD_DIR` di `backend/.env`) |
| Konfigurasi rahasia | `/var/www/sekolah/backend/.env` dan `/var/www/sekolah/frontend/.env` (tidak ada di GitHub) |
| Cron | crontab root memanggil `/usr/local/bin/sekolah-cron.sh` (5 jadwal) |

**ATURAN untuk AI asisten:**
1. JANGAN menjalankan `scripts/setup-vps.sh` (itu untuk install baru dan bisa menimpa konfigurasi).
2. JANGAN menghapus atau menimpa `backend/.env`, `frontend/.env`, folder `uploads/`, atau database.
3. JANGAN `git clone` ulang ke folder lain dan JANGAN `rm -rf /var/www/sekolah`.
4. JANGAN ubah konfigurasi SSL/certbot.
5. Jalankan perintah **satu langkah per giliran**, minta saya menempel output, lalu cek apakah sesuai "Hasil yang diharapkan".
6. Jika ada error, baca pesan errornya, lihat tabel Troubleshooting di bagian 6, lalu beri satu perbaikan saja.

Update main17 **tidak butuh variabel .env baru**. Isi main17: mode offline (service worker baru), hapus riwayat absensi,
pembeda wajah mirip/kembar (konfirmasi NISN), grafik kehadiran mingguan per kelas, pemilih jam roster baru,
Schoolgram baru, dan tampilan kamera gaya Face ID.

---

## 1. PRASYARAT (dilakukan di Emergent, bukan di VPS)
Pastikan versi terbaru sudah di-**Save to GitHub** ke branch **`main17`** (termasuk file `scripts/update-vps.sh`,
folder `docs/notebooklm/`, dan `backend/requirements.txt` versi bersih). Jika ragu, klik **Save to GitHub → main17 sekali lagi**.

Cek dari VPS bahwa file update sudah ada di GitHub:
```bash
git ls-remote --heads https://github.com/boassibarani123-a11y/Website-Sekolah.git main17
```
Hasil yang diharapkan: satu baris berisi kode commit + `refs/heads/main17`. Kalau kosong, branch belum ter-push.

---

## 2. CARA CEPAT — script update otomatis (disarankan)
Jalankan 3 perintah ini berurutan:
```bash
cd /var/www/sekolah
sudo git config --global --add safe.directory /var/www/sekolah
sudo git fetch origin main17
sudo git show origin/main17:scripts/update-vps.sh | sudo tee /tmp/update-vps.sh > /dev/null
```
Lalu jalankan update dari salinan di /tmp (supaya script tidak berubah di tengah jalan saat kode berganti versi):
```bash
sudo BRANCH=main17 bash /tmp/update-vps.sh
```
Script akan melakukan 7 tahap: backup DB + .env → ambil kode main17 → cek .env → install dependency backend →
build frontend → restart service → verifikasi.

Hasil yang diharapkan di akhir:
```
active
API /api/settings      : 200
SELESAI. Buka situs, lalu tekan Ctrl+Shift+R ...
```
Lanjut ke **bagian 4 (Nginx service worker)** dan **bagian 5 (verifikasi di browser)**.

---

## 3. CARA MANUAL (jika script gagal / ingin langkah demi langkah)

### Langkah 3.1 — Masuk folder & cek kondisi
```bash
cd /var/www/sekolah
sudo git config --global --add safe.directory /var/www/sekolah
git branch --show-current
git status --short | head
ls backend/.env frontend/.env
```
Diharapkan: branch lama (main15/main16), file `.env` keduanya ada. Kalau `git status` menampilkan file berubah
(huruf `M`), itu perubahan lokal. Simpan dulu dengan `sudo git stash`.

### Langkah 3.2 — Backup database & .env (WAJIB)
```bash
sudo mkdir -p /var/backups/sekolah
DB=$(grep '^DB_NAME=' backend/.env | cut -d'"' -f2); echo "DB=$DB"
sudo mongodump --db "$DB" --archive=/var/backups/sekolah/db-before-main17-$(date +%F-%H%M).gz --gzip
sudo cp backend/.env /var/backups/sekolah/backend.env-$(date +%F)
sudo cp frontend/.env /var/backups/sekolah/frontend.env-$(date +%F)
ls -lh /var/backups/sekolah | tail -3
```
Diharapkan: muncul `DB=sekolah_db`, mongodump menampilkan `done dumping`, dan file backup muncul di daftar.

### Langkah 3.3 — Pindah ke branch main17
```bash
sudo git fetch origin main17
sudo git checkout -B main17 origin/main17
git log -1 --oneline
ls docs/notebooklm scripts/update-vps.sh
```
Diharapkan: `Switched to (or reset) branch 'main17'`, file docs dan script terlihat.
Jika muncul error *"Your local changes would be overwritten"*: jalankan `sudo git stash` lalu ulangi perintah checkout.
Jika muncul error *"dubious ownership"*: jalankan lagi perintah `safe.directory` di 3.1.

### Langkah 3.4 — Update dependency backend
```bash
sudo /var/www/sekolah/backend/venv/bin/pip install -r /var/www/sekolah/backend/requirements.txt
```
Diharapkan: diakhiri `Successfully installed ...` atau `Requirement already satisfied`.
Paket baru di main17: `websockets` (agar chat real-time berjalan via WebSocket).

### Langkah 3.5 — Build ulang frontend (2–6 menit)
```bash
cd /var/www/sekolah/frontend
cat .env
sudo yarn install
sudo yarn build
ls build/service-worker.js build/index.html
```
Diharapkan: `.env` berisi `REACT_APP_BACKEND_URL=https://sman1laguboti.web.id`, build diakhiri
`The build folder is ready to be deployed.`, dan kedua file ada.
Jika muncul `Killed` artinya RAM kurang, jadi tambahkan swap (lihat Troubleshooting) lalu ulangi `sudo yarn build`.

### Langkah 3.6 — Restart backend & reload Nginx
```bash
sudo chown -R www-data:www-data /var/www/sekolah/backend /var/www/sekolah/uploads
sudo systemctl restart sekolah-backend
sleep 5
systemctl is-active sekolah-backend
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/settings
sudo nginx -t && sudo systemctl reload nginx
```
Diharapkan: `active`, `200`, dan `syntax is ok` / `test is successful`.

---

## 4. Nginx: service worker jangan di-cache (sekali saja, disarankan)
Mode offline memakai `service-worker.js`. File ini harus selalu diambil versi terbaru agar update berikutnya langsung
terpakai. Cek dulu apakah aturan sudah ada:
```bash
grep -n "service-worker" /etc/nginx/sites-available/sekolah || echo "BELUM ADA"
```
Jika `BELUM ADA`, tambahkan aturan sebelum blok `location / {` yang pertama:
```bash
sudo cp /etc/nginx/sites-available/sekolah /etc/nginx/sites-available/sekolah.bak-$(date +%F)
sudo sed -i '0,/location \/ {/s//location = \/service-worker.js {\n        add_header Cache-Control "no-cache, no-store, must-revalidate";\n        try_files $uri =404;\n    }\n\n    location \/ {/' /etc/nginx/sites-available/sekolah
sudo nginx -t && sudo systemctl reload nginx
curl -sI https://sman1laguboti.web.id/service-worker.js | grep -i -E "HTTP|cache-control"
```
Diharapkan: `HTTP/2 200` dan `cache-control: no-cache, no-store, must-revalidate`.
Jika `nginx -t` gagal: `sudo cp /etc/nginx/sites-available/sekolah.bak-$(date +%F) /etc/nginx/sites-available/sekolah && sudo systemctl reload nginx`.

---

## 5. Cek cron & verifikasi di browser
```bash
sudo crontab -l | grep sekolah-cron
SECRET=$(grep WEBHOOK_CRON_SECRET /var/www/sekolah/backend/.env | cut -d'"' -f2)
curl -s -X POST http://127.0.0.1:8001/api/cron/piket-reminder -H "Authorization: Bearer $SECRET" -H "X-Webhook-Id: tes-$(date +%s)" -H "Content-Type: application/json" -d '{}'
```
Diharapkan: 5 baris cron (attendance-reminder 08:00, attendance-auto-alpha 09:00, attendance-archive Senin 01:00,
kas-reminder tgl 1, piket-reminder) dan respons `{"ok":true}`.

Di browser (laptop & HP), buka `https://sman1laguboti.web.id`, tekan **Ctrl+Shift+R** (di HP: tutup tab lalu buka lagi), login, lalu cek:
1. Header kanan atas ada indikator **Online** (ikon wifi hijau). Itu fitur mode offline yang baru.
2. Dashboard Kepala Sekolah / Super Admin ada **Kehadiran Mingguan per Kelas**.
3. Presensi Barcode: tabel log punya tombol hapus (ikon tong sampah) dan tombol **Hapus Semua Hari Ini**.
4. Presensi Wajah: kamera tampil bulat dengan cincin ala Face ID.
5. Jadwal → Tambah: jam & menit berupa dropdown terpisah + tombol jam cepat.
6. Schoolgram → Profil → pilih kelas: foto profil bulat bergradien, tab Post/Reels/Ditandai.

---

## 6. Troubleshooting
| Gejala | Penyebab & solusi |
|---|---|
| `fatal: detected dubious ownership` | `sudo git config --global --add safe.directory /var/www/sekolah` |
| `Your local changes would be overwritten` | `sudo git stash` lalu ulangi checkout |
| `couldn't find remote ref main17` | Branch belum di-push dari Emergent → Save to GitHub ke main17 |
| pip error `emergentintegrations` / `litellm` not found | requirements.txt lama (hasil freeze). Push ulang main17 dari Emergent (requirements versi bersih 22 paket), lalu ulangi 3.3–3.4 |
| `yarn build` → `Killed` | RAM kurang: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` lalu build ulang |
| 502 Bad Gateway | `sudo journalctl -u sekolah-backend -n 80 --no-pager` untuk melihat error Python |
| `KeyError: 'JWT_SECRET'` | `.env` hilang/tertimpa → `sudo cp /var/backups/sekolah/backend.env-TANGGAL /var/www/sekolah/backend/.env` lalu restart |
| Tampilan masih versi lama | Hard refresh Ctrl+Shift+R; atau di Chrome: F12 → Application → Service Workers → Unregister → reload |
| Indikator selalu "Offline" | Cek `curl https://sman1laguboti.web.id/api/` harus 200 (`{"message":...}`); cek Nginx `location /api/` |
| Foto lama hilang | Cek `grep UPLOAD_DIR backend/.env` mengarah ke `/var/www/sekolah/uploads`; izin: `sudo chown -R www-data:www-data /var/www/sekolah/uploads` |
| Chat tidak real-time | Pastikan `websockets` terpasang (langkah 3.4) dan Nginx `location /api/` punya header `Upgrade`/`Connection "upgrade"` |
| Kamera wajah tidak muncul | Harus HTTPS + izin kamera di gembok address bar |

## 7. Rollback (kembali ke versi sebelumnya bila darurat)
```bash
cd /var/www/sekolah
sudo git checkout -B main16 origin/main16          # atau main15
sudo /var/www/sekolah/backend/venv/bin/pip install -r backend/requirements.txt
cd frontend && sudo yarn install && sudo yarn build
sudo systemctl restart sekolah-backend && sudo systemctl reload nginx
# Hanya jika data rusak (data setelah backup akan hilang):
# sudo mongorestore --drop --gzip --archive=/var/backups/sekolah/db-before-main17-TANGGAL.gz
```

## 8. Update berikutnya (main18, dst.)
```bash
cd /var/www/sekolah && sudo git fetch origin main18
sudo git show origin/main18:scripts/update-vps.sh | sudo tee /tmp/update-vps.sh > /dev/null
sudo BRANCH=main18 bash /tmp/update-vps.sh
```
