import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, Users, Loader2 } from "lucide-react";

const iso = (d) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
const firstOfMonth = () => { const t = iso(new Date()); return `${t.slice(0, 8)}01`; };
const COLS = [["hadir", "Hadir", "text-emerald-600"], ["izin", "Izin", "text-sky-600"], ["sakit", "Sakit", "text-amber-600"], ["alpa", "Alpa", "text-rose-600"]];

function RecapTable({ kind, data }) {
  return (
    <div className="overflow-x-auto" data-testid={`recap-range-table-${kind}`}>
      <table className="w-full text-sm min-w-[640px]">
        <thead><tr className="bg-slate-50 text-slate-500 text-xs">
          <th className="text-left px-4 py-3">No</th>
          <th className="text-left px-4 py-3">{kind === "guru" ? "Nama Guru" : "Nama Siswa"}</th>
          <th className="text-left px-3 py-3">{kind === "guru" ? "NIP" : "Kelas"}</th>
          {COLS.map(([k, l]) => <th key={k} className="px-3 py-3 text-center">{l}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {data.rows.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-slate-400">Belum ada data.</td></tr>}
          {data.rows.map((r, i) => (
            <tr key={r.id} className="hover:bg-sky-50/40" data-testid={`recap-range-row-${kind}-${i}`}>
              <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
              <td className="px-4 py-2.5 font-semibold text-slate-800">{r.name}</td>
              <td className="px-3 py-2.5 text-slate-500">{kind === "guru" ? (r.no_id || "-") : r.kelas}</td>
              {COLS.map(([k, , c]) => <td key={k} className={`px-3 py-2.5 text-center font-semibold tabular-nums ${c}`}>{r[k]}</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="bg-slate-50 font-bold text-xs">
          <td colSpan={3} className="px-4 py-3 text-right text-slate-500">TOTAL</td>
          {COLS.map(([k, , c]) => <td key={k} data-testid={`recap-range-total-${kind}-${k}`} className={`px-3 py-3 text-center ${c}`}>{data.totals[k]}</td>)}
        </tr></tfoot>
      </table>
    </div>
  );
}

export function RecapRange() {
  const { user } = useAuth();
  const [kind, setKind] = useState("siswa");
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(iso(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    api.get(`/attendance/recap-range?kind=${kind}&start=${start}&end=${end}`).then(r => setData(r.data))
      .catch(e => { setData(null); toast.error(e.response?.data?.detail || "Gagal memuat rekap"); }).finally(() => setLoading(false));
  }, [kind, start, end]);
  useEffect(() => { load(); }, [load]);
  const Btn = ({ k, icon: Icon, label }) => (
    <button data-testid={`recap-switch-${k}`} onClick={() => setKind(k)}
      className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${kind === k ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" data-testid="recap-range">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <Btn k="siswa" icon={Users} label="Rekap Absensi Siswa" />
        {user.role !== "guru" && <Btn k="guru" icon={GraduationCap} label="Rekap Absensi Guru" />}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <input data-testid="recap-range-start" type="date" value={start} onChange={e => setStart(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl" />
          <span className="text-slate-400">s/d</span>
          <input data-testid="recap-range-end" type="date" value={end} onChange={e => setEnd(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl" />
        </div>
      </div>
      <p className="px-4 pt-3 font-heading font-bold text-slate-800" data-testid="recap-range-title">{kind === "guru" ? "Tabel Rekap Absensi Guru" : "Tabel Rekap Absensi Siswa"}</p>
      {loading && !data ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
        : data && data.kind === kind ? <RecapTable kind={kind} data={data} /> : <div className="h-40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>}
    </div>
  );
}
