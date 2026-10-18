# Rekap Fitur — Website SMA Negeri 1 Laguboti

Dokumen ini merangkum seluruh fitur yang ada di source code (backend `server.py` + `live_class.py`, frontend `src/pages`).
Peran: **SA** super admin · **KS** kepala sekolah · **TU** staff TU · **GR** guru/wali kelas · **SW** siswa · **KK** ketua kelas · **OS** ketua OSIS · **PP** admin perpustakaan · **PG** piket gerbang.

## 1. Akun & Keamanan
| Fitur | Peran | Menu / Halaman |
|---|---|---|
| Login JWT (cookie httpOnly / Bearer), kunci sementara setelah gagal berkali-kali | Semua | `/login` |
| Kelola akun multi-peran, impor siswa massal dari Excel | SA, TU | Kelola Akun (`MasterAccounts`) |
| Lupa password (email / permintaan reset ke admin), ganti password | Semua | `/forgot-password`, Permintaan Reset |
| Foto profil mandiri, profil publik, prestasi profil | Semua | Profil |
| Guru & Staff: jabatan, penugasan wali kelas / guru mapel | SA, TU | Guru & Staff |
| Audit log aktivitas penting | SA | (backend `audit_logs`) |

## 2. Absensi
| Fitur | Peran | Menu |
|---|---|---|
| Absensi QR/barcode di gerbang + stasiun scanner (heartbeat) | PG, SA | Absensi Barcode |
| Absensi Face ID (daftar wajah + pencocokan) | PG, SA | Absensi Face ID, Daftar Wajah |
| Monitor gerbang masuk/keluar, Izin Keluar (IK) dengan persetujuan | PG, GR, KS | Monitor Gerbang, Izin Keluar |
| Absensi guru (scan/manual), rekap bulanan | SA, KS, TU | Absensi Guru |
| Absensi harian, rekap mingguan, rekap rentang tanggal, arsip Excel otomatis | SA, KS, GR | Absensi Guru & Siswa, Absensi Harian |
| Konfirmasi absensi via tautan, alpha otomatis 09:00, pengingat 08:00 (cron) | Sistem | — |
| Hapus data scan (per baris / hari ini) | SA, PG | Absensi Barcode |

## 3. Kelas
| Fitur | Peran |
|---|---|
| Ruang kelas: materi (file/video ≤30MB), jadwal, agenda, pengumuman kelas, denah duduk, diskusi, rapor ringkas, papan peringkat, rekap absensi, BPH kelas, uang kas | GR, SW, KK |
| Jadwal Pelajaran (timetable) lintas kelas, pengecekan bentrok | SA, TU, GR |
| **Kelas Live** (video conference terjadwal, self-hosted LiveKit) | GR, SW, KS, SA |
| **Absensi dari Live**: siswa yang masuk sesi live otomatis *hadir* per mapel, durasi, unduh CSV | GR, KS, SA |
| **Pemantau Kelas Live**: satu layar status semua kelas, guru online/terlambat, siswa online, kehadiran | KS, SA |
| Buka/Tutup Kelas Live seluruh sekolah + mode per kelas ("ZOOM DITUTUP") | KS, SA |

## 4. Pembelajaran & Ujian
| Fitur | Peran |
|---|---|
| Tugas + pengumpulan + penilaian | GR, SW |
| Mini-quiz (sesi, kunci, percobaan) | GR, SW |
| Ujian online **Vortex Guard**: token, anti-curang (pelanggaran), pengawas live, autosave, analisis butir, paket acak, acak soal/opsi per siswa | GR, SW, SA |
| Bank Soal manual + dari analisis ujian | GR, SA |
| Pengajuan Ujian (guru → super admin → buat ujian massal per kelas), jenis Harian/UTS/UAS/Try Out | GR, SA |
| AI pembuat soal / ringkasan / asisten (**nonaktif** sampai kunci diisi) | GR |

## 5. Sekolah & Administrasi
| Fitur | Peran |
|---|---|
| Informasi sekolah, pengaturan (logo, nama, tema), struktur organisasi (editor + publik) | SA |
| Pengumuman, notifikasi, kalender kegiatan, kritik & saran | Semua |
| Inventaris: ruang, barang (QR), peminjaman, log | SA, TU |
| Perpustakaan: katalog, peminjaman, reservasi, ulasan, konfigurasi denda | PP, SW |
| Uang kas kelas & dana sosial | KK, GR, SA |
| Pemilu OSIS: kandidat, voting, konfigurasi | OS, SA, SW |
| PPDB: formulir publik + admin | Publik, SA |
| Kartu pelajar (cetak massal PDF/JPG-ZIP) | SA, TU |
| Kunjungan tamu: jam kunjungan, halaman publik `/info-tamu`, persetujuan KS di luar jam | PG, KS |
| Piket guru, TV piket, pengingat shift | GR, SA |
| Poin siswa, papan peringkat | GR, SW |
| Analitik dashboard, laporan, dokumentasi, presentasi (PPTX) | SA, KS |

## 6. Sosial
| Fitur | Peran |
|---|---|
| Schoolgram: post, story, highlight, reels, follow, komentar, moderasi/takedown | Semua |
| Galeri publik, prestasi | Publik, SA |
| Chat | Semua |

## 7. Tugas Terjadwal (WIB)
| Endpoint | Jadwal |
|---|---|
| `POST /api/cron/attendance-reminder` | 08:00 tiap hari |
| `POST /api/cron/attendance-auto-alpha` | 09:00 tiap hari |
| `POST /api/cron/attendance-archive` | 01:00 tiap Senin |
| `POST /api/cron/kas-reminder` | 00:00 tanggal 1 |
| `POST /api/cron/piket-reminder` | tiap 15 menit |
| Penjadwal Kelas Live (di dalam backend) | tiap 1 detik |
