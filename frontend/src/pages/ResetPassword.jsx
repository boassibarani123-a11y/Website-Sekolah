import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { KeyRound, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) return toast.error("Konfirmasi password tidak sama");
    setBusy(true);
    try { const r = await api.post("/auth/reset-password", { token, new_password: pw }); setDone(r.data.message); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mengubah password"); }
    finally { setBusy(false); }
  };
  const inp = "w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-sky-500 outline-none";
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md" data-testid="reset-password-page">
        <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center"><KeyRound className="w-7 h-7" /></div>
        <h1 className="mt-6 font-heading text-3xl font-extrabold text-slate-900">Buat Password Baru</h1>
        {!token ? <p data-testid="reset-no-token" className="mt-4 text-sm text-rose-600">Tautan reset tidak valid. Minta tautan baru dari halaman Lupa Password.</p>
          : done ? (
            <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center" data-testid="reset-success">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" /><p className="mt-3 text-sm text-emerald-900">{done}</p>
              <Link to="/login" className="mt-4 inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold" data-testid="reset-go-login">Ke halaman login</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" /><input data-testid="reset-new-password" type="password" required value={pw} onChange={e => setPw(e.target.value)} placeholder="Password baru (min. 8, huruf & angka)" className={inp} /></div>
              <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" /><input data-testid="reset-confirm-password" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Ulangi password baru" className={inp} /></div>
              <button data-testid="reset-submit" disabled={busy} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-sky-600 disabled:opacity-60">{busy ? "Menyimpan..." : "Simpan Password Baru"}</button>
            </form>
          )}
        <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600"><ArrowLeft className="w-4 h-4" />Kembali ke Login</Link>
      </div>
    </div>
  );
}
