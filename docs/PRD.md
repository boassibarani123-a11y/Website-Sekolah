# PRD — Product Requirements Document
**Produk:** Sistem Manajemen Sekolah SMA Negeri 1 Laguboti · **Versi dokumen:** Juni 2026

## 1. Latar Belakang
Sekolah membutuhkan satu platform untuk absensi, pembelajaran, ujian, administrasi, dan komunikasi warga sekolah,
termasuk kemampuan belajar jarak jauh (Kelas Live) ketika sekolah tidak bisa tatap muka (mis. musibah), yang dapat
dinonaktifkan saat kembali normal dan diaktifkan lagi kapan pun.

## 2. Tujuan
1. Absensi siswa & guru akurat dan cepat (QR/barcode, Face ID, otomatis dari Kelas Live).
2. Kegiatan kelas, tugas, dan ujian online yang aman dari kecurangan.
3. Administrasi sekolah (inventaris, perpustakaan, keuangan kelas, PPDB, tamu) terdigitalisasi.
4. Pembelajaran jarak jauh terjadwal yang berjalan di server sekolah sendiri, tanpa layanan pihak ketiga.

## 3. Pengguna (Persona)
| Persona | Kebutuhan utama |
|---|---|
| Super admin | Mengelola akun, pengaturan, seluruh data |
| Kepala sekolah | Pemantauan (analitik, Papan Pemantau Live), persetujuan tamu, buka/tutup Kelas Live |
| Staff TU | Akun, data siswa, kartu pelajar, inventaris |
| Guru / wali kelas | Kelas, materi, tugas, ujian, absensi, host Kelas Live |
| Siswa / ketua kelas / ketua OSIS | Belajar, ujian, absensi, Schoolgram, uang kas, pemilu |
| Admin perpustakaan | Katalog & peminjaman |
| Piket gerbang | Scan absensi, izin keluar, tamu |

## 4. Kebutuhan Fungsional (ringkas)
Lihat `docs/REKAP_FITUR.md` untuk daftar lengkap. Kebutuhan kunci Kelas Live:
- FR-L1 Ruang live terbuka otomatis sesuai Jadwal Pelajaran dan tertutup tepat saat jam habis (semua peserta diputus).
- FR-L2 Hanya guru pengampu jam aktif yang menjadi host; guru lain diblokir; hanya siswa kelas tersebut yang boleh masuk.
- FR-L3 Wali kelas, kepala sekolah, super admin dapat masuk sebagai pemantau.
- FR-L4 Notifikasi real-time saat guru bergabung; indikator "Guru belum bergabung" setelah 10 menit.
- FR-L5 Kontrol host: bisukan semua, bagikan layar, kunci ruang, keluarkan peserta, akhiri sesi, +5 menit (tidak menggeser mapel berikutnya).
- FR-L6 Chat (markdown, link, pengumuman guru), angkat tangan, reaksi, jadwal & mapel berikutnya.
- FR-L7 Absensi otomatis per mapel dari kehadiran live + unduh CSV.
- FR-L8 Papan Pemantau untuk kepala sekolah.
- FR-L9 Saklar Buka/Tutup seluruh sekolah + mode per kelas (ikuti / selalu buka / tutup).

## 5. Kebutuhan Non-Fungsional
| Kode | Kebutuhan |
|---|---|
| NFR-1 | Keamanan: kunci API hanya di backend `.env`; JWT httpOnly; RBAC di setiap endpoint |
| NFR-2 | Kapasitas Kelas Live: 900 siswa aktif di 22 kelas paralel (simulcast, adaptive stream) pada VPS 8 vCPU/16 GB |
| NFR-3 | Ketepatan jadwal: pemutusan sesi ≤ 2 detik setelah jam selesai (terukur ±1 detik) |
| NFR-4 | Zona waktu WIB (Asia/Jakarta) untuk semua jadwal |
| NFR-5 | Responsif desktop & ponsel; bahasa Indonesia |
| NFR-6 | Self-hosted: MongoDB, file unggahan, dan server video di VPS sekolah |

## 6. Ruang Lingkup Tidak Termasuk
Rekaman sesi live, aplikasi mobile native, integrasi pembayaran.

## 7. Metrik Keberhasilan
Kehadiran tercatat otomatis ≥ 95% sesi; guru bergabung ≤ 10 menit; tidak ada akses lintas kelas; uptime ≥ 99%.

## 8. Status & Backlog
Riwayat implementasi lengkap: `memory/PRD.md`.
Backlog: aktifkan AI & email, rekaman sesi live, kuis di dalam live, pengumuman otomatis saat Kelas Live dibuka.
