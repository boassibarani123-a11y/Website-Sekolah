import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import {
  GraduationCap, QrCode, ScanLine, PiggyBank, Wallet, Network, Boxes,
  ShieldCheck, ChevronLeft, ChevronRight, Maximize, Minimize, Users,
  Timer, AlertTriangle, Lock, Bell, FileSpreadsheet, ArrowRightLeft,
  ClipboardList, BrainCircuit, IdCard, CalendarDays, Megaphone, CheckCircle2,
  TrendingUp, UserCheck, ArrowRight, Sparkles, HandCoins, Copy, BarChart3,
  UserPlus, Upload, Printer, FileCheck, Clock, Shuffle,
} from "lucide-react";

/* ---------------- komponen visual kecil ---------------- */
const CHIP_COLORS = {
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
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

const FeatureCard = ({ icon: Icon, title, gradient, children }) => (
  <div className="w-full max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
    <div className={`flex items-center gap-3 px-6 md:px-8 py-4 bg-gradient-to-r ${gradient}`}>
      <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon className="w-6 h-6 text-white" /></span>
      <h2 className="font-heading text-xl md:text-2xl font-extrabold text-white">{title}</h2>
    </div>
    <div className="p-6 md:p-8">{children}</div>
  </div>
);

/* ---------------- SLIDES ---------------- */
function SlideCover({ schoolName }) {
  return (
    <div className="text-center max-w-4xl">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-sky-400 to-indigo-600 flex items-center justify-center shadow-2xl shadow-sky-500/30">
        <GraduationCap className="w-11 h-11 text-white" />
      </div>
      <h1 className="mt-8 font-heading text-4xl md:text-6xl font-black tracking-tight text-white">{schoolName}</h1>
      <p className="mt-3 text-lg md:text-2xl text-sky-300 font-semibold">Sistem Manajemen Sekolah Terpadu</p>
      <p className="mt-6 text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
        Satu platform untuk seluruh warga sekolah — presensi digital, keuangan kas yang transparan,
        struktur kelas yang rapi, inventaris terlacak, dan ujian daring yang aman.
      </p>
      <div className="mt-10 flex items-center justify-center gap-3 text-xs text-slate-500 no-print">
        <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">Tekan → untuk mulai</span>
        <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5">F = Layar penuh</span>
      </div>
    </div>
  );
}

function SlideOverview() {
  const modules = [
    [QrCode, "Absensi QR"], [PiggyBank, "Kas Kelas"], [Network, "Kelas & BPH"], [Boxes, "Inventaris"],
    [ShieldCheck, "Ujian Anti-Cheat"], [ClipboardList, "Tugas"], [BrainCircuit, "Mini-Quiz"], [IdCard, "Kartu Pelajar"],
    [CalendarDays, "Kalender"], [Megaphone, "Pengumuman"], [HandCoins, "Dana Sosial"], [FileSpreadsheet, "Laporan"],
  ];
  return (
    <div className="max-w-5xl w-full">
      <Chip icon={Sparkles} color="sky">Overview Sistem</Chip>
      <h2 className="mt-4 font-heading text-3xl md:text-5xl font-extrabold text-white">Satu Platform. <span className="text-sky-400">Sembilan Peran.</span> Nol Kertas.</h2>
      <div className="mt-8 grid grid-cols-3 gap-4 md:gap-8">
        <Stat value="9" label="Peran Pengguna" />
        <Stat value="15+" label="Modul Terintegrasi" accent="text-emerald-400" />
        <Stat value="1" label="Dasbor Terpadu" accent="text-violet-400" />
      </div>
      <div className="mt-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {modules.map(([Icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 hover:bg-white/10 transition-colors">
            <Icon className="w-6 h-6 text-sky-400" />
            <span className="text-[11px] font-semibold text-slate-300 text-center">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-slate-400">
        Peran: Super Admin · Kepala Sekolah · Staff TU · Guru · Siswa · Ketua Kelas · <b className="text-teal-300">Bendahara</b> · Ketua OSIS · Orang Tua
      </p>
    </div>
  );
}

function SlideAbsensi() {
  return (
    <FeatureCard icon={QrCode} title="Absensi QR / Barcode — 800 Siswa Tanpa Antre" gradient="from-sky-500 to-sky-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={QrCode}>Setiap siswa memiliki <b className="text-white">Kartu Pelajar digital dengan QR permanen</b> — cukup tunjukkan ke kamera pos presensi</Bullet>
            <Bullet icon={ScanLine}>Mendukung <b className="text-white">barcode scanner USB</b> (keyboard-wedge) membaca NISN — cocok untuk kartu fisik cetak</Bullet>
            <Bullet icon={UserCheck}>Metode <b className="text-white">Manual</b> tersedia sebagai cadangan; semua metode tercatat dalam satu log</Bullet>
            <Bullet icon={CheckCircle2}><b className="text-white">Anti-duplikat</b>: satu siswa hanya tercatat sekali per hari</Bullet>
            <Bullet icon={Bell}>Notifikasi kehadiran otomatis ke siswa & orang tua</Bullet>
            <Bullet icon={FileSpreadsheet}>Rekap & statistik kehadiran, ekspor Excel lengkap dengan kolom Metode</Bullet>
          </ul>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Perkiraan waktu presensi 800 siswa</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 font-semibold">Manual (buku absen)</span><span className="text-rose-300 font-bold">± 2,5 jam</span></div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-sky-300 font-semibold">QR / Barcode (±3 detik/siswa)</span><span className="text-sky-300 font-bold">± 40 menit</span></div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-[27%] rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" /></div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
            <p className="text-3xl font-black text-sky-300">±73% lebih cepat</p>
            <p className="text-xs text-slate-400 mt-1">800 siswa terdata sebelum bel pertama selesai</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKas() {
  return (
    <FeatureCard icon={PiggyBank} title="Kas Kelas — Transparan, Dikelola Bendahara" gradient="from-emerald-500 to-teal-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={Wallet}><b className="text-white">Jabatan Bendahara</b>: Ketua Kelas/Super Admin menunjuk 1 siswa — Bendahara & Ketua Kelas sama-sama bisa tambah, edit, hapus transaksi</Bullet>
            <Bullet icon={HandCoins}>Pencatatan masuk/keluar dengan opsi <b className="text-white">&quot;Dari siswa&quot;</b> — setiap rupiah tercatat atas nama pembayarnya</Bullet>
            <Bullet icon={CalendarDays}>Rekap <b className="text-white">mingguan (Senin–Minggu WIB)</b> per siswa + tombol &quot;Tandai Bayar&quot; sekali klik</Bullet>
            <Bullet icon={BarChart3}>Rekap bulanan per minggu & <b className="text-white">grafik tren kas 3–12 bulan</b></Bullet>
            <Bullet icon={Bell}><b className="text-white">Pengingat otomatis Jumat 08:00 WIB</b> ke siswa yang belum membayar (cron)</Bullet>
            <Bullet icon={Lock}>Anggota lain <b className="text-white">baca-saja</b> — transparansi penuh tanpa risiko perubahan</Bullet>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3">
          {[["Siswa membayar iuran mingguan", "1"], ["Bendahara / Ketua mencatat", "2"], ["Sistem memperbarui saldo & rekap", "3"], ["Pengingat otomatis ke penunggak", "4"]].map(([label, n], i) => (
            <div key={n}>
              <FlowStep n={n}>{label}</FlowStep>
              {i < 3 && <div className="ml-3.5 h-4 w-px bg-emerald-400/40" />}
            </div>
          ))}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-3"><p className="text-lg font-black text-emerald-300">2</p><p className="text-[10px] text-slate-400 uppercase">Pengelola kas</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 py-3"><p className="text-lg font-black text-white">7</p><p className="text-[10px] text-slate-400 uppercase">Hari / siklus</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 py-3"><p className="text-lg font-black text-white">100%</p><p className="text-[10px] text-slate-400 uppercase">Transparan</p></div>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKelasBph() {
  return (
    <FeatureCard icon={Network} title="Manajemen Kelas & Struktur BPH" gradient="from-violet-500 to-purple-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={Network}>Bagan <b className="text-white">BPH per kelas</b>: jabatan berjenjang dengan label tingkat (Lapis), garis penghubung, foto pengurus, dan drag-and-drop</Bullet>
            <Bullet icon={Copy}><b className="text-white">Salin Struktur</b>: Super Admin dapat menyalin bagan BPH dari kelas lain saat membuat kelas baru — konsisten dalam sekejap</Bullet>
            <Bullet icon={Lock}><b className="text-white">Password kelas</b>: anggota cukup memasukkan sekali; mengganti password otomatis mengatur ulang akses semua anggota</Bullet>
            <Bullet icon={Users}>Siswa dengan nama kelas yang sama otomatis menjadi anggota</Bullet>
            <Bullet icon={ShieldCheck}>Hanya <b className="text-white">Ketua Kelas</b> yang mengubah BPH; anggota lain melihat baca-saja</Bullet>
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-0">
            <div className="px-5 py-2.5 rounded-xl bg-violet-500/20 border-2 border-violet-400/60 text-center">
              <p className="text-sm font-bold text-white">Ketua Kelas</p>
              <p className="text-[10px] text-violet-300">Lapis 1</p>
            </div>
            <div className="h-5 w-px bg-violet-400/50" />
            <div className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="px-4 py-2 rounded-xl bg-teal-500/20 border border-teal-400/50 text-center">
                  <p className="text-xs font-bold text-teal-200">Bendahara</p>
                  <p className="text-[9px] text-teal-400">kelola kas</p>
                </div>
                <div className="h-4 w-px bg-teal-400/40" />
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-[10px] text-slate-300">Sie Dana</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-center">
                  <p className="text-xs font-bold text-slate-200">Sekretaris</p>
                  <p className="text-[9px] text-slate-400">administrasi</p>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-[10px] text-slate-300">Sie Kebersihan</div>
              </div>
            </div>
            <p className="mt-5 text-xs text-slate-400 italic">Kedalaman tak terbatas · garis putus-putus untuk jabatan non-struktural</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideInventaris() {
  return (
    <FeatureCard icon={Boxes} title="Inventaris — Stok Selalu Terlacak" gradient="from-amber-500 to-orange-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={Boxes}>Data lengkap: <b className="text-white">kode, kategori, lokasi, kondisi, stok, min. stok</b> — dengan tombol Edit & Hapus di tiap barang</Bullet>
            <Bullet icon={AlertTriangle}><b className="text-white">Peringatan stok menipis</b> otomatis saat stok ≤ batas minimum — pengadaan tidak pernah terlewat</Bullet>
            <Bullet icon={ArrowRightLeft}>Siklus peminjaman penuh: <b className="text-white">ajukan → setujui/tolak → dikembalikan</b>; stok berkurang & kembali otomatis</Bullet>
            <Bullet icon={Bell}>Pemohon menerima notifikasi di setiap perubahan status</Bullet>
            <Bullet icon={FileSpreadsheet}>Riwayat per barang + <b className="text-white">ekspor laporan Excel</b> (tersedia, dipinjam, total)</Bullet>
          </ul>
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Contoh: stok Proyektor</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-semibold text-slate-200">Proyektor EPSON · Gudang A</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Kondisi Baik</span>
            </div>
            <div className="h-5 rounded-full bg-white/10 overflow-hidden flex">
              <div className="h-full w-[60%] bg-gradient-to-r from-emerald-500 to-emerald-400" title="Tersedia" />
              <div className="h-full w-[40%] bg-gradient-to-r from-amber-500 to-amber-400" title="Dipinjam" />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Tersedia 6</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Dipinjam 4</span>
              <span className="font-bold text-white">Total 10</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
            <p className="text-xs text-rose-200"><b>Stok menipis:</b> &quot;Kabel HDMI&quot; tersisa 2 dari min. 5 — segera adakan pengadaan.</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideTugasQuiz() {
  return (
    <FeatureCard icon={BrainCircuit} title="Tugas & Mini-Quiz — Penilaian Otomatis" gradient="from-fuchsia-500 to-pink-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={ClipboardList}>Guru membuat <b className="text-white">tugas dengan tenggat waktu</b>; siswa mengumpulkan jawaban/berkas langsung dari dasbor</Bullet>
            <Bullet icon={BrainCircuit}><b className="text-white">Mini-Quiz pilihan ganda</b> dengan penilaian otomatis begitu siswa submit</Bullet>
            <Bullet icon={Shuffle}>Soal & opsi <b className="text-white">diacak per siswa</b> untuk mengurangi contek-menyontek</Bullet>
            <Bullet icon={CalendarDays}><b className="text-white">Quiz bulanan</b> terjadwal + rekap nilai per siswa & per kelas</Bullet>
            <Bullet icon={FileSpreadsheet}>Ekspor nilai ke Excel & umpan balik langsung ke siswa</Bullet>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3">
          {[["Guru menyusun soal + tenggat", "1"], ["Siswa mengerjakan (soal diacak)", "2"], ["Sistem menilai otomatis", "3"], ["Rekap & ekspor nilai", "4"]].map(([label, n], i) => (
            <div key={n}>
              <FlowStep n={n}>{label}</FlowStep>
              {i < 3 && <div className="ml-3.5 h-4 w-px bg-pink-400/40" />}
            </div>
          ))}
          <div className="mt-4 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 text-center">
            <p className="text-3xl font-black text-pink-300">0 menit</p>
            <p className="text-xs text-slate-400 mt-1">waktu koreksi manual untuk soal pilihan ganda</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlidePpdb() {
  return (
    <FeatureCard icon={UserPlus} title="PPDB Online — Pendaftaran Siswa Baru" gradient="from-cyan-500 to-blue-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={UserPlus}>Calon siswa <b className="text-white">mendaftar online tanpa perlu akun</b> — cukup isi formulir dari rumah</Bullet>
            <Bullet icon={Upload}><b className="text-white">Upload berkas</b> (ijazah, foto, dokumen) langsung dari perangkat</Bullet>
            <Bullet icon={FileCheck}>Panitia memverifikasi dokumen & <b className="text-white">mengumumkan kelulusan</b> dari dasbor Admin PPDB</Bullet>
            <Bullet icon={Clock}>Pendaftar dapat <b className="text-white">memantau status</b> secara mandiri kapan saja</Bullet>
            <Bullet icon={Bell}>Notifikasi hasil via email — transparan & tanpa antre di sekolah</Bullet>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3">
          {[["Isi formulir online", "1"], ["Upload berkas pendukung", "2"], ["Panitia verifikasi", "3"], ["Pengumuman kelulusan", "4"]].map(([label, n], i) => (
            <div key={n}>
              <FlowStep n={n}>{label}</FlowStep>
              {i < 3 && <div className="ml-3.5 h-4 w-px bg-cyan-400/40" />}
            </div>
          ))}
          <div className="mt-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center">
            <p className="text-3xl font-black text-cyan-300">24/7</p>
            <p className="text-xs text-slate-400 mt-1">pendaftaran & pemantauan status tanpa batas jam kantor</p>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function SlideKartu() {
  return (
    <FeatureCard icon={IdCard} title="Kartu Pelajar Digital — Cetak Format KTP" gradient="from-teal-500 to-emerald-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={IdCard}>Setiap siswa punya <b className="text-white">Kartu Pelajar digital</b> ber-QR permanen, otomatis sejak akun dibuat</Bullet>
            <Bullet icon={Printer}><b className="text-white">Cetak massal format KTP</b> (CR80) — siap dilaminasi menjadi kartu fisik</Bullet>
            <Bullet icon={QrCode}>QR & NISN digunakan untuk <b className="text-white">presensi dan peminjaman inventaris</b></Bullet>
            <Bullet icon={Sparkles}>Desain <b className="text-white">ter-branding sekolah</b>: logo, nama, masa berlaku, dan tata tertib di balik kartu — semua diatur dari Pengaturan</Bullet>
          </ul>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-72 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-700 p-5 shadow-2xl border border-white/20">
            <div className="flex items-center gap-2 text-white">
              <GraduationCap className="w-6 h-6"/>
              <span className="font-heading font-extrabold text-sm">KARTU PELAJAR</span>
            </div>
            <div className="mt-4 flex gap-3">
              <div className="w-16 h-20 rounded-lg bg-white/20 border border-white/30" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-24 rounded bg-white/40" />
                <div className="h-2 w-20 rounded bg-white/25" />
                <div className="h-2 w-16 rounded bg-white/25" />
              </div>
              <div className="w-12 h-12 rounded bg-white p-1 flex items-center justify-center"><QrCode className="w-full h-full text-slate-900"/></div>
            </div>
            <div className="mt-3 text-[10px] text-sky-100/80 uppercase tracking-wider">Berlaku 2025 - 2028</div>
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
        Presensi 800 siswa dalam hitungan menit. Kas kelas yang transparan. Struktur kelas yang konsisten.
        Aset yang selalu terlacak. Ujian yang jujur.
      </p>
      <div className="mt-10 flex items-center justify-center gap-3 flex-wrap no-print">
        <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/30 transition-colors">
          Masuk ke Aplikasi <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/dokumentasi" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold transition-colors">
          Lihat Dokumentasi (TOR · PRD · BPMN)
        </Link>
      </div>
    </div>
  );
}

function SlideUjian() {
  return (
    <FeatureCard icon={ShieldCheck} title="Ujian Online — Sistem Anti-Cheat" gradient="from-indigo-500 to-blue-700">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <ul className="space-y-3">
            <Bullet icon={Lock}><b className="text-white">Password wajib</b> — begitu password benar, ujian <b className="text-white">langsung mulai otomatis</b></Bullet>
            <Bullet icon={Maximize}>Mode <b className="text-white">layar penuh dipaksa</b> selama pengerjaan</Bullet>
            <Bullet icon={AlertTriangle}>Pindah tab / minimize / keluar fullscreen = <b className="text-white">pelanggaran tercatat di server</b> + peringatan</Bullet>
            <Bullet icon={ShieldCheck}>Mencapai batas pelanggaran (mis. 3×) → <b className="text-white">jawaban dikirim otomatis & ujian terkunci</b></Bullet>
            <Bullet icon={Timer}>Batas waktu opsional dengan timer live; jawaban terkirim saat waktu habis</Bullet>
            <Bullet icon={BrainCircuit}>Soal & opsi <b className="text-white">diacak per siswa</b>; siswa tidak bisa mengulang ujian yang sudah dikumpulkan</Bullet>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-3">
          {[["Guru membuat ujian + password", "1"], ["Siswa memasukkan password", "2"], ["Ujian mulai — layar penuh", "3"], ["Pelanggaran terdeteksi & dicatat", "4"], ["Guru melihat skor + pelanggaran", "5"]].map(([label, n], i) => (
            <div key={n}>
              <FlowStep n={n}>{label}</FlowStep>
              {i < 4 && <div className="ml-3.5 h-4 w-px bg-indigo-400/40" />}
            </div>
          ))}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
            <p className="text-xs text-slate-300">Contoh panel pelanggaran siswa</p>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500" />
              <span className="w-3.5 h-3.5 rounded-full bg-white/20" />
              <span className="ml-2 text-xs font-bold text-rose-300">2 / 3</span>
            </div>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

const SLIDES = [SlideCover, SlideOverview, SlideAbsensi, SlideKas, SlideKelasBph, SlideInventaris, SlideTugasQuiz, SlideUjian, SlidePpdb, SlideKartu, SlideClosing];
const ACCENTS = ["from-slate-950 via-slate-900 to-sky-950", "from-slate-950 via-slate-900 to-slate-950",
  "from-slate-950 via-sky-950 to-slate-950", "from-slate-950 via-emerald-950 to-slate-950",
  "from-slate-950 via-violet-950 to-slate-950", "from-slate-950 via-amber-950 to-slate-950",
  "from-slate-950 via-fuchsia-950 to-slate-950", "from-slate-950 via-indigo-950 to-slate-950",
  "from-slate-950 via-cyan-950 to-slate-950", "from-slate-950 via-teal-950 to-slate-950",
  "from-slate-950 via-slate-900 to-sky-950"];

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
      {/* Interactive on-screen deck */}
      <div className={`screen-deck h-screen w-screen overflow-hidden bg-gradient-to-br ${ACCENTS[idx]} text-slate-100 flex flex-col transition-colors duration-700`} data-testid="presentation-deck">
        <div className="h-1 bg-white/10 shrink-0">
          <div className="h-full bg-sky-400 transition-all duration-500" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto flex items-center justify-center px-5 py-8 md:px-10">
          <div key={idx} className="w-full animate-[slideIn_.45s_ease] flex justify-center">
            {renderSlide(Current, idx)}
          </div>
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

      {/* Print-only handout: every slide on its own page */}
      <div className="print-deck" data-testid="presentation-print">
        {SLIDES.map((Comp, i) => (
          <section key={i} className={`print-slide bg-gradient-to-br ${ACCENTS[i]} text-slate-100`}>
            <div className="w-full flex items-center justify-center px-10 py-12">
              {renderSlide(Comp, `p-${i}`)}
            </div>
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
          .print-slide {
            position: relative;
            min-height: 100vh;
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            justify-content: center;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-slide:last-child { page-break-after: auto; }
          .print-foot {
            position: absolute; bottom: 12px; left: 0; right: 0;
            text-align: center; font-size: 10px; letter-spacing: .08em;
            text-transform: uppercase; color: rgba(255,255,255,.55);
          }
        }
      `}</style>
    </>
  );
}
