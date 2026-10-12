import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";

export function EmailStatusCard() {
  const [st, setSt] = useState(null);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/email/status").then(r => setSt(r.data)).catch(() => {}); }, []);
  if (!st) return null;
  const test = async () => {
    if (!to.trim()) return toast.error("Isi email tujuan");
    setBusy(true);
    try { await api.post("/email/test", { to }); toast.success(`Email tes terkirim ke ${to}`); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal mengirim email tes"); }
    finally { setBusy(false); }
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5" data-testid="email-status-card">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Mail className="w-5 h-5"/></div>
        <div className="flex-1">
          <p className="font-heading font-bold text-slate-900">Notifikasi Email (SMTP)</p>
          <p className="text-xs text-slate-500">Reset password, status PPDB, nilai & rapor, presensi</p>
        </div>
        <span data-testid="email-status-badge" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${st.configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {st.configured ? <CheckCircle2 className="w-3.5 h-3.5"/> : <AlertCircle className="w-3.5 h-3.5"/>}{st.configured ? "Aktif" : "Belum dikonfigurasi"}
        </span>
      </div>
      {st.configured && <>
        <p className="mt-3 text-xs text-slate-500">Pengirim: <b>{st.from_name}</b> &lt;{st.from}&gt; via {st.host}</p>
        <div className="mt-3 flex gap-2">
          <input data-testid="email-test-input" type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="email tujuan tes..."
            className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none"/>
          <button data-testid="email-test-button" disabled={busy} onClick={test} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-60">
            <Send className="w-4 h-4"/>{busy ? "Mengirim..." : "Kirim Tes"}</button>
        </div>
      </>}
    </div>
  );
}
