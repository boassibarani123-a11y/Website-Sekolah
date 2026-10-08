from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_DIR = "/opt/plugins-venv/lib/python3.11/site-packages/reportlab/fonts"
NAVY = (2, 32, 71)
BLUE = (2, 132, 199)
LIGHT = (235, 244, 252)
GREY = (90, 100, 110)
DARK = (30, 35, 40)
GREEN = (22, 120, 60)
AMBER = (170, 90, 10)
CODEBG = (244, 246, 248)


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Vera", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 6, "Website Sekolah - SMA Negeri 1 Laguboti | Panduan Teknis & Deploy",
                  align="L")
        self.cell(0, 6, f"Hal. {self.page_no()}", align="R",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*BLUE)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Vera", "", 7)
        self.set_text_color(*GREY)
        self.cell(0, 6, "Dibuat oleh SMANSALA - Dokumen setup & deployment", align="C")


pdf = PDF(format="A4")
pdf.add_font("Vera", "", f"{FONT_DIR}/Vera.ttf")
pdf.add_font("Vera", "B", f"{FONT_DIR}/VeraBd.ttf")
pdf.add_font("Vera", "I", f"{FONT_DIR}/VeraIt.ttf")
pdf.set_auto_page_break(True, margin=18)
pdf.set_margins(18, 18, 18)
EPW = pdf.w - pdf.l_margin - pdf.r_margin


def h1(txt):
    pdf.ln(2)
    pdf.set_fill_color(*NAVY)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Vera", "B", 13)
    pdf.cell(0, 9, "  " + txt, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


def h2(txt):
    pdf.ln(1)
    pdf.set_text_color(*BLUE)
    pdf.set_font("Vera", "B", 11)
    pdf.cell(0, 7, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_draw_color(*BLUE)
    pdf.set_line_width(0.2)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 40, pdf.get_y())
    pdf.ln(2)


def para(txt, size=9.5, color=DARK):
    pdf.set_text_color(*color)
    pdf.set_font("Vera", "", size)
    pdf.multi_cell(0, 5, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(1)


def bullet(txt, size=9.5):
    pdf.set_text_color(*DARK)
    pdf.set_font("Vera", "", size)
    x = pdf.get_x()
    pdf.set_text_color(*BLUE)
    pdf.cell(5, 5, chr(8226))
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 5, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def code(lines):
    pdf.set_fill_color(*CODEBG)
    pdf.set_font("Vera", "", 8.3)
    pdf.set_text_color(*NAVY)
    pdf.ln(1)
    for ln in lines:
        pdf.cell(0, 5, "  " + ln, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


def table(headers, rows, widths):
    pdf.set_font("Vera", "B", 8.6)
    pdf.set_fill_color(*BLUE)
    pdf.set_text_color(255, 255, 255)
    for i, hd in enumerate(headers):
        pdf.cell(widths[i], 7, " " + hd, border=0, fill=True, align="L")
    pdf.ln(7)
    pdf.set_font("Vera", "", 8.4)
    fill = False
    for row in rows:
        # compute height
        line_counts = []
        for i, cell in enumerate(row):
            pdf.set_font("Vera", "", 8.4)
            n = len(pdf.multi_cell(widths[i] - 2, 4.6, cell, dry_run=True, output="LINES"))
            line_counts.append(n)
        rh = max(line_counts) * 4.6 + 2
        if pdf.get_y() + rh > pdf.h - 18:
            pdf.add_page()
        x0 = pdf.get_x()
        y0 = pdf.get_y()
        pdf.set_fill_color(*(LIGHT if fill else (255, 255, 255)))
        pdf.set_text_color(*DARK)
        for i, cell in enumerate(row):
            x = pdf.get_x()
            y = pdf.get_y()
            pdf.rect(x, y, widths[i], rh, style="F" if True else "")
            pdf.set_xy(x + 1, y + 1)
            pdf.multi_cell(widths[i] - 2, 4.6, cell, align="L")
            pdf.set_xy(x + widths[i], y)
        pdf.set_draw_color(220, 225, 230)
        pdf.set_line_width(0.1)
        pdf.line(x0, y0 + rh, x0 + sum(widths), y0 + rh)
        pdf.set_xy(x0, y0 + rh)
        fill = not fill
    pdf.ln(3)


# ---------------- COVER ----------------
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, pdf.w, pdf.h, style="F")
pdf.set_fill_color(*BLUE)
pdf.rect(0, 95, pdf.w, 2, style="F")
pdf.set_xy(18, 55)
pdf.set_text_color(255, 255, 255)
pdf.set_font("Vera", "B", 26)
pdf.multi_cell(EPW, 12, "Website Sekolah", align="L")
pdf.set_x(18)
pdf.set_font("Vera", "B", 16)
pdf.set_text_color(120, 200, 245)
pdf.multi_cell(EPW, 9, "SMA Negeri 1 Laguboti", align="L")
pdf.ln(6)
pdf.set_x(18)
pdf.set_font("Vera", "", 13)
pdf.set_text_color(230, 235, 240)
pdf.multi_cell(EPW, 8, "Panduan Teknis & Deployment ke VPS", align="L")
pdf.ln(20)
pdf.set_x(18)
pdf.set_font("Vera", "", 10.5)
pdf.set_text_color(200, 210, 220)
pdf.multi_cell(EPW, 6.5,
    "Isi dokumen:\n"
    "  1.  Flow Backend & Frontend\n"
    "  2.  Daftar Environment Variable\n"
    "  3.  Kebutuhan Database & Third-Party\n"
    "  4.  Cara AI Bisa Berjalan\n"
    "  5.  Panduan Deploy ke VPS (langkah demi langkah)", align="L")
pdf.set_xy(18, pdf.h - 30)
pdf.set_font("Vera", "", 9)
pdf.set_text_color(150, 165, 180)
pdf.cell(0, 6, "Stack: React + Tailwind/shadcn  |  FastAPI (Python)  |  MongoDB  |  Auth JWT")

# ---------------- 1. FLOW ----------------
pdf.add_page()
h1("1.  Flow Backend & Frontend")
para("Aplikasi ini adalah full-stack: React (frontend) berkomunikasi dengan FastAPI (backend) "
     "melalui HTTP REST, dan backend menyimpan semua data di MongoDB. Autentikasi memakai JWT.")

h2("Arsitektur singkat")
code([
    "[ Browser / React ]  --(HTTPS, header Bearer JWT)-->  [ FastAPI /api/* ]",
    "        ^                                                     |",
    "        |  JSON response                                      v",
    "        +------------------------------------------  [ MongoDB (motor) ]",
])

h2("Alur Request (umum)")
bullet("Frontend memanggil backend memakai REACT_APP_BACKEND_URL + prefix /api. "
       "Semua panggilan lewat axios (src/lib/api) yang otomatis menyisipkan token JWT di header Authorization.")
bullet("Backend: SEMUA route diberi prefix /api (wajib untuk routing/ingress). "
       "Setiap endpoint terproteksi diverifikasi JWT (HS256) lalu dicek role (require_roles).")
bullet("Data dibaca/ditulis ke MongoDB secara async memakai driver Motor.")

h2("Alur Login (JWT)")
bullet("User submit email + password ke POST /api/auth/login.")
bullet("Backend verifikasi password (bcrypt) terhadap data di collection users.")
bullet("Jika valid, backend menerbitkan token JWT (berlaku 7 hari) dan mengembalikannya ke frontend.")
bullet("Frontend menyimpan token, lalu mengirimnya di tiap request berikutnya.")
bullet("Akses fitur dibatasi 9 role: super_admin, kepsek, staff_tu, guru, siswa, "
       "ketua_osis, ketua_kelas, orang_tua, admin_perpus.")

h2("Seeding Super Admin (otomatis)")
para("Saat backend start (event startup), fungsi _seed() otomatis membuat akun super admin "
     "dari ADMIN_EMAIL / ADMIN_PASSWORD bila belum ada. Sifatnya idempoten (aman diulang tiap restart).")

h2("Modul fitur utama")
para("Absensi QR/Barcode, Schoolgram (galeri), Inventaris & Peminjaman, Tugas & Mini-Quiz, "
     "Ujian anti-cheat, Uang Kas kelas, Dana Sosial, Pemilu OSIS (e-voting), PPDB online, "
     "Rapor Digital, Kartu Pelajar (cetak KTP + QR), Perpustakaan Pintar (AI), Pengumuman, "
     "Kalender, Chat Wali-Ortu, Notifikasi, Laporan Excel/PDF/PPTX.")

# ---------------- 2. ENV ----------------
pdf.add_page()
h1("2.  Environment Variables")
h2("Backend  (backend/.env)")
table(
    ["Variable", "Wajib", "Fungsi"],
    [
        ["MONGO_URL", "Ya", "String koneksi MongoDB. Contoh: mongodb://localhost:27017"],
        ["DB_NAME", "Ya", "Nama database. Dipakai: website_sekolah"],
        ["JWT_SECRET", "Ya", "Kunci rahasia untuk menandatangani token login (min. 32 karakter acak)"],
        ["EMERGENT_LLM_KEY", "Untuk AI", "Kunci mesin AI (ringkasan & rekomendasi perpustakaan). Kosong = AI mati"],
        ["EMERGENT_EMAIL_KEY", "Untuk Email", "Kunci layanan email (pengumuman, reset password, reminder). Kosong = email mati"],
        ["WEBHOOK_CRON_SECRET", "Untuk Cron", "Token proteksi endpoint cron (reminder absensi & uang kas)"],
        ["FRONTEND_URL", "Opsional", "URL frontend; dipakai untuk CORS & link di dalam email"],
        ["ADMIN_EMAIL", "Opsional", "Email super admin yang di-seed (default: boassibarani123@gmail.com)"],
        ["ADMIN_PASSWORD", "Opsional", "Password super admin yang di-seed (default: Boas12345io)"],
        ["EMAIL_FROM_NAME", "Opsional", "Nama pengirim pada email keluar"],
    ],
    [38, 22, EPW - 60],
)
para("Catatan: MONGO_URL, DB_NAME, dan JWT_SECRET bersifat WAJIB - backend tidak akan start bila kosong.",
     size=8.8, color=AMBER)

h2("Frontend  (frontend/.env)")
table(
    ["Variable", "Wajib", "Fungsi"],
    [
        ["REACT_APP_BACKEND_URL", "Ya", "URL dasar backend yang dipanggil frontend (tanpa akhiran /api). "
                                        "Saat produksi isi dengan domain publik backend, mis. https://api.domainanda.com"],
        ["WDS_SOCKET_PORT", "Dev", "Port websocket dev-server (hanya relevan saat development)"],
    ],
    [50, 18, EPW - 68],
)
para("Penting: variabel frontend harus diawali REACT_APP_ dan di-build ulang (yarn build) setiap kali diubah, "
     "karena nilainya ditanam saat build.", size=8.8, color=AMBER)

h2("Contoh isi backend/.env untuk produksi")
code([
    'MONGO_URL="mongodb://localhost:27017"',
    'DB_NAME="website_sekolah"',
    'JWT_SECRET="<hasil: openssl rand -hex 32>"',
    'WEBHOOK_CRON_SECRET="<hasil: openssl rand -hex 16>"',
    'EMERGENT_LLM_KEY="sk-emergent-xxxxxxxx"',
    'EMERGENT_EMAIL_KEY=""',
    'FRONTEND_URL="https://sekolah.domainanda.com"',
    'ADMIN_EMAIL="admin@sekolah.sch.id"',
    'ADMIN_PASSWORD="<password-kuat>"',
])

# ---------------- 3. DB & THIRD PARTY ----------------
pdf.add_page()
h1("3.  Kebutuhan Database & Third-Party")
h2("Database: MongoDB")
bullet("Hanya butuh 1 instance MongoDB (versi 6/7 disarankan). Satu database: website_sekolah.")
bullet("Collection dibuat OTOMATIS saat data pertama masuk - tidak perlu migrasi/skema manual.")
bullet("Total +/- 45 collection. Yang utama antara lain:")
para("users, settings, classes, subjects, attendance, attendance_archives, exams, exam_sessions, "
     "quizzes, quiz_attempts, assignments, submissions, books, loans, book_reviews, borrow_requests, "
     "inventory, uang_kas, social_fund, ppdb, candidates, votes, announcements, events, chat_messages, "
     "notifications, gallery, posts, org_nodes, files, password_reset_tokens.",
     size=8.8, color=GREY)
para("Backup produksi disarankan: mongodump terjadwal (lihat bagian deploy).", size=8.8, color=AMBER)

h2("Layanan Third-Party")
table(
    ["Layanan", "Dipakai untuk", "Perlu disiapkan"],
    [
        ["SMANSALA LLM (OpenAI gpt-5.4)", "Ringkasan AI buku & rekomendasi perpustakaan",
         "EMERGENT_LLM_KEY. Tanpa ini fitur AI mati (sisanya tetap jalan)"],
        ["SMANSALA Email", "Email pengumuman, reset password, reminder absensi, kirim rapor",
         "EMERGENT_EMAIL_KEY. Kosong = fitur email mati (opsional)"],
        ["SMANSALA Object Storage", "Upload file/gambar (galeri, berkas PPDB, logo)",
         "Inisialisasi otomatis memakai EMERGENT_LLM_KEY"],
        ["MongoDB", "Database utama seluruh data aplikasi", "Instance MongoDB aktif (lokal/Docker/Atlas)"],
    ],
    [42, 55, EPW - 97],
)
para("Ringkas: yang WAJIB untuk aplikasi inti hanyalah MongoDB. SMANSALA LLM diperlukan hanya jika "
     "ingin fitur AI aktif. Email bersifat opsional.", size=9)

# ---------------- 4. AI ----------------
pdf.add_page()
h1("4.  Cara AI Bisa Berjalan")
para("AI dipakai di modul Perpustakaan Pintar, memakai model OpenAI gpt-5.4 melalui library "
     "emergentintegrations dan kunci EMERGENT_LLM_KEY.")

h2("Dua fitur AI")
table(
    ["Fitur", "Endpoint", "Lokasi di UI"],
    [
        ["Ringkasan AI Buku", "POST /api/books/{id}/ai-summary",
         "Perpustakaan > klik buku > modal detail > tombol 'Ringkasan AI'. Hasil di-cache di buku."],
        ["Rekomendasi AI", "GET /api/library/ai-recommendations",
         "Halaman Perpustakaan (muncul otomatis, berdasar riwayat pinjam + katalog)"],
    ],
    [34, 54, EPW - 88],
)

h2("Syarat agar AI jalan")
bullet("EMERGENT_LLM_KEY terisi di backend/.env. Jika kosong, backend membalas: "
       "400 'Fitur AI belum aktif: EMERGENT_LLM_KEY belum diset'.")
bullet("Library emergentintegrations terpasang (sudah ada di requirements.txt).")
bullet("Ada minimal 1 buku di katalog (ditambahkan role pustakawan/admin via menu Library Admin).")

h2("Cara pakai (langkah)")
bullet("Login (mis. super admin).")
bullet("Buka menu Perpustakaan. Bagian Rekomendasi AI memuat otomatis.")
bullet("Klik salah satu buku untuk membuka detail, lalu klik tombol 'Ringkasan AI'.")
bullet("Klik berikutnya instan karena ringkasan sudah tersimpan (cached) di field ai_summary.")

h2("Mengisi saldo / mengganti kunci AI")
para("EMERGENT_LLM_KEY adalah Universal Key SMANSALA yang mendukung OpenAI/Anthropic/Gemini. "
     "Bila saldo menipis: Profile > Manage plan > Universal Key > Add Balance (atau aktifkan auto top-up). "
     "Saat deploy di VPS, cukup set nilai kunci yang sama pada environment variable EMERGENT_LLM_KEY.")

# ---------------- 5. DEPLOY VPS ----------------
pdf.add_page()
h1("5.  Panduan Deploy ke VPS")
para("Contoh deploy di Ubuntu 22.04. Arsitektur: Nginx (reverse proxy + serve React build) di depan, "
     "Uvicorn/Gunicorn menjalankan FastAPI, MongoDB sebagai database. Backend di port 8001 (internal).")

h2("Langkah 1 - Prasyarat server")
code([
    "sudo apt update && sudo apt install -y python3.11 python3.11-venv \\",
    "     git nginx curl",
    "# Node 20 + Yarn",
    "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
    "sudo apt install -y nodejs && sudo npm i -g yarn",
])

h2("Langkah 2 - Install MongoDB")
code([
    "# Opsi A: Docker",
    "docker run -d --name sekolah-mongo --restart always \\",
    "   -p 27017:27017 -v mongo_data:/data/db mongo:7",
    "# Opsi B: paket resmi MongoDB (lihat dokumentasi mongodb.com)",
])

h2("Langkah 3 - Ambil kode & siapkan backend")
code([
    "git clone -b main7 <URL-REPO> /opt/sekolah && cd /opt/sekolah",
    "python3.11 -m venv venv && source venv/bin/activate",
    "pip install -r backend/requirements.txt",
    "# buat backend/.env (lihat Bagian 2). Generate secret:",
    "openssl rand -hex 32   # untuk JWT_SECRET",
])

h2("Langkah 4 - Jalankan backend sebagai service (systemd)")
para("Buat file /etc/systemd/system/sekolah-api.service :", size=8.8)
code([
    "[Unit]",
    "Description=Sekolah FastAPI",
    "After=network.target",
    "[Service]",
    "WorkingDirectory=/opt/sekolah/backend",
    "EnvironmentFile=/opt/sekolah/backend/.env",
    "ExecStart=/opt/sekolah/venv/bin/uvicorn server:app \\",
    "    --host 0.0.0.0 --port 8001 --workers 2",
    "Restart=always",
    "[Install]",
    "WantedBy=multi-user.target",
])
code([
    "sudo systemctl daemon-reload",
    "sudo systemctl enable --now sekolah-api",
    "curl http://localhost:8001/api/settings   # harus 200",
])

h2("Langkah 5 - Build frontend")
code([
    "cd /opt/sekolah/frontend",
    "# set frontend/.env:",
    'echo "REACT_APP_BACKEND_URL=https://sekolah.domainanda.com" > .env',
    "yarn install && yarn build   # hasil di folder build/",
])

h2("Langkah 6 - Nginx (serve build + proxy /api)")
code([
    "server {",
    "  listen 80;",
    "  server_name sekolah.domainanda.com;",
    "  root /opt/sekolah/frontend/build;",
    "  index index.html;",
    "  location /api/ {",
    "    proxy_pass http://127.0.0.1:8001;",
    "    proxy_set_header Host $host;",
    "    proxy_set_header X-Real-IP $remote_addr;",
    "  }",
    "  location / { try_files $uri /index.html; }",
    "}",
])
code([
    "sudo ln -s /etc/nginx/sites-available/sekolah \\",
    "   /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx",
])

h2("Langkah 7 - HTTPS (SSL gratis)")
code([
    "sudo apt install -y certbot python3-certbot-nginx",
    "sudo certbot --nginx -d sekolah.domainanda.com",
])

h2("Langkah 8 - Cron (reminder absensi & uang kas) - opsional")
para("Backend punya endpoint cron yang diproteksi WEBHOOK_CRON_SECRET. Panggil terjadwal via crontab, mis:",
     size=8.8)
code([
    "# tiap hari 08:00 WIB (contoh)",
    '0 1 * * * curl -s -X POST https://sekolah.domainanda.com/api/cron/... \\',
    '   -H "X-Cron-Secret: $WEBHOOK_CRON_SECRET"',
])

h2("Checklist verifikasi setelah deploy")
bullet("GET https://domain/api/settings  ->  balas 200 (backend hidup).")
bullet("Halaman login tampil dan menampilkan nama sekolah (frontend tersambung ke backend).")
bullet("Login super admin berhasil.")
bullet("Tidak ada error CORS/404 di console browser (pastikan REACT_APP_BACKEND_URL benar).")
bullet("Fitur AI diuji: tambah 1 buku lalu klik 'Ringkasan AI'.")

h2("Backup rutin (disarankan)")
code([
    "# backup harian database",
    "0 2 * * * mongodump --db website_sekolah \\",
    "   --archive=/backup/sekolah-$(date +\\%F).gz --gzip",
])

pdf.ln(3)
para("Selesai. Dengan langkah di atas, aplikasi siap diakses publik melalui domain Anda, "
     "backend berjalan sebagai service yang auto-restart, dan database tersimpan permanen di VPS.",
     size=9.5, color=GREEN)

pdf.output("/app/frontend/public/Panduan_Deploy_Website_Sekolah.pdf")
print("PDF saved")
