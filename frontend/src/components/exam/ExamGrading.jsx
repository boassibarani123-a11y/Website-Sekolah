import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, CheckCircle2, XCircle, PenLine } from "lucide-react";
import { LETTERS, wordCount } from "./brand";

export function ExamGrading({ exam, attemptId, onClose, onSaved }) {
  const [d, setD] = useState(null);
  const [grades, setGrades] = useState({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/exams/${exam.id}/attempts/${attemptId}`).then(r => {
      setD(r.data); setFeedback(r.data.attempt.feedback || "");
      setGrades(Object.fromEntries(r.data.attempt.responses.map((x, i) => [i, { points: x.points ?? "", comment: x.comment || "" }])));
    }).catch(e => { toast.error(e.response?.data?.detail || "Gagal memuat"); onClose(); });
  }, [exam.id, attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => {
    if (!d) return { s: 0, t: 0 };
    return d.attempt.responses.reduce((acc, r, i) => ({
      s: acc.s + (+(r.type === "essay" ? grades[i]?.points : r.points) || 0), t: acc.t + (+r.max_points || 0) }), { s: 0, t: 0 });
  }, [d, grades]);

  const setG = (i, patch) => setGrades(g => ({ ...g, [i]: { ...g[i], ...patch } }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { feedback, grades: d.attempt.responses.map((r, i) => ({ index: i, comment: grades[i]?.comment || "",
        points: r.type === "essay" && grades[i]?.points !== "" ? +grades[i].points : null })) };
      await api.patch(`/exams/${exam.id}/attempts/${attemptId}/grade`, body);
      toast.success("Nilai tersimpan"); onSaved(); onClose();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-[55] p-2 sm:p-4" data-testid="exam-grading-modal">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b">
          <div><h3 className="font-heading font-bold">Koreksi: {d?.attempt.student_name || "…"}</h3><p className="text-xs text-slate-500">{exam.title}</p></div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm" data-testid="grading-total">{total.s}/{total.t} · {total.t ? ((total.s / total.t) * 100).toFixed(1) : 0}</span>
            <button data-testid="grading-close" onClick={onClose} className="p-1.5"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3">
          {!d && <p className="text-slate-400">Memuat…</p>}
          {d && d.questions.map((q, i) => {
            const r = d.attempt.responses[i]; if (!r) return null;
            return (
              <div key={i} className={`rounded-2xl border p-4 ${q.type === "essay" ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200"}`} data-testid={`grading-q-${i}`}>
                <div className="flex justify-between gap-3"><p className="font-semibold text-sm whitespace-pre-wrap"><span className="text-slate-400 mr-1">{i + 1}.</span>{q.q}</p>
                  <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 h-fit rounded-full bg-slate-100 text-slate-500">{q.type === "essay" ? "Essay" : "PG"} · {r.max_points}</span></div>
                {q.type === "essay" ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl bg-white border border-slate-200 p-3 text-sm whitespace-pre-wrap min-h-[60px]">{r.answer || <i className="text-slate-400">Tidak dijawab</i>}</div>
                    <p className="text-[11px] text-slate-400">{wordCount(r.answer)} kata</p>
                    {q.rubric && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900"><b>Rubrik:</b> {q.rubric}</div>}
                    <div className="flex flex-wrap items-center gap-2">
                      <PenLine className="w-4 h-4 text-indigo-600" />
                      <input data-testid={`grade-points-${i}`} type="number" min={0} max={r.max_points} step={0.5} value={grades[i]?.points ?? ""} onChange={e => setG(i, { points: e.target.value })}
                        placeholder="Nilai" className="w-24 px-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none" />
                      <span className="text-xs text-slate-500">/ {r.max_points}</span>
                      {[0, 0.5, 1].map(f => <button key={f} type="button" data-testid={`grade-quick-${i}-${f}`} onClick={() => setG(i, { points: +(r.max_points * f).toFixed(1) })} className="px-2 py-1 rounded-lg bg-slate-100 text-xs font-semibold hover:bg-slate-200">{f === 0 ? "0" : f === 1 ? "Penuh" : "½"}</button>)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                    {q.options.map((o, oi) => (
                      <div key={oi} className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${oi === q.answer ? "bg-emerald-100 text-emerald-800 font-semibold" : oi === r.answer ? "bg-rose-100 text-rose-700" : "bg-slate-50 text-slate-600"}`}>
                        <b>{LETTERS[oi]}</b>{o}{oi === r.answer && (r.correct ? <CheckCircle2 className="w-3.5 h-3.5 ml-auto" /> : <XCircle className="w-3.5 h-3.5 ml-auto" />)}
                      </div>
                    ))}
                    {r.answer == null && <p className="text-xs text-slate-400 italic">Tidak dijawab</p>}
                  </div>
                )}
                <input data-testid={`grade-comment-${i}`} value={grades[i]?.comment || ""} onChange={e => setG(i, { comment: e.target.value })} placeholder="Komentar untuk soal ini (opsional)"
                  className="mt-3 w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" />
              </div>
            );
          })}
          {d && <div><label className="text-xs font-semibold uppercase text-slate-600">Catatan umum untuk siswa</label>
            <textarea data-testid="grading-feedback" rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" /></div>}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
          <button data-testid="grading-save" disabled={busy || !d} onClick={save} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-indigo-700">{busy ? "Menyimpan…" : "Simpan Nilai"}</button>
        </div>
      </div>
    </div>
  );
}
