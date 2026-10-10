# 01 — REKAP FITUR LENGKAP: Sistem Manajemen Sekolah Terpadu SMA Negeri 1 Laguboti (SMANSALA)
Sumber untuk NotebookLM. Versi kode: branch **main17** (Juni 2026). Repo: github.com/boassibarani123-a11y/Website-Sekolah.
Situs produksi: https://sman1laguboti.web.id

## A. Identitas
- Sekolah: SMA Negeri 1 Laguboti, Jl. Sekolah No. 3, Pasar Laguboti, Kec. Laguboti, Kab. Toba 22381. Telp 0632–331512, smanegeri1laguboti@yahoo.co.id
- Berdiri 1966 · NPSN 10208460 · Akreditasi A · ±900 akun target (siswa, guru, staf)
- Slogan aplikasi: "Satu Platform. Tujuh Peran. Sekolah Modern."
- Jenis: aplikasi web full-stack responsif (laptop & HP), dapat di-install sebagai aplikasi (PWA) dan bekerja online/offline (hybrid).

## B. Peran Pengguna (role)
| Role | Hak utama |
|---|---|
| Super Admin | Semua modul: akun, kelas, mapel, pengaturan, struktur organisasi, log aktivitas, hapus riwayat absensi |
| Kepala Sekolah | Dashboard analitik, grafik kehadiran mingguan per kelas, rekap absensi, laporan, piket |
| Staff TU | Presensi, inventaris, galeri, guru & staf, piket |
| Guru | Tugas, kuis, ujian, nilai, rapor, jadwal, check-in piket gerbang |
| Admin Absensi | Stasiun scanner barcode, presensi wajah, daftar wajah, hapus riwayat absensi hari ini |
| Admin Perpustakaan | Katalog, sirkulasi, reservasi buku |
| Siswa | Jadwal, tugas/kuis/ujian, kartu pelajar, Schoolgram, chat, voting OSIS, perpustakaan, poin |
| Ketua Kelas | Mengelola akun Schoolgram & BPH kelasnya |
| Ketua OSIS | Galeri kegiatan, pemilu OSIS |
| Bendahara kelas (penugasan) | Uang kas kelas |
| Publik (tanpa login) | Profil sekolah, galeri, struktur organisasi, PPDB online, dokumentasi, presentasi |

## C. Daftar Modul & Fitur
### 1. Autentikasi & Akun
Login email+password (cookie httpOnly, HTTPS), wajib ganti password awal, lupa password lewat permintaan reset yang disetujui admin, penguncian login setelah gagal berulang, Kelola Akun (tambah/edit/hapus/nonaktif, filter role/kelas, ekspor Excel, status wajah), log aktivitas (audit log).

### 2. Presensi Gerbang Barcode (fitur unggulan)
- Scanner USB mode keyboard: siswa scan barcode NISN di Kartu Pelajar dan langsung tercatat HADIR beserta jam.
- Layar gerbang penuh: kartu hasil besar (MASUK hijau, SUDAH ABSEN kuning, DITOLAK merah, TERSIMPAN OFFLINE ungu), bunyi beep, jam digital, tabel riwayat scan real-time (filter status, pencarian).
- Multi-stasiun/gerbang dengan status online, scan QR kamera dengan foto bukti, input manual NISN (Hadir/Izin/Sakit/Alpa).
- **Baru main17:** hapus riwayat absensi hari ini, per siswa atau semua sekaligus (khusus Super Admin & Admin Absensi). Ada konfirmasi (hapus semua wajib mengetik "HAPUS") dan tercatat di log aktivitas.
- Ekspor Excel harian, rekap mingguan, arsip otomatis.

### 3. Presensi Wajah (cadangan saat scanner bermasalah)
- Pengenalan wajah di browser (face-api, model ±12MB di-cache). Server hanya menyimpan kode numerik 128 angka per sampel.
- Daftar Wajah Siswa: 5 pose terpandu, Mode Per Kelas (otomatis lanjut ke siswa berikutnya), anti-foto dengan deteksi kedipan.
- **Baru main17:** tampilan kamera bulat bergaya Apple Face ID: cincin garis yang menyala sesuai progres, sapuan cahaya saat memindai, centang hijau saat berhasil, dan getar merah saat gagal.
- **Baru main17, pembeda wajah mirip/kembar:**
  - Satu siswa bisa punya beberapa sampel wajah (hingga 30); ada tombol "Tambah Sampel".
  - Skor kecocokan = rata-rata 3 sampel terdekat, dengan ambang yang lebih ketat (jarak 0,45).
  - Saat mendaftar wajah yang sangat mirip siswa lain, admin diminta konfirmasi, lalu kedua siswa ditandai "mirip".
  - Saat presensi, jika selisih 2 kandidat teratas terlalu tipis, sistem menampilkan kandidat dan meminta scan barcode atau ketik NISN.
  - Wajah yang sudah dikonfirmasi disimpan sebagai sampel baru, sehingga sistem makin pintar membedakan.
- Hasil presensi wajah masuk ke **rekap absensi yang sama** dengan barcode (koleksi `attendance`, metode "face").

### 4. Otomasi Terjadwal (cron)
| Jadwal (WIB) | Tugas |
|---|---|
| Setiap hari 08:00 | Pengingat siswa yang belum absen (notifikasi + email berisi tombol "Saya Sakit"/"Saya Izin") |
| Setiap hari 09:00 | Siswa tanpa kabar otomatis ALPA |
| Senin 01:00 | Arsip rekap absensi mingguan (Excel) |
| Tanggal 1, 07:00 | Pengingat uang kas kelas |
| Tiap 15 menit (VPS: 5 menit) | Pengingat guru ±30 menit sebelum shift piket gerbang |
Endpoint cron diamankan secret Bearer dan anti-dobel (idempotensi run id).

### 5. Mode Hybrid Online/Offline (baru main17)
- Aplikasi bisa di-install (PWA). Halaman tetap terbuka walau internet putus (service worker, batas waktu 4 detik saat jaringan lelet).
- Jika jaringan **putus atau lelet** (request lebih dari 12 detik), aplikasi otomatis beralih ke Mode Offline. Semua input (absensi barcode/wajah/manual, komentar, like, pesan, jadwal, dll.) disimpan di penyimpanan lokal perangkat (localStorage).
- Saat koneksi kembali, sistem otomatis menyinkronkan data ke database server (dicek setiap 10 detik dan saat event "online"). Waktu scan asli tetap dipakai, dan record ditandai "offline".
- Data tampilan terakhir (GET) di-cache, sehingga halaman tetap berisi data saat offline.
- Indikator di header: Online / Offline (lelet) / n antre / Sinkronisasi, lengkap dengan panel daftar antrean dan tombol "Sinkronkan Sekarang".
- Batasan: upload foto/video butuh internet. Presensi wajah offline dicocokkan saat sinkron; kalau wajahnya ternyata mirip siswa lain, data itu tidak tercatat dan siswa perlu absen ulang atau lewat barcode.

### 6. Dashboard & Analitik
Kartu statistik (siswa, guru, inventaris, tugas, kuis, post), presensi hari ini, pengumuman, jadwal hari ini, papan peringkat, sorotan prestasi.
**Baru main17:** grafik **Kehadiran Mingguan per Kelas** (Kepala Sekolah & Super Admin). Isinya grafik batang rata-rata % hadir Senin–Sabtu per kelas (hijau ≥90%, biru ≥75%, kuning ≥60%, merah <60%), grafik garis harian per kelas yang dipilih, navigasi minggu sebelumnya, dan rata-rata sekolah. Halaman Analitik kepsek juga tersedia.

### 7. Ruang Kelas, Tugas, Kuis, Ujian
Kelas (wali kelas, mapel, password kelas, BPH/pengurus kelas), tugas (tenggat, lampiran, penilaian), mini-kuis (timer, nilai otomatis, impor soal Excel/CSV), **Ujian anti-nyontek** (pencatatan pelanggaran keluar tab/layar, sesi, hasil per siswa), penjadwalan ulang guru, poin & papan peringkat.

### 8. Jadwal Pelajaran (Roster) & Kalender
Jadwal mingguan per kelas (tampilan kartu & matriks, penanda "Berlangsung", deteksi bentrok kelas/guru/ruangan), kalender akademik.
**Baru main17:** pemilih jam berupa dropdown jam & menit terpisah (langkah 5 menit) dan tombol jam cepat (07:00, 07:45, 08:30, …). Ada juga validasi jam selesai harus setelah jam mulai. Masalah scroll menit yang terlewat sudah teratasi.

### 9. Piket Gerbang
Jadwal shift guru per gerbang, check-in/out berbasis WIB (terlambat >10 menit), pengingat otomatis, laporan bulanan & ekspor Excel.

### 10. Keuangan
Uang kas kelas (mingguan/bulanan, grafik, bendahara, pengingat), Dana Sosial sekolah.

### 11. Inventaris & Perpustakaan
Inventaris sarpras (kondisi, lokasi, stok minimum, peminjaman, riwayat). Perpustakaan digital (katalog, peminjaman, reservasi, ulasan, buku populer, statistik).

### 12. Schoolgram (media sosial internal per kelas) — dirombak di main17
- Beranda: baris story bulat dengan ring gradien ala Instagram (abu-abu jika sudah dilihat), feed post.
- Post interaktif: **ketuk dua kali untuk suka** dengan animasi hati besar, animasi tombol suka, komentar (edit/hapus), balasan cepat ("Keren!", "Mantap", "Semangat!", "Bangga"), simpan ke koleksi, bagikan/salin tautan, caption "selengkapnya", label kelas yang ditandai, waktu relatif.
- Story viewer layar penuh: progress bar otomatis 5 detik per story, ketuk kiri/kanan untuk pindah, tahan untuk jeda, tombol panah keyboard, jadikan Sorotan.
- **Profil kelas baru:** sampul besar (bisa diganti langsung), foto profil lingkaran berbingkai gradien (tidak tertutup sampul), statistik (Post, Siswa, Suka, Sorotan), bio maks 150 karakter, baris Story & Sorotan, tab **Post / Reels / Ditandai**, grid dengan hover jumlah suka/komentar.
- Post baru bisa menandai kelas lain (muncul di tab Ditandai kelas tersebut).
- Reels: video vertikal snap, auto-play, tombol suara, ketuk dua kali untuk suka.
- Pesan (chat real-time WebSocket + polling cadangan), pencarian teman.
- Gerbang keamanan: masukkan ulang password akun untuk membuka Schoolgram.

### 13. Komunikasi & Informasi
Pengumuman (termasuk banner di halaman login), notifikasi dalam aplikasi, email (Brevo SMTP), kotak saran/feedback, asisten AI (opsional).

### 14. Rapor & Laporan
Rapor digital per siswa + catatan wali, kirim via email, unduh massal ZIP/PDF, ringkasan laporan.

### 15. PPDB Online, Kartu Pelajar, Pemilu OSIS
PPDB publik dan admin (verifikasi, seleksi, ekspor). Kartu pelajar digital + cetak massal ukuran KTP (barcode NISN untuk presensi). E-voting OSIS (1 akun 1 suara, hasil real-time).

### 16. Halaman Publik & Pengaturan
Profil sekolah, struktur organisasi (editor bagan), galeri prestasi & kegiatan, dokumentasi, presentasi (unduh .pptx), guru & staf. Pengaturan identitas, logo, tema warna, mode gelap, status email.

## D. Teknologi
React 19 + Tailwind + shadcn/ui + Recharts + face-api · FastAPI (Python 3.11, ±245 endpoint /api + WebSocket) · MongoDB 7 · Nginx + Let's Encrypt · systemd · crontab · Brevo SMTP · PWA service worker.

## E. Riwayat Versi Singkat
- main15–main16: presensi barcode multi-stasiun, presensi & daftar wajah, piket gerbang, ujian anti-nyontek, rapor digital, chat, poin, log aktivitas.
- **main17**: mode offline hybrid, hapus riwayat absensi, pembeda wajah mirip/kembar + konfirmasi NISN, animasi Face ID, grafik kehadiran mingguan per kelas, pemilih jam roster baru, Schoolgram baru (profil, interaksi, story viewer, tag kelas), script `update-vps.sh`.
