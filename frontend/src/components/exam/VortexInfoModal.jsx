import { X, Lock, Maximize, Shuffle, Timer, Layers, PenLine, ClipboardCheck, Smartphone, Save, ListChecks, BarChart3 } from "lucide-react";
import { VG, VortexMark } from "./brand";

const FEATURES = [
  { icon: Lock, t: "Gerbang Password", d: "Setiap ujian dilindungi password. Ujian langsung dimulai setelah password benar dan siswa menyetujui peraturan." },
  { icon: Maximize, t: "Mode Layar Penuh & Anti-Nyontek", d: "Ujian berjalan fullscreen. Pindah tab, kehilangan fokus, keluar fullscreen, salin/tempel, klik kanan, dan tombol pintas diblokir & dicatat sebagai pelanggaran." },
  { icon: Smartphone, t: "Satu Akun Satu Perangkat", d: "Akun siswa terkunci pada satu perangkat. Login dari perangkat lain ditolak sampai Super Admin me-reset perangkat." },
  { icon: Layers, t: "Pembagian Soal per Halaman", d: "Soal ditampilkan dalam tabel interaktif dengan jumlah soal per halaman yang dapat diatur (mis. 10 soal per halaman)." },
  { icon: ListChecks, t: "Kontrol Navigasi", d: "Pengelola ujian menentukan apakah siswa boleh kembali ke halaman sebelumnya atau hanya boleh maju. Aturan ini dijaga di server." },
  { icon: PenLine, t: "Soal Essay", d: "Mendukung soal essay dengan batas kata, rubrik penilaian, dan bobot nilai per soal." },
  { icon: ClipboardCheck, t: "Koreksi Essay Manual", d: "Guru / Super Admin menilai essay per soal lengkap dengan komentar. Nilai akhir = PG otomatis + essay manual." },
  { icon: Shuffle, t: "Acak Soal & Opsi", d: "Urutan soal dan pilihan jawaban dapat diacak per siswa untuk mencegah contek-mencontek." },
  { icon: Timer, t: "Batas Waktu & Jadwal", d: "Timer tersinkron dengan server, jadwal buka/tutup ujian, dan pengiriman otomatis saat waktu habis." },
  { icon: Save, t: "Simpan Otomatis", d: "Jawaban tersimpan otomatis di server; jika halaman dimuat ulang, siswa melanjutkan dari posisi terakhir." },
  { icon: BarChart3, t: "Analitik Hasil", d: "Tabel hasil interaktif: rata-rata, nilai tertinggi, kelulusan KKM, pelanggaran, ekspor CSV." },
];

export function VortexInfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="vortex-info-modal">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="relative bg-slate-950 text-white p-7 rounded-t-3xl overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-600/40 blur-3xl" />
          <div className="absolute -bottom-24 left-10 w-60 h-60 rounded-full bg-cyan-500/20 blur-3xl" />
          <button data-testid="vortex-info-close" onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
          <div className="relative">
            <VortexMark dark />
            <h2 className="mt-5 font-heading text-3xl sm:text-4xl font-black tracking-tight">Tentang {VG.full}</h2>
            <p className="mt-2 text-indigo-100/80 max-w-2xl text-sm sm:text-base">
              {VG.name} adalah mesin ujian online terintegrasi untuk sekolah: aman, adil, dan fleksibel.
              Dirancang untuk mencegah kecurangan sekaligus memberi pengelola ujian kendali penuh atas aturan, tampilan, dan penilaian.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-full bg-white/10">Versi {VG.version}</span>
              <span className="px-2.5 py-1 rounded-full bg-white/10">PG + Essay</span>
              <span className="px-2.5 py-1 rounded-full bg-white/10">Server-side enforcement</span>
            </div>
          </div>
        </div>
        <div className="p-6 sm:p-8 space-y-8">
          <section>
            <h3 className="font-heading font-bold text-lg mb-4">Fitur Utama</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-3 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:-translate-y-0.5 transition-[transform,border-color]">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon className="w-4 h-4" /></span>
                  <div><p className="font-semibold text-sm">{t}</p><p className="text-xs text-slate-500 mt-1 leading-relaxed">{d}</p></div>
                </div>
              ))}
            </div>
          </section>
          <section className="grid md:grid-cols-3 gap-4">
            {[
              ["1. Persiapan", "Guru / Super Admin membuat ujian: soal PG & essay, bobot, soal per halaman, aturan navigasi, jadwal, password, dan peraturan khusus."],
              ["2. Pelaksanaan", "Siswa membaca & menyetujui peraturan, memasukkan password, lalu mengerjakan dalam mode layar penuh dengan pengawasan otomatis."],
              ["3. Penilaian", "PG dinilai otomatis. Essay dikoreksi manual per soal dengan komentar. Nilai akhir & status KKM tersedia di tabel hasil."],
            ].map(([t, d]) => (
              <div key={t} className="p-4 rounded-2xl bg-slate-50"><p className="font-heading font-bold text-indigo-700">{t}</p><p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{d}</p></div>
            ))}
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Hak Akses</p>
            <p className="mt-1 text-xs leading-relaxed">Hanya <b>Super Admin</b> dan <b>Guru</b> (pada kelas yang diampu) yang dapat membuat, mengedit, menghapus ujian, mengatur peraturan, dan mengoreksi jawaban. Siswa hanya dapat mengerjakan ujian dan melihat hasil sesuai pengaturan.</p>
          </section>
          <p className="text-center text-[11px] font-mono text-slate-400">{VG.full} · {VG.tagline}</p>
        </div>
      </div>
    </div>
  );
}
