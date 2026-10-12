# DOKUMEN SUMBER — Sistem Manajemen Sekolah Terpadu SMA Negeri 1 Laguboti ("SMANSALA")
(Dokumen sumber untuk NotebookLM: dasar penyusunan TOR, PRD, BPMN, ERD, User Flow, dan slide presentasi.)

## 1. Identitas Proyek
- Nama sistem: Sistem Manajemen Sekolah Terpadu — SMA Negeri 1 Laguboti (SMANSALA)
- Alamat sekolah: Jl. Sekolah No. 3, Pasar Laguboti, Kec. Laguboti, Kab. Toba 22381
- Kontak: 0632 – 331512 · smanegeri1laguboti@yahoo.co.id
- Data sekolah: berdiri 1966 · NPSN 10208460 · Akreditasi A
- Skala pengguna target: ±900 akun (siswa, guru, staf)
- Slogan aplikasi: "Satu Platform. Tujuh Peran. Sekolah Modern."
- Jenis: Aplikasi web full-stack (dapat dibuka di laptop & HP), di-hosting di VPS sekolah sendiri.
- Kode sumber: GitHub boassibarani123-a11y/Website-Sekolah, branch main15.

## 2. Latar Belakang & Masalah yang Diselesaikan
Sebelum sistem ini, banyak proses sekolah berjalan manual, terpisah-pisah, dan sulit diawasi:
1. **Absensi manual di kertas / dipanggil satu-satu** → memakan waktu jam pelajaran, rawan titip absen, rekap bulanan lama, orang tua/wali kelas terlambat tahu siswa bolos.
2. **Data siswa, guru, kelas tersebar** di Excel berbeda-beda → duplikasi, tidak sinkron.
3. **Tugas & kuis lewat grup chat** → tugas tenggelam, pengumpulan tidak tercatat, penilaian manual.
4. **Uang kas kelas & dana sosial dicatat di buku bendahara** → tidak transparan, rawan selisih, siswa lupa bayar.
5. **Inventaris & peminjaman barang tanpa catatan riwayat** → barang hilang/rusak tanpa jejak penanggung jawab.
6. **Perpustakaan konvensional** → stok tidak terpantau, keterlambatan pengembalian sulit dilacak.
7. **Pemilu OSIS dengan kertas suara** → penghitungan lama, rawan kecurangan dan suara ganda.
8. **Kartu pelajar dicetak pihak ketiga** → mahal, lama, tidak terhubung dengan sistem absensi.
9. **PPDB (pendaftaran siswa baru) datang langsung + berkas fotokopi** → antrean panjang, berkas tercecer, seleksi manual.
10. **Informasi & pengumuman tidak sampai** ke semua warga sekolah; profil sekolah tidak punya etalase digital.
11. **Kepala sekolah sulit memantau kondisi sekolah** secara cepat (kehadiran, nilai, keuangan).
12. **Rapor & laporan nilai dibuat manual** per siswa.

Solusi: satu platform terpadu dengan hak akses berbasis peran, otomatisasi terjadwal, dan data terpusat.

## 3. Tujuan
- Digitalisasi administrasi sekolah dalam satu sistem terintegrasi.
- Absensi otomatis cepat via barcode Kartu Pelajar (hitungan detik per siswa).
- Transparansi keuangan kelas & dana sosial.
- Mendukung pembelajaran (tugas, kuis, ujian anti-curang, perpustakaan).
- Memberi kepala sekolah dashboard analitik real-time.
- Memperkuat citra sekolah melalui halaman publik (profil, galeri, struktur organisasi, PPDB online).

## 4. Pengguna & Peran (9 role)
| Role | Kegunaan utama |
|---|---|
| Super Admin | Mengelola seluruh sistem: akun, kelas, mapel, struktur organisasi, pengaturan, inventaris |
| Kepala Sekolah (kepsek) | Memantau analitik, rekap absensi, laporan, menyetujui hal strategis |
| Staff TU | Administrasi: presensi gerbang, inventaris, galeri, data staf |
| Guru | Membuat tugas, kuis, ujian, menilai, melihat rekap absensi; bisa menjadi Wali Kelas |
| Siswa | Melihat jadwal, mengerjakan tugas/kuis/ujian, kartu pelajar digital, voting OSIS, Schoolgram, perpustakaan |
| Ketua OSIS | Mengelola galeri kegiatan, pemilu OSIS |
| Ketua Kelas | Mengelola kegiatan kelas (BPH kelas) |
| Admin Perpustakaan | Katalog buku, sirkulasi peminjaman, reservasi |
| Admin Absensi | Mengoperasikan stasiun scanner barcode di gerbang |
Tambahan: **Bendahara kelas** dapat ditetapkan per kelas untuk mengelola uang kas.
Pengguna publik (tanpa login): calon siswa (PPDB), masyarakat (profil, galeri, struktur organisasi).

## 5. Daftar Modul, Fitur, Kegunaan & Masalah yang Diatasi

### 5.1 Autentikasi & Akun
- Login email + password, sesi aman (cookie httpOnly, HTTPS), ganti password, lupa password → **permintaan reset** yang disetujui/ditolak admin.
- Kelola Akun: tambah/edit/hapus, ekspor Excel, filter per role/kelas. Akun siswa wajib nomor WhatsApp aktif.
- Audit log aktivitas admin.
- *Masalah diatasi:* akun liar, lupa password tanpa prosedur, tidak ada jejak perubahan data.

### 5.2 Presensi Gerbang (Barcode) — fitur unggulan
- Siswa men-scan barcode NISN pada Kartu Pelajar di alat scanner USB di gerbang → tercatat HADIR dengan jam.
- Tampilan gerbang layar penuh: kartu hasil besar berwarna (MASUK hijau / SUDAH ABSEN kuning / DITOLAK merah), suara beep, jam digital, dan **tabel riwayat scan real-time** (filter status, pencarian nama/kelas, highlight baris baru).
- Scanner **otomatis aktif** saat dicolok (mode keyboard HID) tanpa driver; mendukung banyak scanner/gerbang (multi-stasiun dengan status online).
- Alternatif: scan QR via kamera (dengan foto bukti anti titip absen) dan input manual NISN dengan status Hadir/Izin/Sakit/Alpa.
- Statistik harian (Hadir, Izin, Sakit, Alpa, Belum absen), ekspor Excel.
- **Otomasi:** 08.00 WIB pengingat ke siswa yang belum absen (email + notifikasi berisi tombol "Saya Sakit"/"Saya Izin" sekali pakai) → 09.00 WIB otomatis Alpa → arsip mingguan otomatis tiap Senin 01.00.
- Rekap Absensi mingguan + unduh arsip.
- *Masalah diatasi:* waktu terbuang untuk absensi, titip absen, rekap manual, keterlambatan informasi siswa tidak hadir.

### 5.3 Ruang Kelas
- Kartu kelas: jumlah siswa, mapel, wali kelas, password kelas opsional.
- Penetapan wali kelas, salin struktur BPH (pengurus kelas) dari kelas lain.
- Master mata pelajaran; guru pengampu otomatis mendapat akses kelas.
- *Masalah:* data kelas tidak terstruktur, pembagian wewenang tidak jelas.

### 5.4 Tugas, Mini-Kuis & Ujian
- Tugas: tenggat, lampiran, pengumpulan siswa, penilaian guru, status pengumpulan.
- Mini-Kuis: pilihan ganda, timer, nilai otomatis; impor soal massal dari Excel/CSV/file.
- Ujian dengan **anti-curang** (pencatatan pelanggaran seperti keluar tab), hasil per siswa.
- AI generator soal & ringkasan (opsional, saat OpenAI aktif).
- Poin & **Papan Peringkat** untuk memotivasi siswa.
- Penjadwalan ulang / ketidakhadiran guru (reschedule).
- *Masalah:* tugas tercecer di chat, koreksi manual, kecurangan ujian.

### 5.5 Jadwal & Kalender
- Jadwal pelajaran per kelas + "Jadwal Hari Ini" di dashboard.
- Kalender akademik (agenda, ujian, libur).

### 5.6 Keuangan Kelas & Dana Sosial
- Uang kas kelas: iuran per siswa mingguan/bulanan, grafik, ekspor Excel, bendahara kelas, pengingat kas otomatis tanggal 1 pukul 07.00.
- Dana sosial sekolah: pencatatan donasi & penggunaan, ekspor.
- *Masalah:* pembukuan tidak transparan, tunggakan iuran.

### 5.7 Inventaris Sarpras
- Data aset (kondisi, lokasi), peminjaman & pengembalian, riwayat per barang, ekspor Excel.
- *Masalah:* aset hilang tanpa jejak.

### 5.8 Perpustakaan Digital
- Katalog & kategori buku, peminjaman, pengembalian, reservasi, ulasan buku, buku populer, statistik, ekspor peminjaman.
- AI: ringkasan buku & rekomendasi (opsional).
- *Masalah:* stok dan keterlambatan tidak terpantau.

### 5.9 Pemilu OSIS (E-Voting)
- Kandidat dengan visi-misi & foto, satu akun satu suara, status pemilu, statistik hasil real-time.
- *Masalah:* penghitungan lama, suara ganda, biaya kertas.

### 5.10 Kartu Pelajar Digital
- Kartu digital per siswa (foto, NISN, barcode, logo sekolah) + cetak massal ukuran KTP.
- Barcode di kartu langsung dipakai untuk presensi gerbang.
- *Masalah:* biaya cetak pihak ketiga, kartu tidak terhubung sistem.

### 5.11 Komunikasi
- **Schoolgram**: media sosial internal per kelas (posting, story, reels, like, komentar, highlight).
- Chat real-time antar siswa.
- Pengumuman (termasuk banner di halaman login), notifikasi dalam aplikasi, email.
- Kotak saran/feedback.
- *Masalah:* informasi tidak merata; ruang ekspresi siswa yang aman & terpantau.

### 5.12 Rapor Digital & Laporan
- Rapor per siswa + catatan wali, kirim rapor via email, unduh rapor massal (ZIP/PDF), ringkasan laporan.
- **Analitik Kepala Sekolah**: ringkasan kehadiran, akademik, dan aktivitas sekolah.

### 5.13 PPDB Online
- Formulir publik tanpa login + unggah berkas.
- Admin PPDB: verifikasi, seleksi otomatis, status kelulusan, ekspor Excel.
- *Masalah:* antrean pendaftaran, berkas tercecer, seleksi manual.

### 5.14 Halaman Publik & Profil Sekolah
- Halaman login informatif, Profil Sekolah, Struktur Organisasi (bagan dapat diedit), Galeri Prestasi & Kegiatan, Dokumentasi sistem, Presentasi sekolah (dapat diunduh .pptx).
- Guru & Staff: data tenaga pendidik + ekspor.

### 5.15 Pengaturan
- Nama, logo, kontak, galeri sekolah, status & tes email SMTP.

## 6. Arsitektur Teknis
- Frontend: React (Tailwind, shadcn/ui) → file statis dilayani Nginx.
- Backend: FastAPI Python 3.11 (±220 endpoint REST di bawah /api, plus WebSocket chat) → uvicorn 2 worker, systemd.
- Database: MongoDB 7.0 lokal.
- Penyimpanan file: disk VPS (/var/www/sekolah/uploads), persisten saat update.
- Keamanan: JWT dalam cookie httpOnly Secure, HTTPS Let's Encrypt, hak akses per role, MongoDB tidak terbuka ke internet.
- Otomasi: crontab VPS memanggil 4 endpoint cron dengan secret.
- Email: Brevo SMTP (gratis 300 email/hari). WhatsApp & AI: siap diaktifkan kemudian.

## 7. Entitas Data Utama (untuk ERD)
- **users** (id, name, email, password_hash, role, nisn, kelas, whatsapp, photo, qr_code)
- **classes** (id, name, description, subjects[], homeroom_teacher_id→users, password, treasurer)
- **class_bph** (node pengurus kelas → classes)
- **subjects** (id, name)
- **attendance** (id, student_id→users, student_name, kelas, date, status[hadir/izin/sakit/alpa], scanned_at, method[barcode/qr/manual], station_id, station_name, photo, scanned_by)
- **attendance_stations**, **attendance_archives**, **attendance_confirm_tokens**
- **timetable** (kelas, hari, jam, mapel, guru), **events** (kalender), **reschedules**
- **assignments** → **submissions** (nilai)
- **quizzes** → **quiz_attempts**; **exams** → attempts & violations
- **points** (poin siswa, leaderboard)
- **kas** (iuran per siswa per kelas), **social_fund**
- **inventory** → **borrow** (peminjaman barang)
- **books** → **loans**, **reservations**, **reviews**
- **candidates** → **votes** (pemilu OSIS)
- **posts**, **stories**, komentar, like (Schoolgram); **chat messages**
- **announcements**, **notifications**, **feedback**
- **reports** (rapor & catatan), **achievements**, **profile_achievements**, **gallery**
- **ppdb** (pendaftar & berkas)
- **org_structures** / **org** (bagan organisasi)
- **settings** (singleton: identitas sekolah, logo, galeri)
- **reset_requests**, **audit_logs**
Relasi kunci: users(siswa) 1–N attendance; classes 1–N users(siswa) via kelas; users(guru) 1–N classes (wali); assignments 1–N submissions; candidates 1–N votes (1 vote per siswa); books 1–N loans.

## 8. Proses Bisnis (untuk BPMN)
**A. Presensi harian**
1. Siswa tiba → scan Kartu Pelajar di scanner gerbang.
2. Sistem cek NISN → valid: catat HADIR + jam, tampil MASUK; sudah tercatat: tampil SUDAH ABSEN; tidak dikenal: DITOLAK.
3. 08.00 → sistem kirim pengingat ke siswa yang belum absen (tombol Sakit/Izin).
4. Siswa klik Sakit/Izin → status tercatat.
5. 09.00 → siswa tanpa catatan otomatis ALPA + notifikasi.
6. Senin 01.00 → arsip rekap mingguan.
7. Wali kelas/Kepsek melihat rekap & ekspor.

**B. Tugas/Kuis**: Guru buat → siswa kerjakan/kumpulkan → sistem nilai otomatis (kuis) / guru menilai (tugas) → poin & leaderboard → masuk rapor.

**C. Uang Kas**: Bendahara catat pembayaran → grafik & ekspor → tanggal 1 pengingat otomatis ke yang menunggak.

**D. PPDB**: Calon siswa isi form & unggah berkas → admin verifikasi → seleksi otomatis/manual → status diumumkan → akun siswa dibuat.

**E. Pemilu OSIS**: Admin buat kandidat → pemilu dibuka → siswa login & memilih (1x) → hasil real-time → pemilu ditutup.

**F. Peminjaman (buku/inventaris)**: ajukan → disetujui → dikembalikan → riwayat tercatat.

**G. Reset password**: user ajukan → admin approve/reject → user ganti password.

## 9. Kebutuhan Non-Fungsional
- Keamanan HTTPS, hak akses per role, password ter-hash, secret acak.
- Ketersediaan: auto-restart service, backup database harian.
- Kinerja: scan barcode < 1 detik tampil; tabel gerbang real-time (refresh 3 detik).
- Kemudahan: responsif di HP, bahasa Indonesia, mode gelap.
- Skalabilitas: ±900 akun pada VPS tunggal.

## 10. Rencana Pengembangan Berikutnya
- Notifikasi WhatsApp ke orang tua (absen, kas, pengumuman).
- Aktivasi fitur AI (generator soal, ringkasan buku, rekomendasi).
- Upgrade email jika perlu blast sekaligus >300/hari.

## 11. Saran Alur Slide Presentasi
1. Judul & identitas sekolah · 2. Masalah sebelum digitalisasi · 3. Solusi: satu platform, 9 peran · 4. Demo presensi barcode (fitur unggulan) · 5. Akademik (tugas, kuis, ujian, rapor) · 6. Keuangan transparan · 7. Perpustakaan & inventaris · 8. Pemilu OSIS & Kartu Pelajar · 9. Komunikasi (Schoolgram, pengumuman) · 10. PPDB & halaman publik · 11. Dashboard Kepala Sekolah · 12. Arsitektur & keamanan · 13. Dampak/manfaat · 14. Rencana ke depan.
