import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Search, ArrowUpDown, Download, ClipboardCheck, RotateCcw } from "lucide-react";
import { VortexMark, fmtDate } from "./brand";
import { ExamGrading } from "./ExamGrading";

const FILTERS = [["all", "Semua"], ["pending", "Menunggu koreksi"], ["graded", "Selesai dinilai"], ["pass", "Lulus KKM"], ["fail", "Belum lulus"]];

export function ExamResults({ exam, onClose }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState(["submitted_at", -1]);
  const [grading, setGrading] = useState(null);

  const load = () => api.get(`/exams/${exam.id}/results`).then(r => setData(r.data)).catch(() => setData({ attempts: [], passing_grade: 70 }));
  useEffect(() => { load(); }, [exam.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const kkm = data?.passing_grade ?? 70;
  const rows = useMemo(() => {
    let r = (data?.attempts || []).filter(a => a.student_name?.toLowerCase().includes(q.toLowerCase()));
    if (filter === "pending" || filter === "graded") r = r.filter(a => a.status === filter);
    if (filter === "pass") r = r.filter(a => a.percent >= kkm);
    if (filter === "fail") r = r.filter(a => a.percent < kkm);
    const [k, d] = sort;
    return [...r].sort((a, b) => ((a[k] ?? "") > (b[k] ?? "") ? d : (a[k] ?? "") < (b[k] ?? "") ? -d : 0));
  }, [data, q, filter, sort, kkm]);

  const st = useMemo(() => {
    const a = data?.attempts || [], p = a.map(x => x.percent || 0);
    return [["Peserta", a.length], ["Rata-rata", a.length ? (p.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : "—"],
      ["Tertinggi", a.length ? Math.max(...p).toFixed(1) : "—"], ["Lulus KKM", a.filter(x => x.percent >= kkm).length], ["Menunggu koreksi", a.filter(x => x.status === "pending").length]];
  }, [data, kkm]);

  const exportCsv = () => {
    const head = ["Nama", "Dikirim", "PG", "Essay", "Skor", "Total", "Persen", "Pelanggaran", "Status"];
    const lines = rows.map(a => [a.student_name, a.submitted_at, a.pg_score ?? "", a.essay_score ?? "", a.score, a.total, (a.percent || 0).toFixed(1), a.violations || 0, a.status]);
    const csv = [head, ...lines].map(l => l.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `hasil-${exam.title}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const reset = async (a) => {
    if (!window.confirm(`Reset hasil ${a.student_name}? Siswa dapat mengerjakan ulang ujian ini.`)) return;
    try { await api.delete(`/exams/${exam.id}/attempts/${a.id}`); toast.success("Hasil direset"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal mereset"); }
  };
  const Th = ({ k, children }) => <th className="px-3 py-2.5"><button onClick={() => setSort(([sk, d]) => [k, sk === k ? -d : 1])} className="inline-flex items-center gap-1 hover:text-indigo-600">{children}<ArrowUpDown className="w-3 h-3" /></button></th>;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" data-testid="exam-results-modal">
      <div className="bg-slate-50 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-950 text-white">
          <div className="flex items-center gap-4 min-w-0"><VortexMark size="sm" dark /><h3 className="font-heading font-bold truncate">Hasil: {exam.title}</h3></div>
          <button data-testid="exam-results-close" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {st.map(([l, v]) => <div key={l} className="bg-white rounded-2xl border border-slate-200 p-4"><p className="font-heading text-2xl font-black text-slate-900">{v}</p><p className="text-[11px] uppercase tracking-wider text-slate-500">{l}</p></div>)}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-3 flex flex-col md:flex-row gap-3 md:items-center justify-between border-b border-slate-100">
              <div className="relative flex-1 max-w-sm"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input data-testid="results-search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari siswa…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-indigo-500" /></div>
              <div className="flex flex-wrap gap-1.5 items-center">
                {FILTERS.map(([k, l]) => <button key={k} data-testid={`results-filter-${k}`} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filter === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>)}
                <button data-testid="results-export-csv" onClick={exportCsv} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1 hover:bg-emerald-700"><Download className="w-3.5 h-3.5" />CSV</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]" data-testid="exam-results-list">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><tr>
                  <Th k="student_name">Siswa</Th><Th k="submitted_at">Dikirim</Th><Th k="pg_score">PG</Th><Th k="essay_score">Essay</Th><Th k="percent">Nilai</Th><Th k="violations">Pelanggaran</Th><Th k="status">Status</Th><th className="px-3 py-2.5 text-right">Aksi</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data === null && <tr><td colSpan={8} className="p-8 text-center text-slate-400">Memuat…</td></tr>}
                  {data && rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400">Belum ada data.</td></tr>}
                  {rows.map(a => (
                    <tr key={a.id} className="hover:bg-indigo-50/40" data-testid={`result-row-${a.id}`}>
                      <td className="px-3 py-3 font-semibold">{a.student_name}{a.auto_submitted && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">Auto</span>}</td>
                      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(a.submitted_at)}</td>
                      <td className="px-3 py-3">{a.pg_score ?? a.score}</td>
                      <td className="px-3 py-3">{a.status === "pending" ? <span className="text-amber-600 text-xs font-semibold">belum</span> : (a.essay_score ?? 0)}</td>
                      <td className="px-3 py-3 whitespace-nowrap"><b className={a.percent >= kkm ? "text-emerald-600" : "text-rose-600"}>{(a.percent || 0).toFixed(1)}</b><span className="text-[11px] text-slate-400"> ({a.score}/{a.total})</span></td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.violations ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{a.violations || 0}</span></td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{a.status === "pending" ? "Menunggu" : "Dinilai"}</span></td>
                      <td className="px-3 py-3 text-right whitespace-nowrap space-x-1">
                        <button data-testid={`grade-attempt-${a.id}`} onClick={() => setGrading(a)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"><ClipboardCheck className="w-3.5 h-3.5" />Koreksi</button>
                        <button data-testid={`reset-attempt-${a.id}`} onClick={() => reset(a)} title="Izinkan mengulang" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><RotateCcw className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {grading && <ExamGrading exam={exam} attemptId={grading.id} onClose={() => setGrading(null)} onSaved={load} />}
    </div>
  );
}

export function MyExamResult({ exam, onClose }) {
  const [att, setAtt] = useState(undefined);
  useEffect(() => { api.get(`/exams/${exam.id}/results`).then(r => setAtt(r.data.mine)).catch(() => setAtt(null)); }, [exam.id]);
  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4" data-testid="my-exam-result-modal">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><VortexMark size="sm" /><button data-testid="my-result-close" onClick={onClose} className="p-1.5"><X className="w-5 h-5" /></button></div>
        <div className="p-6 space-y-4">
          <h3 className="font-heading font-bold text-xl">{exam.title}</h3>
          {att === undefined ? <p className="text-slate-400 text-sm">Memuat…</p> : !att ? <p className="text-slate-400 text-sm">Belum ada hasil.</p> : (
            <>
              {att.score != null ? (
                <div className="rounded-2xl bg-slate-50 p-5 text-center"><p className="font-heading text-5xl font-black text-indigo-600">{Math.round(att.percent)}</p>
                  <p className="text-xs text-slate-500 mt-1">Skor {att.score}/{att.total} · PG {att.pg_score ?? "-"} · Essay {att.status === "pending" ? "menunggu" : att.essay_score ?? 0}</p></div>
              ) : <p className="text-sm text-slate-500">Nilai tidak ditampilkan untuk ujian ini.</p>}
              <p className="text-xs text-slate-500">Status: <b>{att.status === "pending" ? "Menunggu koreksi essay" : "Selesai dinilai"}</b> · {att.violations || 0} pelanggaran</p>
              {att.feedback && <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-sm text-sky-900"><b>Catatan guru:</b> {att.feedback}</div>}
              {(att.responses || []).map((r, i) => r.comment ? <div key={i} className="text-xs rounded-xl border border-slate-200 p-3"><b>Soal {i + 1}</b> ({r.points ?? "-"}/{r.max_points}): {r.comment}</div> : null)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
