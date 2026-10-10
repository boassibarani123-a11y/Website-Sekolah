# 03 — PRODUCT REQUIREMENTS DOCUMENT (PRD) — SMANSALA v main17

## 1. Ringkasan Produk
Aplikasi web terpadu SMA Negeri 1 Laguboti untuk presensi (barcode & wajah), pembelajaran, keuangan kelas, sarpras, perpustakaan, komunikasi (Schoolgram, chat, pengumuman), rapor, PPDB, dan halaman publik. Aplikasi dapat dipakai online maupun offline.

## 2. Masalah & Peluang
Proses sekolah manual, data tersebar, presensi lambat dan rawan titip absen, informasi tidak merata, jaringan sekolah tidak stabil, dan kepala sekolah kekurangan data cepat.

## 3. Persona
| Persona | Kebutuhan | Nilai yang didapat |
|---|---|---|
| Pak Kepsek | Pantau kehadiran & kinerja | Dashboard + grafik mingguan per kelas, analitik, laporan |
| Ibu Admin Absensi | Presensi pagi cepat | Layar gerbang barcode, presensi wajah cadangan, hapus salah scan |
| Pak Guru / Wali Kelas | Tugas, ujian, nilai, rapor | Kelas digital, ujian anti-nyontek, rapor otomatis |
| Staff TU | Administrasi | Inventaris, data guru & staf, piket, ekspor Excel |
| Siswa | Info jadwal, tugas, sosial | Jadwal, Schoolgram, chat, poin, kartu pelajar |
| Ketua Kelas | Kelola akun kelas | Profil Schoolgram kelas, BPH kelas |
| Calon siswa / publik | Info & daftar | Profil sekolah, galeri, PPDB online |

## 4. Kebutuhan Fungsional (ringkas, prioritas)
| ID | Kebutuhan | Prioritas | Status |
|---|---|---|---|
| F-01 | Login berbasis peran, reset password via persetujuan admin, audit log | P0 | Selesai |
| F-02 | Presensi barcode NISN multi-stasiun, layar penuh, riwayat real-time | P0 | Selesai |
| F-03 | Presensi manual/QR dengan status Hadir/Izin/Sakit/Alpa | P0 | Selesai |
| F-04 | Presensi wajah + daftar wajah 5 pose + mode per kelas + anti-foto | P1 | Selesai |
| F-05 | Barcode & wajah masuk ke satu rekap absensi yang sama | P0 | Selesai |
| F-06 | Hapus riwayat absensi hari ini (per siswa/semua), khusus Super Admin & Admin Absensi, konfirmasi + audit | P1 | Selesai (main17) |
| F-07 | Pembeda wajah mirip/kembar: multi-sampel, ambang ketat, tanda "mirip", konfirmasi NISN/barcode, belajar dari konfirmasi | P1 | Selesai (main17) |
| F-08 | Animasi kamera gaya Face ID | P2 | Selesai (main17) |
| F-09 | Cron: pengingat 08:00, auto-alpa 09:00, arsip Senin, kas tgl 1, piket ±30 mnt | P0 | Selesai |
| F-10 | Mode offline: deteksi putus/lelet, antrean lokal, sinkron otomatis, cache data, indikator | P1 | Selesai (main17) |
| F-11 | Grafik kehadiran mingguan per kelas di dashboard kepsek | P1 | Selesai (main17) |
| F-12 | Roster: pemilih jam dropdown jam/menit (5 mnt) + jam cepat + validasi | P1 | Selesai (main17) |
| F-13 | Schoolgram: profil kelas baru, story ring, viewer progress, double-tap like, komentar, simpan, bagikan, tag kelas, tab Post/Reels/Ditandai | P1 | Selesai (main17) |
| F-14 | Tugas, kuis (impor soal), ujian anti-nyontek, poin, leaderboard | P0 | Selesai |
| F-15 | Uang kas, dana sosial, inventaris, perpustakaan | P1 | Selesai |
| F-16 | Rapor digital, kirim email, unduh massal | P1 | Selesai |
| F-17 | PPDB online, kartu pelajar, e-voting OSIS | P1 | Selesai |
| F-18 | Halaman publik, struktur organisasi, galeri, presentasi | P2 | Selesai |
| F-19 | Email Brevo aktif penuh | P1 | Menunggu kredensial SMTP |

## 5. Kriteria Penerimaan Fitur main17
- **Hapus absensi:** tombol hapus hanya muncul untuk Super Admin dan Admin Absensi; role lain mendapat 403. Hanya riwayat tanggal hari ini (WIB) yang bisa dihapus. Hapus semua wajib konfirmasi dan ketik "HAPUS". Setiap penghapusan tercatat sebagai `attendance_deleted` / `attendance_cleared_day` di audit log.
- **Wajah kembar:** mendaftarkan wajah yang mirip siswa lain (jarak < 0,42) ditolak dengan 409, kecuali admin mengonfirmasi. Saat scan, jika selisih kandidat < 0,06 (atau < 0,10 untuk pasangan bertanda mirip), respons berisi `need_confirm` + kandidat. NISN yang benar langsung mencatat absensi, sedangkan NISN di luar kandidat ditolak.
- **Offline:** saat browser offline, input absensi menampilkan "Tersimpan offline" dan muncul di panel antrean. Saat online kembali, data terkirim otomatis dalam ≤15 detik dan antrean menjadi 0. Waktu scan memakai waktu asli perangkat (maks 7 hari ke belakang).
- **Grafik mingguan:** menampilkan 6 hari (Senin–Sabtu), % hadir = hadir ÷ jumlah siswa kelas, bisa navigasi minggu sebelumnya.
- **Roster:** menit bisa dipilih tepat dalam langkah 5 menit tanpa scroll terlewat; jam selesai ≤ jam mulai ditolak.
- **Schoolgram:** foto profil bulat tidak tertutup sampul; ketuk dua kali pada media menambah suka disertai animasi; story berjalan otomatis dengan progress bar.

## 6. Kebutuhan Non-Fungsional
- Kinerja: respons scan < 1 detik di jaringan normal; dashboard < 2 detik.
- Ketersediaan: tetap bisa input saat offline; backend auto-restart (systemd).
- Keamanan: HTTPS, cookie httpOnly Secure SameSite=None, hak akses per role, bcrypt, penguncian login, secret cron, MongoDB localhost, data wajah disimpan sebagai angka (bukan foto video).
- Privasi: foto wajah hanya 1 thumbnail kecil; data offline tersimpan di perangkat operator dan cache dihapus saat logout.
- Kompatibilitas: Chrome/Edge terbaru, layar HP sampai monitor gerbang (mode layar penuh), mode gelap.
- Pemeliharaan: update satu perintah (`scripts/update-vps.sh`) dengan backup otomatis.

## 7. Metrik Keberhasilan
% siswa ter-absen sebelum 08:00, waktu rata-rata per scan, jumlah salah scan yang dihapus, % kelas dengan kehadiran ≥90%, jumlah data offline yang berhasil tersinkron, keaktifan Schoolgram (post/like/komentar per minggu).

## 8. Di Luar Lingkup / Batasan
Upload foto/video saat offline, notifikasi WhatsApp (belum aktif), AI (opsional, butuh API key), presensi wajah offline yang ambigu (perlu absen ulang).

## 9. Roadmap / Backlog
- P1: aktifkan email Brevo; notifikasi kehadiran ke orang tua; nama siswa tampil saat scan offline (cache daftar siswa).
- P2: daftar penonton story; laporan kehadiran bulanan per kelas dalam PDF; aplikasi kiosk gerbang.
