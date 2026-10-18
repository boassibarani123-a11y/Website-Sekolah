import { PageHeader, UnderlineTabs, StatStrip } from "@/components/zx/ui";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Users, GraduationCap, ClipboardCheck } from "lucide-react";

const ST = { hadir: "bg-emerald-100 text-emerald-700", izin: "bg-sky-100 text-sky-700", sakit: "bg-amber-100 text-amber-700", alpa: "bg-rose-100 text-rose-700" };
const todayWib = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const timeOf = (r) => r.time || new Date(r.scanned_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

function Row({ r }) {
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 truncate">{r.student_name}</p><p className="text-xs text-slate-500">{r.kelas || "-"} · {r.method || "-"} · {timeOf(r)}</p></div>
      {r.late && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">Terlambat</span>}
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${ST[r.status]}`}>{r.status}</span>
    </div>
  );
}

function Students({ date }) {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get(`/attendance?date=${date}`).then(r => setRows(r.data)).catch(() => {});
    api.get(`/attendance/stats?date=${date}`).then(r => setStats(r.data)).catch(() => {});
  }, [date]);
  return (
    <div className="space-y-4" data-testid="daily-students">
      <StatStrip items={[["hadir", "Hadir"], ["izin", "Izin"], ["sakit", "Sakit"], ["alpa", "Alpa"], ["belum_absen", "Belum absen"]].map(([k, l]) => ({ label: l, value: stats?.[k] ?? "—", testid: `daily-student-stat-${k}` }))}/>
      <div className="zx-card divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {rows.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">Belum ada siswa yang absen.</p>}
        {rows.map(r => <Row key={r.id} r={r} />)}
      </div>
    </div>
  );
}

function Teachers({ date }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api.get(`/teacher-attendance?date=${date}`).then(r => setData(r.data)).catch(() => {}), [date]);
  useEffect(() => { load(); }, [load]);
  const manual = async (t, status) => {
    try { await api.post("/teacher-attendance/manual", { teacher_id: t.id, status }); toast.success(`${t.name}: ${status}`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  if (!data) return <p className="text-slate-400 text-sm">Memuat…</p>;
  const isToday = date === todayWib();
  return (
    <div className="grid lg:grid-cols-5 gap-4" data-testid="daily-teachers">
      <div className="lg:col-span-3 zx-card divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        <p className="px-5 py-3 font-heading font-bold">Sudah Absen ({data.rows.length})</p>
        {data.rows.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">Belum ada guru yang absen.</p>}
        {data.rows.map(r => <Row key={r.id} r={r} />)}
      </div>
      <div className="lg:col-span-2 zx-card divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        <p className="px-5 py-3 font-heading font-bold">Belum Absen ({data.missing.length})</p>
        {data.missing.map(t => (
          <div key={t.id} className="px-5 py-3">
            <p className="font-semibold text-sm">{t.name}</p>
            {isToday && <div className="mt-2 flex gap-1.5">{Object.keys(ST).map(s => <button key={s} data-testid={`daily-teacher-${t.id}-${s}`} onClick={() => manual(t, s)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase ${ST[s]}`}>{s}</button>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DailyAttendance() {
  const [tab, setTab] = useState("siswa");
  const [date, setDate] = useState(todayWib());
  return (
    <div className="space-y-6" data-testid="daily-attendance-page">
      <PageHeader title="Rekap Absensi Guru & Siswa" subtitle="Daftar kehadiran harian siswa dan guru yang tercatat di gerbang."
        actions={<input data-testid="daily-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="zx-input !w-auto" />}/>
      <UnderlineTabs value={tab} onChange={setTab} testid="daily-tab" tabs={[["siswa", "Siswa", Users], ["guru", "Guru", GraduationCap]]}/>
      {tab === "siswa" ? <Students date={date} /> : <Teachers date={date} />}
    </div>
  );
}
