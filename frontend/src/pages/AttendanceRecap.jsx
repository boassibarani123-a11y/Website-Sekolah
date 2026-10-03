import { useEffect, useState, useCallback } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarCheck, ChevronLeft, ChevronRight, Download, Archive, Database,
  Loader2, Trash2, FileSpreadsheet, Clock, Users, CalendarRange,
} from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const STATUS_META = {
  hadir: { ch: "H", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  izin: { ch: "I", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  sakit: { ch: "S", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  alpa: { ch: "A", cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOf(date) {
  const x = new Date(date); const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x;
}

function StatPill({ label, value, tone }) {
  const tones = {
    emerald: "from-emerald-500 to-emerald-600", sky: "from-sky-500 to-sky-600",
    amber: "from-amber-500 to-orange-600", rose: "from-rose-500 to-rose-600", slate: "from-slate-700 to-slate-900",
  };
  return (
    <div className={`bg-gradient-to-br ${tones[tone]} text-white rounded-2xl p-4 shadow-lg`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{label}</p>
      <p className="mt-1 font-heading text-3xl font-extrabold">{value ?? 0}</p>
    </div>
  );
}

export default function AttendanceRecap() {
  const { user } = useAuth();
  const canDelete = ["super_admin", "kepsek", "staff_tu"].includes(user.role);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archives, setArchives] = useState([]);
  const [busy, setBusy] = useState("");

  const start = isoLocal(weekStart);
  const loadWeek = useCallback(() => {
    setLoading(true);
    api.get(`/attendance/week?start=${start}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [start]);
  const loadArchives = useCallback(() => {
    api.get("/attendance/archives").then((r) => setArchives(r.data)).catch(() => {});
  }, []);
  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => { loadArchives(); }, [loadArchives]);

  const shiftWeek = (delta) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + delta * 7); setWeekStart(mondayOf(d));
  };
  const isThisWeek = isoLocal(mondayOf(new Date())) === start;

  const exportWeek = async () => {
    setBusy("export");
    try {
      const r = await api.get(`/attendance/week/export?start=${start}`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href = url; a.download = `Rekap_Absensi_${data.start}_sd_${data.end}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Gagal mengekspor"); } finally { setBusy(""); }
  };
  const archiveNow = async () => {
    if (!window.confirm("Arsipkan semua minggu yang sudah selesai ke Storage, lalu hapus datanya dari website? File Excel tetap tersimpan di Storage Rekap.")) return;
    setBusy("archive");
    try {
      const r = await api.post("/attendance/archive-now");
      if (r.data.count === 0) toast.info("Belum ada minggu selesai untuk diarsipkan.");
      else toast.success(`${r.data.count} rekap mingguan diarsipkan & data dibersihkan.`);
      loadWeek(); loadArchives();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal mengarsipkan"); } finally { setBusy(""); }
  };
  const downloadArchive = async (a) => {
    try {
      const r = await api.get(`/attendance/archives/${a.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const el = document.createElement("a"); el.href = url; el.download = `Rekap_Absensi_${a.period_start}_sd_${a.period_end}.xlsx`; el.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Gagal mengunduh"); }
  };
  const deleteArchive = async (a) => {
    if (!window.confirm(`Hapus arsip "${a.label}" secara permanen?`)) return;
    try { await api.delete(`/attendance/archives/${a.id}`); toast.success("Arsip dihapus"); loadArchives(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-6" data-testid="attendance-recap-page">
      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 p-6 sm:p-8 text-white">
        <div className="absolute -right-10 -bottom-12 opacity-15"><CalendarCheck className="w-56 h-56" /></div>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold tracking-wide"><CalendarRange className="w-3.5 h-3.5" />REKAP MINGGUAN</span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Rekap Absensi Mingguan</h1>
          <p className="text-sky-100 mt-2 text-sm max-w-2xl">Ringkasan kehadiran seluruh siswa per minggu. Setiap Senin dini hari sistem otomatis mengekspor rekap ke Excel, menyimpannya di Storage, lalu membersihkan data absensi mingguan dari website.</p>
        </div>
      </motion.div>

      {/* WEEK NAV + ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          <button data-testid="week-prev" onClick={() => shiftWeek(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
          <div className="px-3 text-center min-w-[180px]">
            <p className="text-sm font-bold text-slate-800">{data?.label || "—"}</p>
            <p className="text-[11px] text-slate-400">{isThisWeek ? "Minggu berjalan" : "Minggu lampau/mendatang"}</p>
          </div>
          <button data-testid="week-next" onClick={() => shiftWeek(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><ChevronRight className="w-4 h-4" /></button>
          {!isThisWeek && <button data-testid="week-today" onClick={() => setWeekStart(mondayOf(new Date()))} className="ml-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100">Minggu Ini</button>}
        </div>
        <div className="flex gap-2">
          <button data-testid="recap-export-button" onClick={exportWeek} disabled={busy === "export" || !data} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-60">
            {busy === "export" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Export Excel
          </button>
          <button data-testid="recap-archive-button" onClick={archiveNow} disabled={busy === "archive"} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-60">
            {busy === "archive" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}Arsipkan & Bersihkan
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatPill label="Hadir" value={data?.totals?.hadir} tone="emerald" />
        <StatPill label="Izin" value={data?.totals?.izin} tone="sky" />
        <StatPill label="Sakit" value={data?.totals?.sakit} tone="amber" />
        <StatPill label="Alpa" value={data?.totals?.alpa} tone="rose" />
        <StatPill label="Total Catatan" value={data?.record_count} tone="slate" />
      </div>

      {/* WEEKLY MATRIX */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100">
          <Users className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading font-bold text-slate-800">Matriks Kehadiran Mingguan</h2>
          <span className="ml-auto text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{data?.start} s/d {data?.end}</span>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
        ) : !data || data.students.length === 0 ? (
          <div className="text-center py-16 text-slate-400"><CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />Belum ada data absensi pada minggu ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-left font-semibold px-4 py-3 sticky left-0 bg-slate-50">Nama Siswa</th>
                  <th className="text-left font-semibold px-3 py-3">Kelas</th>
                  {data.days.map((d, i) => (
                    <th key={d} className="font-semibold px-2 py-3 text-center whitespace-nowrap">
                      {data.day_labels[i].slice(0, 3)}<br /><span className="text-[10px] text-slate-400">{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                    </th>
                  ))}
                  {["H", "I", "S", "A"].map((t) => <th key={t} className="font-bold px-2 py-3 text-center">{t}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-sky-50/40" data-testid={`recap-row-${idx}`}>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 sticky left-0 bg-white whitespace-nowrap">{s.name}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.kelas}</td>
                    {data.days.map((d) => {
                      const st = s.marks[d];
                      const m = STATUS_META[st];
                      return (
                        <td key={d} className="px-2 py-2.5 text-center">
                          {m ? <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold border ${m.cls}`}>{m.ch}</span>
                            : <span className="text-slate-300">·</span>}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-center font-semibold text-emerald-600">{s.totals.hadir}</td>
                    <td className="px-2 py-2.5 text-center font-semibold text-sky-600">{s.totals.izin}</td>
                    <td className="px-2 py-2.5 text-center font-semibold text-amber-600">{s.totals.sakit}</td>
                    <td className="px-2 py-2.5 text-center font-semibold text-rose-600">{s.totals.alpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span><b className="text-emerald-600">H</b> Hadir</span><span><b className="text-sky-600">I</b> Izin</span>
          <span><b className="text-amber-600">S</b> Sakit</span><span><b className="text-rose-600">A</b> Alpa</span>
        </div>
      </div>

      {/* STORAGE REKAP */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" data-testid="storage-rekap">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50">
          <Database className="w-5 h-5 text-sky-600" />
          <h2 className="font-heading font-bold text-slate-800">Storage Rekap Absensi Siswa</h2>
          <span className="ml-auto text-xs text-slate-400">{archives.length} arsip tersimpan</span>
        </div>
        <div className="divide-y divide-slate-100">
          {archives.length === 0 && (
            <div className="text-center py-12 text-slate-400"><FileSpreadsheet className="w-9 h-9 mx-auto mb-2 opacity-50" />Belum ada arsip. Arsip otomatis dibuat tiap Senin dini hari, atau tekan "Arsipkan & Bersihkan".</div>
          )}
          {archives.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-slate-50" data-testid={`archive-${a.id}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><FileSpreadsheet className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{a.label}</p>
                <p className="text-xs text-slate-500">
                  {a.record_count} catatan · {a.student_count} siswa · H {a.summary?.hadir || 0} / I {a.summary?.izin || 0} / S {a.summary?.sakit || 0} / A {a.summary?.alpa || 0}
                  <span className="text-slate-300"> · dibuat {(a.generated_at || "").slice(0, 10)} oleh {a.generated_by}</span>
                </p>
              </div>
              <button data-testid={`archive-download-${a.id}`} onClick={() => downloadArchive(a)} className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Unduh</button>
              {canDelete && <button data-testid={`archive-delete-${a.id}`} onClick={() => deleteArchive(a)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
