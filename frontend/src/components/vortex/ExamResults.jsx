import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, ChevronDown, Radio, AlertTriangle } from "lucide-react";
import { VortexLogo, fmtDT } from "./VortexLogo";

function Stat({ label, value, tone = "text-slate-900", testid }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p data-testid={testid} className={`font-heading font-black text-2xl mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

function ViolationLog({ log }) {
  if (!log?.length) return <p className="text-xs text-slate-400 italic">Tidak ada pelanggaran.</p>;
  return (
    <ul className="space-y-1">
      {log.map((v, i) => <li key={i} className="text-xs text-rose-700 flex gap-2"><span className="font-mono text-slate-400">{new Date(v.at).toLocaleTimeString("id-ID")}</span>{v.reason}</li>)}
    </ul>
  );
}

function AttemptRow({ a, onGraded, examId }) {
  const [open, setOpen] = useState(false);
  const essays = (a.details || []).filter(d => d.type === "essay");
  const [scores, setScores] = useState(Object.fromEntries(essays.map(d => [d.q_idx, d.score ?? ""])));
  const [busy, setBusy] = useState(false);
  const grade = async () => {
    const body = Object.fromEntries(Object.entries(scores).filter(([, v]) => v !== "").map(([k, v]) => [k, +v]));
    setBusy(true);
    try { await api.patch(`/exams/${examId}/attempts/${a.id}/grade`, { essay_scores: body }); toast.success("Nilai esai disimpan"); onGraded(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan nilai"); }
    finally { setBusy(false); }
  };
  return (
    <div className="border border-slate-200 rounded-xl bg-white" data-testid={`exam-attempt-${a.id}`}>
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{a.student_name}</p>
          <p className="text-[11px] text-slate-500">{fmtDT(a.submitted_at)} · PG benar {a.mc_correct ?? a.score}/{a.total - (a.essay_count || 0)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {a.auto_submitted && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">Auto</span>}
          {a.essay_pending && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 text-sky-700">Esai belum dinilai</span>}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.violations > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{a.violations || 0} pelanggaran</span>
          <span data-testid={`exam-attempt-score-${a.id}`} className="font-heading font-black text-lg w-12 text-right">{Math.round(a.percent || 0)}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="border-t p-4 space-y-4 bg-slate-50 rounded-b-xl">
          <div><p className="text-xs font-bold uppercase text-slate-500 mb-1.5">Catatan Pelanggaran</p><ViolationLog log={a.violation_log} /></div>
          {essays.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase text-slate-500">Jawaban Esai</p>
              {essays.map(d => (
                <div key={d.q_idx} className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-semibold">{d.q}</p>
                  <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-wrap">{d.answer || <i className="text-slate-400">(kosong)</i>}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-slate-500">Nilai (0–100)</label>
                    <input data-testid={`essay-score-${a.id}-${d.q_idx}`} type="number" min={0} max={100} value={scores[d.q_idx]}
                      onChange={e => setScores({ ...scores, [d.q_idx]: e.target.value })} className="w-24 px-2 py-1 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
              ))}
              <button data-testid={`save-essay-grade-${a.id}`} disabled={busy} onClick={grade} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{busy ? "Menyimpan..." : "Simpan Nilai Esai"}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActiveList({ active }) {
  if (!active.length) return <p className="text-sm text-slate-400 italic">Tidak ada siswa yang sedang mengerjakan.</p>;
  return (
    <div className="space-y-2">
      {active.map(s => (
        <div key={s.student_id} data-testid={`exam-active-${s.student_id}`} className={`border rounded-xl p-3 bg-white ${s.violations > 0 ? "border-rose-300" : "border-slate-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-semibold text-sm truncate">{s.student_name || "Siswa"}</p>
              <p className="text-[11px] text-slate-500">Mulai {fmtDT(s.started_at)} · {s.answered} terjawab</p></div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${s.violations > 0 ? "bg-rose-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>{s.violations || 0} pelanggaran</span>
          </div>
          {s.violation_log?.length > 0 && <div className="mt-2"><ViolationLog log={s.violation_log} /></div>}
        </div>
      ))}
    </div>
  );
}

export function ExamResults({ exam, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("rekap");
  const load = useCallback(() => api.get(`/exams/${exam.id}/results`).then(r => setData(r.data)).catch(() => setData({ attempts: [], active: [], summary: {} })), [exam.id]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  const s = data?.summary || {};
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="exam-results-modal">
      <div className="bg-[#F4F6F5] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b bg-white rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0"><VortexLogo size="sm" /><span className="text-slate-300">/</span><h3 className="font-heading font-bold truncate">{exam.title}</h3></div>
          <button data-testid="exam-results-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <Stat label="Selesai" value={s.count ?? 0} testid="exam-stat-count" />
            <Stat label="Sedang" value={s.active ?? 0} tone="text-teal-700" testid="exam-stat-active" />
            <Stat label="Rata-rata" value={Math.round(s.avg || 0)} testid="exam-stat-avg" />
            <Stat label="Tertinggi" value={Math.round(s.max || 0)} />
            <Stat label="Terendah" value={Math.round(s.min || 0)} />
            <Stat label="Pelanggaran" value={s.total_violations ?? 0} tone="text-rose-600" testid="exam-stat-violations" />
          </div>
          <div className="flex gap-2">
            <button data-testid="exam-results-tab-rekap" onClick={() => setTab("rekap")} className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "rekap" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>Rekap Nilai</button>
            <button data-testid="exam-results-tab-live" onClick={() => setTab("live")} className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 ${tab === "live" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}><Radio className="w-3.5 h-3.5 text-rose-500" />Pengawasan</button>
          </div>
          {data === null && <p className="text-slate-400 italic text-sm">Memuat...</p>}
          {data && tab === "rekap" && (
            <div className="space-y-2" data-testid="exam-results-list">
              {s.essay_pending > 0 && <p className="text-xs text-sky-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{s.essay_pending} hasil menunggu penilaian esai. Buka baris siswa untuk menilai.</p>}
              {data.attempts.length === 0 && <p className="text-slate-400 italic text-sm">Belum ada siswa yang mengumpulkan.</p>}
              {data.attempts.map(a => <AttemptRow key={a.id + (a.score ?? "")} a={a} examId={exam.id} onGraded={load} />)}
            </div>
          )}
          {data && tab === "live" && <ActiveList active={data.active || []} />}
        </div>
      </div>
    </div>
  );
}
