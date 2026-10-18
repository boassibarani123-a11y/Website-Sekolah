# Impor Website Sekolah SMA Negeri 1 Laguboti (branch main27)

Sistem manajemen sekolah yang sudah ada (absensi, kelas, ujian online, perpustakaan, Schoolgram, PPDB, Kelas Live, dan lainnya) diambil dari GitHub branch `main27` lalu dijalankan di workspace ini.
Kodenya dibiarkan apa adanya. Pekerjaan kali ini hanya memasang semua dependensi, mengatur konfigurasi, dan mengecek bahwa aplikasi bisa dipakai di preview.

## Untuk siapa
- Pemilik proyek yang ingin melanjutkan pengembangan dari branch `main27`.
- Semua peran yang sudah ada di aplikasi: super admin, kepala sekolah, staff TU, guru/wali kelas, siswa, ketua kelas, ketua OSIS, admin perpustakaan, dan piket gerbang.

## Fitur inti dan pengalaman
- Semua fitur di branch `main27` ikut terbawa tanpa perubahan. Tidak ada fitur baru dan tidak ada desain ulang.
- Login super admin di preview memakai email **boassibarani123@gmail.com**. Akun ini dibuat otomatis saat aplikasi pertama kali menyala.
- Jadwal otomatis yang sudah ada di repo tetap dipasang: pengingat absensi pukul 08.00, auto-alpha pukul 09.00, arsip absensi setiap Senin pukul 01.00, pengingat kas setiap tanggal 1, dan pengingat piket setiap 15 menit (semua WIB).
- File unggahan (foto, video, lampiran) disimpan di disk server, sama seperti sebelumnya.
- **AI pembuat soal: NONAKTIF.** Tombolnya tetap ada, tetapi belum bisa menghasilkan soal.
- **Email (reset password, pengingat): NONAKTIF.** Email tidak terkirim. Fitur lain tetap berjalan.
- **Video Kelas Live: tidak mengalir di preview** karena port media tidak terbuka. Jadwal, ruang, chat, kontrol host, absensi live, dan papan pemantau tetap bisa dibuka. Video baru berjalan penuh setelah dipasang di VPS.

## Alur pengguna
1. Buka URL preview, lalu masuk ke halaman login.
2. Login sebagai super admin.
3. Masuk ke dashboard, lalu buka menu sidebar mana saja. Semua halaman tampil tanpa error.
4. Halaman publik (misalnya `/info-tamu` dan PPDB) bisa dibuka tanpa login.

## Tampilan
Tampilan, warna, dan tata letak sama persis dengan yang ada di repo. Tidak ada perubahan visual.

## Tahapan
- **Tahap 1 (dikerjakan sekarang):** impor branch `main27`, pasang dependensi backend dan frontend, isi konfigurasi, siapkan akun super admin, nyalakan jadwal otomatis, lalu cek semua halaman sidebar dan halaman publik bisa terbuka.
- **Tahap 2:** fitur baru atau perbaikan sesuai permintaan Anda. AI pembuat soal dan email diaktifkan jika Anda sudah siap.
- **Tahap 3:** pindahkan data dan file unggahan produksi bila diperlukan, lalu publikasikan atau perbarui VPS (termasuk server video Kelas Live).

## Asumsi
- Database di preview masih kosong, jadi tidak ada data produksi yang ikut dibawa.
- Password super admin yang Anda berikan dicatat di catatan akun uji internal. Password ini tidak ditulis ke dalam kode.
- Jika ada dependensi yang bentrok saat dipasang, versinya disesuaikan secukupnya agar aplikasi bisa berjalan. Kode fitur tidak diubah.
- Kunci rahasia sistem (token login, rahasia cron) dibuat baru khusus untuk preview.
- Alamat server video Kelas Live dikosongkan di preview.
