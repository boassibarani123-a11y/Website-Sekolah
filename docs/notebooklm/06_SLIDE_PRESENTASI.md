# 06 — NASKAH SLIDE PRESENTASI — SMANSALA (main17)
Format: 16 slide. Tiap slide berisi Judul, Poin, dan Saran visual. Bisa ditempel ke NotebookLM / Gamma / Canva.

**Slide 1 — Judul**
"SMANSALA — Satu Platform. Tujuh Peran. Sekolah Modern." · SMA Negeri 1 Laguboti, Kab. Toba · Juni 2026.
Visual: logo sekolah + foto gerbang + mockup dashboard di laptop & HP.

**Slide 2 — Masalah**
Absensi kertas lambat & rawan titip · data tersebar di Excel · tugas tenggelam di grup chat · kas & inventaris tidak transparan · jaringan sekolah sering lelet · kepsek sulit memantau.
Visual: ikon-ikon masalah dengan tanda silang merah.

**Slide 3 — Solusi**
Satu aplikasi web (bisa di-install di HP/PC) dengan 16 modul, 9+ peran, otomatisasi terjadwal, dan mode offline.
Visual: diagram hub-and-spoke modul.

**Slide 4 — Pengguna & Peran**
Super Admin, Kepala Sekolah, Staff TU, Guru, Admin Absensi, Admin Perpustakaan, Siswa, Ketua Kelas, Ketua OSIS (+ Bendahara, Publik).
Visual: tabel peran dengan avatar.

**Slide 5 — Presensi Barcode Gerbang**
Scan Kartu Pelajar ±1 detik · layar MASUK/SUDAH ABSEN/DITOLAK · multi-gerbang · riwayat real-time · hapus salah scan (baru).
Visual: screenshot layar gerbang layar penuh.

**Slide 6 — Presensi Wajah ala Face ID**
Cadangan saat scanner rusak · animasi cincin Face ID · anti-foto (kedip) · data disimpan sebagai angka, bukan video.
Visual: screenshot kamera bulat dengan cincin hijau.

**Slide 7 — Bisa Membedakan Siswa Kembar**
Multi-sampel per siswa · ambang lebih ketat · tanda "mirip" · minta NISN/barcode bila ragu · sistem belajar dari konfirmasi.
Visual: dua kartu kandidat + kolom NISN (alur P2 dari BPMN).

**Slide 8 — Otomasi Harian**
08:00 pengingat belum absen · 09:00 auto-Alpa · Senin arsip mingguan · tgl 1 pengingat kas · pengingat piket guru.
Visual: timeline jam.

**Slide 9 — Mode Hybrid Online/Offline**
Internet putus/lelet? Data tetap tersimpan di perangkat dan otomatis terkirim saat online. Indikator status di header.
Visual: alur Offline → Antre → Sinkron (diagram P5).

**Slide 10 — Dashboard Kepala Sekolah**
Statistik real-time · grafik kehadiran mingguan per kelas (warna hijau/biru/kuning/merah) · tren harian per kelas.
Visual: screenshot grafik batang + garis.

**Slide 11 — Pembelajaran Digital**
Tugas · kuis impor soal · ujian anti-nyontek (deteksi keluar tab) · poin & papan peringkat · rapor digital.
Visual: screenshot ujian + leaderboard.

**Slide 12 — Jadwal & Piket**
Roster per kelas dengan deteksi bentrok · pemilih jam baru (jam/menit + jam cepat) · piket gerbang dengan check-in & laporan.
Visual: modal Tambah Jadwal.

**Slide 13 — Schoolgram**
Media sosial aman per kelas: story ring, ketuk dua kali untuk suka, komentar, tag kelas, reels, chat real-time · profil kelas dengan foto bulat & sampul.
Visual: mockup HP profil kelas.

**Slide 14 — Administrasi & Layanan Publik**
Uang kas & dana sosial · inventaris · perpustakaan · PPDB online · kartu pelajar · e-voting OSIS · profil, galeri, struktur organisasi.
Visual: grid ikon modul.

**Slide 15 — Arsitektur & Keamanan**
React + FastAPI + MongoDB di VPS Ubuntu · Nginx + HTTPS · systemd · cron · cookie httpOnly · hak akses per peran · backup harian · update satu perintah.
Visual: diagram arsitektur Browser → Nginx → FastAPI → MongoDB.

**Slide 16 — Dampak & Rencana**
Dampak: absensi detik per siswa, data real-time, transparansi, tidak ada data hilang saat offline.
Rencana: email Brevo penuh, notifikasi orang tua, nama siswa saat scan offline.
Penutup: "Terima kasih. Demo langsung: https://sman1laguboti.web.id"
