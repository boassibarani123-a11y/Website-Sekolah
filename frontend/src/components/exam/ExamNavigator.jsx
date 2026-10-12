import { Lock } from "lucide-react";

export function ExamNavigator({ questions, answers, flags, page, perPage, allowBack, maxPage, onGo }) {
  const pages = Math.max(1, Math.ceil(questions.length / perPage));
  const answered = questions.filter((q, i) => (q.type === "essay" ? !!(answers[i] || "").trim() : answers[i] >= 0 && answers[i] !== null)).length;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm" data-testid="exam-navigator">
      <div>
        <div className="flex justify-between text-xs font-semibold text-slate-600"><span>Progres</span><span data-testid="exam-progress-text">{answered}/{questions.length}</span></div>
        <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-600 to-cyan-400 transition-[width] duration-500" style={{ width: `${(answered / Math.max(1, questions.length)) * 100}%` }} /></div>
      </div>
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {Array.from({ length: pages }, (_, p) => {
          const lockedPage = !allowBack && p < maxPage;
          return (
            <div key={p}>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center gap-1">Halaman {p + 1}{lockedPage && <Lock className="w-3 h-3" />}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.slice(p * perPage, (p + 1) * perPage).map((q, k) => {
                  const i = p * perPage + k;
                  const done = q.type === "essay" ? !!(answers[i] || "").trim() : answers[i] >= 0 && answers[i] !== null;
                  const cls = flags[i] ? "bg-amber-400 text-amber-950" : done ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600";
                  return (
                    <button key={i} type="button" data-testid={`nav-q-${i}`} disabled={lockedPage} onClick={() => onGo(p, i)}
                      className={`h-9 rounded-lg text-xs font-bold transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 ${cls} ${p === page ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}>{i + 1}</button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-indigo-600" />Terjawab</span>
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-amber-400" />Ragu</span>
        <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded bg-slate-200" />Kosong</span>
      </div>
      {!allowBack && <p className="text-[11px] text-rose-600 bg-rose-50 rounded-lg p-2">Ujian ini tidak mengizinkan kembali ke halaman sebelumnya.</p>}
    </div>
  );
}
