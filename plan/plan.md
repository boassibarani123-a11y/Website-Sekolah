# Import & Setup: Website Sekolah (branch main16)

Memindahkan aplikasi Website Sekolah yang sudah ada dari GitHub (branch `main16`) ke workspace ini, memasang semua dependensinya, lalu menjalankannya.
Kode aplikasinya tidak dibangun ulang dan tidak didesain ulang. Tujuannya agar aplikasi yang sudah ada jalan lagi seperti sebelumnya.

## Untuk siapa
- Pemilik proyek/admin sekolah yang ingin melanjutkan pengembangan atau deploy dari branch `main16`.
- Pengguna aplikasi (admin, kepala sekolah, staff TU, guru, admin absensi, siswa) mendapatkan fitur yang sama seperti sebelumnya.

## Fitur dan pengalaman inti (yang sudah ada di repo, dibawa apa adanya)
- Login berdasarkan peran dan dashboard per peran.
- Presensi Barcode (dukungan scanner USB, mode layar penuh, riwayat scan langsung).
- Presensi Wajah, Daftar Wajah Siswa, Mode Per Kelas, dan status wajah di Kelola Akun.
- Piket Gerbang: jadwal, check-in, laporan bulanan, dan ekspor Excel.
- Ujian anti-nyontek, Rapor Digital, chat, sistem poin, dan log aktivitas admin.
- Notifikasi di dalam aplikasi dan pengingat terjadwal (termasuk pengingat piket).

## Alur pengguna (setelah setup)
1. Buka URL preview, lalu login dengan akun admin default.
2. Dashboard tampil dengan menu sesuai peran.
3. Buka Presensi Barcode, masukkan atau scan NISN, dan hasilnya muncul di tabel riwayat.

## Nuansa UI/UX
- Tampilan tetap sama seperti di repo. Desain tidak diubah.

## Tahapan implementasi
**Fase 1 (MVP, dikerjakan sekarang): Import & jalankan**
- Ambil seluruh isi branch `main16` dan pasang dependensi backend dan frontend.
- Sesuaikan konfigurasi lingkungan agar cocok dengan workspace ini (database dan URL backend).
- Matikan sementara pengiriman email (SMTP Brevo). Notifikasi di dalam aplikasi tetap aktif.
- Jalankan seed bawaan repo untuk akun admin default dan catat login-nya.
- Uji alur utama: login, dashboard, dan presensi barcode. Perbaiki hanya error yang menghalangi aplikasi berjalan.

**Fase 2: Aktifkan integrasi**
- Isi kredensial SMTP Brevo agar email (pengingat, rapor) terkirim.
- Pastikan pengingat terjadwal berjalan.

**Fase 3: Verifikasi menyeluruh & deploy**
- Uji semua modul (wajah, piket, ujian, rapor, chat).
- Lanjutkan ke deploy (Emergent atau VPS sesuai panduan di repo).

## Asumsi
- Yang dipakai adalah branch `main16` sebagaimana adanya, bukan `main`, meskipun `main16` tertinggal 12 commit dari `main`.
- Email dimatikan sampai kunci Brevo diberikan. Tidak ada fitur yang dihapus.
- Database dimulai kosong, lalu diisi akun admin dari seed bawaan repo. Data lama tidak ikut dipindahkan.
- Kamera dan scanner fisik tidak bisa diuji di lingkungan ini. Presensi wajah hanya dicek sampai halamannya bisa dibuka.
- Kode tidak direfaktor dan fitur baru tidak ditambahkan, kecuali perbaikan minimal yang diperlukan agar aplikasi bisa berjalan.
