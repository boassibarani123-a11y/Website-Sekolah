import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { CalendarRange, Check, X, Minus } from "lucide-react";

const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const thisMonth = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 7);

function Cell({ c }) {
  if (c.status === "paid") return <span title={`Rp ${c.amount.toLocaleString("id-ID")}`} className="mx-auto w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check className="w-4 h-4" /></span>;
  if (c.status === "unpaid") return <span title="Belum bayar" className="mx-auto w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center"><X className="w-4 h-4" /></span>;
  return <span title="Belum berjalan" className="mx-auto w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center"><Minus className="w-4 h-4" /></span>;
}

export function MonthlyKas({ classId, refreshKey }) {
  const [month, setMonth] = useState(thisMonth);
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/classes/${classId}/kas/monthly?month=${month}`).then(r => setData(r.data)).catch(() => setData(null));
  }, [classId, month, refreshKey]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" data-testid="monthly-kas-card">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-heading font-bold flex items-center gap-2"><CalendarRange className="w-5 h-5 text-indigo-500" />Rekap Kas Bulanan</h3>
        <input data-testid="monthly-kas-month" type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} className="px-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm" />
      </div>
      {!data ? <p className="mt-4 text-sm text-slate-400">Memuat rekap...</p> : data.students.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Belum ada siswa di kelas ini.</p>
      ) : (
        <div className="mt-4 overflow-x-auto -mx-1">
          <table className="w-full text-sm" data-testid="monthly-kas-table">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="text-left font-semibold px-2 py-2 sticky left-0 bg-white">Siswa</th>
                {data.weeks.map(w => (
                  <th key={w.start} className={`font-semibold px-2 py-2 text-center whitespace-nowrap ${w.start === data.current_week_start ? "text-sky-600" : ""}`}>
                    {w.label}<div className="text-[10px] normal-case font-normal text-slate-400">{fmt(w.start)}–{fmt(w.end)}</div>
                  </th>
                ))}
                <th className="font-semibold px-2 py-2 text-center">Lunas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map(s => (
                <tr key={s.id} data-testid={`monthly-row-${s.id}`}>
                  <td className="px-2 py-2 font-medium text-slate-800 whitespace-nowrap sticky left-0 bg-white">{s.name}</td>
                  {s.weeks.map((c, i) => <td key={i} data-testid={`monthly-cell-${s.id}-${i}`} data-status={c.status} className="px-2 py-2 text-center"><Cell c={c} /></td>)}
                  <td className="px-2 py-2 text-center text-xs font-bold text-slate-600">{s.paid_count}/{s.weeks.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" />Sudah bayar</span>
        <span className="flex items-center gap-1"><X className="w-3 h-3 text-rose-600" />Belum bayar</span>
        <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-slate-400" />Minggu belum berjalan</span>
      </div>
    </div>
  );
}
