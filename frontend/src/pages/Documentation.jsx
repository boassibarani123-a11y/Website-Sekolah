import { Link } from "react-router-dom";
import { ArrowLeft, Printer, BookOpen, FileText, GitBranch, AlertTriangle } from "lucide-react";

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

/* ============================ HALAMAN ============================ */
export default function Documentation() {
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
          <p className="text-xs font-bold tracking-[0.3em] text-sky-600 uppercase">SEKOLAHKU — Sistem Manajemen Sekolah Terpadu</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">Dokumen Produk &amp; Proses</h1>
          <p className="text-slate-600 mt-2">Term of Reference (TOR) · Product Requirements Document (PRD) · Diagram BPMN</p>
          <p className="text-xs text-slate-400 mt-3">Versi 1.0 · Tahun Ajaran 2025/2026 · Status: Final Draft</p>
        </header>

        {/* ============ BAGIAN A: TOR ============ */}
        <Section id="tor" icon={BookOpen} title="Bagian A — Term of Reference (Kerangka Acuan Kerja)">
          <H3>A.1 Latar Belakang</H3>
          <P>Proses operasional sekolah — presensi, administrasi keuangan kelas (uang kas), pengelolaan aset, hingga pelaksanaan ujian — masih banyak dilakukan manual sehingga lambat, sulit diaudit, dan rawan kecurangan. SEKOLAHKU dibangun sebagai satu platform terpadu berbasis web untuk mendigitalisasi proses-proses tersebut agar transparan, terdokumentasi, dan mudah diawasi oleh seluruh warga sekolah.</P>

          <H3>A.2 Tujuan Sistem</H3>
          <UL items={[
            "Menyediakan presensi harian yang cepat dan akurat melalui QR kartu pelajar dan barcode NISN.",
            "Mewujudkan transparansi keuangan kas kelas dengan pencatatan digital oleh Ketua Kelas dan Bendahara.",
            "Mempermudah pembentukan kelas beserta struktur organisasi kelas (BPH) secara konsisten.",
            "Mengelola aset/inventaris sekolah beserta siklus peminjaman–pengembalian secara terdokumentasi.",
            "Menyelenggarakan ujian daring yang aman dengan mekanisme anti-cheat (password, layar penuh, deteksi pelanggaran).",
          ]} />

          <H3>A.3 Ruang Lingkup</H3>
          <P>Sistem mencakup: autentikasi & manajemen akun multi-peran, absensi QR/Barcode/manual, manajemen kelas & BPH (termasuk penunjukan Bendahara dan penyalinan struktur BPH antar kelas), uang kas kelas (transaksi, rekap mingguan/bulanan, pengingat otomatis), inventaris & peminjaman, ujian anti-cheat, serta modul pendukung (tugas, mini-quiz, pengumuman, kalender, kartu pelajar, PPDB daring, dana sosial, pemilihan OSIS, dan laporan).</P>

          <H3>A.4 Pengguna & Pemangku Kepentingan</H3>
          <Table
            head={["Peran", "Deskripsi", "Hak Akses Utama"]}
            rows={[
              ["Super Admin", "Pengelola penuh sistem (tata kelola sekolah)", "Kelola akun, kelas, pengaturan sekolah/kartu, seluruh modul"],
              ["Kepala Sekolah", "Pimpinan sekolah", "Pemantauan laporan, analitik, pengumuman"],
              ["Staff TU", "Tata usaha", "Kelola inventaris & approval peminjaman, PPDB, administrasi"],
              ["Guru", "Pengajar / wali kelas", "Tugas, kuis, ujian anti-cheat, jadwal pengganti, nilai"],
              ["Siswa", "Peserta didik", "Presensi, mengerjakan tugas/kuis/ujian, melihat kas & BPH, meminjam inventaris"],
              ["Ketua Kelas", "Siswa pengurus kelas", "Kelola uang kas & bagan BPH kelas, menunjuk Bendahara"],
              ["Bendahara", "Siswa yang ditunjuk Ketua Kelas/Super Admin", "Kelola uang kas kelas (tambah/edit/hapus) bersama Ketua Kelas"],
              ["Ketua OSIS", "Pengurus OSIS", "Pengumuman, event, pemilihan OSIS"],
              ["Orang Tua", "Wali murid", "Menerima notifikasi kehadiran & informasi anak"],
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
            "Pengingat kas berjalan terjadwal (Jumat 08:00 WIB) melalui cron platform.",
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

          <H3>B.7 Modul Pendukung (ringkas)</H3>
          <P>Tugas & pengumpulan daring dengan penilaian; Mini-Quiz (password opsional, pengacakan, timer); Pengumuman multi-cakupan dengan banner login; Kalender akademik; Kartu Pelajar digital (QR permanen) & cetak massal; PPDB daring dengan unggah berkas; Dana Sosial; Pemilihan OSIS; Schoolgram; Notifikasi in-app; Laporan & ekspor Excel.</P>

          <H3>B.8 Kebutuhan Non-Fungsional</H3>
          <UL items={[
            "Keamanan: autentikasi JWT, password ter-hash (bcrypt), otorisasi berbasis peran di setiap endpoint.",
            "Isolasi data: akun demo terpisah dari data asli (is_demo) dan tidak saling terlihat.",
            "Kinerja: daftar utama dimuat < 2 detik pada koneksi sekolah normal.",
            "Kegunaan: antarmuka Bahasa Indonesia, responsif untuk HP dan desktop.",
            "Keandalan: pencatatan presensi idempotent (anti-duplikat); cron pengingat idempotent.",
            "Auditabilitas: setiap transaksi/pelanggaran menyimpan pelaku & stempel waktu.",
          ]} />

          <H3>B.9 Di Luar Cakupan (fase ini)</H3>
          <UL items={[
            "Aplikasi desktop pengunci OS untuk ujian (digantikan deteksi pelanggaran berbasis browser).",
            "Pembayaran kas daring (payment gateway) — pencatatan kas bersifat manual oleh pengurus kelas.",
            "Integrasi SMS/WhatsApp — notifikasi saat ini in-app dan email.",
          ]} />
        </Section>

        {/* ============ BAGIAN C: BPMN ============ */}
        <Section id="bpmn" icon={GitBranch} title="Bagian C — Diagram BPMN Alur Proses" breakBefore>
          <P>Notasi: <b>oval hijau</b> = mulai, <b>oval merah</b> = selesai, <b>kotak</b> = aktivitas, <b>belah ketupat kuning</b> = keputusan (gateway). Lencana berwarna menunjukkan aktor (swimlane) yang bertanggung jawab pada tiap langkah.</P>
          <BpmnFlow title="C.1 Alur Absensi QR / Barcode" desc="Dari siswa tiba di sekolah hingga kehadiran terekap dan ternotifikasi." steps={FLOW_ABSENSI} />
          <BpmnFlow title="C.2 Alur Kas Kelas" desc="Pembayaran iuran, pencatatan oleh Bendahara/Ketua Kelas, pengingat otomatis, dan rekap." steps={FLOW_KAS} />
          <BpmnFlow title="C.3 Alur Manajemen Kelas & BPH" desc="Pembuatan kelas (dengan opsi salin struktur BPH) hingga penunjukan Bendahara." steps={FLOW_KELAS_BPH} />
          <BpmnFlow title="C.4 Alur Inventaris & Peminjaman" desc="Pengelolaan aset, peringatan stok menipis, dan siklus peminjaman–pengembalian." steps={FLOW_INVENTARIS} />
          <BpmnFlow title="C.5 Alur Ujian Anti-Cheat" desc="Pembuatan ujian berpassword hingga penilaian dengan pencatatan pelanggaran." steps={FLOW_UJIAN} />
        </Section>

        <footer className="mt-10 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>Dokumen ini dihasilkan dari sistem SEKOLAHKU · Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
        </footer>
      </div>
    </div>
  );
}
