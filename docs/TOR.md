# TOR — Kerangka Acuan Kerja (Terms of Reference)
**Kegiatan:** Pengembangan & Operasional Sistem Informasi Manajemen Sekolah SMA Negeri 1 Laguboti

## 1. Latar Belakang
Proses absensi, pembelajaran, ujian, dan administrasi sekolah masih tersebar. Sekolah juga memerlukan pembelajaran
jarak jauh yang dapat diaktifkan saat terjadi musibah dan dimatikan saat kembali tatap muka. Diperlukan sistem
terpadu berbasis web yang berjalan di server milik sekolah.

## 2. Maksud dan Tujuan
- **Maksud:** menyediakan satu platform digital bagi seluruh warga sekolah.
- **Tujuan:** meningkatkan akurasi absensi, efisiensi administrasi, kualitas evaluasi (ujian online anti-curang), dan
  kesinambungan belajar (Kelas Live terjadwal).

## 3. Sasaran
900 siswa, guru dan tenaga kependidikan, kepala sekolah, serta masyarakat (PPDB, tamu, galeri publik).

## 4. Ruang Lingkup Pekerjaan
1. Pengembangan aplikasi web (frontend React, backend FastAPI, database MongoDB) — seluruh modul pada `docs/REKAP_FITUR.md`.
2. Server video Kelas Live self-hosted (LiveKit open-source) untuk 22 kelas paralel.
3. Instalasi di VPS sekolah (Nginx, HTTPS, systemd, cron) — `PANDUAN_DEPLOY_VPS.pdf`.
4. Migrasi data awal (impor siswa Excel), pembuatan akun.
5. Pelatihan pengguna (admin, guru, piket) dan dokumentasi.
6. Pemeliharaan: backup database harian, pembaruan keamanan.

## 5. Keluaran (Deliverables)
| No | Keluaran |
|---|---|
| 1 | Source code lengkap + `project-backup.zip` |
| 2 | Dokumen: Rekap Fitur, PRD, ERD, BPMN, TOR, PROJECT_CONTEXT |
| 3 | Panduan deploy VPS (PDF) + script otomatis (`scripts/setup-vps.sh`, `scripts/setup-livekit-vps.sh`) |
| 4 | Uji otomatis (pytest, uji jadwal Kelas Live) |
| 5 | Aplikasi berjalan di domain sekolah dengan HTTPS |

## 6. Spesifikasi Teknis Minimum Server
| Komponen | Spesifikasi |
|---|---|
| OS | Ubuntu 22.04 LTS |
| CPU / RAM | 8 vCPU / 16 GB (dengan Kelas Live); 2 vCPU / 4 GB tanpa Kelas Live |
| Disk | ≥ 100 GB SSD (unggahan video & backup) |
| Jaringan | ≥ 1 Gbps, IP publik, port 80/443, 7881/tcp, 3478/udp, 5349/tcp, 50000–60000/udp |
| Domain | 1 domain website + 1 subdomain video (mis. `live.domain.sch.id`) |

## 7. Pelaksana & Tanggung Jawab
| Pihak | Tanggung jawab |
|---|---|
| Kepala sekolah | Penanggung jawab, keputusan buka/tutup Kelas Live |
| Super admin / operator | Instalasi, akun, backup, pemantauan |
| Guru | Mengisi jadwal, materi, ujian, menjadi host Kelas Live |
| Pengembang | Perbaikan & pengembangan fitur |

## 8. Jadwal Pelaksanaan (indikatif)
| Tahap | Durasi |
|---|---|
| Persiapan server & domain | 1 minggu |
| Instalasi & konfigurasi | 1 minggu |
| Impor data & uji coba terbatas | 2 minggu |
| Pelatihan & go-live | 1 minggu |
| Pemeliharaan | berkelanjutan |

## 9. Indikator Keberhasilan
Seluruh modul dapat diakses lewat HTTPS; absensi harian tercatat; ujian online berjalan tanpa gangguan; Kelas Live
menutup sesi tepat waktu dan mencatat kehadiran otomatis; backup harian tersedia.

## 10. Risiko & Mitigasi
| Risiko | Mitigasi |
|---|---|
| Jaringan sekolah memblokir UDP | TURN/TCP otomatis di server video |
| Kehilangan data | `mongodump` harian + salin folder `uploads` |
| Kebocoran kredensial | Rahasia hanya di `.env` server; ganti password admin awal |
| Beban puncak ujian/live | VPS sesuai spesifikasi, 1 proses backend asinkron, simulcast video |
