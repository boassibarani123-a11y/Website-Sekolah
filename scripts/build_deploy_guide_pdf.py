#!/usr/bin/env python3
"""Membangun PDF 'Panduan Deploy dari Nol untuk Gemini' (Bahasa Indonesia).

Jalankan: python scripts/build_deploy_guide_pdf.py
Output  : /app/PANDUAN_DEPLOY_DARI_NOL_GEMINI.pdf
"""
from fpdf import FPDF

FONT_DIR = "/usr/share/fonts/truetype/liberation"
REPO = "https://github.com/boassibarani123-a11y/Website-Sekolah.git"
BRANCH = "main24"

NAVY = (15, 32, 68)
SKY = (14, 110, 190)
GREY = (90, 100, 115)
LIGHT = (238, 243, 249)
CODEBG = (24, 30, 42)
RED = (176, 42, 55)


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Lib", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 8, "Panduan Deploy dari Nol — Website-Sekolah (SMA NEGERI 1 LAGUBOTI)", align="L")
        self.cell(0, 8, f"Hal. {self.page_no()}", align="R")
        self.ln(10)

    def footer(self):
        self.set_y(-12)
        self.set_font("Lib", "", 7)
        self.set_text_color(*GREY)
        self.cell(0, 8, "Dokumen dibuat untuk dipandukan ke Gemini — ikuti langkah berurutan, satu per satu.", align="C")


def new_pdf():
    pdf = PDF(format="A4")
    pdf.add_font("Lib", "", f"{FONT_DIR}/LiberationSans-Regular.ttf")
    pdf.add_font("Lib", "B", f"{FONT_DIR}/LiberationSans-Bold.ttf")
    pdf.add_font("Lib", "I", f"{FONT_DIR}/LiberationSans-Italic.ttf")
    pdf.add_font("Mono", "", f"{FONT_DIR}/LiberationMono-Regular.ttf")
    pdf.set_auto_page_break(True, margin=16)
    pdf.set_margins(16, 16, 16)
    return pdf


def h1(pdf, text):
    if pdf.get_y() > 240:
        pdf.add_page()
    pdf.ln(2)
    pdf.set_font("Lib", "B", 15)
    pdf.set_text_color(*NAVY)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 8, text)
    pdf.set_draw_color(*SKY)
    pdf.set_line_width(0.8)
    y = pdf.get_y() + 1
    pdf.line(16, y, 70, y)
    pdf.ln(4)


def h2(pdf, text):
    if pdf.get_y() > 250:
        pdf.add_page()
    pdf.ln(1)
    pdf.set_font("Lib", "B", 11.5)
    pdf.set_text_color(*SKY)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 6.5, text)
    pdf.ln(1)


def para(pdf, text, color=None):
    pdf.set_font("Lib", "", 10)
    pdf.set_text_color(*(color or (40, 45, 55)))
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 5.6, text)
    pdf.ln(1.2)


def bullet(pdf, text):
    pdf.set_font("Lib", "", 10)
    pdf.set_x(pdf.l_margin)
    x = pdf.get_x()
    pdf.set_text_color(*SKY)
    pdf.cell(5, 5.6, "\u2022")
    pdf.set_text_color(40, 45, 55)
    pdf.set_x(x + 5)
    pdf.multi_cell(pdf.epw - 5, 5.6, text)
    pdf.ln(0.6)


def note(pdf, text, color=RED, title="PENTING"):
    pdf.ln(1)
    pdf.set_fill_color(252, 240, 242)
    pdf.set_font("Lib", "B", 9.5)
    pdf.set_text_color(*color)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 5.4, f"  {title}", fill=True)
    pdf.set_font("Lib", "", 9.5)
    pdf.set_text_color(70, 40, 45)
    pdf.set_fill_color(252, 240, 242)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(pdf.epw, 5.2, f"  {text}  ", fill=True)
    pdf.ln(2)


def code(pdf, lines):
    pdf.ln(1)
    pdf.set_font("Mono", "", 8.6)
    line_h = 4.8
    pad = 2.4
    height = line_h * len(lines) + pad * 2
    if pdf.get_y() + height > 275:
        pdf.add_page()
    x, y = pdf.get_x(), pdf.get_y()
    pdf.set_fill_color(*CODEBG)
    pdf.rect(x, y, 178, height, style="F")
    pdf.set_xy(x + 3, y + pad)
    pdf.set_text_color(226, 232, 240)
    for ln in lines:
        pdf.set_x(x + 3)
        pdf.cell(0, line_h, ln)
        pdf.ln(line_h)
    pdf.set_y(y + height)
    pdf.ln(2.5)


def build():
    pdf = new_pdf()
    pdf.add_page()

    # ---- Cover ----
    pdf.ln(14)
    pdf.set_fill_color(*NAVY)
    rect_top = pdf.get_y()
    pdf.rect(0, rect_top, 210, 66, style="F")
    pdf.set_xy(16, rect_top + 12)
    pdf.set_font("Lib", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.multi_cell(178, 11, "Panduan Deploy dari Nol")
    pdf.set_x(16)
    pdf.set_font("Lib", "", 13)
    pdf.set_text_color(180, 210, 240)
    pdf.multi_cell(178, 8, "Website-Sekolah — SMA NEGERI 1 LAGUBOTI")
    pdf.set_x(16)
    pdf.set_font("Lib", "", 10)
    pdf.set_text_color(150, 180, 220)
    pdf.multi_cell(178, 6, "Stack: FastAPI (Python) + React + MongoDB + Nginx  |  Target: VPS Ubuntu 22.04")
    pdf.set_y(rect_top + 66 + 10)

    pdf.set_font("Lib", "", 10.5)
    pdf.set_text_color(40, 45, 55)
    pdf.multi_cell(0, 5.8,
        "Dokumen ini ditujukan untuk dibaca oleh asisten AI (Gemini) agar dapat memandu Anda "
        "melakukan deploy aplikasi dari benar-benar nol pada sebuah VPS kosong. Dokumen berisi dua "
        "bagian besar: (A) MENGOSONGKAN server lama sampai bersih seperti server baru, lalu "
        "(B) MEMBANGUN ulang seluruh aplikasi dari awal (backend, frontend, database, Nginx, SSL).")
    pdf.ln(2)

    para(pdf, "Repositori sumber:")
    code(pdf, [f"Repo   : {REPO}", f"Branch : {BRANCH}"])

    note(pdf,
         "Instruksi pada Bagian A bersifat MERUSAK dan TIDAK DAPAT DIBATALKAN. Semua folder, "
         "konfigurasi Nginx, layanan, dan DATABASE akan dihapus permanen. Pastikan Anda sudah "
         "mem-backup data penting sebelum menjalankannya.", title="PERINGATAN KERAS")

    # ---- Prompt untuk Gemini ----
    h1(pdf, "0. Prompt Pembuka untuk Gemini")
    para(pdf, "Salin-tempel teks di bawah ini sebagai pesan pertama Anda ke Gemini, lalu lampirkan / "
              "tempel isi panduan ini. Gemini akan memandu Anda langkah demi langkah.")
    code(pdf, [
        "Kamu adalah asisten DevOps. Pandu aku langkah demi langkah untuk",
        "deploy aplikasi 'Website-Sekolah' dari NOL di VPS Ubuntu kosong.",
        "",
        f"Repo   : {REPO}",
        f"Branch : {BRANCH}",
        "",
        "Aturan:",
        "1. Mulai dengan MENGOSONGKAN server lama sampai bersih (Bagian A).",
        "2. Lanjut membangun ulang semuanya dari awal (Bagian B).",
        "3. Beri aku SATU blok perintah pada satu waktu, tunggu aku",
        "   menempelkan hasilnya, baru lanjut ke langkah berikutnya.",
        "4. Jelaskan risiko tiap perintah yang merusak sebelum aku jalankan.",
        "5. Bahasa Indonesia, ringkas, dan praktis.",
    ])

    # ---- Prasyarat ----
    h1(pdf, "1. Prasyarat")
    bullet(pdf, "VPS Ubuntu 22.04 LTS (minimal 2 vCPU, RAM 2-4 GB, disk 20 GB+).")
    bullet(pdf, "Akses root / sudo via SSH ke VPS.")
    bullet(pdf, "Nama domain (opsional tapi disarankan) yang sudah diarahkan (A record) ke IP VPS untuk SSL.")
    bullet(pdf, "Git, serta kemampuan copy-paste perintah di terminal.")

    # ============ BAGIAN A ============
    h1(pdf, "BAGIAN A — Mengosongkan Server Sampai Bersih")
    para(pdf, "Tujuan: mengembalikan VPS ke kondisi seperti baru dengan menghentikan & menghapus semua "
              "layanan, konfigurasi, dan data aplikasi lama. Jalankan sebagai root (atau dengan sudo).")

    h2(pdf, "A1. Hentikan semua layanan aplikasi")
    code(pdf, [
        "# Hentikan proses yang dikelola supervisor / pm2 / systemd",
        "sudo supervisorctl stop all 2>/dev/null || true",
        "pm2 delete all 2>/dev/null || true; pm2 kill 2>/dev/null || true",
        "sudo systemctl stop nginx 2>/dev/null || true",
        "sudo systemctl stop mongod 2>/dev/null || true",
        "# Matikan proses uvicorn/node/yarn yang mungkin masih jalan",
        "sudo pkill -f uvicorn 2>/dev/null || true",
        "sudo pkill -f 'node' 2>/dev/null || true",
    ])

    h2(pdf, "A2. Hapus konfigurasi Nginx lama")
    code(pdf, [
        "sudo rm -f /etc/nginx/sites-enabled/*",
        "sudo rm -f /etc/nginx/sites-available/website-sekolah*",
        "sudo rm -f /etc/nginx/conf.d/website-sekolah*",
        "# (opsional) kembalikan konfigurasi default bawaan",
        "sudo apt-get install --reinstall -y nginx-common 2>/dev/null || true",
    ])

    h2(pdf, "A3. Hapus service systemd/supervisor buatan aplikasi")
    code(pdf, [
        "sudo rm -f /etc/systemd/system/website-sekolah*.service",
        "sudo rm -f /etc/supervisor/conf.d/website-sekolah*.conf",
        "sudo systemctl daemon-reload",
        "sudo supervisorctl reread 2>/dev/null || true",
        "sudo supervisorctl update 2>/dev/null || true",
    ])

    h2(pdf, "A4. Hapus folder kode aplikasi")
    code(pdf, [
        "# Sesuaikan path jika lokasi lama berbeda",
        "sudo rm -rf /var/www/website-sekolah",
        "sudo rm -rf /opt/website-sekolah",
        "sudo rm -rf /root/Website-Sekolah /home/*/Website-Sekolah",
        "sudo rm -rf /var/www/uploads   # berisi file unggahan lama",
    ])

    h2(pdf, "A5. Hapus DATABASE MongoDB (semua data hilang)")
    note(pdf, "Perintah ini menghapus SELURUH data sekolah: akun, absensi, nilai, materi, dll. "
              "Backup dulu bila perlu: mongodump --out /root/backup-$(date +%F).")
    code(pdf, [
        "# Opsi 1: hapus hanya database aplikasi",
        "mongosh --quiet --eval 'db.getSiblingDB(\"test_database\").dropDatabase()' \\",
        "  2>/dev/null || true",
        "",
        "# Opsi 2: reset total MongoDB (hapus SEMUA database & copot paket)",
        "sudo systemctl stop mongod 2>/dev/null || true",
        "sudo apt-get purge -y mongodb-org* 2>/dev/null || true",
        "sudo rm -rf /var/lib/mongodb /var/log/mongodb /etc/mongod.conf",
    ])

    h2(pdf, "A6. (Opsional) Bersihkan runtime lama & SSL")
    code(pdf, [
        "# Node & Python env lama",
        "sudo rm -rf /usr/local/lib/node_modules",
        "sudo rm -rf /root/.nvm /home/*/.nvm",
        "# Sertifikat SSL lama (bila ingin terbit ulang dari awal)",
        "sudo rm -rf /etc/letsencrypt/live/* /etc/letsencrypt/renewal/*",
        "# Bersihkan paket sisa",
        "sudo apt-get autoremove -y && sudo apt-get autoclean -y",
    ])

    h2(pdf, "A7. Verifikasi server sudah bersih")
    code(pdf, [
        "systemctl --type=service --state=running | grep -Ei 'nginx|mongo' || echo BERSIH",
        "ls /var/www /opt 2>/dev/null",
        "ps aux | grep -Ei 'uvicorn|node|mongod' | grep -v grep || echo 'tidak ada proses'",
    ])
    para(pdf, "Jika tidak ada layanan nginx/mongo yang berjalan dan folder aplikasi sudah hilang, "
              "server Anda kini bersih seperti baru. Lanjut ke Bagian B.")

    # ============ BAGIAN B ============
    h1(pdf, "BAGIAN B — Membangun Ulang dari Nol")

    h2(pdf, "B1. Update sistem & pasang dependensi dasar")
    code(pdf, [
        "sudo apt-get update && sudo apt-get upgrade -y",
        "sudo apt-get install -y git curl build-essential nginx \\",
        "  python3 python3-venv python3-pip",
        "# Node.js 20 + Yarn",
        "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
        "sudo apt-get install -y nodejs",
        "sudo npm install -g yarn",
    ])

    h2(pdf, "B2. Pasang MongoDB 7")
    code(pdf, [
        "curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \\",
        "  sudo gpg -o /usr/share/keyrings/mongodb-7.gpg --dearmor",
        "echo 'deb [signed-by=/usr/share/keyrings/mongodb-7.gpg] \\",
        "  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | \\",
        "  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list",
        "sudo apt-get update && sudo apt-get install -y mongodb-org",
        "sudo systemctl enable --now mongod",
        "mongosh --quiet --eval 'db.runCommand({ping:1})'   # harus { ok: 1 }",
    ])

    h2(pdf, "B3. Ambil kode dari repositori")
    code(pdf, [
        "sudo mkdir -p /var/www && cd /var/www",
        f"sudo git clone {REPO} website-sekolah",
        "cd website-sekolah",
        f"sudo git checkout {BRANCH}",
        "sudo chown -R $USER:$USER /var/www/website-sekolah",
    ])

    h2(pdf, "B4. Siapkan Backend (FastAPI)")
    code(pdf, [
        "cd /var/www/website-sekolah/backend",
        "python3 -m venv venv && source venv/bin/activate",
        "pip install --upgrade pip",
        "pip install -r requirements.txt",
        "# Jika emergentintegrations gagal, pasang via index khusus:",
        "pip install emergentintegrations \\",
        "  --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/",
    ])
    para(pdf, "Buat file backend/.env (gitignored, tidak ada di repo):")
    code(pdf, [
        "cat > /var/www/website-sekolah/backend/.env <<'EOF'",
        "MONGO_URL=\"mongodb://localhost:27017\"",
        "DB_NAME=\"website_sekolah\"",
        "JWT_SECRET=\"GANTI_dengan_string_acak_panjang_min_32_karakter\"",
        "CORS_ORIGINS=\"https://domain-anda.com\"",
        "UPLOAD_DIR=\"/var/www/uploads\"",
        "FRONTEND_URL=\"https://domain-anda.com\"",
        "WEBHOOK_CRON_SECRET=\"GANTI_dengan_secret_acak\"",
        "# Admin awal (diseed otomatis saat backend start)",
        "ADMIN_EMAIL=\"boassibarani123@gmail.com\"",
        "ADMIN_PASSWORD=\"GANTI_password_kuat\"",
        "# Opsional (kosongkan jika belum dipakai):",
        "EMERGENT_LLM_KEY=\"\"   # AI pembuat soal",
        "BREVO_API_KEY=\"\"      # email",
        "BREVO_SENDER_EMAIL=\"\"",
        "EOF",
        "mkdir -p /var/www/uploads",
    ])
    note(pdf, "JWT_SECRET WAJIB diisi — backend tidak akan start tanpa variabel ini. "
              "Buat nilai acak: openssl rand -hex 32", title="WAJIB")

    h2(pdf, "B5. Siapkan Frontend (React)")
    code(pdf, [
        "cd /var/www/website-sekolah/frontend",
        "# Arahkan frontend ke backend (via domain + Nginx)",
        "cat > .env <<'EOF'",
        "REACT_APP_BACKEND_URL=https://domain-anda.com",
        "EOF",
        "yarn install",
        "yarn build   # hasil build ada di folder build/",
    ])

    h2(pdf, "B6. Jalankan Backend sebagai service (systemd)")
    code(pdf, [
        "sudo tee /etc/systemd/system/website-sekolah-api.service >/dev/null <<'EOF'",
        "[Unit]",
        "Description=Website Sekolah API (FastAPI)",
        "After=network.target mongod.service",
        "",
        "[Service]",
        "WorkingDirectory=/var/www/website-sekolah/backend",
        "EnvironmentFile=/var/www/website-sekolah/backend/.env",
        "ExecStart=/var/www/website-sekolah/backend/venv/bin/uvicorn \\",
        "  server:app --host 0.0.0.0 --port 8001",
        "Restart=always",
        "User=www-data",
        "",
        "[Install]",
        "WantedBy=multi-user.target",
        "EOF",
        "sudo chown -R www-data:www-data /var/www/website-sekolah /var/www/uploads",
        "sudo systemctl daemon-reload",
        "sudo systemctl enable --now website-sekolah-api",
        "curl -s http://127.0.0.1:8001/api/health   # harus {\"status\":\"ok\"}",
    ])

    h2(pdf, "B7. Konfigurasi Nginx (reverse proxy + serve React)")
    code(pdf, [
        "sudo tee /etc/nginx/sites-available/website-sekolah >/dev/null <<'EOF'",
        "server {",
        "    listen 80;",
        "    server_name domain-anda.com;",
        "    client_max_body_size 25M;",
        "",
        "    root /var/www/website-sekolah/frontend/build;",
        "    index index.html;",
        "",
        "    # API -> backend FastAPI",
        "    location /api/ {",
        "        proxy_pass http://127.0.0.1:8001;",
        "        proxy_set_header Host $host;",
        "        proxy_set_header X-Real-IP $remote_addr;",
        "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
        "        proxy_set_header X-Forwarded-Proto $scheme;",
        "    }",
        "",
        "    # File unggahan",
        "    location /uploads/ { alias /var/www/uploads/; }",
        "",
        "    # React SPA (fallback ke index.html)",
        "    location / { try_files $uri $uri/ /index.html; }",
        "}",
        "EOF",
        "sudo ln -sf /etc/nginx/sites-available/website-sekolah \\",
        "  /etc/nginx/sites-enabled/website-sekolah",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo nginx -t && sudo systemctl restart nginx",
    ])

    h2(pdf, "B8. Pasang SSL HTTPS (Let's Encrypt)")
    code(pdf, [
        "sudo apt-get install -y certbot python3-certbot-nginx",
        "sudo certbot --nginx -d domain-anda.com --redirect \\",
        "  -m email-anda@contoh.com --agree-tos -n",
        "# Perpanjangan otomatis sudah diatur certbot (uji: sudo certbot renew --dry-run)",
    ])

    h2(pdf, "B9. Verifikasi akhir")
    bullet(pdf, "Buka https://domain-anda.com - halaman login sekolah harus muncul.")
    bullet(pdf, "curl https://domain-anda.com/api/health harus mengembalikan {\"status\":\"ok\"}.")
    bullet(pdf, "Login sebagai Super Admin memakai ADMIN_EMAIL / ADMIN_PASSWORD dari .env.")
    bullet(pdf, "Cek log bila ada masalah: sudo journalctl -u website-sekolah-api -n 100 --no-pager.")

    h1(pdf, "2. Penjadwalan Tugas Otomatis (Cron) — Opsional")
    para(pdf, "Aplikasi memiliki endpoint cron (mis. pengingat absensi, pengingat agenda/ujian H-1, "
              "arsip mingguan). Di VPS, panggil endpoint tersebut terjadwal memakai crontab sistem. "
              "Semua endpoint butuh header Authorization: Bearer <WEBHOOK_CRON_SECRET>.")
    code(pdf, [
        "# Edit crontab root: sudo crontab -e  (waktu server dalam UTC)",
        "# 08:00 WIB = 01:00 UTC -> pengingat absensi + agenda H-1",
        "0 1 * * * curl -s -X POST https://domain-anda.com/api/cron/attendance-reminder \\",
        "  -H 'Authorization: Bearer GANTI_WEBHOOK_CRON_SECRET' \\",
        "  -H 'X-Webhook-Id: '$(date +\\%s) -H 'Content-Type: application/json' -d '{}'",
    ])

    h1(pdf, "3. Ringkasan Alur")
    bullet(pdf, "A. Kosongkan server: hentikan layanan -> hapus Nginx -> hapus service -> hapus kode -> hapus DB -> verifikasi.")
    bullet(pdf, "B. Bangun ulang: pasang paket -> MongoDB -> clone repo -> backend (.env + venv) -> frontend (build) -> systemd -> Nginx -> SSL -> verifikasi.")
    bullet(pdf, "Selalu uji /api/health dan halaman login setelah selesai.")
    para(pdf, "Selesai. Berikan dokumen ini ke Gemini dan minta ia memandu Anda satu langkah pada satu waktu.",
         color=SKY)

    out = "/app/PANDUAN_DEPLOY_DARI_NOL_GEMINI.pdf"
    pdf.output(out)
    print("PDF dibuat:", out)


if __name__ == "__main__":
    build()
