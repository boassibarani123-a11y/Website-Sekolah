import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Printer, BookOpen, FileText, GitBranch, AlertTriangle, Rocket } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

/* ============================ KOMPONEN KECIL ============================ */
const Section = ({ id, icon: Icon, title, children, breakBefore = false }) => (
  <section id={id} className={`doc-section ${breakBefore ? "break-before-page" : ""}`}>
    <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 border-b-2 border-sky-600 pb-2 mb-4">
      <Icon className="w-5 h-5 text-sky-600 no-print" />{title}
    </h2>
    {children}
  </section>
);

const H3 = ({ children }) => <h3 className="font-bold text-slate-800 mt-5 mb-2">{children}</h3>;
const P = ({ children }) => <p className="text-sm text-slate-700 leading-relaxed mb-2">{children}</p>;
const UL = ({ items }) => (
  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 mb-3">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
);

const Table = ({ head, rows }) => (
  <div className="overflow-x-auto mb-4">
    <table className="w-full text-sm border border-slate-300">
      <thead>
        <tr className="bg-slate-800 text-white">
          {head.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold border border-slate-600">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
            {r.map((c, j) => <td key={j} className="px-3 py-2 border border-slate-200 align-top">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ============================ BPMN RENDERER ============================ */
const ACTOR_STYLE = {
  "Siswa": "bg-sky-100 text-sky-800 border-sky-300",
  "Guru": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "Ketua Kelas": "bg-violet-100 text-violet-800 border-violet-300",
  "Bendahara": "bg-teal-100 text-teal-800 border-teal-300",
  "Staff TU": "bg-amber-100 text-amber-800 border-amber-300",
  "Super Admin": "bg-rose-100 text-rose-800 border-rose-300",
  "Petugas Presensi": "bg-orange-100 text-orange-800 border-orange-300",
  "Sistem": "bg-slate-200 text-slate-800 border-slate-400",
};

const Arrow = () => (
  <div className="flex justify-center py-0.5" aria-hidden="true">
    <div className="w-px h-5 bg-slate-400 relative">
      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-[6px] border-t-slate-400" />
    </div>
  </div>
);

function FlowNode({ step }) {
  const badge = step.actor ? (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border mb-1 ${ACTOR_STYLE[step.actor] || ACTOR_STYLE["Sistem"]}`}>{step.actor}</span>
  ) : null;

  if (step.type === "start" || step.type === "end") {
    return (
      <div className="flex flex-col items-center">
        <div className={`px-5 py-1.5 rounded-full text-xs font-bold border-2 ${step.type === "start" ? "bg-emerald-500 border-emerald-600 text-white" : "bg-rose-500 border-rose-600 text-white"}`}>
          {step.label}
        </div>
      </div>
    );
  }
  if (step.type === "decision") {
    return (
      <div className="flex flex-col items-center">
        {badge}
        <div className="flex items-center gap-3">
          <div className="w-24 h-24 rotate-45 bg-amber-50 border-2 border-amber-500 flex items-center justify-center shrink-0">
            <p className="-rotate-45 text-[10px] font-bold text-amber-900 text-center leading-tight px-1">{step.label}</p>
          </div>
        </div>
        {(step.yes || step.no) && (
          <div className="mt-2 grid grid-cols-2 gap-4 text-[11px] w-full max-w-md">
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1"><b className="text-emerald-700">Ya →</b> <span className="text-slate-700">{step.yes}</span></div>
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1"><b className="text-rose-700">Tidak →</b> <span className="text-slate-700">{step.no}</span></div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      {badge}
      <div className="w-full max-w-md bg-white border-2 border-slate-300 border-l-4 border-l-sky-500 rounded-lg px-3 py-2 shadow-sm">
        <p className="text-[13px] font-semibold text-slate-800">{step.label}</p>
        {step.note && <p className="text-[11px] text-slate-500 mt-0.5">{step.note}</p>}
      </div>
    </div>
  );
}

function BpmnFlow({ title, desc, steps }) {
  return (
    <div className="bpmn-flow border border-slate-300 rounded-xl p-4 mb-6 bg-slate-50 break-inside-avoid">
      <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1"><GitBranch className="w-4 h-4 text-sky-600 no-print" />{title}</h4>
      <p className="text-xs text-slate-500 mb-4">{desc}</p>
      <div className="flex flex-col">
        {steps.map((s, i) => (
          <div key={i}>
            <FlowNode step={s} />
            {i < steps.length - 1 && <Arrow />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ DATA BPMN ============================ */
const FLOW_ABSENSI = [
  { type: "start", label: "Mulai — Jam masuk sekolah" },
  { actor: "Siswa", label: "Siswa menunjukkan Kartu Pelajar (QR) atau kartu barcode NISN di pos presensi" },
  { actor: "Petugas Presensi", label: "Pindai QR kamera / alat barcode USB", note: "Sistem mendukung dua metode: scan QR dari kamera, atau barcode scanner USB (keyboard-wedge) membaca NISN" },
  { actor: "Sistem", label: "Validasi identitas siswa", note: "Cocokkan kode QR / NISN dengan data akun siswa" },
  { actor: "Sistem", type: "decision", label: "Identitas valid?", yes: "Lanjut pencatatan kehadiran", no: "Tampilkan pesan gagal; petugas dapat memakai pencatatan Manual" },
  { actor: "Sistem", label: "Catat kehadiran (tanggal, jam, metode: QR / Barcode / Manual)", note: "Satu siswa hanya tercatat sekali per hari" },
  { actor: "Sistem", label: "Kirim notifikasi ke siswa & orang tua" },
  { actor: "Guru", label: "Guru/Admin memantau rekap & statistik kehadiran, ekspor Excel (kolom Metode)" },
  { type: "end", label: "Selesai" },
];

const FLOW_KAS = [
  { type: "start", label: "Mulai — Periode kas mingguan (Senin–Minggu WIB)" },
  { actor: "Siswa", label: "Siswa membayar iuran kas kepada Ketua Kelas / Bendahara" },
  { actor: "Bendahara", label: "Catat transaksi masuk di tab Uang Kas kelas", note: "Ketua Kelas dan Bendahara sama-sama berhak menambah, mengedit, menghapus transaksi" },
  { actor: "Sistem", label: "Simpan transaksi (jumlah, tipe, siswa pembayar, pencatat) & perbarui saldo" },
  { actor: "Sistem", type: "decision", label: "Jumat 08:00 WIB — masih ada yang belum bayar?", yes: "Cron mengirim notifikasi pengingat ke siswa yang menunggak", no: "Tidak ada aksi; lanjut rekap" },
  { actor: "Ketua Kelas", label: "Tandai lunas per siswa lewat rekap mingguan (Tandai Bayar)" },
  { actor: "Sistem", label: "Hasilkan rekap mingguan, bulanan, grafik tren, dan ekspor Excel" },
  { actor: "Siswa", label: "Seluruh anggota kelas dapat melihat transparansi saldo & riwayat (baca-saja)" },
  { type: "end", label: "Selesai" },
];

const FLOW_KELAS_BPH = [
  { type: "start", label: "Mulai — Super Admin menyiapkan kelas" },
  { actor: "Super Admin", label: "Buat kelas baru (nama, mapel, wali kelas, password opsional)" },
  { actor: "Super Admin", type: "decision", label: "Salin struktur BPH dari kelas lain?", yes: "Bagan BPH kelas sumber disalin otomatis ke kelas baru", no: "Kelas baru mulai dengan BPH kosong" },
  { actor: "Sistem", label: "Kelas aktif; anggota baru diminta password kelas sekali saat pertama masuk" },
  { actor: "Ketua Kelas", label: "Susun bagan BPH kelas: tambah jabatan, atur tingkat (lapis), unggah foto, drag-and-drop" },
  { actor: "Ketua Kelas", label: "Tunjuk seorang siswa sebagai Bendahara kelas", note: "Super Admin juga dapat menunjuk / melepas Bendahara" },
  { actor: "Sistem", label: "Bendahara mendapat hak kelola Uang Kas bersama Ketua Kelas" },
  { actor: "Siswa", label: "Anggota kelas melihat bagan BPH & informasi kelas (baca-saja)" },
  { type: "end", label: "Selesai" },
];

const FLOW_INVENTARIS = [
  { type: "start", label: "Mulai — Pengelolaan aset sekolah" },
  { actor: "Staff TU", label: "Tambah barang inventaris (kode, kategori, lokasi, stok, min. stok, kondisi, keterangan)" },
  { actor: "Sistem", type: "decision", label: "Stok ≤ min. stok?", yes: "Barang ditandai 'Menipis' + peringatan pengadaan di dasbor", no: "Status stok normal" },
  { actor: "Siswa", label: "Siswa/Guru mengajukan peminjaman (jumlah, keperluan, tanggal kembali)" },
  { actor: "Staff TU", type: "decision", label: "Setujui peminjaman?", yes: "Status 'Disetujui'; stok tersedia berkurang otomatis", no: "Status 'Ditolak'; pemohon menerima notifikasi" },
  { actor: "Sistem", label: "Kirim notifikasi status ke pemohon" },
  { actor: "Siswa", label: "Barang dipakai sesuai keperluan lalu dikembalikan" },
  { actor: "Staff TU", label: "Konfirmasi pengembalian (status 'Dikembalikan'); stok kembali bertambah" },
  { actor: "Staff TU", label: "Edit/hapus barang, lihat riwayat peminjaman per barang, ekspor laporan Excel" },
  { type: "end", label: "Selesai" },
];

const FLOW_UJIAN = [
  { type: "start", label: "Mulai — Guru menyiapkan ujian" },
  { actor: "Guru", label: "Buat Ujian Anti-Nyontek (soal, password wajib, batas waktu, maks. pelanggaran)" },
  { actor: "Siswa", label: "Buka tab Ujian di kelas, masukkan password ujian" },
  { actor: "Sistem", type: "decision", label: "Password benar?", yes: "Ujian LANGSUNG MULAI otomatis + layar penuh (fullscreen) dipaksa", no: "Pesan 'Password ujian salah'; siswa mengulang" },
  { actor: "Sistem", label: "Buat sesi ujian di server: soal & opsi diacak, timer berjalan (jika ada batas waktu)" },
  { actor: "Siswa", label: "Siswa menjawab soal di halaman ujian layar penuh" },
  { actor: "Sistem", type: "decision", label: "Siswa pindah tab / keluar fullscreen?", yes: "Catat pelanggaran + tampilkan peringatan. Jika pelanggaran ≥ batas → jawaban dikirim otomatis & ujian terkunci", no: "Lanjut mengerjakan" },
  { actor: "Sistem", type: "decision", label: "Waktu habis?", yes: "Jawaban dikirim otomatis saat timer mencapai 0", no: "Siswa menekan 'Selesai & Kirim Jawaban'" },
  { actor: "Sistem", label: "Nilai dihitung, pelanggaran dicatat; siswa tidak dapat mengulang ujian" },
  { actor: "Guru", label: "Guru melihat hasil: skor + jumlah pelanggaran + penanda auto-submit per siswa" },
  { type: "end", label: "Selesai" },
];

const FLOW_ABSENSI_AUTO = [
  { type: "start", label: "Mulai — Hari sekolah berjalan (Senin–Sabtu, zona WIB)" },
  { actor: "Sistem", type: "decision", label: "Pukul 08:00 — siswa sudah absen (scan)?", yes: "Tidak ada aksi untuk siswa tersebut", no: "Buat tautan konfirmasi sekali-pakai untuk hari ini" },
  { actor: "Sistem", label: "Kirim EMAIL berisi tombol 'Saya Sakit' & 'Saya Izin' + notifikasi aplikasi", note: "Cron attendance-reminder 08:00 WIB; token unik per siswa per hari (idempoten)" },
  { actor: "Siswa", type: "decision", label: "Siswa menekan tombol konfirmasi?", yes: "Status Sakit/Izin tercatat (metode: Konfirmasi Email); token jadi terpakai", no: "Belum ada kehadiran tercatat" },
  { actor: "Sistem", type: "decision", label: "Pukul 09:00 — masih belum ada kehadiran?", yes: "Catat otomatis sebagai ALPA (metode: Sistem) + notifikasi ke siswa", no: "Kehadiran hari ini sudah final (Hadir/Sakit/Izin)" },
  { actor: "Guru", label: "Wali kelas/Admin memantau rekap; dapat mengoreksi status bila perlu" },
  { type: "end", label: "Selesai" },
];

const FLOW_AKUN = [
  { type: "start", label: "Mulai — Super Admin menyiapkan akun warga sekolah" },
  { actor: "Super Admin", label: "Buka Kelola Akun Master → Buat Akun Baru (nama, email, password, peran)" },
  { actor: "Super Admin", type: "decision", label: "Peran = Siswa?", yes: "Nomor WhatsApp aktif WAJIB diisi (divalidasi format)", no: "Nomor WhatsApp opsional" },
  { actor: "Sistem", label: "Validasi email unik & data; simpan akun + buat QR permanen (siswa) & Kartu Pelajar" },
  { actor: "Siswa", label: "Pengguna login dengan email & password" },
  { actor: "Siswa", type: "decision", label: "Lupa password?", yes: "Minta reset → sistem kirim email tautan reset (berlaku 1 jam, sekali pakai)", no: "Masuk ke dasbor sesuai peran" },
  { actor: "Sistem", label: "Terapkan otorisasi berbasis peran pada setiap menu & endpoint" },
  { type: "end", label: "Selesai" },
];

const FLOW_PPDB = [
  { type: "start", label: "Mulai — Pendaftaran Peserta Didik Baru (daring, tanpa login)" },
  { actor: "Siswa", label: "Calon siswa membuka halaman PPDB publik & mengisi formulir (data diri, asal sekolah, berkas)" },
  { actor: "Sistem", label: "Simpan pendaftaran dengan nomor registrasi; status awal 'Menunggu Verifikasi'" },
  { actor: "Staff TU", label: "Verifikasi berkas pendaftar di menu Admin PPDB" },
  { actor: "Staff TU", type: "decision", label: "Berkas lengkap & memenuhi syarat?", yes: "Tetapkan status 'Diterima'", no: "Tetapkan status 'Ditolak' / 'Perlu Perbaikan'" },
  { actor: "Sistem", label: "Calon siswa memantau status kelulusan lewat nomor registrasi" },
  { actor: "Super Admin", label: "Pendaftar yang diterima dapat dikonversi menjadi akun siswa" },
  { type: "end", label: "Selesai" },
];

const FLOW_PERPUS = [
  { type: "start", label: "Mulai — Perpustakaan Pintar" },
  { actor: "Staff TU", label: "Admin Perpus/Super Admin mengelola katalog buku (judul, penulis, kategori, stok, lokasi)" },
  { actor: "Siswa", label: "Siswa mencari & melihat detail buku di katalog; dapat membaca ringkasan AI & ulasan" },
  { actor: "Siswa", type: "decision", label: "Buku tersedia?", yes: "Ajukan pinjam / baca di tempat", no: "Buat reservasi (masuk antrean)" },
  { actor: "Staff TU", label: "Admin Perpus meminjamkan buku (desk) & mencatat tanggal kembali; stok tersedia berkurang" },
  { actor: "Siswa", label: "Siswa mengembalikan buku pada tanggal jatuh tempo" },
  { actor: "Sistem", type: "decision", label: "Terlambat?", yes: "Hitung denda (per hari) saat pengembalian", no: "Tanpa denda; stok kembali bertambah" },
  { actor: "Staff TU", label: "Kelola reservasi, lihat statistik & buku populer, ekspor data peminjaman" },
  { type: "end", label: "Selesai" },
];

const FLOW_OSIS = [
  { type: "start", label: "Mulai — Pemilihan Ketua OSIS (e-voting)" },
  { actor: "Super Admin", label: "Buat pemilihan: daftar kandidat (foto, visi-misi), jadwal buka–tutup" },
  { actor: "Sistem", type: "decision", label: "Periode pemilihan dibuka?", yes: "Siswa dapat memberikan suara", no: "Pemilihan terkunci (belum/selesai)" },
  { actor: "Siswa", label: "Siswa memilih satu kandidat" },
  { actor: "Sistem", type: "decision", label: "Siswa sudah pernah memilih?", yes: "Tolak — satu siswa satu suara", no: "Catat suara secara anonim; tambah perolehan kandidat" },
  { actor: "Sistem", label: "Tampilkan hasil & grafik perolehan suara secara real-time setelah ditutup" },
  { type: "end", label: "Selesai" },
];

const FLOW_DANA = [
  { type: "start", label: "Mulai — Dana Sosial / Penggalangan" },
  { actor: "Ketua OSIS", label: "Buat program dana sosial (judul, target, keterangan, tenggat)" },
  { actor: "Siswa", label: "Warga sekolah menyetor donasi melalui pengurus" },
  { actor: "Staff TU", label: "Pengurus mencatat pemasukan & pengeluaran dana" },
  { actor: "Sistem", label: "Perbarui total terkumpul, progres terhadap target, dan riwayat transaksi" },
  { actor: "Siswa", label: "Seluruh warga melihat transparansi dana (baca-saja) & ekspor laporan Excel" },
  { type: "end", label: "Selesai" },
];

const FLOW_TUGAS = [
  { type: "start", label: "Mulai — Tugas & Mini-Quiz" },
  { actor: "Guru", label: "Buat tugas (instruksi, tenggat) atau mini-quiz (soal, password opsional, timer, pengacakan)" },
  { actor: "Siswa", label: "Siswa mengerjakan: unggah/isi jawaban tugas, atau kerjakan mini-quiz" },
  { actor: "Sistem", type: "decision", label: "Mini-quiz?", yes: "Nilai otomatis dihitung saat selesai", no: "Menunggu penilaian guru" },
  { actor: "Guru", label: "Guru menilai tugas & melihat rekap nilai per siswa" },
  { actor: "Sistem", label: "Nilai tugas & quiz mengalir ke Rapor Digital" },
  { type: "end", label: "Selesai" },
];

const FLOW_RAPOR = [
  { type: "start", label: "Mulai — Rapor Digital" },
  { actor: "Sistem", label: "Agregasi nilai tugas, mini-quiz, dan rekap kehadiran per siswa per semester" },
  { actor: "Guru", label: "Wali kelas meninjau rapor siswa di kelasnya" },
  { actor: "Guru", type: "decision", label: "Kirim rapor ke orang tua?", yes: "Sistem mengirim ringkasan rapor ke email orang tua", no: "Rapor tetap dapat dilihat siswa & wali kelas di aplikasi" },
  { actor: "Siswa", label: "Siswa & orang tua terkait melihat rapor digital" },
  { type: "end", label: "Selesai" },
];

const FLOW_GALERI = [
  { type: "start", label: "Mulai — Galeri Prestasi di halaman Profil Sekolah" },
  { actor: "Super Admin", label: "Buka Profil Sekolah → tekan 'Tambah Prestasi' (judul, tahun, tingkat, deskripsi, foto)" },
  { actor: "Sistem", label: "Simpan prestasi; unggah foto ke penyimpanan objek (opsional)" },
  { actor: "Super Admin", label: "Edit atau hapus prestasi kapan saja (hanya Super Admin yang berhak mengelola)" },
  { actor: "Sistem", type: "decision", label: "Ada prestasi tersimpan?", yes: "Tampilkan kartu prestasi (foto, tingkat, tahun) ke publik", no: "Tampilkan slot kosong 'Prestasi segera hadir'" },
  { actor: "Siswa", label: "Pengunjung publik melihat galeri prestasi tanpa perlu login" },
  { type: "end", label: "Selesai" },
];



/* ============================ PANDUAN CEPAT SUPER ADMIN ============================ */
const QUICK_GUIDE = [
  { title: "Masuk sebagai Super Admin", menu: "Halaman Login", desc: "Buka halaman login dan masuk dengan email & password Super Admin yang telah diberikan. Hanya akun ini yang ada saat sistem baru dipasang." },
  { title: "Lengkapi Pengaturan Sekolah", menu: "Pengaturan", desc: "Unggah logo sekolah, lengkapi nama, alamat, kontak, tahun akademik, dan teks halaman login. Logo otomatis tampil di login, sidebar, dan kartu pelajar." },
  { title: "Buat Kelas & Mata Pelajaran", menu: "Ruang Kelas", desc: "Buat setiap kelas (mis. X IPA 1, XI IPA 1), tambahkan mata pelajaran, dan tetapkan wali kelas. Kelas dibutuhkan sebelum membuat akun siswa." },
  { title: "Buat Akun Guru & Staff", menu: "Kelola Akun", desc: "Buat akun Guru/Wali Kelas, Staff TU, Kepala Sekolah, Admin Perpustakaan, dan Ketua OSIS. Nomor WhatsApp untuk peran ini opsional." },
  { title: "Buat Akun Siswa", menu: "Kelola Akun", desc: "Buat akun tiap siswa: wajib mengisi NISN, kelas, dan Nomor WhatsApp aktif. Setiap akun siswa otomatis mendapat QR permanen & Kartu Pelajar digital." },
  { title: "Cetak & Bagikan Kartu Pelajar", menu: "Kelola Akun → Cetak Kartu Massal", desc: "Cetak kartu pelajar seluruh siswa (ukuran KTP standar) dan bagikan. Kartu ini dipakai untuk absensi QR/barcode harian." },
  { title: "Isi Katalog Perpustakaan", menu: "Perpustakaan", desc: "Admin Perpustakaan/Super Admin menambahkan koleksi buku (judul, penulis, kategori, stok, lokasi rak) agar siswa bisa meminjam & mereservasi." },
  { title: "Isi Galeri Prestasi", menu: "Profil Sekolah (publik) → Tambah Prestasi", desc: "Buka halaman Profil Sekolah sambil login sebagai Super Admin, lalu tekan 'Tambah Prestasi' untuk mengisi pencapaian sekolah yang tampil ke publik." },
  { title: "Terbitkan Pengumuman & Kalender", menu: "Pengumuman · Kalender", desc: "Buat pengumuman awal (bisa tampil sebagai banner di halaman login) dan isi kalender akademik: jadwal ujian, rapat, libur, dan kegiatan." },
  { title: "Susun Struktur Organisasi", menu: "Struktur Organisasi", desc: "Susun bagan organisasi sekolah — dapat dilihat publik tanpa login melalui tautan di halaman login." },
  { title: "Mulai Operasional Harian", menu: "Semua modul aktif", desc: "Petugas presensi mulai scan QR/barcode; guru membuat tugas, mini-quiz & ujian anti-cheat; Ketua Kelas/Bendahara mencatat uang kas; siswa meminjam inventaris & buku." },
  { title: "Otomatisasi Berjalan Sendiri", menu: "Tanpa aksi", desc: "Reminder absensi email 08:00 WIB & auto-alpa 09:00 WIB (Senin–Sabtu), arsip rekap absensi mingguan tiap Senin dini hari, dan pengingat kas Jumat 08:00 WIB berjalan otomatis." },
];


export default function Documentation() {
  const { settings } = useSettings();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
    }
  }, [hash]);
  const brand = settings.school_name || "SEKOLAH";
  const brandFull = settings.school_full_name || brand;
  return (
    <div className="printable-doc min-h-screen bg-slate-100 py-6 px-4">
      {/* Toolbar (tidak ikut tercetak) */}
      <div className="no-print max-w-4xl mx-auto mb-4 flex items-center justify-between gap-3">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
          <ArrowLeft className="w-4 h-4" />Kembali
        </Link>
        <button data-testid="print-doc-button" onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-lg">
          <Printer className="w-4 h-4" />Cetak / Unduh PDF
        </button>
      </div>

      <div className="doc-paper max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 md:p-12">
        {/* Sampul */}
        <header className="text-center border-b-4 border-sky-600 pb-6 mb-8">
          <p className="text-xs font-bold tracking-[0.3em] text-sky-600 uppercase">{brand} — Sistem Manajemen Sekolah Terpadu</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">Dokumen Produk &amp; Proses</h1>
          <p className="text-slate-600 mt-2">Term of Reference (TOR) · Product Requirements Document (PRD) · Diagram BPMN</p>
          <p className="text-xs text-slate-400 mt-3">Versi 2.0 · Tahun Ajaran 2025/2026 · Status: Final · Mencakup seluruh fitur & alur sistem</p>
        </header>

        {/* ============ PANDUAN CEPAT SUPER ADMIN ============ */}
        <Section id="panduan" icon={Rocket} title="Panduan Cepat Super Admin — Mulai dari Nol">
          <P>Sistem baru dipasang dalam keadaan kosong (hanya ada akun Super Admin). Ikuti urutan langkah berikut sampai sekolah siap beroperasi penuh — setiap langkah mencantumkan menu tempatnya.</P>
          <div className="space-y-3">
            {QUICK_GUIDE.map((g, i) => (
              <div key={i} className="flex gap-3 items-start break-inside-avoid" data-testid={`guide-step-${i + 1}`}>
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow">{i + 1}</div>
                <div className="flex-1 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                  <p className="font-bold text-slate-900 text-sm">{g.title}
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wide">{g.menu}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ============ BAGIAN A: TOR ============ */}
        <Section id="tor" icon={BookOpen} title="Bagian A — Term of Reference (Kerangka Acuan Kerja)">
          <H3>A.1 Latar Belakang</H3>
          <P>Proses operasional sekolah — presensi, administrasi keuangan kelas (uang kas), pengelolaan aset, hingga pelaksanaan ujian — masih banyak dilakukan manual sehingga lambat, sulit diaudit, dan rawan kecurangan. {brandFull} dibangun sebagai satu platform terpadu berbasis web untuk mendigitalisasi proses-proses tersebut agar transparan, terdokumentasi, dan mudah diawasi oleh seluruh warga sekolah.</P>

          <H3>A.2 Tujuan Sistem</H3>
          <UL items={[
            "Menyediakan presensi harian yang cepat dan akurat melalui QR kartu pelajar dan barcode NISN.",
            "Mewujudkan transparansi keuangan kas kelas dengan pencatatan digital oleh Ketua Kelas dan Bendahara.",
            "Mempermudah pembentukan kelas beserta struktur organisasi kelas (BPH) secara konsisten.",
            "Mengelola aset/inventaris sekolah beserta siklus peminjaman–pengembalian secara terdokumentasi.",
            "Menyelenggarakan ujian daring yang aman dengan mekanisme anti-cheat (password, layar penuh, deteksi pelanggaran).",
          ]} />

          <H3>A.3 Ruang Lingkup</H3>
          <P>Sistem mencakup: autentikasi & manajemen akun multi-peran (nomor WhatsApp wajib untuk siswa, reset password via email); absensi QR/Barcode/manual beserta absensi otomatis (reminder email 08:00 WIB & auto-alpa 09:00 WIB); manajemen kelas & BPH (termasuk penunjukan Bendahara dan penyalinan struktur BPH antar kelas); uang kas kelas (transaksi, rekap mingguan/bulanan, pengingat otomatis); inventaris & peminjaman; ujian anti-cheat; Perpustakaan Pintar (katalog, peminjaman, reservasi, ringkasan AI); PPDB daring; Pemilihan OSIS (e-voting); Dana Sosial; Rapor Digital; Galeri Prestasi di Profil Sekolah; serta modul pendukung (tugas, mini-quiz, pengumuman, kalender, kartu pelajar, schoolgram, notifikasi, laporan Excel).</P>

          <H3>A.4 Pengguna & Pemangku Kepentingan</H3>
          <Table
            head={["Peran", "Deskripsi", "Hak Akses Utama"]}
            rows={[
              ["Super Admin", "Pengelola penuh sistem (tata kelola sekolah)", "Kelola akun, kelas, pengaturan sekolah/kartu, Galeri Prestasi, seluruh modul"],
              ["Kepala Sekolah", "Pimpinan sekolah", "Pemantauan laporan, analitik, pengumuman"],
              ["Staff TU", "Tata usaha", "Kelola inventaris & approval peminjaman, PPDB, administrasi"],
              ["Guru", "Pengajar / wali kelas", "Tugas, kuis, ujian anti-cheat, rapor, rekap kehadiran"],
              ["Siswa", "Peserta didik (WA wajib)", "Presensi & konfirmasi Sakit/Izin, tugas/kuis/ujian, kas & BPH, perpustakaan, e-voting"],
              ["Ketua Kelas", "Siswa pengurus kelas", "Kelola uang kas & bagan BPH kelas, menunjuk Bendahara"],
              ["Bendahara", "Siswa yang ditunjuk Ketua Kelas/Super Admin", "Kelola uang kas kelas (tambah/edit/hapus) bersama Ketua Kelas"],
              ["Ketua OSIS", "Pengurus OSIS", "Pengumuman, event, pemilihan OSIS, dana sosial, galeri kegiatan"],
              ["Admin Perpustakaan", "Pengelola perpustakaan", "Kelola katalog buku, sirkulasi peminjaman, reservasi, statistik"],
              ["Orang Tua", "Wali murid", "Menerima notifikasi kehadiran & rapor anak via email"],
            ]}
          />

          <H3>A.5 Manfaat</H3>
          <UL items={[
            "Efisiensi: presensi < 3 detik per siswa; rekap kas dan inventaris otomatis.",
            "Transparansi: saldo kas dan riwayat peminjaman dapat dilihat seluruh anggota kelas.",
            "Akuntabilitas: setiap transaksi dan pelanggaran ujian tercatat dengan identitas & waktu.",
            "Integritas ujian: pengaturan layar penuh dan deteksi perpindahan tab menekan kecurangan.",
          ]} />

          <H3>A.6 Batasan Sistem</H3>
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 mb-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 no-print" />
            <span>Fitur anti-cheat berbasis browser tidak dapat mengunci aplikasi lain di tingkat sistem operasi (itu memerlukan aplikasi desktop khusus). Sistem ini menangkal kecurangan melalui: mode layar penuh paksa, deteksi perpindahan tab/minimize, pencatatan pelanggaran, dan pengiriman jawaban otomatis setelah batas pelanggaran tercapai.</span>
          </div>
          <UL items={[
            "Sistem berbasis web; memerlukan koneksi internet.",
            "Absensi otomatis & pengingat kas berjalan terjadwal melalui cron platform (reminder absensi 08:00, auto-alpa 09:00, pengingat kas Jumat 08:00 — zona WIB).",
            "Notifikasi dikirim melalui email dan notifikasi dalam aplikasi; nomor WhatsApp siswa disimpan sebagai basis data sekolah (tanpa pengiriman WA otomatis pada fase ini).",
            "Berbagai data demo diisolasi (is_demo) sehingga tidak tercampur dengan data sekolah asli.",
          ]} />

          <H3>A.7 Kriteria Keberhasilan</H3>
          <UL items={[
            "≥ 95% presensi harian tercatat via QR/barcode tanpa kendala.",
            "100% transaksi kas kelas tercatat digital dan dapat direkap mingguan/bulanan.",
            "Seluruh kelas memiliki bagan BPH; penunjukan Bendahara < 1 menit.",
            "Seluruh siklus peminjaman inventaris terdokumentasi dengan stok akurat.",
            "Ujian daring terselenggara dengan 100% pelanggaran tercatat dan auto-submit berfungsi.",
          ]} />
        </Section>

        {/* ============ BAGIAN B: PRD ============ */}
        <Section id="prd" icon={FileText} title="Bagian B — Product Requirements Document (PRD)" breakBefore>
          <H3>B.1 Visi & Tujuan Produk</H3>
          <P>Satu platform untuk tujuh peran: seluruh aktivitas sekolah — dari presensi pagi hingga ujian akhir — berjalan dalam satu dasbor yang elegan, aman, dan transparan.</P>

          <H3>B.2 Kebutuhan Fungsional — Absensi QR/Barcode</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-ABS-01", "Sistem menyediakan scan QR kartu pelajar via kamera perangkat", "Tinggi"],
              ["FR-ABS-02", "Sistem mendukung barcode scanner USB (keyboard-wedge) membaca NISN", "Tinggi"],
              ["FR-ABS-03", "Sistem menyediakan pencatatan manual sebagai cadangan", "Sedang"],
              ["FR-ABS-04", "Sistem mencegah duplikasi presensi siswa yang sama pada hari yang sama", "Tinggi"],
              ["FR-ABS-05", "Setiap catatan menyimpan metode (QR/Barcode/Manual) dan dapat diekspor ke Excel", "Sedang"],
              ["FR-ABS-06", "Sistem mengirim notifikasi kehadiran ke siswa dan orang tua", "Sedang"],
              ["FR-ABS-07", "Guru/Admin melihat statistik & rekap kehadiran", "Sedang"],
            ]}
          />

          <H3>B.3 Kebutuhan Fungsional — Kas Kelas & Bendahara</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-KAS-01", "Ketua Kelas dan Bendahara dapat menambah, mengedit, menghapus transaksi kas kelas", "Tinggi"],
              ["FR-KAS-02", "Ketua Kelas/Super Admin dapat menunjuk & melepas seorang siswa sebagai Bendahara", "Tinggi"],
              ["FR-KAS-03", "Anggota kelas lain hanya dapat melihat kas (baca-saja)", "Tinggi"],
              ["FR-KAS-04", "Sistem menyediakan rekap mingguan (Senin–Minggu WIB) dengan status lunas/belum per siswa dan tombol 'Tandai Bayar'", "Tinggi"],
              ["FR-KAS-05", "Sistem menyediakan rekap bulanan per minggu dan grafik tren kas 3–12 bulan", "Sedang"],
              ["FR-KAS-06", "Sistem mengirim pengingat otomatis (cron Jumat 08:00 WIB) ke siswa yang belum membayar", "Sedang"],
              ["FR-KAS-07", "Data kas dapat diekspor ke Excel", "Sedang"],
            ]}
          />

          <H3>B.4 Kebutuhan Fungsional — Manajemen Kelas & BPH</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-KLS-01", "Super Admin dapat membuat, mengedit, menghapus kelas (nama, mapel, wali kelas, password kelas opsional)", "Tinggi"],
              ["FR-KLS-02", "Saat membuat kelas baru, Super Admin dapat menyalin bagan BPH dari kelas lain", "Tinggi"],
              ["FR-KLS-03", "Kelas berpassword: anggota memasukkan password sekali; mengganti password mengatur ulang akses semua anggota", "Sedang"],
              ["FR-KLS-04", "Ketua Kelas menyusun bagan BPH: tambah jabatan berjenjang (lapis), unggah foto, drag-and-drop, garis putus-putus", "Tinggi"],
              ["FR-KLS-05", "Hanya Ketua Kelas kelas tersebut yang dapat mengubah BPH; anggota lain baca-saja", "Tinggi"],
              ["FR-KLS-06", "Struktur organisasi sekolah dapat dilihat publik tanpa login", "Rendah"],
            ]}
          />

          <H3>B.5 Kebutuhan Fungsional — Inventaris & Peminjaman</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-INV-01", "Staff TU/Super Admin menambah barang: kode, nama, kategori, kondisi, lokasi, stok, min. stok, keterangan", "Tinggi"],
              ["FR-INV-02", "Staff TU/Super Admin dapat mengedit dan menghapus setiap barang inventaris", "Tinggi"],
              ["FR-INV-03", "Sistem menandai barang 'Menipis' saat stok ≤ min. stok dan menampilkan peringatan pengadaan", "Sedang"],
              ["FR-INV-04", "Pencarian barang dan filter berdasarkan kategori & kondisi", "Sedang"],
              ["FR-INV-05", "Siswa/Guru mengajukan peminjaman (jumlah, keperluan, tanggal kembali)", "Tinggi"],
              ["FR-INV-06", "Staff TU menyetujui/menolak; stok berkurang saat disetujui dan kembali saat dikembalikan", "Tinggi"],
              ["FR-INV-07", "Riwayat peminjaman per barang dan ekspor laporan Excel", "Sedang"],
            ]}
          />

          <H3>B.6 Kebutuhan Fungsional — Ujian Anti-Cheat</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-UJN-01", "Guru/Super Admin membuat ujian dengan soal pilihan ganda, password WAJIB, batas waktu opsional, dan batas maksimal pelanggaran", "Tinggi"],
              ["FR-UJN-02", "Siswa memasukkan password; jika benar, ujian LANGSUNG dimulai dan tampil layar penuh (fullscreen)", "Tinggi"],
              ["FR-UJN-03", "Soal dan opsi jawaban diacak per siswa oleh server; siswa tidak dapat mengulang ujian yang sudah dikumpulkan", "Tinggi"],
              ["FR-UJN-04", "Sistem mendeteksi perpindahan tab/minimize/keluar fullscreen sebagai pelanggaran, mencatatnya di server, dan menampilkan peringatan", "Tinggi"],
              ["FR-UJN-05", "Setelah pelanggaran mencapai batas (mis. 3×), jawaban dikirim otomatis dan ujian terkunci", "Tinggi"],
              ["FR-UJN-06", "Jawaban terkirim otomatis saat batas waktu habis", "Sedang"],
              ["FR-UJN-07", "Guru melihat hasil per siswa: skor, jumlah pelanggaran, dan penanda auto-submit", "Sedang"],
            ]}
          />

          <H3>B.7 Kebutuhan Fungsional — Absensi Otomatis (Reminder & Auto-Alpa)</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-ABO-01", "Cron 08:00 WIB (Sen–Sab) mendeteksi siswa yang belum absen dan membuat tautan konfirmasi sekali-pakai per siswa per hari", "Tinggi"],
              ["FR-ABO-02", "Sistem mengirim email berisi tombol 'Saya Sakit' & 'Saya Izin' + notifikasi aplikasi ke siswa tersebut", "Tinggi"],
              ["FR-ABO-03", "Siswa dapat mengkonfirmasi status (Sakit/Izin) lewat satu klik tombol tanpa perlu login", "Tinggi"],
              ["FR-ABO-04", "Tautan konfirmasi hanya berlaku hari yang sama, sekali pakai, dan tidak menimpa kehadiran yang sudah tercatat", "Tinggi"],
              ["FR-ABO-05", "Cron 09:00 WIB menandai siswa tanpa scan/konfirmasi sebagai ALPA otomatis (metode: Sistem) + notifikasi", "Tinggi"],
              ["FR-ABO-06", "Kedua cron aman (bearer secret) dan idempoten (anti pemrosesan ganda)", "Tinggi"],
            ]}
          />

          <H3>B.8 Kebutuhan Fungsional — Autentikasi & Manajemen Akun</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-AKN-01", "Super Admin membuat akun multi-peran (nama, email unik, password, peran)", "Tinggi"],
              ["FR-AKN-02", "Nomor WhatsApp aktif WAJIB untuk akun siswa (divalidasi format); opsional untuk peran lain", "Tinggi"],
              ["FR-AKN-03", "Setiap akun siswa otomatis mendapat QR permanen & Kartu Pelajar digital", "Tinggi"],
              ["FR-AKN-04", "Login dengan email & password; sesi aman berbasis JWT (cookie httpOnly)", "Tinggi"],
              ["FR-AKN-05", "Lupa password: sistem mengirim tautan reset via email (berlaku 1 jam, sekali pakai)", "Tinggi"],
              ["FR-AKN-06", "Otorisasi berbasis peran diterapkan pada setiap menu & endpoint", "Tinggi"],
            ]}
          />

          <H3>B.9 Kebutuhan Fungsional — Perpustakaan Pintar</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-LIB-01", "Admin Perpus/Super Admin mengelola katalog buku (CRUD: judul, penulis, kategori, stok, lokasi)", "Tinggi"],
              ["FR-LIB-02", "Siswa mencari & memfilter katalog, melihat detail, ringkasan AI, dan memberi ulasan/rating", "Sedang"],
              ["FR-LIB-03", "Peminjaman & pengembalian dengan tanggal jatuh tempo; stok tersedia menyesuaikan otomatis", "Tinggi"],
              ["FR-LIB-04", "Reservasi (antrean) untuk buku yang sedang tidak tersedia", "Sedang"],
              ["FR-LIB-05", "Perhitungan denda keterlambatan per hari saat pengembalian", "Sedang"],
              ["FR-LIB-06", "Statistik, buku populer, rekomendasi AI, dan ekspor data peminjaman", "Rendah"],
            ]}
          />

          <H3>B.10 Kebutuhan Fungsional — PPDB, Pemilu OSIS, Dana Sosial</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-PDB-01", "Calon siswa mendaftar daring tanpa login (data diri, berkas) & memantau status via nomor registrasi", "Tinggi"],
              ["FR-PDB-02", "Staff TU memverifikasi & menetapkan status (Diterima/Ditolak/Perbaikan); pendaftar diterima dapat dikonversi jadi akun", "Tinggi"],
              ["FR-OSI-01", "Pemilihan OSIS: kandidat (foto, visi-misi), jadwal buka–tutup, e-voting satu siswa satu suara (anonim)", "Tinggi"],
              ["FR-OSI-02", "Hasil & grafik perolehan suara ditampilkan setelah periode ditutup", "Sedang"],
              ["FR-DAN-01", "Dana Sosial: program dengan target, pencatatan pemasukan/pengeluaran, progres, transparansi & ekspor Excel", "Sedang"],
            ]}
          />

          <H3>B.11 Kebutuhan Fungsional — Rapor, Tugas/Quiz & Galeri Prestasi</H3>
          <Table
            head={["ID", "Kebutuhan", "Prioritas"]}
            rows={[
              ["FR-TGS-01", "Guru membuat tugas (instruksi, tenggat) & mini-quiz (password opsional, timer, pengacakan); siswa mengerjakan", "Tinggi"],
              ["FR-TGS-02", "Mini-quiz dinilai otomatis; tugas dinilai guru; nilai mengalir ke Rapor Digital", "Sedang"],
              ["FR-RPR-01", "Rapor Digital mengagregasi nilai tugas, quiz, dan kehadiran per siswa per semester", "Tinggi"],
              ["FR-RPR-02", "Wali kelas dapat mengirim ringkasan rapor ke email orang tua", "Sedang"],
              ["FR-GAL-01", "Super Admin mengelola Galeri Prestasi (tambah/edit/hapus: judul, tahun, tingkat, deskripsi, foto) di halaman Profil Sekolah", "Sedang"],
              ["FR-GAL-02", "Galeri Prestasi tampil publik tanpa login; menampilkan slot kosong bila belum ada prestasi", "Sedang"],
            ]}
          />

          <H3>B.12 Modul Pendukung Lain (ringkas)</H3>
          <P>Pengumuman multi-cakupan dengan banner login; Kalender akademik; Kartu Pelajar digital (QR permanen) & cetak massal; Schoolgram (lini masa sosial sekolah); Notifikasi in-app & email; Struktur Organisasi sekolah publik; Laporan & ekspor Excel di berbagai modul.</P>

          <H3>B.13 Kebutuhan Non-Fungsional</H3>
          <UL items={[
            "Keamanan: autentikasi JWT, password ter-hash (bcrypt), otorisasi berbasis peran di setiap endpoint, cron terproteksi bearer secret.",
            "Isolasi data: akun demo terpisah dari data asli (is_demo) dan tidak saling terlihat.",
            "Kinerja: daftar utama dimuat < 2 detik pada koneksi sekolah normal.",
            "Kegunaan: antarmuka Bahasa Indonesia, responsif untuk HP dan desktop; konfirmasi absensi cukup satu klik dari email.",
            "Keandalan: pencatatan presensi idempotent (anti-duplikat); seluruh cron idempotent (anti pemrosesan ganda).",
            "Auditabilitas: setiap transaksi/pelanggaran/kehadiran menyimpan pelaku/metode & stempel waktu.",
          ]} />

          <H3>B.14 Di Luar Cakupan (fase ini)</H3>
          <UL items={[
            "Aplikasi desktop pengunci OS untuk ujian (digantikan deteksi pelanggaran berbasis browser).",
            "Pembayaran kas/donasi daring (payment gateway) — pencatatan bersifat manual oleh pengurus.",
            "Pengiriman WhatsApp otomatis — nomor WA siswa disimpan untuk kebutuhan sekolah; notifikasi saat ini via email & in-app.",
          ]} />
        </Section>

        {/* ============ BAGIAN C: BPMN ============ */}
        <Section id="bpmn" icon={GitBranch} title="Bagian C — Diagram BPMN Alur Proses" breakBefore>
          <P>Notasi: <b>oval hijau</b> = mulai, <b>oval merah</b> = selesai, <b>kotak</b> = aktivitas, <b>belah ketupat kuning</b> = keputusan (gateway). Lencana berwarna menunjukkan aktor (swimlane) yang bertanggung jawab pada tiap langkah.</P>
          <BpmnFlow title="C.1 Alur Absensi QR / Barcode" desc="Dari siswa tiba di sekolah hingga kehadiran terekap dan ternotifikasi." steps={FLOW_ABSENSI} />
          <BpmnFlow title="C.2 Alur Absensi Otomatis (Reminder 08:00 & Auto-Alpa 09:00)" desc="Siswa yang belum absen ditanya Sakit/Izin lewat email bertombol; tanpa kabar hingga 09:00 WIB otomatis Alpa." steps={FLOW_ABSENSI_AUTO} />
          <BpmnFlow title="C.3 Alur Kas Kelas" desc="Pembayaran iuran, pencatatan oleh Bendahara/Ketua Kelas, pengingat otomatis, dan rekap." steps={FLOW_KAS} />
          <BpmnFlow title="C.4 Alur Manajemen Kelas & BPH" desc="Pembuatan kelas (dengan opsi salin struktur BPH) hingga penunjukan Bendahara." steps={FLOW_KELAS_BPH} />
          <BpmnFlow title="C.5 Alur Inventaris & Peminjaman" desc="Pengelolaan aset, peringatan stok menipis, dan siklus peminjaman–pengembalian." steps={FLOW_INVENTARIS} />
          <BpmnFlow title="C.6 Alur Ujian Anti-Cheat" desc="Pembuatan ujian berpassword hingga penilaian dengan pencatatan pelanggaran." steps={FLOW_UJIAN} />
          <BpmnFlow title="C.7 Alur Autentikasi & Pembuatan Akun" desc="Pembuatan akun (WA wajib untuk siswa), login, dan reset password via email." steps={FLOW_AKUN} />
          <BpmnFlow title="C.8 Alur PPDB Daring" desc="Pendaftaran peserta didik baru tanpa login, verifikasi berkas, hingga penetapan status." steps={FLOW_PPDB} />
          <BpmnFlow title="C.9 Alur Perpustakaan Pintar" desc="Katalog, peminjaman & pengembalian dengan denda, reservasi, dan statistik." steps={FLOW_PERPUS} />
          <BpmnFlow title="C.10 Alur Pemilihan OSIS (E-Voting)" desc="Pembuatan pemilihan, pemungutan suara satu siswa satu suara, hingga hasil." steps={FLOW_OSIS} />
          <BpmnFlow title="C.11 Alur Dana Sosial" desc="Program penggalangan, pencatatan dana, progres target, dan transparansi." steps={FLOW_DANA} />
          <BpmnFlow title="C.12 Alur Tugas & Mini-Quiz" desc="Pembuatan tugas/quiz, pengerjaan siswa, penilaian, hingga mengalir ke rapor." steps={FLOW_TUGAS} />
          <BpmnFlow title="C.13 Alur Rapor Digital" desc="Agregasi nilai & kehadiran, peninjauan wali kelas, hingga pengiriman ke orang tua." steps={FLOW_RAPOR} />
          <BpmnFlow title="C.14 Alur Galeri Prestasi (Profil Sekolah)" desc="Super Admin mengelola prestasi; publik melihat galeri atau slot kosong." steps={FLOW_GALERI} />
        </Section>

        <footer className="mt-10 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>Dokumen ini dihasilkan dari sistem {brandFull} · Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </footer>
      </div>
    </div>
  );
}
