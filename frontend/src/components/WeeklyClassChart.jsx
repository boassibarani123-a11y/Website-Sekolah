import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from "recharts";
import { BarChart3, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import api from "@/lib/apiClient";

const color = (p) => (p >= 90 ? "#10b981" : p >= 75 ? "#0ea5e9" : p >= 60 ? "#f59e0b" : "#f43f5e");
const iso = (d) => d.toISOString().slice(0, 10);

// Grafik kehadiran mingguan per kelas (dashboard Kepala Sekolah / Super Admin).
export function WeeklyClassChart() {
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [sel, setSel] = useState("");
  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() + offset * 7);
    api.get(`/attendance/weekly-by-class?start=${iso(d)}`).then((r) => setData(r.data)).catch(() => setData({ classes: [], days: [] }));
  }, [offset]);
  const bars = useMemo(() => (data?.classes || []).map((c) => ({ kelas: c.kelas, avg: c.avg, total: c.total })), [data]);
  const active = (data?.classes || []).find((c) => c.kelas === sel) || data?.classes?.[0];
  const line = (active?.series || []).map((s, i) => ({ hari: data.day_labels[i], pct: s.pct, hadir: s.hadir, izin: s.izin, sakit: s.sakit, alpa: s.alpa }));
  const schoolAvg = bars.length ? Math.round(bars.reduce((a, b) => a + b.avg, 0) / bars.length * 10) / 10 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="weekly-class-chart">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-sky-600" />Kehadiran Mingguan per Kelas</h2>
          <p className="text-xs text-slate-500 mt-0.5">Rata-rata % hadir Senin–Sabtu · rata-rata sekolah <b data-testid="weekly-school-avg" className="text-slate-900">{schoolAvg}%</b></p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="weekly-prev" onClick={() => setOffset((o) => o - 1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
          <span data-testid="weekly-label" className="text-xs font-semibold text-slate-600 min-w-[110px] text-center">{data?.label || "…"}</span>
          <button data-testid="weekly-next" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          <Link to="/attendance-recap" className="text-xs text-sky-600 font-semibold flex items-center gap-1 hover:text-sky-800 ml-1">Rekap <ArrowRight className="w-3 h-3" /></Link>
        </div>
      </div>
      {!data ? <p className="text-sm text-slate-400">Memuat…</p> : bars.length === 0 ? <p className="text-sm text-slate-400 italic py-8 text-center">Belum ada data kelas.</p> : (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="kelas" tick={{ fontSize: 11 }} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, "Rata-rata hadir"]} cursor={{ fill: "rgba(14,165,233,0.08)" }} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]} onClick={(d) => setSel(d.kelas)} className="cursor-pointer">
                  {bars.map((b) => <Cell key={b.kelas} fill={color(b.avg)} opacity={!active || active.kelas === b.kelas ? 1 : 0.45} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-800">Harian kelas</p>
              <select data-testid="weekly-class-select" value={active?.kelas || ""} onChange={(e) => setSel(e.target.value)} className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white">
                {bars.map((b) => <option key={b.kelas} value={b.kelas}>{b.kelas}</option>)}
              </select>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={line} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hari" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip formatter={(v, n) => (n === "pct" ? [`${v ?? "-"}%`, "Hadir"] : [v, n])} />
                  <Line type="monotone" dataKey="pct" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{active?.total || 0} siswa · rata-rata <b className="text-slate-800">{active?.avg ?? 0}%</b></p>
          </div>
        </div>
      )}
    </div>
  );
}
