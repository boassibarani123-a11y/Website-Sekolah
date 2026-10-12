import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import {
  GraduationCap, QrCode, ScanLine, PiggyBank, Wallet, Network, Boxes,
  ShieldCheck, ChevronLeft, ChevronRight, Maximize, Minimize, Users,
  Timer, AlertTriangle, Lock, Bell, FileSpreadsheet, ArrowRightLeft,
  ClipboardList, BrainCircuit, IdCard, CalendarDays, Megaphone, CheckCircle2,
  TrendingUp, UserCheck, ArrowRight, Sparkles, HandCoins, Copy, BarChart3,
  UserPlus, Upload, Printer, FileCheck, Clock, Shuffle, Download, BookOpen,
  CalendarCheck, Archive, Vote, Camera, Trophy, MessageSquare, FileText,
  HeartHandshake, Database, Star, Search,
} from "lucide-react";

/* ---------------- komponen visual ---------------- */
const CHIP_COLORS = {
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};
const Chip = ({ icon: Icon, children, color = "sky" }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${CHIP_COLORS[color] || CHIP_COLORS.sky}`}>
    <Icon className="w-3.5 h-3.5" />{children}
  </span>
);
const Stat = ({ value, label, accent = "text-sky-400" }) => (
  <div className="text-center">
    <p className={`text-4xl md:text-5xl font-black font-heading ${accent}`}>{value}</p>
    <p className="text-xs md:text-sm text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
  </div>
);
const FlowStep = ({ n, children }) => (
  <div className="flex items-center gap-2.5">
    <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black shrink-0">{n}</span>
    <span className="text-sm md:text-base text-slate-200">{children}</span>
  </div>
);
const Bullet = ({ icon: Icon, children }) => (
  <li className="flex items-start gap-2.5">
    <Icon className="w-5 h-5 mt-0.5 shrink-0 opacity-80" />
    <span className="text-sm md:text-base text-slate-200 leading-relaxed">{children}</span>
  </li>
);
const Problem = ({ children }) => (
  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
    <AlertTriangle className="w-4.5 h-4.5 text-rose-300 mt-0.5 shrink-0" />
    <p className="text-xs md:text-sm text-rose-100/90 leading-relaxed"><b className="text-rose-200 uppercase tracking-wide">Masalah yang kami jawab — </b>{children}</p>
  </div>
);
const FeatureCard = ({ icon: Icon, title, gradient, children }) => (
  <div className="w-full max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
    <div className={`flex items-center gap-3 px-6 md:px-8 py-4 bg-gradient-to-r ${gradient}`}>
      <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon className="w-6 h-6 text-white" /></span>
      <h2 className="font-heading text-xl md:text-2xl font-extrabold text-white">{title}</h2>
    </div>
    <div className="p-6 md:p-8">{children}</div>
  </div>
);
const Highlight = ({ value, label, color = "sky" }) => (
  <div className={`mt-4 rounded-2xl border p-4 text-center ${CHIP_COLORS[color]}`}>
    <p className="text-3xl font-black">{value}</p>
    <p className="text-xs text-slate-300/90 mt-1">{label}</p>
  </div>
);

/* ---------------- SLIDES ---------------- */
function SlideCover({ schoolName }) {
  return (
    <div className="text-center max-w-4xl">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-2xl shadow-sky-500/30">
        <GraduationCap className="w-11 h-11 text-white" />
      </div>
      <p className="mt-6 text-xs tracking-[0.3em] text-sky-300/80 uppercase">Sistem Manajemen Sekolah Terpadu</p>
      <h1 className="mt-3 font-heading text-4xl md:text-6xl font-black tracking-tight text-white">{schoolName}</h1>
      <p className="mt-5 text-base md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
        Dari buku absen yang menumpuk hingga kas kelas yang sulit dipertanggungjawabkan —
        kami menyatukan <span className="text-sky-300 font-semibold">seluruh denyut operasional sekolah</span> ke dalam satu platform yang rapi, cepat, dan transparan.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
        <Chip icon={Sparkles} color="sky">15+ Modul Terpadu</Chip>
        <Chip icon={Users} color="emerald">9 Peran Pengguna</Chip>
        <Chip icon={ShieldCheck} color="violet">Aman &amp; Transparan</Chip>
      </div>
      <div className="mt-10 flex items-center justify-center gap-3 text-xs text-slate-500 no-print">
        <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">Tekan → untuk mulai</span>
        <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">F = Layar penuh</span>
      </div>
    </div>
  );
}

function SlideOverview() {
  const modules = [
    [QrCode, "Absensi QR"], [CalendarCheck, "Rekap Mingguan"], [ShieldCheck, "Ujian Anti-Cheat"],
    [BrainCircuit, "Tugas & Quiz"], [FileText, "Rapor Digital"], [PiggyBank, "Kas Kelas"],
    [HandCoins, "Dana Sosial"], [Boxes, "Inventaris"], [BookOpen, "Perpustakaan"],
    [Network, "Kelas & BPH"], [Vote, "Pemilu OSIS"], [Camera, "Schoolgram"],
    [Trophy, "Prestasi"], [IdCard, "Kartu Pelajar"], [UserPlus, "PPDB Online"],
  ];
  return (
    <div className="max-w-5xl w-full">
      <Chip icon={Sparkles} color="sky">Gambaran Umum</Chip>
      <h2 className="mt-4 font-heading text-3xl md:text-5xl font-extrabold text-white leading-tight">
        Satu Platform. <span className="text-sky-400">Sembilan Peran.</span> Nol Kertas.
      </h2>
      <p className="mt-4 text-slate-300 max-w-3xl leading-relaxed">
        Sebelumnya, setiap urusan — kehadiran, nilai, keuangan, aset, organisasi — berjalan di buku, map, dan grup chat yang terpisah.
        Data tercecer, sulit diaudit, dan rawan hilang. Kini semuanya terhubung dalam satu dasbor cerdas.
      </p>
      <div className="mt-7 grid grid-cols-3 gap-4 md:gap-8">
        <Stat value="±73%" label="Lebih cepat presensi" />
        <Stat value="100%" label="Transparansi keuangan" accent="text-emerald-400" />
        <Stat value="24/7" label="Akses kapan saja" accent="text-violet-400" />
      </div>
      <div className="mt-8 grid grid-cols-3 sm:grid-cols-5 gap-3">
        {modules.map(([Icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 hover:bg-white/10 transition-colors">
            <Icon className="w-6 h-6 text-sky-400" />
            <span className="text-[11px] font-semibold text-slate-300 text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideAbsensi() {
  return (
    <FeatureCard icon={QrCode} title="Absensi QR / Barcode — 800 Siswa Tanpa Antre" gradient="from-sky-500 to-sky-700">
      <Problem>Presensi manual 800 siswa memakan hampir <b>2,5 jam</b> setiap pagi, rawan salah catat, dan membuka celah titip absen. Guru kehilangan waktu mengajar hanya untuk mengisi buku.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={QrCode}>Setiap siswa memegang <b className="text-white">Kartu Pelajar ber-QR permanen</b> — cukup ditunjukkan ke kamera pos presensi.</Bullet>
          <Bullet icon={ScanLine}>Dukungan <b className="text-white">barcode scanner USB</b> membaca NISN untuk kartu fisik cetak.</Bullet>
          <Bullet icon={Camera}><b className="text-white">Foto bukti otomatis</b> saat scan — menutup rapat celah titip absen.</Bullet>
          <Bullet icon={CheckCircle2}><b className="text-white">Anti-duplikat</b>: satu siswa hanya tercatat sekali per hari.</Bullet>
          <Bullet icon={Bell}>Status Hadir / Izin / Sakit / Alpa langsung terekam dalam satu log terpadu.</Bullet>
        </ul>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Waktu presensi 800 siswa</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 font-semibold">Manual (buku absen)</span><span className="text-rose-300 font-bold">± 2,5 jam</span></div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-sky-300 font-semibold">QR / Barcode (±3 dtk/siswa)</span><span className="text-sky-300 font-bold">± 40 menit</span></div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[27%] rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" /></div>
            </div>
          </div>
          <Highlight value="±73% lebih cepat" label="800 siswa terdata sebelum bel pertama" color="sky" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideRekap() {
  return (
    <FeatureCard icon={CalendarCheck} title="Rekap Mingguan & Auto-Arsip Absensi" gradient="from-cyan-500 to-sky-700">
      <Problem>Data absensi harian menumpuk di layar hingga ribuan baris, membuat sistem berat dan rekap akhir pekan jadi pekerjaan manual yang melelahkan. Arsip pun sering tercecer antar file.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={CalendarCheck}>Halaman khusus <b className="text-white">rekap 1 minggu penuh</b> dalam matriks berwarna H/I/S/A — bisa geser antar minggu.</Bullet>
          <Bullet icon={Clock}>Setiap <b className="text-white">Senin dini hari</b>, sistem otomatis mengekspor rekap minggu lalu ke Excel yang rapi.</Bullet>
          <Bullet icon={Database}>File tersimpan aman di <b className="text-white">Storage Rekap Absensi</b> — bisa diunduh kapan saja oleh Admin, Kepsek, Guru &amp; TU.</Bullet>
          <Bullet icon={Archive}>Data mingguan di website <b className="text-white">dibersihkan otomatis</b> setelah diarsipkan — aplikasi tetap ringan & cepat.</Bullet>
          <Bullet icon={FileSpreadsheet}>Excel ber-tema sekolah: total harian, rekap per siswa, legenda — siap cetak & ditandatangani.</Bullet>
        </ul>
        <div className="flex flex-col justify-center gap-3">
          {[["Guru/TU mencatat kehadiran harian", "1"], ["Senin dini hari — ekspor otomatis", "2"], ["Excel tersimpan ke Storage Rekap", "3"], ["Data mingguan dibersihkan dari web", "4"]].map(([label, n], i) => (
            <div key={n}><FlowStep n={n}>{label}</FlowStep>{i < 3 && <div className="ml-3.5 h-4 w-px bg-cyan-400/40" />}</div>
          ))}
          <Highlight value="0 kerja manual" label="arsip rapi & website selalu ringan" color="sky" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideUjian() {
  return (
    <FeatureCard icon={ShieldCheck} title="Ujian Online — Sistem Anti-Cheat" gradient="from-indigo-500 to-blue-700">
      <Problem>Ujian daring biasa mudah dicurangi: siswa membuka tab lain, menyalin jawaban, atau mengulang ujian. Guru sulit memastikan kejujuran tanpa pengawasan ketat.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={Lock}><b className="text-white">Password wajib</b> — begitu benar, ujian langsung mulai otomatis.</Bullet>
          <Bullet icon={Maximize}>Mode <b className="text-white">layar penuh dipaksa</b> selama pengerjaan.</Bullet>
          <Bullet icon={AlertTriangle}>Pindah tab / minimize / keluar fullscreen = <b className="text-white">pelanggaran tercatat di server</b>.</Bullet>
          <Bullet icon={ShieldCheck}>Mencapai batas pelanggaran → <b className="text-white">jawaban terkirim otomatis & ujian terkunci</b>.</Bullet>
          <Bullet icon={Shuffle}>Soal & opsi <b className="text-white">diacak per siswa</b>; ujian tidak bisa diulang.</Bullet>
          <Bullet icon={Timer}>Timer live; jawaban terkirim otomatis saat waktu habis.</Bullet>
        </ul>
        <div className="flex flex-col justify-center gap-3">
          {[["Guru membuat ujian + password", "1"], ["Siswa memasukkan password", "2"], ["Ujian mulai — layar penuh", "3"], ["Pelanggaran terdeteksi & dicatat", "4"], ["Guru melihat skor + pelanggaran", "5"]].map(([label, n], i) => (
            <div key={n}><FlowStep n={n}>{label}</FlowStep>{i < 4 && <div className="ml-3.5 h-4 w-px bg-indigo-400/40" />}</div>
          ))}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <p className="text-xs text-slate-300">Panel pelanggaran siswa</p>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500" /><span className="w-3.5 h-3.5 rounded-full bg-rose-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-white/20" /><span className="ml-2 text-xs font-bold text-rose-300">2 / 3</span>
            </div>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideTugasQuiz() {
  return (
    <FeatureCard icon={BrainCircuit} title="Tugas & Mini-Quiz — Penilaian Otomatis" gradient="from-fuchsia-500 to-pink-700">
      <Problem>Mengoreksi ratusan lembar tugas dan kuis menyita waktu guru hingga berjam-jam, umpan balik ke siswa pun jadi lambat dan nilai tersebar di banyak buku.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={ClipboardList}>Guru membuat <b className="text-white">tugas bertenggat</b>; siswa mengumpulkan langsung dari dasbor.</Bullet>
          <Bullet icon={BrainCircuit}><b className="text-white">Mini-Quiz pilihan ganda</b> dinilai otomatis saat siswa submit.</Bullet>
          <Bullet icon={Shuffle}>Soal & opsi <b className="text-white">diacak per siswa</b> untuk menekan contek-menyontek.</Bullet>
          <Bullet icon={CalendarDays}><b className="text-white">Quiz bulanan</b> terjadwal + rekap nilai per siswa & kelas.</Bullet>
          <Bullet icon={FileSpreadsheet}>Ekspor nilai ke Excel & umpan balik instan ke siswa.</Bullet>
        </ul>
        <div className="flex flex-col justify-center gap-3">
          {[["Guru menyusun soal + tenggat", "1"], ["Siswa mengerjakan (diacak)", "2"], ["Sistem menilai otomatis", "3"], ["Rekap & ekspor nilai", "4"]].map(([label, n], i) => (
            <div key={n}><FlowStep n={n}>{label}</FlowStep>{i < 3 && <div className="ml-3.5 h-4 w-px bg-pink-400/40" />}</div>
          ))}
          <Highlight value="0 menit" label="koreksi manual untuk pilihan ganda" color="rose" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideRapor() {
  return (
    <FeatureCard icon={FileText} title="Rapor Digital — Nilai & Perkembangan Terpadu" gradient="from-blue-500 to-indigo-700">
      <Problem>Rapor manual lambat disusun, sulit diakses orang tua, dan rekap kehadiran serta nilai sering tidak sinkron antara wali kelas dan tata usaha.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={FileText}>Wali kelas menyusun <b className="text-white">rapor digital</b> lengkap dengan nilai, kehadiran & catatan.</Bullet>
          <Bullet icon={Users}><b className="text-white">Siswa & orang tua</b> dapat melihat perkembangan kapan saja, dari mana saja.</Bullet>
          <Bullet icon={BarChart3}>Terhubung dengan data <b className="text-white">presensi & nilai quiz</b> — tanpa input ganda.</Bullet>
          <Bullet icon={Bell}>Kirim <b className="text-white">laporan via email</b> ke orang tua langsung dari dasbor.</Bullet>
          <Bullet icon={ShieldCheck}>Akses berjenjang: data rapor hanya untuk pihak yang berhak.</Bullet>
        </ul>
        <div className="flex flex-col justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-300">Kehadiran Semester</span><span className="text-emerald-300 font-bold">96%</span></div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[96%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" /></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-300">Rata-rata Nilai</span><span className="text-sky-300 font-bold">87,4</span></div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[87%] rounded-full bg-gradient-to-r from-sky-500 to-indigo-400" /></div>
          </div>
          <Highlight value="Satu sumber data" label="kehadiran, nilai & catatan menyatu" color="indigo" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKas() {
  return (
    <FeatureCard icon={PiggyBank} title="Kas Kelas — Transparan, Dikelola Bendahara" gradient="from-emerald-500 to-teal-700">
      <Problem>Uang kas yang dicatat di buku tulis rawan selisih dan kecurigaan. Siswa tak tahu ke mana uangnya mengalir, dan penagihan ke penunggak sering terlewat.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={Wallet}><b className="text-white">Jabatan Bendahara</b> resmi — Bendahara & Ketua Kelas mencatat setiap transaksi.</Bullet>
          <Bullet icon={HandCoins}>Opsi <b className="text-white">&quot;Dari siswa&quot;</b> — setiap rupiah tercatat atas nama pembayarnya.</Bullet>
          <Bullet icon={CalendarDays}>Rekap <b className="text-white">mingguan</b> per siswa + tombol &quot;Tandai Bayar&quot; sekali klik.</Bullet>
          <Bullet icon={Bell}><b className="text-white">Pengingat otomatis Jumat 08:00 WIB</b> ke yang belum membayar.</Bullet>
          <Bullet icon={Lock}>Anggota lain <b className="text-white">baca-saja</b> — transparansi penuh tanpa risiko diubah.</Bullet>
        </ul>
        <div className="flex flex-col justify-center gap-3">
          {[["Siswa membayar iuran", "1"], ["Bendahara mencatat", "2"], ["Saldo & rekap ter-update", "3"], ["Pengingat ke penunggak", "4"]].map(([label, n], i) => (
            <div key={n}><FlowStep n={n}>{label}</FlowStep>{i < 3 && <div className="ml-3.5 h-4 w-px bg-emerald-400/40" />}</div>
          ))}
          <Highlight value="100% transparan" label="setiap rupiah tercatat & dapat diaudit" color="emerald" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideDanaSosial() {
  return (
    <FeatureCard icon={HeartHandshake} title="Dana Sosial OSIS — Solidaritas yang Terukur" gradient="from-rose-500 to-pink-700">
      <Problem>Penggalangan dana duka/bantuan sering tidak terdokumentasi rapi — sulit menunjukkan berapa terkumpul, dari siapa, dan untuk apa disalurkan.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={HandCoins}>Catat <b className="text-white">pemasukan & pengeluaran</b> dana sosial lengkap dengan sumber & keterangan.</Bullet>
          <Bullet icon={BarChart3}><b className="text-white">Saldo berjalan</b> otomatis — total masuk, keluar, dan sisa dana selalu jelas.</Bullet>
          <Bullet icon={ShieldCheck}>Dikelola <b className="text-white">OSIS, Kepsek & Admin</b>; warga lain melihat laporan terbuka.</Bullet>
          <Bullet icon={FileSpreadsheet}>Ekspor <b className="text-white">laporan Excel ber-tema sekolah</b> untuk pertanggungjawaban.</Bullet>
        </ul>
        <div className="flex flex-col justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-emerald-300">Pemasukan</span><span className="font-bold text-emerald-300">Rp 4.250.000</span></div>
            <div className="flex justify-between"><span className="text-rose-300">Pengeluaran</span><span className="font-bold text-rose-300">Rp 1.500.000</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-slate-200 font-semibold">Saldo Akhir</span><span className="font-black text-white">Rp 2.750.000</span></div>
          </div>
          <Highlight value="Akuntabel" label="setiap bantuan tercatat & dilaporkan" color="rose" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideInventaris() {
  return (
    <FeatureCard icon={Boxes} title="Inventaris — Aset Sekolah Selalu Terlacak" gradient="from-amber-500 to-orange-700">
      <Problem>Barang sekolah sering hilang tak berjejak, stok habis tanpa peringatan, dan peminjaman alat tak tercatat sehingga saling lempar tanggung jawab.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={Boxes}>Data lengkap: <b className="text-white">kode, kategori, lokasi, kondisi, stok, min. stok</b>.</Bullet>
          <Bullet icon={AlertTriangle}><b className="text-white">Peringatan stok menipis</b> otomatis — pengadaan tak pernah terlewat.</Bullet>
          <Bullet icon={ArrowRightLeft}>Siklus peminjaman: <b className="text-white">ajukan → setujui/tolak → kembalikan</b>, stok menyesuaikan otomatis.</Bullet>
          <Bullet icon={Bell}>Pemohon menerima notifikasi di setiap perubahan status.</Bullet>
          <Bullet icon={FileSpreadsheet}>Riwayat per barang + <b className="text-white">ekspor laporan Excel rapi</b>.</Bullet>
        </ul>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Contoh: stok Proyektor</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-200">Proyektor EPSON · Gudang A</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Baik</span>
            </div>
            <div className="h-5 rounded-full bg-white/10 overflow-hidden flex">
              <div className="h-full w-[60%] bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <div className="h-full w-[40%] bg-gradient-to-r from-amber-500 to-amber-400" />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Tersedia 6</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Dipinjam 4</span>
              <span className="font-bold text-white">Total 10</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
            <p className="text-xs text-rose-200"><b>Stok menipis:</b> &quot;Kabel HDMI&quot; tersisa 2 dari min. 5.</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlidePerpustakaan() {
  return (
    <FeatureCard icon={BookOpen} title="Perpustakaan Pintar — Baca Lebih Mudah" gradient="from-violet-500 to-indigo-700">
      <Problem>Katalog buku di buku besar bikin siswa sulit mencari judul, petugas repot mencatat pinjam-kembali manual, dan denda keterlambatan kerap tidak terpantau.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={Search}>Siswa <b className="text-white">mencari, meminjam & mengembalikan</b> buku mandiri dari dasbor.</Bullet>
          <Bullet icon={ShieldCheck}>Hanya <b className="text-white">Admin Perpustakaan</b> yang mengelola koleksi, sirkulasi & kebijakan.</Bullet>
          <Bullet icon={Sparkles}><b className="text-white">AI</b> membuat ringkasan buku & rekomendasi bacaan personal.</Bullet>
          <Bullet icon={Star}>Ulasan & rating pembaca, reservasi antre saat stok habis.</Bullet>
          <Bullet icon={FileSpreadsheet}>Denda otomatis, statistik populer, & ekspor sirkulasi ke Excel.</Bullet>
        </ul>
        <div className="flex flex-col justify-center gap-3">
          {[["Admin menata koleksi buku", "1"], ["Siswa cari & pinjam mandiri", "2"], ["Sistem hitung tempo & denda", "3"], ["Pengembalian & statistik", "4"]].map(([label, n], i) => (
            <div key={n}><FlowStep n={n}>{label}</FlowStep>{i < 3 && <div className="ml-3.5 h-4 w-px bg-violet-400/40" />}</div>
          ))}
          <Highlight value="Minat baca naik" label="akses koleksi 24/7 + rekomendasi AI" color="violet" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKelasBph() {
  return (
    <FeatureCard icon={Network} title="Manajemen Kelas & Struktur BPH" gradient="from-purple-500 to-fuchsia-700">
      <Problem>Struktur pengurus kelas sering hanya ada di kertas, berbeda-beda format, dan hilang saat pergantian tahun — menyulitkan koordinasi dan pembagian tugas.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={Network}>Bagan <b className="text-white">BPH per kelas</b> berjenjang dengan foto, garis penghubung & drag-and-drop.</Bullet>
          <Bullet icon={Copy}><b className="text-white">Salin Struktur</b> dari kelas lain — konsisten dalam sekejap.</Bullet>
          <Bullet icon={Lock}><b className="text-white">Password kelas</b> sekali masuk; ganti password mengatur ulang akses semua anggota.</Bullet>
          <Bullet icon={Users}>Siswa dengan nama kelas sama otomatis menjadi anggota.</Bullet>
          <Bullet icon={ShieldCheck}>Hanya <b className="text-white">Ketua Kelas</b> yang mengubah; lainnya baca-saja.</Bullet>
        </ul>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="px-5 py-2.5 rounded-xl bg-violet-500/20 border-2 border-violet-400/60 text-center"><p className="text-sm font-bold text-white">Ketua Kelas</p><p className="text-[10px] text-violet-300">Lapis 1</p></div>
            <div className="h-5 w-px bg-violet-400/50" />
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="px-4 py-2 rounded-xl bg-teal-500/20 border border-teal-400/50 text-center"><p className="text-xs font-bold text-teal-200">Bendahara</p></div>
                <div className="h-4 w-px bg-teal-400/40" /><div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-[10px] text-slate-300">Sie Dana</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-center"><p className="text-xs font-bold text-slate-200">Sekretaris</p></div>
                <div className="h-4 w-px bg-white/20" /><div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-[10px] text-slate-300">Sie Kebersihan</div>
              </div>
            </div>
            <p className="mt-5 text-xs text-slate-400 italic">Kedalaman tak terbatas · konsisten antar tahun</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlidePemilu() {
  return (
    <FeatureCard icon={Vote} title="Pemilu OSIS — Demokrasi Digital yang Jujur" gradient="from-teal-500 to-emerald-700">
      <Problem>Pemilihan OSIS dengan kertas suara memakan waktu panjang untuk menghitung, rawan suara ganda, dan hasil sulit diverifikasi secara terbuka.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={Vote}>Setiap siswa memberi <b className="text-white">satu suara</b> — sistem mencegah suara ganda.</Bullet>
          <Bullet icon={Users}>Profil & visi-misi kandidat tampil rapi sebelum memilih.</Bullet>
          <Bullet icon={BarChart3}><b className="text-white">Hitung suara real-time</b> — hasil langsung terlihat & transparan.</Bullet>
          <Bullet icon={ShieldCheck}>Periode pemilihan diatur panitia; ditutup otomatis saat selesai.</Bullet>
        </ul>
        <div className="flex flex-col justify-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            {[["Paslon 01", 58, "from-teal-500 to-emerald-400"], ["Paslon 02", 42, "from-sky-500 to-cyan-400"]].map(([n, p, g]) => (
              <div key={n}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-200 font-semibold">{n}</span><span className="font-bold text-white">{p}%</span></div>
                <div className="h-4 rounded-full bg-white/10 overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${g}`} style={{ width: `${p}%` }} /></div>
              </div>
            ))}
          </div>
          <Highlight value="Hasil seketika" label="tanpa hitung manual, tanpa suara ganda" color="emerald" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKomunikasi() {
  return (
    <FeatureCard icon={Megaphone} title="Komunikasi & Budaya Sekolah" gradient="from-sky-500 to-indigo-700">
      <Problem>Informasi sekolah tersebar di banyak grup chat dan papan pengumuman — mudah terlewat, sulit diarsipkan, dan prestasi siswa kurang terekspos.</Problem>
      <div className="grid md:grid-cols-2 gap-6">
        <ul className="space-y-3">
          <Bullet icon={Megaphone}><b className="text-white">Pengumuman resmi</b> tampil di dasbor semua warga — bahkan di halaman login.</Bullet>
          <Bullet icon={CalendarDays}><b className="text-white">Kalender akademik</b> terpusat: ujian, libur & agenda sekolah.</Bullet>
          <Bullet icon={Camera}><b className="text-white">Schoolgram</b> — galeri kegiatan sekolah bergaya media sosial.</Bullet>
          <Bullet icon={Trophy}><b className="text-white">Dinding Prestasi</b> memajang pencapaian siswa secara publik.</Bullet>
        </ul>
        <div className="grid grid-cols-2 gap-3 content-center">
          {[[Megaphone, "Pengumuman"], [CalendarDays, "Kalender"], [Camera, "Schoolgram"], [Trophy, "Prestasi"], [HandCoins, "Kritik & Saran"]].map(([Icon, l]) => (
            <div key={l} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-5 hover:bg-white/10 transition-colors">
              <Icon className="w-7 h-7 text-sky-400" /><span className="text-xs font-semibold text-slate-300">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </FeatureCard>
  );
}

function SlidePpdb() {
  return (
    <FeatureCard icon={UserPlus} title="PPDB Online — Pendaftaran Siswa Baru" gradient="from-cyan-500 to-blue-700">
      <Problem>Pendaftaran siswa baru secara tatap muka menimbulkan antrean panjang, berkas tercecer, dan calon siswa dari jauh kesulitan memantau status kelulusan.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={UserPlus}>Calon siswa <b className="text-white">mendaftar online tanpa akun</b> — cukup dari rumah.</Bullet>
          <Bullet icon={Upload}><b className="text-white">Upload berkas</b> (ijazah, foto, dokumen) langsung dari perangkat.</Bullet>
          <Bullet icon={FileCheck}>Panitia memverifikasi & <b className="text-white">mengumumkan kelulusan</b> dari dasbor.</Bullet>
          <Bullet icon={Clock}>Pendaftar <b className="text-white">memantau status</b> mandiri kapan saja.</Bullet>
          <Bullet icon={Bell}>Notifikasi hasil via email — transparan & tanpa antre.</Bullet>
        </ul>
        <div className="flex flex-col justify-center gap-3">
          {[["Isi formulir online", "1"], ["Upload berkas", "2"], ["Panitia verifikasi", "3"], ["Pengumuman kelulusan", "4"]].map(([label, n], i) => (
            <div key={n}><FlowStep n={n}>{label}</FlowStep>{i < 3 && <div className="ml-3.5 h-4 w-px bg-cyan-400/40" />}</div>
          ))}
          <Highlight value="24/7" label="daftar & pantau tanpa batas jam kantor" color="sky" />
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKartu() {
  return (
    <FeatureCard icon={IdCard} title="Kartu Pelajar Digital — Cetak Format KTP" gradient="from-teal-500 to-emerald-700">
      <Problem>Pembuatan kartu pelajar konvensional lambat dan mahal, mudah dipalsukan, serta tidak terhubung dengan sistem presensi maupun perpustakaan.</Problem>
      <div className="grid md:grid-cols-2 gap-8">
        <ul className="space-y-3">
          <Bullet icon={IdCard}>Setiap siswa punya <b className="text-white">Kartu Pelajar digital ber-QR</b>, otomatis sejak akun dibuat.</Bullet>
          <Bullet icon={Printer}><b className="text-white">Cetak massal format KTP</b> (CR80) — siap dilaminasi.</Bullet>
          <Bullet icon={QrCode}>QR & barcode NISN untuk <b className="text-white">presensi & peminjaman</b>.</Bullet>
          <Bullet icon={Sparkles}>Desain <b className="text-white">ter-branding sekolah</b>: logo, masa berlaku & tata tertib.</Bullet>
        </ul>
        <div className="flex items-center justify-center">
          <div className="w-72 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 p-5 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2"><GraduationCap className="w-6 h-6" /><span className="font-heading font-extrabold text-sm">KARTU PELAJAR</span></div>
            </div>
            <div className="mt-4 flex gap-3 items-start">
              <div className="w-14 h-18 rounded-lg bg-white/20 border border-white/30" />
              <div className="flex-1 space-y-1.5"><div className="h-2.5 w-24 rounded bg-white/40" /><div className="h-2 w-20 rounded bg-white/25" /><div className="h-2 w-16 rounded bg-white/25" /></div>
              <div className="w-14 h-14 rounded bg-white p-1 flex items-center justify-center"><QrCode className="w-full h-full text-slate-900" /></div>
            </div>
            <div className="mt-3 h-6 rounded bg-white flex items-center justify-center overflow-hidden">
              <div className="flex gap-0.5 items-center">{Array.from({ length: 28 }).map((_, i) => <span key={i} className="bg-slate-900" style={{ width: i % 3 ? 1 : 2, height: 16 }} />)}</div>
            </div>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideClosing({ schoolName }) {
  return (
    <div className="text-center max-w-3xl">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-2xl shadow-sky-500/30">
        <TrendingUp className="w-8 h-8 text-white" />
      </div>
      <h2 className="mt-8 font-heading text-4xl md:text-6xl font-extrabold text-white">Sekolah Lebih Rapi,<br /><span className="text-sky-400">Mulai Hari Ini.</span></h2>
      <p className="mt-3 text-sky-300 font-semibold">{schoolName}</p>
      <p className="mt-5 text-slate-400 text-sm md:text-base leading-relaxed">
        Presensi secepat kilat. Rekap & arsip yang mengurus dirinya sendiri. Keuangan yang transparan.
        Perpustakaan pintar, ujian yang jujur, dan komunikasi satu pintu — semuanya elegan dalam satu platform.
      </p>
      <div className="mt-10 flex items-center justify-center gap-3 flex-wrap no-print">
        <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/30 transition-colors">Masuk ke Aplikasi <ArrowRight className="w-4 h-4" /></Link>
        <Link to="/profil-sekolah" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold transition-colors">Lihat Profil Sekolah</Link>
      </div>
    </div>
  );
}

const SLIDES = [
  SlideCover, SlideOverview, SlideAbsensi, SlideRekap, SlideUjian, SlideTugasQuiz,
  SlideRapor, SlideKas, SlideDanaSosial, SlideInventaris, SlidePerpustakaan,
  SlideKelasBph, SlidePemilu, SlideKomunikasi, SlidePpdb, SlideKartu, SlideClosing,
];
const PALETTE = [
  "from-slate-950 via-slate-900 to-sky-950", "from-slate-950 via-sky-950 to-slate-950",
  "from-slate-950 via-emerald-950 to-slate-950", "from-slate-950 via-violet-950 to-slate-950",
  "from-slate-950 via-amber-950 to-slate-950", "from-slate-950 via-fuchsia-950 to-slate-950",
  "from-slate-950 via-indigo-950 to-slate-950", "from-slate-950 via-cyan-950 to-slate-950",
  "from-slate-950 via-rose-950 to-slate-950", "from-slate-950 via-teal-950 to-slate-950",
];
const ACCENTS = SLIDES.map((_, i) => PALETTE[i % PALETTE.length]);

/* ---------------- DECK ---------------- */
export default function Presentation() {
  const { settings } = useSettings();
  const schoolName = settings.school_name || "SEKOLAH";
  const [idx, setIdx] = useState(0);
  const [fs, setFs] = useState(false);
  const total = SLIDES.length;

  const renderSlide = (Comp, key) => <Comp key={key} schoolName={schoolName} />;
  const go = useCallback((n) => setIdx(i => Math.max(0, Math.min(total - 1, typeof n === "function" ? n(i) : n))), [total]);
  const next = useCallback(() => go(i => i + 1), [go]);
  const prev = useCallback(() => go(i => i - 1), [go]);

  useEffect(() => {
    const onKey = (e) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("fullscreenchange", onFs); };
  }, [next, prev, go, total]);

  const Current = SLIDES[idx];

  return (
    <>
      <div className={`screen-deck h-screen w-screen overflow-hidden bg-gradient-to-br ${ACCENTS[idx]} text-slate-100 flex flex-col transition-colors duration-700`} data-testid="presentation-deck">
        <div className="h-1 bg-white/10 shrink-0">
          <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-5 py-8 md:px-10">
          <div key={idx} className="w-full animate-[slideIn_.45s_ease] flex justify-center">{renderSlide(Current, idx)}</div>
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 md:px-8 py-3 bg-black/20 border-t border-white/10">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase hidden sm:inline">{schoolName}</span>
          </div>
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} data-testid={`slide-dot-${i}`} onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all ${i === idx ? "w-6 h-2 bg-sky-400" : "w-2 h-2 bg-white/25 hover:bg-white/50"}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400 mr-2" data-testid="slide-counter">{idx + 1} / {total}</span>
            <button data-testid="slide-print" onClick={() => window.print()} title="Cetak / Ekspor PDF handout"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1.5">
              <Printer className="w-4 h-4" /><span className="hidden md:inline text-xs font-semibold">Cetak PDF</span>
            </button>
            <a data-testid="slide-download-pptx" href={`${process.env.REACT_APP_BACKEND_URL}/api/presentation/pptx`} download
              title="Unduh sebagai PowerPoint (.pptx)"
              className="p-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 transition-colors flex items-center gap-1.5">
              <Download className="w-4 h-4" /><span className="hidden md:inline text-xs font-semibold">Unduh PPTX</span>
            </a>
            <button data-testid="slide-prev" onClick={prev} disabled={idx === 0}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button data-testid="slide-next" onClick={next} disabled={idx === total - 1}
              className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <button data-testid="slide-fullscreen" onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => {}); }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title="Layar penuh (F)">
              {fs ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="print-deck" data-testid="presentation-print">
        {SLIDES.map((Comp, i) => (
          <section key={i} className={`print-slide bg-gradient-to-br ${ACCENTS[i]} text-slate-100`}>
            <div className="w-full flex items-center justify-center px-10 py-12">{renderSlide(Comp, `p-${i}`)}</div>
            <div className="print-foot">{schoolName} · Slide {i + 1} / {total}</div>
          </section>
        ))}
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .print-deck { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .no-print { display: none !important; }
          .screen-deck { display: none !important; }
          .print-deck { display: block !important; }
          .print-slide { position: relative; min-height: 100vh; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-slide:last-child { page-break-after: auto; }
          .print-foot { position: absolute; bottom: 12px; left: 0; right: 0; text-align: center; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.55); }
        }
      `}</style>
    </>
  );
}
