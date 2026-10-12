import { useMemo, useState } from "react";
import { Search, Pencil, Trash2, BarChart3, Play, ArrowUpDown, Lock, Undo2, ArrowRight, Eye } from "lucide-react";
import { examWindow, WINDOW_BADGE, fmtDate } from "./brand";

const COLS = [
  ["title", "Ujian"], ["question_count", "Soal"], ["time_limit", "Durasi"], ["start_at", "Jadwal"], ["per_page", "Tampilan"],
];

export function ExamTable({ list, isTeacher, canManage, onEdit, onDelete, onResults, onTake, onMyResult }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState(["created_at", -1]);

  const rows = useMemo(() => {
    let r = (list || []).filter(e => (e.title + " " + (e.subject || "")).toLowerCase().includes(q.toLowerCase()));
    if (status !== "all") r = r.filter(e => examWindow(e) === status);
    const [k, dir] = sort;
    return [...r].sort((a, b) => ((a[k] ?? "") > (b[k] ?? "") ? dir : (a[k] ?? "") < (b[k] ?? "") ? -dir : 0));
  }, [list, q, status, sort]);

  const toggleSort = (k) => setSort(([sk, d]) => [k, sk === k ? -d : 1]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="exam-table">
      <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-b border-slate-100">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input data-testid="exam-search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari judul atau mapel…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap" data-testid="exam-status-filter">
          {[["all", "Semua"], ["open", "Dibuka"], ["scheduled", "Terjadwal"], ["closed", "Ditutup"]].map(([k, l]) => (
            <button key={k} data-testid={`exam-filter-${k}`} onClick={() => setStatus(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${status === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              {COLS.map(([k, l]) => (
                <th key={k} className="px-4 py-3 font-semibold">
                  <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-indigo-600" data-testid={`exam-sort-${k}`}>{l}<ArrowUpDown className="w-3 h-3" /></button>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">{isTeacher ? "Peserta" : "Status"}</th>
              <th className="px-4 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list === null && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Memuat…</td></tr>}
            {list && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400" data-testid="exam-empty">Belum ada ujian.</td></tr>}
            {rows.map(ex => <Row key={ex.id} ex={ex} {...{ isTeacher, canManage, onEdit, onDelete, onResults, onTake, onMyResult }} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ ex, isTeacher, canManage, onEdit, onDelete, onResults, onTake, onMyResult }) {
  const w = examWindow(ex), badge = WINDOW_BADGE[w], mine = ex.my_attempt;
  return (
    <tr className="hover:bg-indigo-50/40 transition-colors" data-testid={`exam-card-${ex.id}`}>
      <td className="px-4 py-3.5">
        <p className="font-semibold text-slate-900">{ex.title}</p>
        <div className="flex gap-1.5 mt-1 flex-wrap">
          {ex.subject && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">{ex.subject}</span>}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"><Lock className="w-2.5 h-2.5" />Password</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
        <b className="text-slate-900">{ex.question_count}</b> soal
        <p className="text-[11px] text-slate-400">{ex.question_count - (ex.essay_count || 0)} PG · {ex.essay_count || 0} essay</p>
      </td>
      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{ex.time_limit ? `${ex.time_limit} menit` : "Tanpa batas"}</td>
      <td className="px-4 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
        {ex.start_at || ex.end_at ? <><p>Buka: {fmtDate(ex.start_at)}</p><p>Tutup: {fmtDate(ex.end_at)}</p></> : "Kapan saja"}
      </td>
      <td className="px-4 py-3.5 text-[11px] text-slate-600 whitespace-nowrap">
        <p>{ex.per_page || 10} soal / halaman</p>
        <p className={`inline-flex items-center gap-1 mt-0.5 font-semibold ${ex.allow_back !== false ? "text-emerald-600" : "text-rose-600"}`}>
          {ex.allow_back !== false ? <><Undo2 className="w-3 h-3" />Boleh kembali</> : <><ArrowRight className="w-3 h-3" />Maju saja</>}
        </p>
      </td>
      <td className="px-4 py-3.5 whitespace-nowrap">
        {isTeacher ? (
          <span className="text-xs text-slate-600"><b className="text-slate-900">{ex.attempt_count || 0}</b> siswa
            {ex.pending_count > 0 && <span className="ml-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{ex.pending_count} koreksi</span>}</span>
        ) : mine ? (
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${mine.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {mine.status === "pending" ? "Menunggu koreksi" : `Selesai${mine.percent != null ? ` · ${Math.round(mine.percent)}%` : ""}`}
          </span>
        ) : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">Belum dikerjakan</span>}
      </td>
      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
        {isTeacher ? (
          <>
            <button data-testid={`exam-results-${ex.id}`} onClick={() => onResults(ex)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700"><BarChart3 className="w-3.5 h-3.5" />Hasil</button>
            {canManage && <button data-testid={`edit-exam-${ex.id}`} onClick={() => onEdit(ex)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4" /></button>}
            {canManage && <button data-testid={`delete-exam-${ex.id}`} onClick={() => onDelete(ex)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
          </>
        ) : mine ? (
          <button data-testid={`my-result-${ex.id}`} onClick={() => onMyResult(ex)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"><Eye className="w-3.5 h-3.5" />Lihat Hasil</button>
        ) : (
          <button data-testid={`take-exam-${ex.id}`} disabled={w !== "open"} onClick={() => onTake(ex)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"><Play className="w-3.5 h-3.5" />Mulai Ujian</button>
        )}
      </td>
    </tr>
  );
}
