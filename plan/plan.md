# Impor & Setup Website Sekolah — SMA Negeri 1 Laguboti (branch main27)

Sistem manajemen sekolah berbasis web yang sudah ada di GitHub (`boassibarani123-a11y/Website-Sekolah`, branch `main27`) dipindahkan ke workspace ini, semua dependensi dipasang, dan aplikasi dijalankan apa adanya.
Tidak ada fitur baru yang dibuat; tujuannya aplikasi bisa dibuka, login berhasil, dan fitur yang sudah ada berjalan seperti di repo.

## Untuk siapa
- Pemilik proyek / pengelola sekolah yang melanjutkan pengembangan di workspace baru.
- Seluruh peran pengguna yang sudah ada di aplikasi: super admin, kepala sekolah, staff TU, guru/wali kelas, siswa, ketua kelas, ketua OSIS, admin perpustakaan, dan piket gerbang.

## Fitur & pengalaman inti (yang sudah ada di repo, dijalankan apa adanya)
- Akun multi-peran, impor siswa massal dari Excel, foto profil.
- Absensi QR/barcode dan Face ID, monitor gerbang, Izin Keluar, absensi guru, rekap rentang tanggal dan arsip Excel.
- Kelas: materi, jadwal, rekap, papan peringkat, rapor ringkas, agenda, denah duduk, diskusi, tugas, mini-quiz.
- Ujian online "Vortex Guard", Bank Soal, Pengajuan Ujian, Ujian Massal.
- Perpustakaan, inventaris, uang kas & dana sosial, Pemilu OSIS, Schoolgram, galeri & prestasi, PPDB, kartu pelajar (cetak massal), struktur organisasi, pengumuman, kritik & saran, piket guru & TV piket, kunjungan tamu, notifikasi, kalender, analitik, pengaturan sekolah.
- Kelas Live (video conference terjadwal) — tampilan, jadwal, absensi live, dan pemantau siap; video baru mengalir setelah kunci server LiveKit diisi (lihat Asumsi).
- Pengingat terjadwal (absensi, auto-alpha, arsip mingguan, uang kas, piket) tetap seperti di repo.

## Alur pengguna
1. Buka halaman aplikasi di URL preview.
2. Login sebagai super admin: `boassibarani123@gmail.com` / password yang sudah diberikan.
3. Super admin membuat/impor akun guru, siswa, dan peran lain, lalu mengatur data sekolah.
4. Pengguna lain login sesuai perannya dan memakai menu masing-masing.

## Nuansa UI/UX
- Tampilan, warna, dan tata letak tidak diubah — sama persis dengan yang ada di repo.

## Tahapan implementasi
- **Tahap 1 (MVP, dikerjakan sekarang):** ambil kode branch `main27`, pasang semua dependensi backend & frontend, isi konfigurasi lingkungan, buat super admin dari kredensial yang diberikan, jalankan aplikasi, lalu cek halaman utama, login, dan beberapa menu utama berjalan.
- **Tahap 2:** aktifkan email (Brevo atau SMTP) dan hubungkan Kelas Live ke server LiveKit di VPS setelah kuncinya diberikan.
- **Tahap 3:** aktifkan fitur AI pembuat soal / asisten bila diinginkan, dan perbaikan/penambahan fitur sesuai permintaan berikutnya.

## Asumsi
- Database dimulai kosong (tidak ada data produksi yang dipindahkan); hanya akun super admin yang dibuat otomatis.
- Super admin: `boassibarani123@gmail.com` dengan password yang diberikan; password ini disimpan sebagai konfigurasi rahasia, bukan di kode. Password ini disarankan diganti setelah login pertama.
- **Kunci LiveKit tidak ada di repo.** Script `setup-livekit-vps.sh` membuat API key & secret secara acak langsung di VPS (tersimpan di `/etc/livekit/livekit.yaml` dan `.env` backend di VPS). Karena itu Kelas Live disiapkan tetapi video belum aktif sampai Anda mengirim: alamat `wss://live.domain-anda`, alamat `https://live.domain-anda`, `LIVEKIT_API_KEY`, dan `LIVEKIT_API_SECRET` dari VPS.
- Email memakai "penyedia lain" sesuai pilihan; aplikasi sudah mendukung Brevo/SMTP. Email tetap nonaktif sampai kunci Brevo atau data SMTP diberikan — fitur lain tidak terpengaruh.
- Fitur AI tetap nonaktif sesuai pilihan.
- File unggahan (foto, video ≤30MB, lampiran) disimpan di penyimpanan lokal seperti di repo.
- Pengingat terjadwal memakai definisi jadwal yang sudah ada di repo (WIB).
- Kunci rahasia baru (penanda login dan kunci pengingat terjadwal) dibuat otomatis untuk workspace ini.
