import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Lock, ArrowLeft, KeyRound } from "lucide-react";

export function ClassUnlock({ klass, onUnlocked }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    try { await api.post(`/classes/${klass.id}/unlock`, { password: pw }); toast.success("Kelas terbuka"); onUnlocked(); }
    catch (err) { toast.error(err.response?.data?.detail || "Password salah"); }
    finally { setBusy(false); }
  };
  return (
    <div className="max-w-md mx-auto py-10" data-testid="class-unlock-page">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800"><ArrowLeft className="w-4 h-4" />Semua Kelas</Link>
      <form onSubmit={submit} className="mt-6 bg-white border border-slate-200 rounded-2xl p-7 shadow-sm text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center"><Lock className="w-6 h-6" /></div>
        <h1 className="mt-4 font-heading text-2xl font-extrabold text-slate-900">{klass.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Kelas ini dilindungi password. Cukup masukkan sekali, selanjutnya kelas akan langsung terbuka.</p>
        <input data-testid="class-password-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password kelas" autoFocus
          className="mt-5 w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-center" />
        <button data-testid="class-unlock-submit" disabled={busy} className="mt-3 w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          <KeyRound className="w-4 h-4" />{busy ? "Memeriksa..." : "Masuk Kelas"}
        </button>
      </form>
    </div>
  );
}
