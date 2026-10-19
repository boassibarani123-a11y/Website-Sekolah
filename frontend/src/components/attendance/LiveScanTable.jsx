import { useMemo, useState } from "react";
import { Search, Radio, Trash2 } from "lucide-react";

const BADGE = {
  hadir: "bg-emerald-100 text-emerald-700",
  izin: "bg-sky-100 text-sky-700",
  sakit: "bg-amber-100 text-amber-700",
  alpa: "bg-rose-100 text-rose-700",
};
const FILTERS = ["semua", "hadir", "izin", "sakit", "alpa"];
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");

export function LiveScanTable({ rows, stats, newId, who = "Siswa", tabs = null, onDelete = null, onDeleteAll = null }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("semua");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(r => (filter === "semua" || r.status === filter) &&
      (!s || `${r.student_name} ${r.kelas || ""} ${r.nip || ""}`.toLowerCase().includes(s)));
  }, [rows, q, filter]);
  const guru = who === "Guru";

  return (
    <div data-testid="live-scan-table" className="mt-5 bg-white border border-slate-200 rounded-[1.75rem] overflow-hidden flex flex-col min-h-0 flex-1 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75" /><span className="relative w-2.5 h-2.5 rounded-full bg-rose-500" /></span>
          <p className="font-heading text-lg font-extrabold text-slate-900">Riwayat {who} Hari Ini</p>
          <span data-testid="live-scan-count" className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold tabular-nums">{list.length} / {rows.length}</span>
          {stats && <span className="hidden md:inline text-xs text-slate-500">Belum absen: <b className="text-slate-900 tabular-nums">{stats.belum_absen}</b> dari {stats.total_siswa}</span>}
          {tabs}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 rounded-xl p-1">
            {FILTERS.map(f => (
              <button key={f} data-testid={`live-filter-${f}`} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors ${filter === f ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                {f}{f !== "semua" && stats ? ` ${stats[f] ?? 0}` : ""}
              </button>
            ))}
          </div>
          {onDeleteAll && <button data-testid="live-delete-all" onClick={onDeleteAll} className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Hapus Semua Hari Ini</button>}
          <label className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 focus-within:ring-2 ring-sky-400">
            <Search className="w-4 h-4 text-slate-400" />
            <input data-testid="live-scan-search" value={q} onChange={e => setQ(e.target.value)} placeholder={guru ? "Cari nama / NIP" : "Cari nama / kelas"}
              className="bg-transparent outline-none text-sm w-40 placeholder:text-slate-400" />
          </label>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-bold w-14">#</th>
              <th className="text-left px-3 py-3 font-bold">Nama {who}</th>
              <th className="text-left px-3 py-3 font-bold">{guru ? "NIP" : "Kelas"}</th>
              <th className="text-left px-3 py-3 font-bold">Status</th>
              <th className="text-left px-3 py-3 font-bold">Jam</th>
              <th className="text-left px-3 py-3 font-bold">Metode</th>
              <th className="text-left px-5 py-3 font-bold">Gerbang</th>
              {onDelete && <th className="px-3 py-3" />}
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={onDelete ? 8 : 7} className="text-center py-12 text-slate-400 italic">
                <Radio className="w-6 h-6 mx-auto mb-2 opacity-60" />Menunggu scan pertama… data masuk otomatis.
              </td></tr>
            )}
            {list.map(r => (
              <tr key={r.id} data-testid={`live-row-${r.id}`}
                className={`border-t border-slate-100 transition-colors hover:bg-sky-50/50 ${r.id === newId ? "bg-emerald-50 animate-in slide-in-from-top-2 fade-in duration-500" : ""}`}>
                <td className="px-5 py-3 text-slate-400 tabular-nums">{rows.length - rows.indexOf(r)}</td>
                <td className="px-3 py-3 font-semibold text-slate-900">{r.student_name}</td>
                <td className="px-3 py-3 text-slate-600">{guru ? (r.nip || "—") : (r.kelas || "—")}</td>
                <td className="px-3 py-3"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${BADGE[r.status] || BADGE.hadir}`}>{r.status}{r.late ? " · telat" : ""}</span></td>
                <td className="px-3 py-3 tabular-nums text-slate-600">{time(r.scanned_at)}</td>
                <td className="px-3 py-3 text-slate-500 capitalize">{r.method || "—"}</td>
                <td className="px-5 py-3 text-slate-500">{r.station_name || "—"}</td>
                {onDelete && <td className="px-3 py-3"><button data-testid={`live-delete-${r.id}`} title="Hapus data scan" onClick={() => onDelete(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
