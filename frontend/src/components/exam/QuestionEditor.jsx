import { ChevronUp, ChevronDown, Copy, Trash2, Plus, X, ListChecks, PenLine } from "lucide-react";
import { LETTERS } from "./brand";

export function QuestionEditor({ q, idx, total, onChange, onMove, onDuplicate, onDelete }) {
  const set = (patch) => onChange({ ...q, ...patch });
  const isEssay = q.type === "essay";
  const setType = (t) => set(t === "essay"
    ? { type: "essay", options: [], answer: 0, points: q.points || 10, rubric: q.rubric || "", max_words: q.max_words || 0 }
    : { type: "pg", options: q.options?.length ? q.options : ["", "", "", ""], answer: 0 });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm" data-testid={`question-editor-${idx}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center justify-center">{idx + 1}</span>
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button type="button" data-testid={`q-${idx}-type-pg`} onClick={() => setType("pg")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${!isEssay ? "bg-white shadow text-indigo-700" : "text-slate-500"}`}><ListChecks className="w-3.5 h-3.5" />Pilihan Ganda</button>
            <button type="button" data-testid={`q-${idx}-type-essay`} onClick={() => setType("essay")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${isEssay ? "bg-white shadow text-indigo-700" : "text-slate-500"}`}><PenLine className="w-3.5 h-3.5" />Essay</button>
          </div>
          <label className="flex items-center gap-1 text-xs text-slate-500">Bobot
            <input data-testid={`q-${idx}-points`} type="number" min={0.5} max={100} step={0.5} value={q.points}
              onChange={e => set({ points: e.target.value === "" ? "" : +e.target.value })} className="w-16 px-2 py-1 border rounded-lg text-sm" />
          </label>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" disabled={idx === 0} onClick={() => onMove(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30" data-testid={`q-${idx}-up`}><ChevronUp className="w-4 h-4" /></button>
          <button type="button" disabled={idx === total - 1} onClick={() => onMove(1)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30" data-testid={`q-${idx}-down`}><ChevronDown className="w-4 h-4" /></button>
          <button type="button" onClick={onDuplicate} className="p-1.5 rounded-lg hover:bg-slate-100" data-testid={`q-${idx}-duplicate`}><Copy className="w-4 h-4" /></button>
          <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50" data-testid={`q-${idx}-delete`}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <textarea data-testid={`q-${idx}-text`} rows={2} placeholder={`Tulis pertanyaan #${idx + 1}…`} value={q.q} onChange={e => set({ q: e.target.value })}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none resize-y" />
      {isEssay ? <EssayFields q={q} idx={idx} set={set} /> : <PgFields q={q} idx={idx} set={set} />}
    </div>
  );
}

function PgFields({ q, idx, set }) {
  const setOpt = (oi, v) => set({ options: q.options.map((o, i) => (i === oi ? v : o)) });
  const removeOpt = (oi) => set({ options: q.options.filter((_, i) => i !== oi), answer: q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer });
  return (
    <div className="space-y-1.5">
      {q.options.map((o, oi) => (
        <div key={oi} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 transition-colors ${q.answer === oi ? "border-emerald-400 bg-emerald-50" : "border-transparent"}`}>
          <button type="button" data-testid={`q-${idx}-correct-${oi}`} onClick={() => set({ answer: oi })} title="Tandai sebagai jawaban benar"
            className={`w-7 h-7 shrink-0 rounded-lg text-xs font-black transition-colors ${q.answer === oi ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{LETTERS[oi]}</button>
          <input data-testid={`q-${idx}-option-${oi}`} placeholder={`Opsi ${LETTERS[oi]}`} value={o} onChange={e => setOpt(oi, e.target.value)}
            className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none bg-white" />
          {q.options.length > 2 && <button type="button" onClick={() => removeOpt(oi)} className="p-1 text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>}
        </div>
      ))}
      {q.options.length < 6 && (
        <button type="button" data-testid={`q-${idx}-add-option`} onClick={() => set({ options: [...q.options, ""] })}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1"><Plus className="w-3.5 h-3.5" />Tambah opsi</button>
      )}
      <p className="text-[11px] text-slate-400 px-2">Klik huruf untuk menandai jawaban benar.</p>
    </div>
  );
}

function EssayFields({ q, idx, set }) {
  return (
    <div className="grid sm:grid-cols-[1fr_160px] gap-3">
      <div>
        <label className="text-[11px] font-semibold uppercase text-slate-500">Rubrik / Kunci Penilaian (hanya terlihat pengoreksi)</label>
        <textarea data-testid={`q-${idx}-rubric`} rows={2} value={q.rubric || ""} onChange={e => set({ rubric: e.target.value })} placeholder="Poin-poin yang harus ada dalam jawaban…"
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none" />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase text-slate-500">Batas Kata</label>
        <input data-testid={`q-${idx}-max-words`} type="number" min={0} value={q.max_words || 0} onChange={e => set({ max_words: +e.target.value || 0 })}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
        <p className="text-[10px] text-slate-400 mt-1">0 = tanpa batas</p>
      </div>
    </div>
  );
}
