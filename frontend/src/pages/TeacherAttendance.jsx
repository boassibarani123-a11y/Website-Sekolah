import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { TeacherMonthly } from "@/components/attendance/TeacherMonthly";
import { toast } from "sonner";
import { GraduationCap, Download, Archive, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle, UserX, FolderArchive } from "lucide-react";

const ST = { hadir: "bg-emerald-100 text-emerald-700", izin: "bg-sky-100 text-sky-700", sakit: "bg-amber-100 text-amber-700", alpa: "bg-rose-100 text-rose-700" };
const MARK = { hadir: "H", izin: "I", sakit: "S", alpa: "A" };
const todayWib = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function saveBlob(url, name) {
  const r = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(r.data);
  const a = document.createElement("a"); a.href = href; a.download = name; a.click(); URL.revokeObjectURL(href);
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></div>
      <p className="mt-3 font-heading text-3xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
    </div>
  );
}

function Today({ data, onManual }) {
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="px-5 py-4 border-b font-heading font-bold">Sudah Absen Hari Ini</p>
        <div className="divide-y max-h-[460px] overflow-y-auto" data-testid="teacher-att-today">
          {data.rows.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">Belum ada guru yang absen.</p>}
          {data.rows.map(r => (
            <div key={r.id} className="px-5 py-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-500">{r.photo ? <img src={r.photo} alt="" className="w-full h-full object-cover" /> : r.student_name[0]}</span>
              <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{r.student_name}</p><p className="text-xs text-slate-500">{r.method === "face" ? "Face ID" : "Manual"} · {r.time || new Date(r.scanned_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p></div>
              {r.late && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">Terlambat</span>}
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${ST[r.status]}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="px-5 py-4 border-b font-heading font-bold">Belum Absen ({data.missing.length})</p>
        <div className="divide-y max-h-[460px] overflow-y-auto" data-testid="teacher-att-missing">
          {data.missing.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">Semua guru sudah tercatat.</p>}
          {data.missing.map(t => (
            <div key={t.id} className="px-5 py-3">
              <p className="font-semibold text-sm text-slate-900">{t.name}</p>
              <div className="mt-2 flex gap-1.5">
                {Object.keys(MARK).map(s => <button key={s} data-testid={`teacher-manual-${t.id}-${s}`} onClick={() => onManual(t, s)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase hover:opacity-80 ${ST[s]}`}>{s}</button>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Week({ start, setStart }) {
  const [w, setW] = useState(null);
  useEffect(() => { api.get(`/teacher-attendance/week?start=${start}`).then(r => setW(r.data)).catch(() => {}); }, [start]);
  if (!w) return <p className="text-slate-400 text-sm">Memuat…</p>;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid="teacher-att-week">
      <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button data-testid="teacher-week-prev" onClick={() => setStart(addDays(w.start, -7))} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
          <p className="font-heading font-bold">{w.label}</p>
          <button data-testid="teacher-week-next" onClick={() => setStart(addDays(w.start, 7))} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button data-testid="teacher-week-export" onClick={() => saveBlob(`/teacher-attendance/week/export?start=${w.start}`, `Rekap_Absensi_Guru_${w.start}.xlsx`).catch(() => toast.error("Gagal ekspor"))}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2"><Download className="w-4 h-4" />Ekspor Excel</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3 text-left">Guru</th>{w.days.map((d, i) => <th key={d} className="px-2 py-3">{w.day_labels[i].slice(0, 3)}<br /><span className="font-normal">{d.slice(8)}</span></th>)}<th className="px-2">H</th><th className="px-2">I</th><th className="px-2">S</th><th className="px-2">A</th></tr></thead>
          <tbody className="divide-y">
            {w.students.length === 0 && <tr><td colSpan={12} className="py-10 text-center text-slate-400">Tidak ada data minggu ini.</td></tr>}
            {w.students.map(s => (
              <tr key={s.id}><td className="px-4 py-2.5 font-medium">{s.name}</td>
                {w.days.map(d => <td key={d} className="text-center">{s.marks[d] ? <span className={`inline-block w-7 h-7 leading-7 rounded-lg text-xs font-bold ${ST[s.marks[d]]}`}>{MARK[s.marks[d]]}</span> : <span className="text-slate-300">·</span>}</td>)}
                {["hadir", "izin", "sakit", "alpa"].map(k => <td key={k} className="text-center tabular-nums">{s.totals[k]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Storage() {
  const [list, setList] = useState([]);
  const load = () => api.get("/teacher-attendance/archives").then(r => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const now = async () => { try { const r = await api.post("/teacher-attendance/archive-now"); toast.success(r.data.count ? `${r.data.count} minggu diarsipkan` : "Tidak ada minggu selesai untuk diarsipkan"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  return (
    <div className="space-y-4" data-testid="teacher-att-storage">
      <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-sky-900 flex items-center gap-2"><FolderArchive className="w-5 h-5" />Setiap minggu (7 hari) data absensi guru otomatis diekspor ke Excel, disimpan di sini, lalu dihapus dari daftar harian.</p>
        <button data-testid="teacher-archive-now" onClick={now} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4" />Arsipkan Sekarang</button>
      </div>
      {list.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">Belum ada arsip.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(a => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="font-heading font-bold text-slate-900">{a.label}</p>
            <p className="text-xs text-slate-500 mt-1">{a.student_count} guru · {a.record_count} catatan · H {a.summary?.hadir ?? 0}</p>
            <button data-testid={`teacher-archive-download-${a.id}`} onClick={() => saveBlob(`/teacher-attendance/archives/${a.id}/download`, `Rekap_Absensi_Guru_${a.period_start}.xlsx`)}
              className="mt-3 w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2"><Download className="w-4 h-4" />Unduh Excel</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [tab, setTab] = useState(user?.role === "kepsek" ? "monthly" : "today");
  const [data, setData] = useState(null);
  const [start, setStart] = useState(todayWib());
  const load = useCallback(() => api.get("/teacher-attendance").then(r => setData(r.data)).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  const manual = async (t, status) => { try { await api.post("/teacher-attendance/manual", { teacher_id: t.id, status }); toast.success(`${t.name}: ${status}`); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const s = data?.stats || {};
  return (
    <div className="space-y-6" data-testid="teacher-attendance-page">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-indigo-950 text-white p-7 sm:p-9 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <p className="relative text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">Khusus Guru</p>
        <h1 className="relative font-heading text-3xl sm:text-4xl font-extrabold mt-2 flex items-center gap-3"><GraduationCap className="w-9 h-9 text-indigo-300" />Absensi Guru</h1>
        <p className="relative mt-2 text-slate-300 text-sm max-w-xl">Guru absen lewat kamera Presensi Wajah yang sama dengan siswa. Rekap guru dipisah dari rekap siswa.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon={CheckCircle2} label="Hadir" value={s.hadir ?? 0} tone="bg-emerald-100 text-emerald-700" />
        <Stat icon={Clock} label="Terlambat" value={s.terlambat ?? 0} tone="bg-orange-100 text-orange-700" />
        <Stat icon={AlertCircle} label="Izin / Sakit" value={(s.izin ?? 0) + (s.sakit ?? 0)} tone="bg-sky-100 text-sky-700" />
        <Stat icon={UserX} label="Alpa" value={s.alpa ?? 0} tone="bg-rose-100 text-rose-700" />
        <Stat icon={GraduationCap} label="Belum Absen" value={s.belum ?? 0} tone="bg-slate-100 text-slate-700" />
      </div>
      <div className="flex gap-1.5">
        {[["today", "Hari Ini"], ["week", "Rekap Mingguan"], ["monthly", "Grafik Bulanan"], ["storage", "Storage Rekap"]].map(([k, l]) => (
          <button key={k} data-testid={`teacher-tab-${k}`} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${tab === k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
      </div>
      {tab === "today" && (data ? <Today data={data} onManual={manual} /> : <p className="text-slate-400 text-sm">Memuat…</p>)}
      {tab === "week" && <Week start={start} setStart={setStart} />}
      {tab === "monthly" && <TeacherMonthly />}
      {tab === "storage" && <Storage />}
    </div>
  );
}
