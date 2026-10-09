# Import & Setup — Website Sekolah (SMA Negeri 1 Laguboti), branch main14

Memindahkan aplikasi manajemen sekolah yang sudah ada dari GitHub (branch `main14`) ke lingkungan ini lalu menjalankannya.
Kode dipakai apa adanya, dan hasilnya jadi titik awal untuk perbaikan dan fitur baru berikutnya.

## Untuk siapa
- Pemilik proyek, yang ingin melanjutkan pengembangan dari versi main14.
- Pengguna aplikasi: Super Admin, Kepala Sekolah, Staff TU, Guru, Siswa, Ketua OSIS, Ketua Kelas.

## Fitur inti (sudah ada di repo, dijalankan apa adanya)
- Dashboard untuk beberapa peran, manajemen akun (filter peran/status, edit, hapus, nonaktifkan akun), halaman profil.
- Presensi QR/barcode dengan log langsung (live), leaderboard, Guru & Staff (tampilan kartu/tabel, tombol WhatsApp).
- Schoolgram, inventaris, tugas & kuis, uang kas/dana sosial, pemilihan OSIS, galeri prestasi, pengumuman.
- Cetak kartu pelajar, pendaftaran PPDB publik, struktur organisasi, perpustakaan, laporan, kalender.

## Alur pengguna (yang diverifikasi setelah setup)
1. Buka website → halaman publik/login tampil.
2. Login sebagai Super Admin → masuk dashboard.
3. Buka beberapa menu utama → halaman tampil tanpa error.

## Tampilan
Tidak ada perubahan desain; tampilan mengikuti kode di branch main14.

## Tahapan
- **Tahap 1 (dikerjakan sekarang):** Ambil branch main14, pasang semua dependensi backend & frontend (termasuk paket yang sering terlewat: react-easy-crop, react-barcode, html2canvas, jspdf, html5-qrcode), isi konfigurasi, jalankan, lalu cek login Super Admin dan alur utama.
- **Tahap 2:** Melanjutkan fitur baru yang sedang dibuat di main13 (rinciannya perlu Anda sampaikan ulang di chat, karena percakapan sebelumnya tidak terbawa ke sini).
- **Tahap 3:** Mengaktifkan AI (Schoolgram generate, AI assistant) dan email SMTP (reset password, notifikasi presensi) saat kuncinya sudah ada.

## Asumsi
- Kunci rahasia (JWT secret) dibuat acak secara otomatis, dan akun Super Admin default dibuat lalu dicatat untuk Anda (Anda menjawab "gatau", jadi opsi yang direkomendasikan dipakai).
- Fitur AI dan email dibiarkan nonaktif; bagian lain aplikasi tetap berjalan normal.
- Kode main14 dianggap versi terbaru; tidak ada penggabungan dengan main13 atau main.
- Database mulai kosong (data dari server lama tidak ikut dipindah), kecuali akun admin awal.
- Tidak ada perubahan fitur atau desain di Tahap 1; bug yang menghalangi aplikasi berjalan atau login tetap diperbaiki.
