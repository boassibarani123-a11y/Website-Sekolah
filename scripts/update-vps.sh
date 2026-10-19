#!/usr/bin/env bash
# Update cepat SMAN 1 Laguboti di VPS (sudah pernah dipasang via setup-vps.sh)
# Pakai: sudo bash /var/www/sekolah/scripts/update-vps.sh   (opsional: BRANCH=main29)
set -euo pipefail
BRANCH="${BRANCH:-main29}"
REPO="${REPO:-https://github.com/boassibarani123-a11y/Website-Sekolah.git}"
APP="${APP:-/var/www/sekolah}"
ENVF="$APP/backend/.env"

echo "== 1/6 Backup database =="
mkdir -p /var/backups/sekolah
DBN=$(grep -E '^DB_NAME=' "$ENVF" | cut -d= -f2 | tr -d '"' || echo sekolah_db)
mongodump --quiet --db "$DBN" --out "/var/backups/sekolah/$(date +%F_%H%M)" || echo "(lewati backup: mongodump tidak tersedia)"

echo "== 2/6 Ambil kode $BRANCH =="
git config --global --add safe.directory "$APP" || true
git -C "$APP" remote set-url origin "$REPO"
git -C "$APP" fetch origin "$BRANCH"
git -C "$APP" checkout -B "$BRANCH" "origin/$BRANCH"
git -C "$APP" reset --hard "origin/$BRANCH"

echo "== 3/6 Lengkapi .env (key baru, nilai lama tidak diubah) =="
add_env() { grep -qE "^$1=" "$ENVF" || echo "$1=\"$2\"" >> "$ENVF"; }
[ -n "$(tail -c1 "$ENVF")" ] && echo >> "$ENVF"
add_env BREVO_API_KEY ""
add_env BREVO_SENDER_EMAIL ""
add_env EMERGENT_LLM_KEY ""
add_env AI_MODEL "claude-sonnet-4-5-20250929"
chmod 600 "$ENVF"

echo "== 4/6 Backend =="
"$APP/backend/venv/bin/pip" install -q --upgrade pip
"$APP/backend/venv/bin/pip" install -q -r "$APP/backend/requirements.txt" \
  --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
chown -R www-data:www-data "$APP/backend" "$APP/uploads"
systemctl restart sekolah-backend

echo "== 5/6 Frontend =="
(cd "$APP/frontend" && yarn install --frozen-lockfile --silent || yarn install --silent) 
(cd "$APP/frontend" && yarn build)
systemctl reload nginx

echo "== 6/6 Cek kesehatan =="
sleep 4
curl -fsS http://127.0.0.1:8001/api/health && echo "  <- backend OK"
systemctl is-active sekolah-backend nginx mongod
echo "Selesai. Commit aktif: $(git -C "$APP" log -1 --oneline)"
