import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { KeyRound, ArrowLeft, ShieldCheck, Eye, EyeOff, Mail, Hash, Lock, Clock } from "lucide-react";

function Field({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
      {children}
    </div>
  );
}

function EmailReset() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await api.post("/auth/forgot-password/email", { email }); setMsg(r.data.message); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mengirim tautan"); }
    finally { setBusy(false); }
  };
  if (msg) return <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center text-sm text-emerald-900" data-testid="forgot-email-sent"><Mail className="w-10 h-10 text-emerald-500 mx-auto mb-3" />{msg}</div>;
  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <Field icon={Mail}><input data-testid="forgot-email-only-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email akun" className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-sky-500 outline-none" /></Field>
      <button data-testid="forgot-email-submit" disabled={busy} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-sky-600 disabled:opacity-60">{busy ? "Mengirim..." : "Kirim Tautan Reset ke Email"}</button>
    </form>
  );
}

const strength = (p) => [p.length >= 8, /[A-Za-z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p) || p.length >= 12].filter(Boolean).length;

export default function ForgotPassword() {
  const [f, setF] = useState({ email: "", identifier: "", new_password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState(null);
  const [mode, setMode] = useState("admin");
  useEffect(() => { api.get("/auth/reset-options").then(r => { setOpts(r.data); if (r.data.email_reset) setMode("email"); }).catch(() => setOpts({ email_reset: false })); }, []);
  const st = strength(f.new_password);
  const submit = async e => {
    e.preventDefault();
    if (f.new_password !== f.confirm) return toast.error("Konfirmasi password tidak sama");
    if (st < 3) return toast.error("Password minimal 8 karakter dengan huruf dan angka");
    setBusy(true);
    try {
      const r = await api.post("/auth/forgot-password", { email: f.email, identifier: f.identifier, new_password: f.new_password });
      setSent(r.data.message);
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal mengirim permintaan"); }
    finally { setBusy(false); }
  };
  const inp = "w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-colors";
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex relative overflow-hidden bg-slate-950 text-white p-14 flex-col justify-between">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3"><img src="/school-logo.png" alt="" className="w-11 h-11 object-contain" /><p className="font-heading font-bold">SMA NEGERI 1 LAGUBOTI</p></div>
        <div className="relative">
          <h2 className="font-heading text-5xl font-extrabold leading-tight">Ubah password,<br /><span className="text-sky-400">tetap aman.</span></h2>
          <div className="mt-10 space-y-5">
            {[[Mail, "Isi email dan NISN akun Anda"], [Lock, "Buat password baru sesuai keinginan"], [Clock, "Super Admin menyetujui permintaan"], [ShieldCheck, "Login dengan password baru"]].map(([I, t], i) => (
              <div key={t} className="flex items-center gap-4"><span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><I className="w-5 h-5 text-sky-300" /></span><span className="text-slate-300"><b className="text-white mr-2">0{i + 1}</b>{t}</span></div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">Password lama tetap berlaku sampai permintaan disetujui.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md" data-testid="forgot-page">
          <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/30"><KeyRound className="w-7 h-7" /></div>
          <h1 className="mt-6 font-heading text-3xl font-extrabold text-slate-900">Lupa Password?</h1>
          <p className="mt-2 text-sm text-slate-500">Buat password baru Anda. Password akan aktif setelah disetujui Super Admin.</p>
          {opts && (opts.email_reset ? (
            <div className="mt-6 inline-flex p-1 bg-white border border-slate-200 rounded-2xl" data-testid="forgot-mode-tabs">
              {[["email", "Via Email"], ["admin", "Via Super Admin"]].map(([k, l]) => <button key={k} type="button" data-testid={`forgot-mode-${k}`} onClick={() => setMode(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === k ? "bg-slate-900 text-white" : "text-slate-500"}`}>{l}</button>)}
            </div>
          ) : <p data-testid="forgot-email-not-configured" className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Reset via email belum dikonfigurasi — permintaan diproses oleh Super Admin.</p>)}
          {mode === "email" ? <EmailReset /> : sent ? (
            <div className="mt-8 p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center" data-testid="forgot-success-message">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto"><Clock className="w-8 h-8" /></div>
              <p className="mt-4 font-heading font-bold text-lg text-emerald-900">Menunggu Persetujuan</p>
              <p className="mt-1 text-sm text-emerald-800">{sent}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <Field icon={Mail}><input data-testid="forgot-email-input" type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Email akun" className={inp} /></Field>
              <Field icon={Hash}><input data-testid="forgot-identifier-input" required maxLength={30} value={f.identifier} onChange={e => setF({ ...f, identifier: e.target.value })} placeholder="NISN (guru/staff: NIP)" className={inp} /></Field>
              <Field icon={Lock}>
                <input data-testid="forgot-new-password-input" type={show ? "text" : "password"} required value={f.new_password} onChange={e => setF({ ...f, new_password: e.target.value })} placeholder="Password baru" className={`${inp} pr-12`} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </Field>
              <div className="flex gap-1.5" data-testid="forgot-strength">{[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < st ? ["bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"][st - 1] : "bg-slate-200"}`} />)}</div>
              <Field icon={Lock}><input data-testid="forgot-confirm-password-input" type={show ? "text" : "password"} required value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} placeholder="Ulangi password baru" className={inp} /></Field>
              <button data-testid="forgot-submit-button" disabled={busy} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-sky-600 disabled:opacity-60 transition-colors">{busy ? "Mengirim..." : "Kirim Permintaan Ubah Password"}</button>
            </form>
          )}
          <Link to="/login" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-800"><ArrowLeft className="w-4 h-4" />Kembali ke Login</Link>
        </div>
      </div>
    </div>
  );
}
