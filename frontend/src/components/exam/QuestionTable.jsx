import { Flag } from "lucide-react";
import { LETTERS, wordCount } from "./brand";

export function QuestionTable({ questions, start, answers, flags, onAnswer, onFlag }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm" data-testid="exam-question-table">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
          <tr><th className="px-3 py-2.5 w-14 text-center">No</th><th className="px-3 py-2.5 text-left">Soal & Jawaban</th><th className="px-3 py-2.5 w-24 text-center hidden sm:table-cell">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {questions.map((q, k) => {
            const i = start + k, a = answers[i];
            const done = q.type === "essay" ? !!(a || "").trim() : a !== null && a !== undefined && a >= 0;
            return (
              <tr key={i} id={`exam-q-${i}`} data-testid={`exam-question-${i}`} className={`align-top ${flags[i] ? "bg-amber-50/60" : ""}`}>
                <td className="px-3 py-4 text-center">
                  <span className={`inline-flex w-9 h-9 rounded-xl items-center justify-center font-black text-sm ${done ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed">{q.q}</p>
                    <span className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{q.type === "essay" ? "Essay" : "PG"} · {q.points} poin</span>
                  </div>
                  {q.type === "essay" ? <EssayAnswer q={q} i={i} value={a || ""} onChange={v => onAnswer(i, v)} /> : (
                    <div className="mt-3 grid gap-2">
                      {q.options.map((o, oi) => (
                        <button key={oi} type="button" data-testid={`exam-q-${i}-option-${oi}`} onClick={() => onAnswer(i, oi)}
                          className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border-2 transition-[border-color,background-color] ${a === oi ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-indigo-300"}`}>
                          <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-black ${a === oi ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{LETTERS[oi]}</span>
                          <span className="text-sm text-slate-800">{o}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" data-testid={`exam-q-${i}-flag`} onClick={() => onFlag(i)}
                    className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${flags[i] ? "bg-amber-400 text-amber-950" : "text-slate-500 hover:bg-slate-100"}`}>
                    <Flag className="w-3.5 h-3.5" />{flags[i] ? "Ditandai ragu-ragu" : "Tandai ragu-ragu"}
                  </button>
                </td>
                <td className="px-3 py-4 text-center hidden sm:table-cell">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${flags[i] ? "bg-amber-100 text-amber-700" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {flags[i] ? "Ragu" : done ? "Terjawab" : "Kosong"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EssayAnswer({ q, i, value, onChange }) {
  const wc = wordCount(value), over = q.max_words && wc > q.max_words;
  return (
    <div className="mt-3">
      <textarea data-testid={`exam-q-${i}-essay`} rows={6} value={value} onChange={e => onChange(e.target.value)} placeholder="Tulis jawaban essay Anda di sini…"
        className={`w-full px-4 py-3 rounded-xl border-2 text-sm leading-relaxed outline-none resize-y select-text ${over ? "border-rose-400" : "border-slate-200 focus:border-indigo-500"}`} />
      <div className="flex justify-between text-[11px] mt-1">
        <span className="text-slate-400">Jawaban tersimpan otomatis saat berpindah halaman.</span>
        <span className={over ? "text-rose-600 font-bold" : "text-slate-500"} data-testid={`exam-q-${i}-wordcount`}>{wc}{q.max_words ? ` / ${q.max_words}` : ""} kata</span>
      </div>
    </div>
  );
}
