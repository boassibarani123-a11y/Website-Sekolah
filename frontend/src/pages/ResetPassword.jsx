import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = sp.get("token") || "";
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Password tidak cocok"); return; }
    if (password.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Password berhasil direset. Silakan login.");
      setTimeout(() => nav("/login"), 1200);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Token tidak valid");
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
          <KeyRound className="w-7 h-7"/>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900">Reset Password</h1>
        <p className="mt-1 text-sm text-slate-500">Buat password baru untuk akun Anda.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input data-testid="reset-password-input" type="password" required value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Password baru (min. 6 karakter)"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          <input data-testid="reset-confirm-input" type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)}
            placeholder="Konfirmasi password baru"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          <button data-testid="reset-submit-button" disabled={busy}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
            {busy ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
        <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800">
          <ArrowLeft className="w-4 h-4"/>Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
