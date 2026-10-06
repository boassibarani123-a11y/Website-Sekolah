from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT = "/opt/plugins-venv/lib/python3.11/site-packages/reportlab/fonts"
NAVY = (2, 32, 71)
BLUE = (2, 132, 199)
SKY = (56, 170, 230)
LIGHT = (235, 244, 252)
GREY = (90, 100, 110)
DARK = (28, 33, 40)
GREEN = (22, 120, 60)
GREENBG = (232, 245, 237)
ROSE = (190, 40, 70)
ROSEBG = (250, 235, 240)
AMBER = (170, 95, 10)
AMBERBG = (253, 246, 230)
CODEBG = (244, 246, 248)

ACTOR_COLOR = {
    "Siswa": (2, 120, 170), "Guru": (70, 70, 180), "Ketua Kelas": (120, 70, 190),
    "Bendahara": (10, 130, 120), "Staff TU": (170, 110, 10), "Super Admin": (200, 40, 80),
    "Petugas Presensi": (200, 90, 20), "Ketua OSIS": (150, 60, 160), "Sistem": (90, 100, 110),
}


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("V", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 6, "SMA Negeri 1 Laguboti  |  Dokumen Produk & Proses (TOR / PRD / BPMN)", align="L")
        self.cell(0, 6, f"Hal. {self.page_no()}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*BLUE); self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y() + 1, self.w - self.r_margin, self.get_y() + 1)
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("V", "", 7)
        self.set_text_color(*GREY)
        self.cell(0, 6, "Sistem Manajemen Sekolah Terpadu - SMA Negeri 1 Laguboti", align="C")


pdf = PDF(format="A4")
pdf.add_font("V", "", f"{FONT}/Vera.ttf")
pdf.add_font("V", "B", f"{FONT}/VeraBd.ttf")
pdf.add_font("V", "I", f"{FONT}/VeraIt.ttf")
pdf.set_auto_page_break(True, margin=16)
pdf.set_margins(16, 16, 16)
EPW = pdf.w - pdf.l_margin - pdf.r_margin


def check(space):
    if pdf.get_y() + space > pdf.h - 16:
        pdf.add_page()


def h1(txt):
    check(16)
    pdf.ln(2)
    pdf.set_fill_color(*NAVY); pdf.set_text_color(255, 255, 255); pdf.set_font("V", "B", 13)
    pdf.cell(0, 9, "  " + txt, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


def h2(txt):
    check(12)
    pdf.ln(1)
    pdf.set_text_color(*BLUE); pdf.set_font("V", "B", 11)
    pdf.cell(0, 7, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_draw_color(*BLUE); pdf.set_line_width(0.2)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 42, pdf.get_y())
    pdf.ln(2)


def h3(txt):
    check(9)
    pdf.set_text_color(*NAVY); pdf.set_font("V", "B", 9.8)
    pdf.cell(0, 6, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(0.5)


def para(txt, size=9.3, color=DARK):
    pdf.set_text_color(*color); pdf.set_font("V", "", size)
    pdf.multi_cell(0, 4.9, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(1)


def bullet(txt, size=9.3):
    pdf.set_font("V", "", size)
    n = len(pdf.multi_cell(EPW - 5, 4.8, txt, dry_run=True, output="LINES"))
    check(n * 4.8 + 1)
    y = pdf.get_y()
    pdf.set_text_color(*BLUE); pdf.set_font("V", "B", size)
    pdf.set_xy(pdf.l_margin, y); pdf.cell(5, 4.8, chr(8226))
    pdf.set_text_color(*DARK); pdf.set_font("V", "", size)
    pdf.set_xy(pdf.l_margin + 5, y)
    pdf.multi_cell(EPW - 5, 4.8, txt, new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def table(headers, rows, widths):
    check(14)
    pdf.set_font("V", "B", 8.4); pdf.set_fill_color(*BLUE); pdf.set_text_color(255, 255, 255)
    for i, hd in enumerate(headers):
        pdf.cell(widths[i], 7, " " + hd, fill=True, align="L")
    pdf.ln(7)
    fill = False
    for row in rows:
        lc = []
        for i, c in enumerate(row):
            pdf.set_font("V", "", 8.2)
            lc.append(len(pdf.multi_cell(widths[i] - 2, 4.3, c, dry_run=True, output="LINES")))
        rh = max(lc) * 4.3 + 2.5
        if pdf.get_y() + rh > pdf.h - 16:
            pdf.add_page()
            pdf.set_font("V", "B", 8.4); pdf.set_fill_color(*BLUE); pdf.set_text_color(255, 255, 255)
            for i, hd in enumerate(headers):
                pdf.cell(widths[i], 7, " " + hd, fill=True, align="L")
            pdf.ln(7)
        x0, y0 = pdf.get_x(), pdf.get_y()
        pdf.set_fill_color(*(LIGHT if fill else (255, 255, 255)))
        pdf.set_text_color(*DARK); pdf.set_font("V", "", 8.2)
        for i, c in enumerate(row):
            x, y = pdf.get_x(), pdf.get_y()
            pdf.rect(x, y, widths[i], rh, style="F")
            pdf.set_xy(x + 1, y + 1.2)
            pdf.multi_cell(widths[i] - 2, 4.3, c, align="L")
            pdf.set_xy(x + widths[i], y)
        pdf.set_draw_color(215, 222, 230); pdf.set_line_width(0.1)
        pdf.line(x0, y0 + rh, x0 + sum(widths), y0 + rh)
        pdf.set_xy(x0, y0 + rh)
        fill = not fill
    pdf.ln(3)


def code(lines):
    check(len(lines) * 5 + 4)
    pdf.set_fill_color(*CODEBG); pdf.set_font("V", "", 8.2); pdf.set_text_color(*NAVY)
    pdf.ln(1)
    for ln in lines:
        pdf.cell(0, 5, "  " + ln, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)


# ---------- BPMN rendering ----------
def arrow():
    pdf.set_draw_color(140, 150, 160); pdf.set_line_width(0.4)
    cx = pdf.l_margin + EPW / 2
    pdf.line(cx, pdf.get_y(), cx, pdf.get_y() + 3.2)
    pdf.ln(3.4)


def pill(label, bg, fg):
    pdf.set_font("V", "B", 8.6)
    w = pdf.get_string_width(label) + 10
    w = min(w, EPW)
    x = pdf.l_margin + (EPW - w) / 2
    check(9)
    y = pdf.get_y()
    pdf.set_fill_color(*bg); pdf.set_draw_color(*fg); pdf.set_line_width(0.3)
    pdf.rect(x, y, w, 6.5, style="FD", round_corners=True, corner_radius=3.2)
    pdf.set_xy(x, y + 0.3); pdf.set_text_color(*fg if False else (255, 255, 255))
    pdf.cell(w, 6, label, align="C")
    pdf.set_xy(pdf.l_margin, y + 6.5)
    pdf.ln(0.5)


def box_activity(step):
    actor = step.get("actor")
    label = step["label"]
    note = step.get("note")
    prefix = f"[{actor}]  " if actor else ""
    pdf.set_font("V", "", 8.6)
    lines = pdf.multi_cell(EPW - 8, 4.6, prefix + label, dry_run=True, output="LINES")
    nh = 0
    if note:
        pdf.set_font("V", "", 7.6)
        nlines = pdf.multi_cell(EPW - 8, 4.0, note, dry_run=True, output="LINES")
        nh = len(nlines) * 4.0 + 1
    h = len(lines) * 4.6 + 3 + nh
    check(h + 1)
    x, y = pdf.l_margin, pdf.get_y()
    pdf.set_fill_color(*LIGHT); pdf.rect(x, y, EPW, h, style="F")
    ac = ACTOR_COLOR.get(actor, ACTOR_COLOR["Sistem"])
    pdf.set_fill_color(*ac); pdf.rect(x, y, 1.8, h, style="F")
    pdf.set_xy(x + 4, y + 1.6)
    # actor bold colored inline: emulate by drawing prefix then label
    pdf.set_font("V", "B", 8.6); pdf.set_text_color(*ac)
    if actor:
        pdf.set_x(x + 4)
        # print label as one block with actor prefix in same color-ish: keep simple
    pdf.set_text_color(*DARK); pdf.set_font("V", "", 8.6)
    pdf.set_xy(x + 4, y + 1.6)
    pdf.multi_cell(EPW - 8, 4.6, prefix + label)
    if note:
        pdf.set_text_color(*GREY); pdf.set_font("V", "", 7.6)
        pdf.set_x(x + 4)
        pdf.multi_cell(EPW - 8, 4.0, note)
    pdf.set_xy(pdf.l_margin, y + h)
    pdf.ln(0.4)


def box_decision(step):
    actor = step.get("actor")
    label = ("KEPUTUSAN" + (f" [{actor}]" if actor else "") + ": " + step["label"])
    pdf.set_font("V", "B", 8.6)
    llines = pdf.multi_cell(EPW - 8, 4.6, label, dry_run=True, output="LINES")
    yes = step.get("yes"); no = step.get("no")
    extra = 0
    if yes:
        pdf.set_font("V", "", 8)
        extra += len(pdf.multi_cell(EPW - 14, 4.2, "Ya -> " + yes, dry_run=True, output="LINES")) * 4.2 + 1
    if no:
        pdf.set_font("V", "", 8)
        extra += len(pdf.multi_cell(EPW - 14, 4.2, "Tidak -> " + no, dry_run=True, output="LINES")) * 4.2 + 1
    h = len(llines) * 4.6 + 3 + extra
    check(h + 1)
    x, y = pdf.l_margin, pdf.get_y()
    pdf.set_fill_color(*AMBERBG); pdf.set_draw_color(*AMBER); pdf.set_line_width(0.3)
    pdf.rect(x, y, EPW, h, style="FD")
    pdf.set_xy(x + 4, y + 1.6); pdf.set_text_color(*AMBER); pdf.set_font("V", "B", 8.6)
    pdf.multi_cell(EPW - 8, 4.6, label)
    if yes:
        pdf.set_x(x + 8); pdf.set_text_color(*GREEN); pdf.set_font("V", "", 8)
        pdf.multi_cell(EPW - 14, 4.2, "Ya -> " + yes)
    if no:
        pdf.set_x(x + 8); pdf.set_text_color(*ROSE); pdf.set_font("V", "", 8)
        pdf.multi_cell(EPW - 14, 4.2, "Tidak -> " + no)
    pdf.set_xy(pdf.l_margin, y + h)
    pdf.ln(0.4)


def flow(title, desc, steps):
    check(20)
    pdf.ln(1)
    pdf.set_text_color(*NAVY); pdf.set_font("V", "B", 10)
    pdf.multi_cell(0, 5.5, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(*GREY); pdf.set_font("V", "", 7.8)
    pdf.multi_cell(0, 4, desc, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(1.5)
    for i, s in enumerate(steps):
        t = s.get("type")
        if t == "start":
            pill("MULAI - " + s["label"], (46, 170, 110), (30, 120, 70))
        elif t == "end":
            pill("SELESAI - " + s["label"], (210, 70, 100), (170, 40, 70))
        elif t == "decision":
            box_decision(s)
        else:
            box_activity(s)
        if i < len(steps) - 1:
            arrow()
    pdf.ln(3)


# ===================== CONTENT =====================
# ---- COVER ----
pdf.add_page()
pdf.set_fill_color(*NAVY); pdf.rect(0, 0, pdf.w, pdf.h, style="F")
pdf.set_fill_color(*BLUE); pdf.rect(0, 104, pdf.w, 2.2, style="F")
pdf.set_xy(16, 42)
pdf.set_text_color(130, 200, 245); pdf.set_font("V", "B", 11)
pdf.cell(0, 7, "SISTEM MANAJEMEN SEKOLAH TERPADU", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_xy(16, 56)
pdf.set_text_color(255, 255, 255); pdf.set_font("V", "B", 30)
pdf.multi_cell(EPW, 13, "Dokumen Produk\n& Proses", align="L")
pdf.ln(3); pdf.set_x(16)
pdf.set_text_color(210, 220, 230); pdf.set_font("V", "", 12)
pdf.multi_cell(EPW, 7, "TOR  -  PRD  -  Diagram BPMN  -  Katalog Fitur", align="L")
pdf.ln(16); pdf.set_x(16)
pdf.set_text_color(255, 255, 255); pdf.set_font("V", "B", 15)
pdf.cell(0, 8, "SMA Negeri 1 Laguboti", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(14); pdf.set_x(16)
pdf.set_font("V", "", 10); pdf.set_text_color(200, 210, 220)
pdf.multi_cell(EPW, 6,
    "Isi dokumen:\n"
    "  1.  Ringkasan Sistem\n"
    "  2.  Fitur Terbaru & Penyempurnaan (Versi 2.0)\n"
    "  3.  Katalog Lengkap Seluruh Fitur\n"
    "  4.  Bagian A - Term of Reference (TOR)\n"
    "  5.  Bagian B - Product Requirements Document (PRD)\n"
    "  6.  Bagian C - Diagram BPMN (14 alur proses)")
pdf.set_xy(16, pdf.h - 24)
pdf.set_font("V", "", 9); pdf.set_text_color(150, 165, 180)
pdf.cell(0, 6, "Versi 2.0  -  Tahun Ajaran 2025/2026  -  Status: Final")

# ---- 1. RINGKASAN ----
pdf.add_page()
h1("1.  Ringkasan Sistem")
para("SMA Negeri 1 Laguboti menggunakan Sistem Manajemen Sekolah Terpadu: satu platform web untuk "
     "tujuh+ peran yang menyatukan seluruh aktivitas sekolah - dari presensi pagi, kas kelas, "
     "inventaris, ujian anti-cheat, perpustakaan, PPDB, pemilu OSIS, hingga rapor digital - dalam "
     "satu dasbor yang aman dan transparan.")
h2("Teknologi")
bullet("Frontend: React + Tailwind + shadcn/ui.")
bullet("Backend: FastAPI (Python), REST API dengan prefix /api.")
bullet("Database: MongoDB (dibuat otomatis, +/- 45 collection).")
bullet("Autentikasi: JWT (HS256) dengan otorisasi berbasis peran.")
bullet("AI: model OpenAI gpt-5.4 (via Emergent) untuk fitur Perpustakaan Pintar.")
h2("Peran pengguna (9)")
para("Super Admin, Kepala Sekolah, Staff TU, Guru/Wali Kelas, Siswa, Ketua Kelas, Bendahara, "
     "Ketua OSIS, Admin Perpustakaan - serta Orang Tua sebagai penerima notifikasi.")

# ---- 2. FITUR TERBARU ----
h1("2.  Fitur Terbaru & Penyempurnaan (Versi 2.0)")
para("Daftar penambahan dan perbaikan menonjol pada versi terkini sistem, berdasarkan dokumentasi "
     "produk Versi 2.0 dan riwayat perubahan terbaru.", size=9, color=GREY)
table(
    ["Fitur / Penyempurnaan", "Keterangan"],
    [
        ["Perpustakaan Pintar + AI",
         "Modul perpustakaan lengkap (katalog, pinjam, reservasi, denda, statistik) dengan Ringkasan AI "
         "per buku dan Rekomendasi AI berbasis riwayat pinjam siswa."],
        ["Barcode scanner USB (NISN)",
         "Absensi kini mendukung alat barcode USB (keyboard-wedge) membaca NISN, selain scan QR kamera "
         "dan pencatatan manual."],
        ["Absensi otomatis (cron)",
         "Reminder email 08:00 WIB berisi tombol 'Saya Sakit'/'Saya Izin', dan auto-Alpa 09:00 WIB bila "
         "tidak ada kehadiran - berjalan otomatis Senin-Sabtu."],
        ["Peran Bendahara kelas",
         "Ketua Kelas / Super Admin dapat menunjuk siswa sebagai Bendahara yang berhak mengelola uang kas "
         "bersama Ketua Kelas."],
        ["Salin struktur BPH antar kelas",
         "Saat membuat kelas baru, bagan BPH dari kelas lain dapat disalin otomatis."],
        ["Galeri Prestasi (publik)",
         "Super Admin mengelola prestasi sekolah (judul, tahun, tingkat, foto) yang tampil di halaman "
         "Profil Sekolah tanpa perlu login."],
        ["Panduan Cepat Super Admin",
         "Panduan langkah-demi-langkah 'mulai dari nol' kini tertaut di dasbor untuk mempercepat "
         "penyiapan sekolah."],
        ["Perbaikan Kartu Pelajar",
         "Ukuran barcode pada Kartu Pelajar diperbaiki agar lebih mudah dipindai; cetak massal format KTP."],
        ["Rapor Digital ke email ortu",
         "Wali kelas dapat mengirim ringkasan rapor langsung ke email orang tua."],
        ["Isolasi data demo",
         "Akun & data demo (is_demo) terpisah penuh dari data sekolah asli."],
    ],
    [50, EPW - 50],
)

# ---- 3. KATALOG FITUR ----
pdf.add_page()
h1("3.  Katalog Lengkap Seluruh Fitur")
table(
    ["Modul", "Fungsi utama", "Pengguna"],
    [
        ["Autentikasi & Akun", "Login JWT, akun multi-peran, WA wajib untuk siswa, reset password via email, QR permanen", "Super Admin"],
        ["Absensi QR/Barcode", "Scan QR kamera, barcode USB (NISN), manual; anti-duplikat; notifikasi; ekspor Excel", "Petugas Presensi"],
        ["Absensi Otomatis", "Reminder email 08:00 (Sakit/Izin 1-klik) & auto-Alpa 09:00 via cron idempoten", "Sistem"],
        ["Uang Kas Kelas", "Transaksi masuk/keluar, rekap mingguan/bulanan, grafik tren, pengingat Jumat, ekspor Excel", "Ketua Kelas, Bendahara"],
        ["Kelas & BPH", "CRUD kelas, password kelas, bagan BPH berjenjang drag-and-drop, salin BPH, tunjuk Bendahara", "Super Admin, Ketua Kelas"],
        ["Inventaris & Peminjaman", "CRUD aset, peringatan stok menipis, approval pinjam, stok otomatis, riwayat, ekspor Excel", "Staff TU"],
        ["Ujian Anti-Cheat", "Soal acak, password wajib, fullscreen paksa, deteksi pindah tab, auto-submit, hasil + pelanggaran", "Guru, Siswa"],
        ["Tugas & Mini-Quiz", "Tugas bertenggat & quiz (timer, pengacakan, password); nilai otomatis ke rapor", "Guru, Siswa"],
        ["Rapor Digital", "Agregasi nilai tugas/quiz + kehadiran per semester; kirim ke email orang tua", "Guru, Siswa, Ortu"],
        ["Perpustakaan Pintar", "Katalog, pinjam/kembali, denda, reservasi, ulasan, Ringkasan & Rekomendasi AI, statistik", "Admin Perpus, Siswa"],
        ["PPDB Daring", "Pendaftaran tanpa login, upload berkas, pantau status via no. registrasi, verifikasi TU", "Calon Siswa, Staff TU"],
        ["Pemilu OSIS (e-voting)", "Kandidat + visi-misi, jadwal, satu siswa satu suara anonim, hasil real-time", "Super Admin, Siswa"],
        ["Dana Sosial", "Program penggalangan, target, catat pemasukan/pengeluaran, progres, transparansi, ekspor", "Ketua OSIS, Staff TU"],
        ["Kartu Pelajar Digital", "QR permanen, cetak massal format KTP ter-branding sekolah", "Super Admin"],
        ["Pengumuman & Kalender", "Pengumuman multi-cakupan (banner login), kalender akademik (ujian, rapat, libur)", "Semua peran terkait"],
        ["Schoolgram", "Lini masa sosial sekolah: galeri momen & kegiatan", "Semua"],
        ["Galeri Prestasi", "Prestasi publik di Profil Sekolah (judul, tahun, tingkat, foto)", "Super Admin"],
        ["Struktur Organisasi", "Bagan organisasi sekolah, dapat dilihat publik tanpa login", "Super Admin"],
        ["Notifikasi & Laporan", "Notifikasi in-app & email; ekspor Excel/PDF/PPTX di berbagai modul", "Semua"],
    ],
    [33, EPW - 33 - 31, 31],
)

# ---- A. TOR ----
pdf.add_page()
h1("Bagian A - Term of Reference (Kerangka Acuan Kerja)")
h3("A.1 Latar Belakang")
para("Proses operasional sekolah - presensi, administrasi keuangan kelas (uang kas), pengelolaan aset, "
     "hingga pelaksanaan ujian - masih banyak dilakukan manual sehingga lambat, sulit diaudit, dan rawan "
     "kecurangan. Sistem ini dibangun sebagai satu platform terpadu berbasis web untuk mendigitalisasi "
     "proses-proses tersebut agar transparan, terdokumentasi, dan mudah diawasi oleh seluruh warga sekolah.")
h3("A.2 Tujuan Sistem")
for t in [
    "Menyediakan presensi harian yang cepat dan akurat melalui QR kartu pelajar dan barcode NISN.",
    "Mewujudkan transparansi keuangan kas kelas dengan pencatatan digital oleh Ketua Kelas dan Bendahara.",
    "Mempermudah pembentukan kelas beserta struktur organisasi kelas (BPH) secara konsisten.",
    "Mengelola aset/inventaris sekolah beserta siklus peminjaman-pengembalian secara terdokumentasi.",
    "Menyelenggarakan ujian daring yang aman dengan mekanisme anti-cheat (password, layar penuh, deteksi pelanggaran).",
]:
    bullet(t)
h3("A.3 Ruang Lingkup")
para("Sistem mencakup: autentikasi & manajemen akun multi-peran (WA wajib untuk siswa, reset password via "
     "email); absensi QR/Barcode/manual beserta absensi otomatis (reminder email 08:00 WIB & auto-alpa "
     "09:00 WIB); manajemen kelas & BPH (termasuk penunjukan Bendahara dan penyalinan struktur BPH antar "
     "kelas); uang kas kelas; inventaris & peminjaman; ujian anti-cheat; Perpustakaan Pintar (katalog, "
     "peminjaman, reservasi, ringkasan AI); PPDB daring; Pemilihan OSIS (e-voting); Dana Sosial; Rapor "
     "Digital; Galeri Prestasi; serta modul pendukung (tugas, mini-quiz, pengumuman, kalender, kartu "
     "pelajar, schoolgram, notifikasi, laporan Excel).")
h3("A.4 Pengguna & Pemangku Kepentingan")
table(
    ["Peran", "Deskripsi", "Hak Akses Utama"],
    [
        ["Super Admin", "Pengelola penuh sistem", "Kelola akun, kelas, pengaturan, Galeri Prestasi, seluruh modul"],
        ["Kepala Sekolah", "Pimpinan sekolah", "Pemantauan laporan, analitik, pengumuman"],
        ["Staff TU", "Tata usaha", "Inventaris & approval pinjam, PPDB, administrasi"],
        ["Guru", "Pengajar / wali kelas", "Tugas, kuis, ujian anti-cheat, rapor, rekap kehadiran"],
        ["Siswa", "Peserta didik (WA wajib)", "Presensi & konfirmasi Sakit/Izin, tugas/kuis/ujian, kas & BPH, perpustakaan, e-voting"],
        ["Ketua Kelas", "Siswa pengurus kelas", "Kelola uang kas & bagan BPH kelas, menunjuk Bendahara"],
        ["Bendahara", "Siswa yang ditunjuk", "Kelola uang kas kelas (tambah/edit/hapus) bersama Ketua Kelas"],
        ["Ketua OSIS", "Pengurus OSIS", "Pengumuman, event, pemilihan OSIS, dana sosial, galeri kegiatan"],
        ["Admin Perpustakaan", "Pengelola perpustakaan", "Katalog buku, sirkulasi, reservasi, statistik"],
        ["Orang Tua", "Wali murid", "Menerima notifikasi kehadiran & rapor anak via email"],
    ],
    [30, 42, EPW - 72],
)
h3("A.5 Manfaat")
for t in [
    "Efisiensi: presensi < 3 detik per siswa; rekap kas dan inventaris otomatis.",
    "Transparansi: saldo kas dan riwayat peminjaman dapat dilihat seluruh anggota kelas.",
    "Akuntabilitas: setiap transaksi dan pelanggaran ujian tercatat dengan identitas & waktu.",
    "Integritas ujian: layar penuh dan deteksi perpindahan tab menekan kecurangan.",
]:
    bullet(t)
h3("A.6 Batasan Sistem")
para("Catatan penting: Fitur anti-cheat berbasis browser tidak dapat mengunci aplikasi lain di tingkat "
     "sistem operasi. Sistem menangkal kecurangan via: mode layar penuh paksa, deteksi perpindahan "
     "tab/minimize, pencatatan pelanggaran, dan pengiriman jawaban otomatis setelah batas tercapai.",
     size=8.8, color=AMBER)
for t in [
    "Sistem berbasis web; memerlukan koneksi internet.",
    "Absensi otomatis & pengingat kas berjalan terjadwal via cron platform (08:00, 09:00, Jumat 08:00 - WIB).",
    "Notifikasi via email & in-app; nomor WA siswa disimpan sebagai basis data (tanpa WA otomatis pada fase ini).",
    "Data demo diisolasi (is_demo) agar tidak tercampur data asli.",
]:
    bullet(t)
h3("A.7 Kriteria Keberhasilan")
for t in [
    ">= 95% presensi harian tercatat via QR/barcode tanpa kendala.",
    "100% transaksi kas kelas tercatat digital dan dapat direkap mingguan/bulanan.",
    "Seluruh kelas memiliki bagan BPH; penunjukan Bendahara < 1 menit.",
    "Seluruh siklus peminjaman inventaris terdokumentasi dengan stok akurat.",
    "Ujian daring terselenggara dengan 100% pelanggaran tercatat dan auto-submit berfungsi.",
]:
    bullet(t)

# ---- B. PRD ----
pdf.add_page()
h1("Bagian B - Product Requirements Document (PRD)")
h3("B.1 Visi & Tujuan Produk")
para("Satu platform untuk tujuh peran: seluruh aktivitas sekolah - dari presensi pagi hingga ujian akhir "
     "- berjalan dalam satu dasbor yang elegan, aman, dan transparan.")

prd = [
    ("B.2 Absensi QR/Barcode", [
        ["FR-ABS-01", "Scan QR kartu pelajar via kamera perangkat", "Tinggi"],
        ["FR-ABS-02", "Dukungan barcode scanner USB (keyboard-wedge) membaca NISN", "Tinggi"],
        ["FR-ABS-03", "Pencatatan manual sebagai cadangan", "Sedang"],
        ["FR-ABS-04", "Mencegah duplikasi presensi siswa sama pada hari sama", "Tinggi"],
        ["FR-ABS-05", "Menyimpan metode (QR/Barcode/Manual) & ekspor Excel", "Sedang"],
        ["FR-ABS-06", "Notifikasi kehadiran ke siswa dan orang tua", "Sedang"],
        ["FR-ABS-07", "Statistik & rekap kehadiran untuk Guru/Admin", "Sedang"],
    ]),
    ("B.3 Kas Kelas & Bendahara", [
        ["FR-KAS-01", "Ketua Kelas & Bendahara tambah/edit/hapus transaksi kas", "Tinggi"],
        ["FR-KAS-02", "Tunjuk & lepas siswa sebagai Bendahara", "Tinggi"],
        ["FR-KAS-03", "Anggota lain hanya melihat kas (baca-saja)", "Tinggi"],
        ["FR-KAS-04", "Rekap mingguan + status lunas/belum per siswa & tombol Tandai Bayar", "Tinggi"],
        ["FR-KAS-05", "Rekap bulanan per minggu & grafik tren 3-12 bulan", "Sedang"],
        ["FR-KAS-06", "Pengingat otomatis (cron Jumat 08:00 WIB) ke penunggak", "Sedang"],
        ["FR-KAS-07", "Ekspor data kas ke Excel", "Sedang"],
    ]),
    ("B.4 Manajemen Kelas & BPH", [
        ["FR-KLS-01", "CRUD kelas (nama, mapel, wali kelas, password opsional)", "Tinggi"],
        ["FR-KLS-02", "Salin bagan BPH dari kelas lain saat buat kelas baru", "Tinggi"],
        ["FR-KLS-03", "Kelas berpassword: anggota masukkan sekali; ganti password reset akses", "Sedang"],
        ["FR-KLS-04", "Bagan BPH berjenjang: tambah jabatan, foto, drag-and-drop", "Tinggi"],
        ["FR-KLS-05", "Hanya Ketua Kelas yang ubah BPH; lain baca-saja", "Tinggi"],
        ["FR-KLS-06", "Struktur organisasi sekolah dilihat publik tanpa login", "Rendah"],
    ]),
    ("B.5 Inventaris & Peminjaman", [
        ["FR-INV-01", "Tambah barang: kode, kategori, kondisi, lokasi, stok, min. stok", "Tinggi"],
        ["FR-INV-02", "Edit & hapus barang inventaris", "Tinggi"],
        ["FR-INV-03", "Tandai 'Menipis' saat stok <= min. stok + peringatan", "Sedang"],
        ["FR-INV-04", "Pencarian & filter kategori/kondisi", "Sedang"],
        ["FR-INV-05", "Ajukan peminjaman (jumlah, keperluan, tanggal kembali)", "Tinggi"],
        ["FR-INV-06", "Approval TU; stok berkurang saat disetujui, kembali saat dikembalikan", "Tinggi"],
        ["FR-INV-07", "Riwayat peminjaman per barang & ekspor Excel", "Sedang"],
    ]),
    ("B.6 Ujian Anti-Cheat", [
        ["FR-UJN-01", "Buat ujian: soal PG, password wajib, batas waktu & maks. pelanggaran", "Tinggi"],
        ["FR-UJN-02", "Password benar -> ujian langsung mulai + fullscreen paksa", "Tinggi"],
        ["FR-UJN-03", "Soal & opsi diacak per siswa; tidak bisa ulang", "Tinggi"],
        ["FR-UJN-04", "Deteksi pindah tab/minimize/keluar fullscreen -> catat pelanggaran", "Tinggi"],
        ["FR-UJN-05", "Pelanggaran >= batas -> auto-submit & ujian terkunci", "Tinggi"],
        ["FR-UJN-06", "Auto-submit saat batas waktu habis", "Sedang"],
        ["FR-UJN-07", "Hasil per siswa: skor, jumlah pelanggaran, penanda auto-submit", "Sedang"],
    ]),
    ("B.7 Absensi Otomatis (Reminder & Auto-Alpa)", [
        ["FR-ABO-01", "Cron 08:00 (Sen-Sab) buat tautan konfirmasi sekali-pakai per siswa/hari", "Tinggi"],
        ["FR-ABO-02", "Kirim email tombol 'Saya Sakit'/'Saya Izin' + notifikasi", "Tinggi"],
        ["FR-ABO-03", "Konfirmasi status via satu klik tanpa login", "Tinggi"],
        ["FR-ABO-04", "Tautan berlaku hari sama, sekali pakai, tak menimpa kehadiran", "Tinggi"],
        ["FR-ABO-05", "Cron 09:00 tandai tanpa kehadiran sebagai ALPA + notifikasi", "Tinggi"],
        ["FR-ABO-06", "Cron aman (bearer secret) & idempoten", "Tinggi"],
    ]),
    ("B.8 Autentikasi & Manajemen Akun", [
        ["FR-AKN-01", "Buat akun multi-peran (nama, email unik, password, peran)", "Tinggi"],
        ["FR-AKN-02", "Nomor WhatsApp wajib untuk siswa (divalidasi); opsional lain", "Tinggi"],
        ["FR-AKN-03", "Akun siswa otomatis dapat QR permanen & Kartu Pelajar", "Tinggi"],
        ["FR-AKN-04", "Login email+password; sesi aman berbasis JWT", "Tinggi"],
        ["FR-AKN-05", "Lupa password: email tautan reset (1 jam, sekali pakai)", "Tinggi"],
        ["FR-AKN-06", "Otorisasi berbasis peran di tiap menu & endpoint", "Tinggi"],
    ]),
    ("B.9 Perpustakaan Pintar", [
        ["FR-LIB-01", "CRUD katalog buku (judul, penulis, kategori, stok, lokasi)", "Tinggi"],
        ["FR-LIB-02", "Cari/filter katalog, detail, ringkasan AI, ulasan/rating", "Sedang"],
        ["FR-LIB-03", "Pinjam & kembali dengan jatuh tempo; stok otomatis", "Tinggi"],
        ["FR-LIB-04", "Reservasi (antrean) buku tak tersedia", "Sedang"],
        ["FR-LIB-05", "Perhitungan denda keterlambatan per hari", "Sedang"],
        ["FR-LIB-06", "Statistik, buku populer, rekomendasi AI, ekspor", "Rendah"],
    ]),
    ("B.10 PPDB, Pemilu OSIS, Dana Sosial", [
        ["FR-PDB-01", "Daftar daring tanpa login & pantau status via no. registrasi", "Tinggi"],
        ["FR-PDB-02", "Verifikasi TU & status; pendaftar diterima -> konversi akun", "Tinggi"],
        ["FR-OSI-01", "Pemilu OSIS: kandidat, jadwal, e-voting 1 siswa 1 suara (anonim)", "Tinggi"],
        ["FR-OSI-02", "Hasil & grafik perolehan suara setelah ditutup", "Sedang"],
        ["FR-DAN-01", "Dana Sosial: target, catat pemasukan/keluaran, progres, ekspor", "Sedang"],
    ]),
    ("B.11 Rapor, Tugas/Quiz & Galeri Prestasi", [
        ["FR-TGS-01", "Buat tugas & mini-quiz (password, timer, pengacakan); siswa kerjakan", "Tinggi"],
        ["FR-TGS-02", "Quiz dinilai otomatis; tugas dinilai guru; mengalir ke rapor", "Sedang"],
        ["FR-RPR-01", "Rapor agregasi nilai tugas, quiz & kehadiran per semester", "Tinggi"],
        ["FR-RPR-02", "Wali kelas kirim ringkasan rapor ke email orang tua", "Sedang"],
        ["FR-GAL-01", "Kelola Galeri Prestasi (judul, tahun, tingkat, foto)", "Sedang"],
        ["FR-GAL-02", "Galeri tampil publik; slot kosong bila belum ada", "Sedang"],
    ]),
]
for title, rows in prd:
    h3(title)
    table(["ID", "Kebutuhan", "Prioritas"], rows, [24, EPW - 24 - 20, 20])

h3("B.12 Modul Pendukung Lain (ringkas)")
para("Pengumuman multi-cakupan dengan banner login; Kalender akademik; Kartu Pelajar digital (QR permanen) "
     "& cetak massal; Schoolgram; Notifikasi in-app & email; Struktur Organisasi publik; Laporan & ekspor "
     "Excel di berbagai modul.")
h3("B.13 Kebutuhan Non-Fungsional")
for t in [
    "Keamanan: JWT, password ter-hash (bcrypt), otorisasi peran tiap endpoint, cron terproteksi secret.",
    "Isolasi data: akun demo terpisah dari data asli (is_demo).",
    "Kinerja: daftar utama dimuat < 2 detik pada koneksi sekolah normal.",
    "Kegunaan: antarmuka Bahasa Indonesia, responsif HP & desktop; konfirmasi absensi 1 klik dari email.",
    "Keandalan: presensi idempotent (anti-duplikat); seluruh cron idempotent.",
    "Auditabilitas: tiap transaksi/pelanggaran/kehadiran simpan pelaku/metode & stempel waktu.",
]:
    bullet(t)
h3("B.14 Di Luar Cakupan (fase ini)")
for t in [
    "Aplikasi desktop pengunci OS untuk ujian (diganti deteksi pelanggaran berbasis browser).",
    "Pembayaran kas/donasi daring (payment gateway) - pencatatan manual oleh pengurus.",
    "Pengiriman WhatsApp otomatis - notifikasi saat ini via email & in-app.",
]:
    bullet(t)

# ---- C. BPMN ----
pdf.add_page()
h1("Bagian C - Diagram BPMN Alur Proses")
para("Notasi: pil hijau = MULAI, pil merah = SELESAI, kotak biru = aktivitas, kotak kuning = keputusan "
     "(gateway) dengan cabang Ya/Tidak. Label [Aktor] menunjukkan pihak yang bertanggung jawab.", size=9)

FLOW_ABSENSI = [
    {"type": "start", "label": "Jam masuk sekolah"},
    {"actor": "Siswa", "label": "Siswa menunjukkan Kartu Pelajar (QR) atau kartu barcode NISN di pos presensi"},
    {"actor": "Petugas Presensi", "label": "Pindai QR kamera / alat barcode USB", "note": "Mendukung scan QR kamera atau barcode scanner USB (keyboard-wedge) membaca NISN"},
    {"actor": "Sistem", "label": "Validasi identitas siswa", "note": "Cocokkan kode QR / NISN dengan data akun siswa"},
    {"actor": "Sistem", "type": "decision", "label": "Identitas valid?", "yes": "Lanjut pencatatan kehadiran", "no": "Pesan gagal; petugas dapat memakai pencatatan Manual"},
    {"actor": "Sistem", "label": "Catat kehadiran (tanggal, jam, metode: QR/Barcode/Manual)", "note": "Satu siswa hanya tercatat sekali per hari"},
    {"actor": "Sistem", "label": "Kirim notifikasi ke siswa & orang tua"},
    {"actor": "Guru", "label": "Guru/Admin memantau rekap & statistik kehadiran, ekspor Excel"},
    {"type": "end", "label": "Selesai"},
]
FLOW_ABSENSI_AUTO = [
    {"type": "start", "label": "Hari sekolah berjalan (Sen-Sab, WIB)"},
    {"actor": "Sistem", "type": "decision", "label": "Pukul 08:00 - siswa sudah absen (scan)?", "yes": "Tidak ada aksi untuk siswa tersebut", "no": "Buat tautan konfirmasi sekali-pakai untuk hari ini"},
    {"actor": "Sistem", "label": "Kirim EMAIL tombol 'Saya Sakit' & 'Saya Izin' + notifikasi aplikasi", "note": "Cron 08:00 WIB; token unik per siswa per hari (idempoten)"},
    {"actor": "Siswa", "type": "decision", "label": "Siswa menekan tombol konfirmasi?", "yes": "Status Sakit/Izin tercatat (Konfirmasi Email); token terpakai", "no": "Belum ada kehadiran tercatat"},
    {"actor": "Sistem", "type": "decision", "label": "Pukul 09:00 - masih belum ada kehadiran?", "yes": "Catat otomatis ALPA (metode: Sistem) + notifikasi", "no": "Kehadiran hari ini final (Hadir/Sakit/Izin)"},
    {"actor": "Guru", "label": "Wali kelas/Admin memantau rekap; koreksi status bila perlu"},
    {"type": "end", "label": "Selesai"},
]
FLOW_KAS = [
    {"type": "start", "label": "Periode kas mingguan (Senin-Minggu WIB)"},
    {"actor": "Siswa", "label": "Siswa membayar iuran kas kepada Ketua Kelas / Bendahara"},
    {"actor": "Bendahara", "label": "Catat transaksi masuk di tab Uang Kas kelas", "note": "Ketua Kelas & Bendahara sama-sama berhak tambah/edit/hapus transaksi"},
    {"actor": "Sistem", "label": "Simpan transaksi & perbarui saldo"},
    {"actor": "Sistem", "type": "decision", "label": "Jumat 08:00 - masih ada yang belum bayar?", "yes": "Cron kirim notifikasi pengingat ke penunggak", "no": "Tidak ada aksi; lanjut rekap"},
    {"actor": "Ketua Kelas", "label": "Tandai lunas per siswa lewat rekap mingguan (Tandai Bayar)"},
    {"actor": "Sistem", "label": "Hasilkan rekap mingguan, bulanan, grafik tren, ekspor Excel"},
    {"actor": "Siswa", "label": "Seluruh anggota kelas melihat transparansi saldo & riwayat (baca-saja)"},
    {"type": "end", "label": "Selesai"},
]
FLOW_KELAS_BPH = [
    {"type": "start", "label": "Super Admin menyiapkan kelas"},
    {"actor": "Super Admin", "label": "Buat kelas baru (nama, mapel, wali kelas, password opsional)"},
    {"actor": "Super Admin", "type": "decision", "label": "Salin struktur BPH dari kelas lain?", "yes": "Bagan BPH kelas sumber disalin otomatis", "no": "Kelas baru mulai dengan BPH kosong"},
    {"actor": "Sistem", "label": "Kelas aktif; anggota diminta password kelas sekali saat pertama masuk"},
    {"actor": "Ketua Kelas", "label": "Susun bagan BPH: tambah jabatan, atur lapis, unggah foto, drag-and-drop"},
    {"actor": "Ketua Kelas", "label": "Tunjuk seorang siswa sebagai Bendahara kelas", "note": "Super Admin juga dapat menunjuk/melepas Bendahara"},
    {"actor": "Sistem", "label": "Bendahara mendapat hak kelola Uang Kas bersama Ketua Kelas"},
    {"actor": "Siswa", "label": "Anggota kelas melihat bagan BPH & info kelas (baca-saja)"},
    {"type": "end", "label": "Selesai"},
]
FLOW_INVENTARIS = [
    {"type": "start", "label": "Pengelolaan aset sekolah"},
    {"actor": "Staff TU", "label": "Tambah barang (kode, kategori, lokasi, stok, min. stok, kondisi)"},
    {"actor": "Sistem", "type": "decision", "label": "Stok <= min. stok?", "yes": "Ditandai 'Menipis' + peringatan pengadaan", "no": "Status stok normal"},
    {"actor": "Siswa", "label": "Siswa/Guru mengajukan peminjaman (jumlah, keperluan, tanggal kembali)"},
    {"actor": "Staff TU", "type": "decision", "label": "Setujui peminjaman?", "yes": "Status 'Disetujui'; stok tersedia berkurang", "no": "Status 'Ditolak'; pemohon dinotifikasi"},
    {"actor": "Sistem", "label": "Kirim notifikasi status ke pemohon"},
    {"actor": "Siswa", "label": "Barang dipakai lalu dikembalikan"},
    {"actor": "Staff TU", "label": "Konfirmasi pengembalian; stok kembali bertambah"},
    {"actor": "Staff TU", "label": "Edit/hapus barang, lihat riwayat, ekspor laporan Excel"},
    {"type": "end", "label": "Selesai"},
]
FLOW_UJIAN = [
    {"type": "start", "label": "Guru menyiapkan ujian"},
    {"actor": "Guru", "label": "Buat Ujian Anti-Nyontek (soal, password wajib, batas waktu, maks. pelanggaran)"},
    {"actor": "Siswa", "label": "Buka tab Ujian, masukkan password ujian"},
    {"actor": "Sistem", "type": "decision", "label": "Password benar?", "yes": "Ujian langsung mulai + fullscreen dipaksa", "no": "Pesan 'Password salah'; siswa mengulang"},
    {"actor": "Sistem", "label": "Buat sesi ujian: soal & opsi diacak, timer berjalan"},
    {"actor": "Siswa", "label": "Siswa menjawab soal di halaman ujian layar penuh"},
    {"actor": "Sistem", "type": "decision", "label": "Pindah tab / keluar fullscreen?", "yes": "Catat pelanggaran + peringatan; jika >= batas -> auto-submit & terkunci", "no": "Lanjut mengerjakan"},
    {"actor": "Sistem", "type": "decision", "label": "Waktu habis?", "yes": "Jawaban dikirim otomatis saat timer 0", "no": "Siswa menekan 'Selesai & Kirim'"},
    {"actor": "Sistem", "label": "Nilai dihitung, pelanggaran dicatat; tidak bisa mengulang"},
    {"actor": "Guru", "label": "Guru melihat hasil: skor + pelanggaran + penanda auto-submit"},
    {"type": "end", "label": "Selesai"},
]
FLOW_AKUN = [
    {"type": "start", "label": "Super Admin menyiapkan akun warga sekolah"},
    {"actor": "Super Admin", "label": "Kelola Akun -> Buat Akun Baru (nama, email, password, peran)"},
    {"actor": "Super Admin", "type": "decision", "label": "Peran = Siswa?", "yes": "Nomor WhatsApp aktif WAJIB (divalidasi)", "no": "Nomor WhatsApp opsional"},
    {"actor": "Sistem", "label": "Validasi email unik; simpan akun + buat QR permanen & Kartu Pelajar"},
    {"actor": "Siswa", "label": "Pengguna login dengan email & password"},
    {"actor": "Siswa", "type": "decision", "label": "Lupa password?", "yes": "Kirim email tautan reset (1 jam, sekali pakai)", "no": "Masuk ke dasbor sesuai peran"},
    {"actor": "Sistem", "label": "Terapkan otorisasi berbasis peran pada tiap menu & endpoint"},
    {"type": "end", "label": "Selesai"},
]
FLOW_PPDB = [
    {"type": "start", "label": "PPDB daring (tanpa login)"},
    {"actor": "Siswa", "label": "Calon siswa isi formulir PPDB (data diri, asal sekolah, berkas)"},
    {"actor": "Sistem", "label": "Simpan pendaftaran + nomor registrasi; status 'Menunggu Verifikasi'"},
    {"actor": "Staff TU", "label": "Verifikasi berkas pendaftar di menu Admin PPDB"},
    {"actor": "Staff TU", "type": "decision", "label": "Berkas lengkap & memenuhi syarat?", "yes": "Status 'Diterima'", "no": "Status 'Ditolak' / 'Perlu Perbaikan'"},
    {"actor": "Sistem", "label": "Calon siswa pantau status lewat nomor registrasi"},
    {"actor": "Super Admin", "label": "Pendaftar diterima dapat dikonversi menjadi akun siswa"},
    {"type": "end", "label": "Selesai"},
]
FLOW_PERPUS = [
    {"type": "start", "label": "Perpustakaan Pintar"},
    {"actor": "Staff TU", "label": "Admin Perpus/Super Admin kelola katalog buku (judul, penulis, kategori, stok, lokasi)"},
    {"actor": "Siswa", "label": "Siswa cari & lihat detail buku; baca ringkasan AI & ulasan"},
    {"actor": "Siswa", "type": "decision", "label": "Buku tersedia?", "yes": "Ajukan pinjam / baca di tempat", "no": "Buat reservasi (masuk antrean)"},
    {"actor": "Staff TU", "label": "Admin Perpus meminjamkan buku & catat tanggal kembali; stok berkurang"},
    {"actor": "Siswa", "label": "Siswa mengembalikan buku pada jatuh tempo"},
    {"actor": "Sistem", "type": "decision", "label": "Terlambat?", "yes": "Hitung denda (per hari) saat pengembalian", "no": "Tanpa denda; stok kembali bertambah"},
    {"actor": "Staff TU", "label": "Kelola reservasi, lihat statistik & buku populer, ekspor data"},
    {"type": "end", "label": "Selesai"},
]
FLOW_OSIS = [
    {"type": "start", "label": "Pemilihan Ketua OSIS (e-voting)"},
    {"actor": "Super Admin", "label": "Buat pemilihan: kandidat (foto, visi-misi), jadwal buka-tutup"},
    {"actor": "Sistem", "type": "decision", "label": "Periode pemilihan dibuka?", "yes": "Siswa dapat memberikan suara", "no": "Pemilihan terkunci"},
    {"actor": "Siswa", "label": "Siswa memilih satu kandidat"},
    {"actor": "Sistem", "type": "decision", "label": "Sudah pernah memilih?", "yes": "Tolak - satu siswa satu suara", "no": "Catat suara anonim; tambah perolehan kandidat"},
    {"actor": "Sistem", "label": "Tampilkan hasil & grafik perolehan suara setelah ditutup"},
    {"type": "end", "label": "Selesai"},
]
FLOW_DANA = [
    {"type": "start", "label": "Dana Sosial / Penggalangan"},
    {"actor": "Ketua OSIS", "label": "Buat program dana sosial (judul, target, keterangan, tenggat)"},
    {"actor": "Siswa", "label": "Warga sekolah menyetor donasi melalui pengurus"},
    {"actor": "Staff TU", "label": "Pengurus mencatat pemasukan & pengeluaran dana"},
    {"actor": "Sistem", "label": "Perbarui total terkumpul, progres target, riwayat transaksi"},
    {"actor": "Siswa", "label": "Seluruh warga melihat transparansi dana (baca-saja) & ekspor Excel"},
    {"type": "end", "label": "Selesai"},
]
FLOW_TUGAS = [
    {"type": "start", "label": "Tugas & Mini-Quiz"},
    {"actor": "Guru", "label": "Buat tugas (instruksi, tenggat) atau mini-quiz (soal, password, timer, pengacakan)"},
    {"actor": "Siswa", "label": "Siswa mengerjakan: unggah/isi jawaban tugas atau kerjakan quiz"},
    {"actor": "Sistem", "type": "decision", "label": "Mini-quiz?", "yes": "Nilai otomatis dihitung saat selesai", "no": "Menunggu penilaian guru"},
    {"actor": "Guru", "label": "Guru menilai tugas & melihat rekap nilai per siswa"},
    {"actor": "Sistem", "label": "Nilai tugas & quiz mengalir ke Rapor Digital"},
    {"type": "end", "label": "Selesai"},
]
FLOW_RAPOR = [
    {"type": "start", "label": "Rapor Digital"},
    {"actor": "Sistem", "label": "Agregasi nilai tugas, quiz, dan rekap kehadiran per siswa per semester"},
    {"actor": "Guru", "label": "Wali kelas meninjau rapor siswa di kelasnya"},
    {"actor": "Guru", "type": "decision", "label": "Kirim rapor ke orang tua?", "yes": "Kirim ringkasan rapor ke email orang tua", "no": "Rapor tetap dilihat siswa & wali kelas di aplikasi"},
    {"actor": "Siswa", "label": "Siswa & orang tua terkait melihat rapor digital"},
    {"type": "end", "label": "Selesai"},
]
FLOW_GALERI = [
    {"type": "start", "label": "Galeri Prestasi di Profil Sekolah"},
    {"actor": "Super Admin", "label": "Profil Sekolah -> 'Tambah Prestasi' (judul, tahun, tingkat, deskripsi, foto)"},
    {"actor": "Sistem", "label": "Simpan prestasi; unggah foto ke penyimpanan objek (opsional)"},
    {"actor": "Super Admin", "label": "Edit/hapus prestasi kapan saja (hanya Super Admin)"},
    {"actor": "Sistem", "type": "decision", "label": "Ada prestasi tersimpan?", "yes": "Tampilkan kartu prestasi ke publik", "no": "Tampilkan slot 'Prestasi segera hadir'"},
    {"actor": "Siswa", "label": "Pengunjung publik melihat galeri prestasi tanpa login"},
    {"type": "end", "label": "Selesai"},
]

flows = [
    ("C.1 Alur Absensi QR / Barcode", "Dari siswa tiba di sekolah hingga kehadiran terekap dan ternotifikasi.", FLOW_ABSENSI),
    ("C.2 Alur Absensi Otomatis (Reminder 08:00 & Auto-Alpa 09:00)", "Siswa belum absen ditanya Sakit/Izin lewat email bertombol; tanpa kabar hingga 09:00 WIB otomatis Alpa.", FLOW_ABSENSI_AUTO),
    ("C.3 Alur Kas Kelas", "Pembayaran iuran, pencatatan oleh Bendahara/Ketua Kelas, pengingat otomatis, dan rekap.", FLOW_KAS),
    ("C.4 Alur Manajemen Kelas & BPH", "Pembuatan kelas (opsi salin BPH) hingga penunjukan Bendahara.", FLOW_KELAS_BPH),
    ("C.5 Alur Inventaris & Peminjaman", "Pengelolaan aset, peringatan stok menipis, dan siklus pinjam-kembali.", FLOW_INVENTARIS),
    ("C.6 Alur Ujian Anti-Cheat", "Ujian berpassword hingga penilaian dengan pencatatan pelanggaran.", FLOW_UJIAN),
    ("C.7 Alur Autentikasi & Pembuatan Akun", "Pembuatan akun (WA wajib untuk siswa), login, dan reset password via email.", FLOW_AKUN),
    ("C.8 Alur PPDB Daring", "Pendaftaran tanpa login, verifikasi berkas, hingga penetapan status.", FLOW_PPDB),
    ("C.9 Alur Perpustakaan Pintar", "Katalog, pinjam & kembali dengan denda, reservasi, dan statistik.", FLOW_PERPUS),
    ("C.10 Alur Pemilihan OSIS (E-Voting)", "Pembuatan pemilihan, satu siswa satu suara, hingga hasil.", FLOW_OSIS),
    ("C.11 Alur Dana Sosial", "Program penggalangan, pencatatan dana, progres target, dan transparansi.", FLOW_DANA),
    ("C.12 Alur Tugas & Mini-Quiz", "Pembuatan tugas/quiz, pengerjaan siswa, penilaian, hingga mengalir ke rapor.", FLOW_TUGAS),
    ("C.13 Alur Rapor Digital", "Agregasi nilai & kehadiran, peninjauan wali kelas, hingga pengiriman ke orang tua.", FLOW_RAPOR),
    ("C.14 Alur Galeri Prestasi (Profil Sekolah)", "Super Admin mengelola prestasi; publik melihat galeri atau slot kosong.", FLOW_GALERI),
]
for title, desc, steps in flows:
    flow(title, desc, steps)

pdf.output("/app/frontend/public/Dokumen_Produk_Proses_Website_Sekolah.pdf")
print("OK pages:", pdf.page_no())
