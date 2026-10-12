import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Timer, AlertTriangle } from "lucide-react";

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function QuizTakeModal({ quiz, onClose, onDone }) {
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const answersRef = useRef(answers);
  const sentRef = useRef(false);
  answersRef.current = answers;

  const submit = useCallback(async (auto = false) => {
    if (sentRef.current) return;
    sentRef.current = true;
    setBusy(true);
    try {
      const r = await api.post("/quizzes/attempt", { quiz_id: quiz.id, answers: answersRef.current });
      toast.success(`${auto ? "Waktu habis — jawaban dikirim otomatis. " : ""}Skor: ${r.data.score}/${r.data.total} (${r.data.percent.toFixed(0)}%)`);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengirim jawaban");
      sentRef.current = false;
      setBusy(false);
    }
  }, [quiz.id, onDone]);

  useEffect(() => {
    let timer;
    api.post(`/quizzes/${quiz.id}/start`).then(r => {
      setQuestions(r.data.questions || []);
      setAnswers(Array((r.data.questions || []).length).fill(-1));
      if (r.data.expired) { setExpired(true); setReady(true); return; }
      setReady(true);
      if (r.data.time_limit) {
        const offset = new Date(r.data.server_now).getTime() - Date.now();
        const deadline = new Date(r.data.deadline).getTime();
        const tick = () => {
          const s = Math.max(0, Math.round((deadline - (Date.now() + offset)) / 1000));
          setLeft(s);
          if (s === 0) { clearInterval(timer); submit(true); }
        };
        tick(); timer = setInterval(tick, 1000);
      }
    }).catch(e => { toast.error(e.response?.data?.detail || "Gagal memulai quiz"); onClose(); });
    return () => clearInterval(timer);
  }, [quiz.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const warn = left !== null && left <= 60;
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" data-testid="quiz-take-modal">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between gap-3 p-5 border-b">
          <h3 className="font-heading font-bold truncate">{quiz.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {quiz.time_limit > 0 && left !== null && !expired && (
              <span data-testid="quiz-timer" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-sm ${warn ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-sky-100 text-sky-700"}`}>
                <Timer className="w-4 h-4" />{mmss(left)}
              </span>
            )}
            <button onClick={onClose} className="p-1.5"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {!ready ? <p className="p-8 text-center text-slate-400">Memulai quiz...</p> : expired ? (
          <div data-testid="quiz-expired" className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="mt-3 font-heading font-bold text-slate-900">Waktu pengerjaan sudah habis</p>
            <p className="text-sm text-slate-500 mt-1">Quiz ini memiliki batas waktu {quiz.time_limit} menit dan waktumu sudah berakhir.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {quiz.time_limit > 0 && <p className="text-xs text-slate-500">Batas waktu {quiz.time_limit} menit. Jawaban dikirim otomatis saat waktu habis.</p>}
            {(questions || []).map((q, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl">
                <p className="font-semibold text-sm mb-2">{i + 1}. {q.q}</p>
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => (
                    <label key={oi} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-white cursor-pointer">
                      <input type="radio" checked={answers[i] === oi} onChange={() => { const a = [...answers]; a[i] = oi; setAnswers(a); }} />{o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button data-testid="submit-quiz-button" disabled={busy} onClick={() => submit(false)} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-60">
              {busy ? "Mengirim..." : "Kirim Jawaban"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuizTimeField({ value, onChange }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Timer className="w-3 h-3" />Batas Waktu (menit)</label>
      <input data-testid="quiz-time-limit-input" type="number" min={0} max={600} value={value} onChange={e => onChange(e.target.value)}
        placeholder="0 = tanpa batas waktu" className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
    </div>
  );
}
