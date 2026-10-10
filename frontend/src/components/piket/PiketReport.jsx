import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Download, ChevronLeft, ChevronRight, FileBarChart, Loader2 } from "lucide-react";
import { initials } from "./piketUtils";

const shiftMonth = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const label = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

function Bar({ pct }) {
  const tone = pct == null ? "bg-slate-200" : pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${tone} transition-[width] duration-700`} style={{ width: `${pct || 0}%` }} /></div>
      <span className="text-xs font-bold tabular-nums text-slate-700 w-12">{pct == null ? "—" : `${pct}%`}</span>
    </div>
  );
}

export function PiketReport({ today }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setData(null); api.get(`/piket/report?month=${month}`).then(r => setData(r.data)).catch(() => setData({ teachers: [], shifts: [] })); }, [month]);

  const exportXlsx = async () => {
    setBusy(true);
    try {
      const r = await api.get(`/piket/report/export?month=${month}`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href = url; a.download = `Laporan_Piket_${month}.xlsx`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Gagal mengekspor laporan"); }
    finally { setBusy(false); }
  };

  const t = data?.teachers || [];
  const sum = (k) => t.reduce((a, r) => a + r[k], 0);
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="piket-report">
      <div className="flex items-center justify-between gap-3 flex-wrap p-5 border-b border-slate-100">
        <p className="font-heading text-lg font-extrabold text-slate-900 flex items-center gap-2"><FileBarChart className="w-5 h-5 text-sky-600" />Laporan Bulanan</p>
        <div className="flex items-center gap-2">
          <button data-testid="piket-report-prev" onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
          <span data-testid="piket-report-month" className="font-semibold text-slate-800 w-36 text-center capitalize">{label(month)}</span>
          <button data-testid="piket-report-next" onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
          <button data-testid="piket-report-export" onClick={exportXlsx} disabled={busy || !t.length}
            className="ml-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Export Excel
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100">
        {[["Total Shift", data?.shifts.length ?? 0, "text-slate-900"], ["Hadir", sum("hadir"), "text-emerald-600"], ["Terlambat", sum("terlambat"), "text-orange-600"], ["Tidak Hadir", sum("tidak_hadir"), "text-rose-600"]].map(([l, v, c]) => (
          <div key={l} className="bg-white p-4"><p className={`font-heading text-2xl font-black tabular-nums ${c}`}>{v}</p><p className="text-xs text-slate-500">{l}</p></div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>{["Guru", "Shift", "Hadir", "Tepat", "Telat", "Menit Telat", "Absen", "Jam Jaga", "Kehadiran"].map(h => <th key={h} className="text-left px-4 py-3 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {!data && <tr><td colSpan={9} className="text-center py-10 text-slate-400">Memuat…</td></tr>}
            {data && t.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-slate-400 italic">Belum ada shift piket di bulan ini.</td></tr>}
            {t.map(r => (
              <tr key={r.teacher_id} data-testid={`piket-report-row-${r.teacher_id}`} className="border-t border-slate-100 hover:bg-sky-50/40 transition-colors">
                <td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-white text-[11px] font-bold flex items-center justify-center">{initials(r.teacher_name)}</span><span className="font-semibold text-slate-800">{r.teacher_name}</span></div></td>
                <td className="px-4 py-3 tabular-nums">{r.total}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700 font-semibold">{r.hadir}</td>
                <td className="px-4 py-3 tabular-nums">{r.tepat}</td>
                <td className="px-4 py-3 tabular-nums text-orange-600">{r.terlambat}</td>
                <td className="px-4 py-3 tabular-nums">{r.late_minutes}m</td>
                <td className="px-4 py-3 tabular-nums text-rose-600">{r.tidak_hadir}</td>
                <td className="px-4 py-3 tabular-nums">{(r.minutes / 60).toFixed(1)}j</td>
                <td className="px-4 py-3"><Bar pct={r.persen} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
