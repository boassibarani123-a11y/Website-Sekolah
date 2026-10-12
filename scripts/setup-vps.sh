#!/usr/bin/env bash
# Setup otomatis SMAN 1 Laguboti di VPS Ubuntu 22.04 (branch main15)
# Pakai: sudo DOMAIN=sekolah.domainanda.com CERT_EMAIL=anda@mail.com ADMIN_EMAIL=... ADMIN_PASSWORD=... bash setup-vps.sh
set -euo pipefail

: "${DOMAIN:?Set DOMAIN, contoh: DOMAIN=sekolah.domainanda.com}"
: "${CERT_EMAIL:?Set CERT_EMAIL untuk Let's Encrypt}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL super admin}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD super admin (jangan pakai default repo)}"
BRANCH="${BRANCH:-main15}"
REPO="${REPO:-https://github.com/boassibarani123-a11y/Website-Sekolah.git}"
APP=/var/www/sekolah
SMTP_USER="${SMTP_USER:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM="${SMTP_FROM:-}"

echo "== Fase 1: dependency sistem =="
apt update && apt upgrade -y
apt install -y software-properties-common gnupg curl git nginx
add-apt-repository -y ppa:deadsnakes/ppa
apt update && apt install -y python3.11 python3.11-venv python3.11-dev
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn
timedatectl set-timezone Asia/Jakarta

echo "== Fase 2: MongoDB 7.0 =="
if ! command -v mongod >/dev/null; then
  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt update && apt install -y mongodb-org
fi
systemctl enable --now mongod
systemctl is-active mongod

echo "== Fase 3: ambil kode ($BRANCH) =="
mkdir -p /var/www
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch origin "$BRANCH" && git -C "$APP" checkout "$BRANCH" && git -C "$APP" pull origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$APP"
fi
mkdir -p "$APP/uploads"

echo "== Fase 4: backend =="
if [ ! -f "$APP/backend/.env" ]; then
cat > "$APP/backend/.env" <<ENV
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sekolah_db"
JWT_SECRET="$(openssl rand -hex 32)"
WEBHOOK_CRON_SECRET="$(openssl rand -hex 32)"
CORS_ORIGINS="https://$DOMAIN"
FRONTEND_URL="https://$DOMAIN"
ADMIN_EMAIL="$ADMIN_EMAIL"
ADMIN_PASSWORD="$ADMIN_PASSWORD"
UPLOAD_DIR="$APP/uploads"
EMAIL_FROM_NAME="SMA NEGERI 1 LAGUBOTI"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="$SMTP_USER"
SMTP_PASSWORD="$SMTP_PASSWORD"
SMTP_FROM="$SMTP_FROM"
ENV
fi
chmod 600 "$APP/backend/.env"
python3.11 -m venv "$APP/backend/venv"
"$APP/backend/venv/bin/pip" install --upgrade pip
"$APP/backend/venv/bin/pip" install -r "$APP/backend/requirements.txt"

echo "== Fase 5: frontend =="
cat > "$APP/frontend/.env" <<ENV
REACT_APP_BACKEND_URL=https://$DOMAIN
WDS_SOCKET_PORT=443
ENV
(cd "$APP/frontend" && yarn install && yarn build)

echo "== Fase 6: systemd + Nginx =="
cat > /etc/systemd/system/sekolah-backend.service <<UNIT
[Unit]
Description=Sekolah FastAPI Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=$APP/backend
ExecStart=$APP/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
chown -R www-data:www-data "$APP/uploads" "$APP/backend"
systemctl daemon-reload
systemctl enable --now sekolah-backend
systemctl restart sekolah-backend

cat > /etc/nginx/sites-available/sekolah <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 15m;
    root $APP/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }

    location /models/ {
        add_header Cache-Control "public, max-age=2592000, immutable";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
ln -sf /etc/nginx/sites-available/sekolah /etc/nginx/sites-enabled/sekolah
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
sleep 4
echo -n "Cek /api/settings: "; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/settings

echo "== Fase 7: HTTPS =="
apt install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" --redirect -m "$CERT_EMAIL" --agree-tos -n
systemctl reload nginx

echo "== Fase 8: cron =="
SECRET=$(grep WEBHOOK_CRON_SECRET "$APP/backend/.env" | cut -d'"' -f2)
cat > /usr/local/bin/sekolah-cron.sh <<SH
#!/usr/bin/env bash
SECRET="$SECRET"
BASE="http://127.0.0.1:8001/api/cron"
curl -s -X POST "\$BASE/\$1" \\
  -H "Authorization: Bearer \$SECRET" \\
  -H "X-Webhook-Id: \$1-\$(date +%Y%m%d%H%M)" \\
  -H "Content-Type: application/json" -d '{}' >> /var/log/sekolah-cron.log 2>&1
echo " [\$(date)] \$1" >> /var/log/sekolah-cron.log
SH
chmod 700 /usr/local/bin/sekolah-cron.sh
( crontab -l 2>/dev/null | grep -v sekolah-cron.sh; cat <<'CRON'
0 8 * * *   /usr/local/bin/sekolah-cron.sh attendance-reminder
0 9 * * *   /usr/local/bin/sekolah-cron.sh attendance-auto-alpha
0 1 * * 1   /usr/local/bin/sekolah-cron.sh attendance-archive
0 7 1 * *   /usr/local/bin/sekolah-cron.sh kas-reminder
*/5 * * * * /usr/local/bin/sekolah-cron.sh piket-reminder
CRON
) | crontab -
crontab -l

mongosh sekolah_db --quiet --eval 'db.settings.updateOne({_id:"singleton"},{$set:{school_logo_url:"/school-logo.png"}},{upsert:true})' || true

echo -n "Cek model wajah: "; curl -s -o /dev/null -w "%{http_code}\n" "https://$DOMAIN/models/face_recognition_model.bin"
echo "== SELESAI. Buka https://$DOMAIN dan login dengan $ADMIN_EMAIL =="
