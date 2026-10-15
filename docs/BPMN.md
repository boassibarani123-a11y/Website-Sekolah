# BPMN — Alur Proses Bisnis Utama

Notasi: diagram alur gaya BPMN (swimlane = subgraph per pelaku). Dapat dilihat langsung di GitHub (mermaid).

## 1. Kelas Live Terjadwal
```mermaid
flowchart LR
  subgraph Sistem
    A((Jam mapel mulai)) --> B[Buka sesi live sesuai Jadwal Pelajaran]
    B --> C{Kelas Live dibuka?}
    C -- Tidak --> Z[Tampilkan ZOOM DITUTUP]
    H((Jam mapel selesai)) --> I[Tutup sesi + hapus room di SFU]
    I --> J[Putus semua peserta + kirim notifikasi]
    J --> K[Buka sesi mapel berikutnya]
  end
  subgraph Guru_Pengampu
    D[Masuk sebagai host] --> E[Notifikasi ke siswa: guru bergabung]
    E --> F[Mengajar: layar, bisukan semua, kunci, +5 menit]
  end
  subgraph Siswa
    G[Gabung kelas live] --> G2[Tercatat HADIR otomatis]
  end
  subgraph Kepala_Sekolah
    M[Pantau semua kelas di Papan Pemantau]
    N[Buka/Tutup Kelas Live]
  end
  C -- Ya --> D
  C -- Ya --> G
  F --> H
```

## 2. Absensi Gerbang (QR / Face ID)
```mermaid
flowchart LR
  subgraph Siswa
    A[Datang ke gerbang] --> B[Scan kartu QR / wajah]
  end
  subgraph Sistem
    B --> C{Terdaftar?}
    C -- Tidak --> X[Tolak + pesan]
    C -- Ya --> D{Sebelum batas jam?}
    D -- Ya --> E[Catat HADIR]
    D -- Tidak --> F[Catat TERLAMBAT]
    G((08:00)) --> H[Kirim pengingat]
    I((09:00)) --> J[Tandai ALPHA yang belum absen]
    K((Senin 01:00)) --> L[Arsip Excel mingguan]
  end
  subgraph Piket_Gerbang
    M[Pantau Monitor Gerbang]
  end
  E --> M
  F --> M
```

## 3. Pengajuan & Pelaksanaan Ujian (Vortex Guard)
```mermaid
flowchart LR
  subgraph Guru
    A[Susun soal / ambil dari Bank Soal] --> B[Ajukan ujian]
  end
  subgraph Super_Admin
    B --> C{Disetujui?}
    C -- Tidak --> D[Tolak + alasan]
    C -- Ya --> E[Buat ujian massal per kelas]
  end
  subgraph Siswa
    E --> F[Masuk dengan token]
    F --> G[Kerjakan: soal & opsi diacak, autosave]
    G --> H[Kirim jawaban]
  end
  subgraph Sistem
    G --> V[Deteksi pelanggaran -> pengawas live]
    H --> I[Nilai otomatis + analisis butir]
  end
  I --> J[Guru menilai esai & melihat analisis]
```

## 4. Izin Keluar (IK)
```mermaid
flowchart LR
  subgraph Siswa
    A[Ajukan izin keluar]
  end
  subgraph Guru_Wali
    A --> B{Setujui?}
  end
  subgraph Piket_Gerbang
    B -- Ya --> C[Scan keluar] --> D[Scan kembali]
  end
  B -- Tidak --> E[Siswa diberi tahu]
```

## 5. Kunjungan Tamu
```mermaid
flowchart LR
  subgraph Tamu
    A[Lihat jam kunjungan di /info-tamu] --> B[Datang]
  end
  subgraph Piket_Gerbang
    B --> C[Catat tamu] --> D{Dalam jam kunjungan?}
    D -- Ya --> E[Izinkan masuk]
    G[Catat keluar]
  end
  subgraph Kepala_Sekolah
    D -- Tidak --> F{Setujui?}
  end
  F -- Ya --> E
  F -- Tidak --> H[Tolak]
  E --> G
```

## 6. Peminjaman Buku
```mermaid
flowchart LR
  subgraph Siswa
    A[Cari buku / reservasi] --> B[Ajukan pinjam]
  end
  subgraph Admin_Perpustakaan
    B --> C[Catat peminjaman] --> D[Terima pengembalian]
    D --> E{Terlambat?}
    E -- Ya --> F[Hitung denda]
  end
  D --> G[Siswa beri ulasan]
```

## 7. PPDB
```mermaid
flowchart LR
  subgraph Calon_Siswa
    A[Isi formulir PPDB publik]
  end
  subgraph Admin
    A --> B[Verifikasi berkas] --> C{Diterima?}
    C -- Ya --> D[Umumkan diterima / buat akun siswa]
    C -- Tidak --> E[Umumkan ditolak]
  end
```
