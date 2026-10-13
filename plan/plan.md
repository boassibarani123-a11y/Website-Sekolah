# Import Website Sekolah SMAN 1 Laguboti + Pengembangan Sistem Ujian "Vortex Guard"

Website sekolah SMAN 1 Laguboti diimpor dari GitHub (branch `main19`), dipasang, dan dijalankan lengkap dengan data bawaan.
Sistem ujian online di dalamnya diberi identitas "Vortex Guard" dan fitur ujian yang belum selesai dilanjutkan.

## Untuk Siapa
- Admin sekolah: kelola konten website, akun siswa, dan ujian.
- Guru: membuat dan mengelola soal serta melihat hasil ujian.
- Siswa (500+ akun bawaan): login dan mengerjakan ujian.

## Fitur Inti & Pengalaman
- Seluruh kode repo dipakai apa adanya; semua dependensi backend dan frontend dipasang.
- Data bawaan dimuat: akun admin, 500+ akun siswa, dan konten yang sudah ada.
- Integrasi Brevo SMTP (email) dan AI perpustakaan/kuis tetap ada di kode, tetapi baru aktif setelah kredensial diisi. Tanpa kredensial, aplikasi tetap berjalan.
- Sistem ujian ditampilkan dengan nama **Vortex Guard** (logo teks, judul halaman, header ujian).
- Melanjutkan fitur ujian yang belum selesai, termasuk:
  - Buat/edit ujian: judul, mapel, kelas tujuan, durasi, jadwal mulai–selesai, token ujian.
  - Bank soal: pilihan ganda dan esai, acak urutan soal dan opsi.
  - Halaman pengerjaan: timer, navigasi nomor soal, tanda ragu-ragu, simpan jawaban otomatis.
  - Pengawasan dasar ("Guard"): deteksi pindah tab/keluar layar penuh, dicatat sebagai pelanggaran dan terlihat oleh pengawas.
  - Penilaian otomatis pilihan ganda, nilai esai diinput guru, rekap nilai per ujian.

## Alur Pengguna
1. Admin/guru login → membuka Vortex Guard → membuat ujian dan soal → menerbitkan dengan jadwal dan token.
2. Siswa login → melihat daftar ujian aktif → memasukkan token → mengerjakan dalam batas waktu → mengumpulkan.
3. Guru melihat hasil, menilai esai, dan meninjau catatan pelanggaran.

## Nuansa UI/UX
- Website sekolah tetap mengikuti desain yang sudah ada di repo.
- Vortex Guard memakai tampilan yang fokus dan tenang untuk ujian: sedikit gangguan, timer yang jelas, dan identitas Vortex Guard yang konsisten.

## Tahap Implementasi
- **Tahap 1 (MVP, dikerjakan sekarang):** import branch `main19`, pasang dependensi, muat data bawaan, aplikasi berjalan di preview; ganti nama sistem ujian menjadi Vortex Guard; selesaikan alur ujian inti (buat ujian & soal, mengerjakan dengan timer dan simpan otomatis, deteksi pindah tab, nilai otomatis PG, rekap nilai).
- **Tahap 2:** penilaian esai yang lebih lengkap, ekspor nilai (Excel/PDF), dasbor pengawas real-time, dan aktivasi email Brevo setelah kredensial tersedia.
- **Tahap 3:** pembuatan soal/kuis dengan bantuan AI, notifikasi WhatsApp, analisis butir soal, dan statistik hasil ujian.

## Asumsi
- Nama sistem ditulis "Vortex Guard" (dari "vortex_gruad"); di kode dipakai `vortex_guard`.
- Fitur ujian yang sudah ada di repo dipertahankan dan dilengkapi, tidak dibangun ulang dari nol.
- Kredensial Brevo SMTP dan OpenAI dibiarkan kosong; fitur terkait menampilkan status "belum dikonfigurasi" alih-alih error.
- Akun login memakai kredensial bawaan dari seed repo; akun tersebut dicatat untuk pengujian.
- Skrip deploy VPS di repo tidak dijalankan; aplikasi hanya dijalankan di lingkungan preview.
- Peran yang dipakai: Admin, Guru, Siswa. Guru ditambahkan jika repo belum punya peran itu.
