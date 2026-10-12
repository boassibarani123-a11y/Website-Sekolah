import { useMemo, useState } from "react";
import { Search, Radio } from "lucide-react";

const BADGE = {
  hadir: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  izin: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  sakit: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  alpa: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};
const FILTERS = ["semua", "hadir", "izin", "sakit", "alpa"];
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");

export function LiveScanTable({ rows, stats, newId }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("semua");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(r => (filter === "semua" || r.status === filter) &&
      (!s || `${r.student_name} ${r.kelas || ""}`.toLowerCase().includes(s)));
  }, [rows, q, filter]);

  return (
    <div data-testid="live-scan-table" className="mt-5 bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"/><span className="relative w-2.5 h-2.5 rounded-full bg-rose-500"/></span>
          <p className="font-heading text-lg font-extrabold">Riwayat Scan Hari Ini</p>
          <span data-testid="live-scan-count" className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-bold tabular-nums">{list.length} / {rows.length}</span>
          {stats && <span className="hidden md:inline text-xs text-slate-400">Belum absen: <b className="text-white tabular-nums">{stats.belum_absen}</b> dari {stats.total_siswa}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-white/5 rounded-xl p-1">
            {FILTERS.map(f => (
              <button key={f} data-testid={`live-filter-${f}`} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${filter === f ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"}`}>
                {f}{f !== "semua" && stats ? ` ${stats[f] ?? 0}` : ""}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 focus-within:ring-2 ring-sky-500">
            <Search className="w-4 h-4 text-slate-400"/>
            <input data-testid="live-scan-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / kelas"
              className="bg-transparent outline-none text-sm w-40 placeholder:text-slate-500"/>
          </label>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-950/95 backdrop-blur text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="text-left px-5 py-3 font-bold w-14">#</th>
              <th className="text-left px-3 py-3 font-bold">Nama Siswa</th>
              <th className="text-left px-3 py-3 font-bold">Kelas</th>
              <th className="text-left px-3 py-3 font-bold">Status</th>
              <th className="text-left px-3 py-3 font-bold">Jam</th>
              <th className="text-left px-3 py-3 font-bold">Metode</th>
              <th className="text-left px-5 py-3 font-bold">Gerbang</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-500 italic">
                <Radio className="w-6 h-6 mx-auto mb-2 opacity-60"/>Menunggu scan pertama… data masuk otomatis.
              </td></tr>
            )}
            {list.map((r, i) => (
              <tr key={r.id} data-testid={`live-row-${r.id}`}
                className={`border-t border-white/5 transition-colors hover:bg-white/5 ${r.id === newId ? "bg-emerald-500/20 animate-in slide-in-from-top-2 fade-in duration-500" : ""}`}>
                <td className="px-5 py-3 text-slate-500 tabular-nums">{rows.length - rows.indexOf(r)}</td>
                <td className="px-3 py-3 font-semibold">{r.student_name}</td>
                <td className="px-3 py-3 text-slate-300">{r.kelas || "—"}</td>
                <td className="px-3 py-3"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ring-1 ${BADGE[r.status] || BADGE.hadir}`}>{r.status}</span></td>
                <td className="px-3 py-3 tabular-nums text-slate-300">{time(r.scanned_at)}</td>
                <td className="px-3 py-3 text-slate-400 capitalize">{r.method || "—"}</td>
                <td className="px-5 py-3 text-slate-400">{r.station_name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
