#!/usr/bin/env bash
# UPDATE website SMAN 1 Laguboti yang SUDAH berjalan di VPS ke branch terbaru (default main17).
# Aman: TIDAK menyentuh backend/.env, frontend/.env, folder uploads/, database, Nginx, SSL, crontab.
# Pakai: sudo git -C /var/www/sekolah fetch origin main17 && sudo git -C /var/www/sekolah show origin/main17:scripts/update-vps.sh > /tmp/update-vps.sh && sudo BRANCH=main17 bash /tmp/update-vps.sh
set -euo pipefail

BRANCH="${BRANCH:-main17}"
APP="${APP:-/var/www/sekolah}"
DB_NAME="$(grep -E '^DB_NAME=' "$APP/backend/.env" | cut -d'"' -f2)"
DB_NAME="${DB_NAME:-sekolah_db}"
STAMP="$(date +%F-%H%M)"

echo "== 1/7 Backup database ($DB_NAME) & file .env =="
mkdir -p /var/backups/sekolah
mongodump --db "$DB_NAME" --archive="/var/backups/sekolah/db-before-$BRANCH-$STAMP.gz" --gzip
cp "$APP/backend/.env" "/var/backups/sekolah/backend.env-$STAMP"
cp "$APP/frontend/.env" "/var/backups/sekolah/frontend.env-$STAMP"
echo "Backup tersimpan di /var/backups/sekolah"

echo "== 2/7 Ambil kode branch $BRANCH =="
git config --global --add safe.directory "$APP" || true
cd "$APP"
git stash push -m "auto-stash-$STAMP" >/dev/null 2>&1 || true   # hanya perubahan file ter-track; uploads/.env/venv tidak disentuh
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git log -1 --oneline

echo "== 3/7 Pastikan .env & uploads tetap ada =="
test -f backend/.env && test -f frontend/.env && echo ".env OK"
mkdir -p "$APP/uploads"

echo "== 4/7 Dependency backend =="
"$APP/backend/venv/bin/pip" install --upgrade pip -q
"$APP/backend/venv/bin/pip" install -r backend/requirements.txt -q

echo "== 5/7 Build frontend (2-6 menit) =="
cd "$APP/frontend"
yarn install --frozen-lockfile 2>/dev/null || yarn install
yarn build

echo "== 6/7 Restart service =="
chown -R www-data:www-data "$APP/backend" "$APP/uploads"
systemctl restart sekolah-backend
nginx -t && systemctl reload nginx
sleep 5

echo "== 7/7 Verifikasi =="
systemctl is-active sekolah-backend
echo -n "API /api/settings      : "; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/settings
echo -n "service-worker.js      : "; curl -s -o /dev/null -w "%{http_code}\n" -H "Host: localhost" http://127.0.0.1/service-worker.js || true
echo "SELESAI. Buka situs, lalu tekan Ctrl+Shift+R (hard refresh) sekali agar service worker versi baru aktif."
