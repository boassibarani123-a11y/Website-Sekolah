# 02 — TERM OF REFERENCE (TOR / KAK)
## Pengembangan Sistem Manajemen Sekolah Terpadu SMA Negeri 1 Laguboti (SMANSALA)

### 1. Latar Belakang
SMA Negeri 1 Laguboti (Kab. Toba, berdiri 1966, NPSN 10208460, Akreditasi A) melayani ±900 warga sekolah. Banyak proses masih berjalan manual dan terpisah:
- Absensi kertas atau dipanggil satu per satu. Cara ini memakan jam pelajaran, rawan titip absen, dan rekapnya lambat.
- Data siswa, guru, dan kelas tersebar di banyak file Excel.
- Tugas dan kuis dibagikan lewat grup chat, sehingga pengumpulan tidak tercatat.
- Uang kas, dana sosial, inventaris, dan perpustakaan dicatat di buku. Akibatnya kurang transparan dan barang mudah hilang jejaknya.
- Pemilu OSIS memakai kertas suara, PPDB dilayani langsung dengan berkas fotokopi, dan kartu pelajar dicetak pihak ketiga.
- Kepala sekolah sulit memantau kehadiran, nilai, dan keuangan secara cepat.
- Jaringan internet di sekolah kadang putus atau lambat, sehingga input data bisa gagal.

### 2. Maksud dan Tujuan
**Maksud:** menyediakan satu platform digital terpadu berbasis web untuk administrasi, pembelajaran, komunikasi, dan citra sekolah.
**Tujuan:**
1. Presensi otomatis dan cepat (barcode Kartu Pelajar ±1 detik per siswa), dengan presensi wajah sebagai cadangan yang bisa membedakan siswa kembar.
2. Data terpusat dengan hak akses berbasis peran.
3. Pembelajaran digital: tugas, kuis, ujian anti-nyontek, rapor digital.
4. Transparansi keuangan kelas dan dana sosial.
5. Dashboard analitik untuk kepala sekolah, termasuk tren kehadiran mingguan per kelas.
6. Tetap bisa dipakai saat jaringan putus atau lelet (mode offline dengan sinkronisasi otomatis).
7. Etalase digital sekolah: profil, galeri, struktur organisasi, PPDB online.

### 3. Sasaran / Penerima Manfaat
Kepala Sekolah, Staff TU, Guru & Wali Kelas, Admin Absensi, Admin Perpustakaan, Siswa (termasuk Ketua Kelas, Ketua OSIS, Bendahara), orang tua (informasi kehadiran via siswa/email), dan masyarakat/calon siswa (halaman publik & PPDB).

### 4. Ruang Lingkup Pekerjaan
1. Analisis kebutuhan dan perancangan (PRD, BPMN, ERD).
2. Pengembangan aplikasi web full-stack (React, FastAPI, MongoDB) dengan 16 kelompok modul (lihat 01_REKAP_FITUR).
3. Integrasi perangkat: scanner barcode USB (HID), webcam untuk presensi wajah, printer kartu.
4. Otomasi terjadwal: pengingat absen 08:00, auto-alpa 09:00, arsip mingguan, pengingat kas, pengingat piket.
5. Mode hybrid online/offline (PWA, antrean lokal, sinkron otomatis).
6. Integrasi email (Brevo SMTP).
7. Deploy ke VPS sekolah (Ubuntu 22.04, Nginx, HTTPS, systemd, crontab), backup harian, dan script update.
8. Dokumentasi, pelatihan operator, dan presentasi.

### 5. Keluaran (Output)
- Aplikasi web produksi di https://sman1laguboti.web.id yang dapat di-install sebagai aplikasi (PWA).
- Kode sumber di GitHub (branch rilis main17).
- Dokumen: Rekap Fitur, TOR, PRD, BPMN, ERD, slide presentasi, panduan deploy/update VPS.
- Akun Super Admin dan panduan operasional.

### 6. Hasil yang Diharapkan (Outcome)
- Waktu presensi pagi turun dari ±15 menit per kelas menjadi beberapa detik per siswa di gerbang.
- Rekap absensi tersedia real-time. Siswa tanpa kabar otomatis diingatkan, lalu ditandai Alpa.
- Tidak ada data hilang saat jaringan putus.
- Keputusan kepala sekolah berbasis data (grafik kehadiran per kelas per minggu).
- Partisipasi siswa meningkat melalui Schoolgram, poin, dan papan peringkat.

### 7. Spesifikasi Teknis Minimum
- Server: VPS Ubuntu 22.04, 2 vCPU, RAM 2–4 GB (+ swap 2 GB), disk 40 GB, domain + SSL.
- Klien: browser Chrome/Edge terbaru. Laptop gerbang + scanner barcode USB. Webcam 720p untuk presensi wajah.
- Keamanan: HTTPS wajib, cookie httpOnly Secure, MongoDB hanya localhost, secret di file .env (tidak di repo).

### 8. Metode Pelaksanaan
Agile/iteratif per branch rilis (main10 … main17). Tiap iterasi: kebutuhan → pengembangan → uji otomatis (backend & antarmuka) → simpan ke GitHub → update VPS.

### 9. Jadwal Indikatif
| Tahap | Kegiatan |
|---|---|
| Iterasi awal | Akun, kelas, presensi barcode, tugas/kuis, kas, inventaris |
| Iterasi menengah | Perpustakaan, PPDB, e-voting, kartu pelajar, Schoolgram, rapor |
| main15–main16 | Presensi wajah, piket gerbang, ujian anti-nyontek, chat, poin, log aktivitas |
| main17 | Mode offline, pembeda wajah kembar, hapus riwayat absensi, grafik mingguan, roster baru, Schoolgram baru |
| Berikutnya | Aktivasi email Brevo penuh, notifikasi orang tua, absensi offline dengan nama siswa |

### 10. Pembiayaan (komponen)
Sewa VPS dan domain per tahun, scanner barcode per gerbang, webcam, kertas/printer kartu. Email Brevo gratis (300 email/hari). Biaya AI opsional.

### 11. Penutup
TOR ini menjadi acuan pengembangan, operasional, dan evaluasi sistem SMANSALA.
