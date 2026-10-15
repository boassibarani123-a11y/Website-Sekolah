#!/usr/bin/env bash
# Pasang server video Kelas Live (LiveKit open-source, self-hosted) di VPS yang sama dengan website.
# Pemakaian (sebagai root):  bash scripts/setup-livekit-vps.sh live.domainsekolah.sch.id
# Syarat: DNS A-record subdomain sudah mengarah ke IP VPS, Nginx + certbot sudah terpasang (setup-vps.sh).
set -euo pipefail
DOMAIN="${1:?Pakai: setup-livekit-vps.sh <subdomain-live>}"
BACKEND_ENV="${BACKEND_ENV:-/var/www/sekolah/backend/.env}"

curl -sSL https://get.livekit.io | bash   # memasang /usr/local/bin/livekit-server
mkdir -p /etc/livekit
KEY="API$(openssl rand -hex 6)"
SECRET="$(openssl rand -base64 36 | tr -d '/+=\n')"

cat > /etc/livekit/livekit.yaml <<EOF
port: 7880
bind_addresses: ["127.0.0.1"]
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
room:
  empty_timeout: 120
  max_participants: 80
turn:
  enabled: true
  domain: ${DOMAIN}
  tls_port: 5349
  udp_port: 3478
  cert_file: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem
  key_file: /etc/letsencrypt/live/${DOMAIN}/privkey.pem
keys:
  ${KEY}: ${SECRET}
logging:
  level: info
EOF
chmod 600 /etc/livekit/livekit.yaml

cat > /etc/systemd/system/livekit.service <<'EOF'
[Unit]
Description=LiveKit SFU (Kelas Live)
After=network.target
[Service]
ExecStart=/usr/local/bin/livekit-server --config /etc/livekit/livekit.yaml
Restart=always
LimitNOFILE=1048576
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/sites-available/livekit <<EOF
server {
  server_name ${DOMAIN};
  location / {
    proxy_pass http://127.0.0.1:7880;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_read_timeout 86400;
  }
}
EOF
ln -sf /etc/nginx/sites-available/livekit /etc/nginx/sites-enabled/livekit
nginx -t && systemctl reload nginx
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email || true

ufw allow 7881/tcp || true
ufw allow 3478/udp || true
ufw allow 5349/tcp || true
ufw allow 50000:60000/udp || true

systemctl daemon-reload && systemctl enable --now livekit

# Simpan kunci HANYA di .env backend (tidak pernah ke frontend)
sed -i '/^LIVEKIT_/d' "${BACKEND_ENV}"
{
  echo "LIVEKIT_URL=\"wss://${DOMAIN}\""
  echo "LIVEKIT_API_URL=\"http://127.0.0.1:7880\""
  echo "LIVEKIT_API_KEY=\"${KEY}\""
  echo "LIVEKIT_API_SECRET=\"${SECRET}\""
} >> "${BACKEND_ENV}"
# Kelas Live butuh 1 proses backend (notifikasi real-time & penjadwal ada di proses itu)
if [ -f /etc/systemd/system/sekolah-backend.service ]; then
  sed -i 's/--workers [0-9]*/--workers 1/' /etc/systemd/system/sekolah-backend.service
  systemctl daemon-reload
fi
systemctl restart sekolah-backend 2>/dev/null || true
sleep 2
curl -fsS http://127.0.0.1:7880 >/dev/null && echo "Cek server video: OK" || echo "PERINGATAN: server video belum merespons, cek: journalctl -u livekit -n 50"
echo "Selesai. Server video aktif di wss://${DOMAIN}"
