import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      toast.error("Gagal mengirim permintaan");
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
          <Mail className="w-7 h-7"/>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900">Lupa Password?</h1>
        <p className="mt-1 text-sm text-slate-500">Masukkan email Anda dan kami akan kirim tautan reset password.</p>
        {sent ? (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p className="text-sm text-emerald-800">Jika email terdaftar, tautan reset telah kami kirim. Silakan periksa inbox Anda (juga folder spam).</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input data-testid="forgot-email-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="nama@sekolahku.id"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            <button data-testid="forgot-submit-button" disabled={busy}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Mengirim..." : "Kirim Tautan Reset"}
            </button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800">
          <ArrowLeft className="w-4 h-4"/>Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
