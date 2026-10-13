import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Lock, X, KeyRound } from "lucide-react";

export function QuizUnlockModal({ quiz, onClose, onUnlocked }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    try { const r = await api.post(`/quizzes/${quiz.id}/unlock`, { password: pw }); toast.success("Quiz terbuka"); onUnlocked(r.data); }
    catch (err) { toast.error(err.response?.data?.detail || "Password salah"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="quiz-unlock-modal">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        <div className="mx-auto w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><Lock className="w-5 h-5" /></div>
        <h3 className="mt-3 font-heading text-lg font-bold">{quiz.title}</h3>
        <p className="text-xs text-slate-500 mt-1">Quiz ini dilindungi password dari guru. Cukup masukkan sekali.</p>
        <input data-testid="quiz-password-input" type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)} placeholder="Password quiz"
          className="mt-4 w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-rose-400 outline-none text-center" />
        <button data-testid="quiz-unlock-submit" disabled={busy} className="mt-3 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          <KeyRound className="w-4 h-4" />{busy ? "Memeriksa..." : "Buka Quiz"}
        </button>
      </form>
    </div>
  );
}

export function QuizPasswordField({ hasPassword, value, onChange, remove, onRemove }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Password Quiz (opsional)</label>
      <input data-testid="quiz-password-field" type="text" value={value} disabled={remove} onChange={e => onChange(e.target.value)}
        placeholder={hasPassword ? "Kosongkan jika tidak ingin mengubah" : "Buat password agar siswa butuh password"}
        className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none disabled:bg-slate-50" />
      {hasPassword && (
        <label className="mt-1.5 flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input data-testid="quiz-remove-password" type="checkbox" checked={remove} onChange={e => onRemove(e.target.checked)} className="w-3.5 h-3.5" />Hapus password quiz
        </label>
      )}
    </div>
  );
}

export const quizPasswordBody = (password, remove) =>
  remove ? { remove_password: true } : password.trim() ? { password: password.trim() } : {};
