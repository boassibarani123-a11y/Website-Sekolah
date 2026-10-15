import { useEffect, useState } from "react";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { ChevronLeft, ChevronRight, CalendarRange, Clock, TrendingUp, Timer, Users } from "lucide-react";
import api from "@/lib/apiClient";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tip = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

function Kpi({ icon: I, label, value, sub, tone }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><I className="w-4 h-4" /></span>
      <p className="mt-3 font-heading text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function TeacherMonthly() {
  const now = new Date(Date.now() + 7 * 3600e3);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [d, setD] = useState(null);
  const key = `${year}-${String(month).padStart(2, "0")}`;
  useEffect(() => { setD(null); api.get(`/teacher-attendance/monthly?year=${year}&month=${key}`).then(r => setD(r.data)).catch(() => setD({ error: true })); }, [year, key]);
  const shift = (n) => { let m = month + n, y = year; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } setMonth(m); setYear(y); };

  if (!d) return <p className="text-slate-400 text-sm" data-testid="teacher-monthly-loading">Memuat rekap bulanan…</p>;
  if (d.error) return <p className="text-rose-600 text-sm">Gagal memuat rekap bulanan.</p>;
  const ms = d.month_summary;
  const sel = d.months[month - 1] || {};
  return (
    <div className="space-y-5" data-testid="teacher-monthly">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full p-1">
          <button data-testid="teacher-month-prev" onClick={() => shift(-1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
          <p data-testid="teacher-month-label" className="font-heading font-bold px-2 min-w-[150px] text-center flex items-center gap-2 justify-center"><CalendarRange className="w-4 h-4 text-indigo-500" />{MONTHS[month - 1]} {year}</p>
          <button data-testid="teacher-month-next" onClick={() => shift(1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500">{d.teachers_total} guru · {ms.days} hari tercatat</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={TrendingUp} label="Tingkat kehadiran" value={`${sel.rate ?? 0}%`} sub={`${ms.hadir} kehadiran`} tone="bg-emerald-100 text-emerald-700" />
        <Kpi icon={Clock} label="Terlambat" value={ms.terlambat} sub={`${sel.late_rate ?? 0}% dari yang hadir`} tone="bg-orange-100 text-orange-700" />
        <Kpi icon={Timer} label="Rata-rata jam datang" value={ms.rata_jam_datang || "—"} sub="batas tepat waktu 07:30" tone="bg-indigo-100 text-indigo-700" />
        <Kpi icon={Users} label="Izin / Sakit / Alpa" value={`${ms.izin} / ${ms.sakit} / ${ms.alpa}`} tone="bg-sky-100 text-sky-700" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="font-heading font-bold text-slate-900 mb-4">Kehadiran & keterlambatan per bulan · {year}</p>
        <div className="h-72" data-testid="teacher-monthly-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.months} margin={{ left: -15, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="tepat_waktu" name="Tepat waktu" stackId="a" fill="#10b981" />
              <Bar yAxisId="l" dataKey="terlambat" name="Terlambat" stackId="a" fill="#f97316" />
              <Bar yAxisId="l" dataKey="izin" name="Izin" stackId="a" fill="#0ea5e9" />
              <Bar yAxisId="l" dataKey="sakit" name="Sakit" stackId="a" fill="#f59e0b" />
              <Bar yAxisId="l" dataKey="alpa" name="Alpa" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              <Line yAxisId="r" type="monotone" dataKey="rate" name="% Kehadiran" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <p className="font-heading font-bold text-slate-900 mb-4">Harian · {MONTHS[month - 1]}</p>
          {d.daily.length === 0 ? <p className="text-sm text-slate-400 italic">Belum ada data bulan ini.</p> : (
            <div className="h-60"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.daily} margin={{ left: -20, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="tepat_waktu" name="Tepat waktu" stackId="d" fill="#10b981" />
                <Bar dataKey="terlambat" name="Terlambat" stackId="d" fill="#f97316" radius={[5, 5, 0, 0]} />
              </BarChart></ResponsiveContainer></div>
          )}
        </div>
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <p className="px-5 py-4 border-b font-heading font-bold">Per guru · {MONTHS[month - 1]} {year}</p>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-sm min-w-[560px]" data-testid="teacher-monthly-table">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0"><tr>
                <th className="px-4 py-2.5 text-left">Guru</th><th className="px-2 text-center">Hadir</th><th className="px-2 text-center">Telat</th><th className="px-2 text-center">I/S/A</th><th className="px-2 text-center">Jam datang</th><th className="px-4 text-left w-32">Kehadiran</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.per_teacher.map(t => (
                  <tr key={t.id} data-testid={`teacher-monthly-row-${t.id}`}>
                    <td className="px-4 py-2.5"><p className="font-semibold text-slate-900">{t.name}</p><p className="text-[11px] text-slate-400">NIP {t.nip || "—"}</p></td>
                    <td className="text-center tabular-nums">{t.hadir}</td>
                    <td className="text-center tabular-nums">{t.terlambat > 0 ? <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">{t.terlambat}</span> : 0}</td>
                    <td className="text-center tabular-nums text-slate-600">{t.izin}/{t.sakit}/{t.alpa}</td>
                    <td className="text-center tabular-nums">{t.rata_jam_datang || "—"}</td>
                    <td className="px-4"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, t.rate)}%` }} /></div><span className="text-xs tabular-nums w-10 text-right">{t.rate}%</span></div></td>
                  </tr>
                ))}
                {d.per_teacher.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada guru.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
