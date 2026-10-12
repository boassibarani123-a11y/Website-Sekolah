import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";

export default function ForgotPassword() {
  const [f, setF] = useState({ email: "", identifier: "", note: "" });
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (f.identifier.trim().length < 4) { toast.error("Isi NISN / NIP / No. WhatsApp yang terdaftar"); return; }
    setBusy(true);
    try {
      const r = await api.post("/auth/forgot-password", f);
      setSent(r.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengirim permintaan");
    } finally { setBusy(false); }
  };
  const inp = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none";
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
          <KeyRound className="w-7 h-7"/>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900">Lupa Password?</h1>
        <p className="mt-1 text-sm text-slate-500">Ajukan permintaan reset. Admin sekolah akan memverifikasi identitas Anda lalu memberikan password sementara.</p>
        {sent ? (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl" data-testid="forgot-success-message">
            <p className="text-sm text-emerald-800 flex gap-2"><ShieldCheck className="w-5 h-5 shrink-0"/>{sent}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input data-testid="forgot-email-input" type="email" required value={f.email} onChange={e=>setF({...f, email: e.target.value})}
              placeholder="Email akun (nama@sekolahku.id)" className={inp}/>
            <div>
              <input data-testid="forgot-identifier-input" required maxLength={30} value={f.identifier} onChange={e=>setF({...f, identifier: e.target.value})}
                placeholder="NISN / NIP / No. WhatsApp terdaftar" className={inp}/>
              <p className="mt-1 text-[11px] text-slate-400">Digunakan untuk verifikasi identitas oleh admin.</p>
            </div>
            <textarea data-testid="forgot-note-input" rows={2} maxLength={300} value={f.note} onChange={e=>setF({...f, note: e.target.value})}
              placeholder="Catatan untuk admin (opsional)" className={inp}/>
            <button data-testid="forgot-submit-button" disabled={busy}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Mengirim..." : "Ajukan Permintaan Reset"}
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
