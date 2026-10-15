import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X } from "lucide-react";

function Shell({ title, onClose, children, testid }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid={testid}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b"><h3 className="font-heading font-bold">{title}</h3>
          {onClose && <button data-testid={`${testid}-close`} onClick={onClose}><X className="w-5 h-5"/></button>}</div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none";

export function ResetApproveModal({ req, onClose, onDone }) {
  const [verified, setVerified] = useState(false);
  const [method, setMethod] = useState("Tatap muka dengan kartu identitas");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/admin/reset-requests/${req.id}/approve`, { identity_verified: verified, verification_method: method });
      toast.success("Permintaan disetujui"); onDone({ ...r.data, name: req.name });
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyetujui"); setBusy(false); }
  };
  return (
    <Shell title="Setujui Reset Password" onClose={onClose} testid="reset-approve-modal">
      <p className="text-sm text-slate-600">Akun: <b>{req.name}</b> ({req.email})</p>
      {!req.identity_match && <p className="text-xs text-rose-700 bg-rose-50 rounded-lg p-2">Identitas yang diisi pengguna tidak cocok dengan data akun. Pastikan verifikasi langsung dilakukan dengan teliti.</p>}
      <label className="block text-xs font-semibold text-slate-600">Metode verifikasi</label>
      <input data-testid="reset-verify-method-input" value={method} onChange={e => setMethod(e.target.value)} className={inp}/>
      <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
        <input data-testid="reset-verify-checkbox" type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="mt-1 accent-emerald-600"/>
        Saya sudah memverifikasi identitas pemilik akun secara langsung.
      </label>
      <button data-testid="reset-approve-submit" disabled={!verified || method.trim().length < 3 || busy} onClick={submit}
        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50">{busy ? "Memproses..." : "Setujui & Buat Password Sementara"}</button>
    </Shell>
  );
}

export function ResetRejectModal({ req, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const submit = async () => {
    try { await api.post(`/admin/reset-requests/${req.id}/reject`, { reason }); toast.success("Permintaan ditolak"); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menolak"); }
  };
  return (
    <Shell title="Tolak Permintaan" onClose={onClose} testid="reset-reject-modal">
      <p className="text-sm text-slate-600">Akun: <b>{req.name}</b> ({req.email})</p>
      <textarea data-testid="reset-reject-reason" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan penolakan..." className={inp}/>
      <button data-testid="reset-reject-submit" disabled={reason.trim().length < 3} onClick={submit} className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-50">Tolak Permintaan</button>
    </Shell>
  );
}

export function TempPasswordModal({ data, onClose, CopyIcon }) {
  return (
    <Shell title="Password Sementara" testid="temp-password-modal">
      <p className="text-sm text-slate-600">Berikan password ini secara langsung kepada <b>{data.name}</b> ({data.email}).</p>
      <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl">
        <code data-testid="temp-password-value" className="flex-1 text-lg font-mono font-bold text-emerald-300 tracking-wider select-all">{data.temp_password}</code>
        <button data-testid="temp-password-copy" onClick={() => { navigator.clipboard?.writeText(data.temp_password); toast.success("Disalin"); }} className="p-2 text-white hover:bg-white/10 rounded-lg"><CopyIcon className="w-4 h-4"/></button>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">Hanya ditampilkan SEKALI dan tidak disimpan di sistem. Berlaku sampai {new Date(data.expires_at).toLocaleTimeString("id-ID")} (30 menit). Pengguna wajib menggantinya saat login.</p>
      <button data-testid="temp-password-done" onClick={onClose} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Selesai, sudah saya berikan</button>
    </Shell>
  );
}

const ACTIONS = { reset_requested: "Permintaan reset", reset_approved: "Reset disetujui", reset_rejected: "Reset ditolak",
  password_changed: "Password diganti", login_locked: "Login dikunci (5x gagal)" };

export function AuditLogList() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/audit-logs?limit=200").then(r => setLogs(r.data)).catch(() => {}); }, []);
  return (
    <div className="bg-white border border-slate-200 rounded-xl divide-y" data-testid="audit-log-list">
      {logs.length === 0 && <p className="p-4 text-slate-400 italic">Belum ada log.</p>}
      {logs.map(l => (
        <div key={l.id} className="p-3 flex items-center justify-between gap-3 text-sm flex-wrap">
          <span className="font-semibold text-slate-800">{ACTIONS[l.action] || l.action}</span>
          <span className="text-slate-600 flex-1">{l.actor_name ? `oleh ${l.actor_name}` : ""}{l.target_name ? ` · akun ${l.target_name}` : ""}</span>
          <span className="text-xs text-slate-400">{l.ip} · {new Date(l.created_at).toLocaleString("id-ID")}</span>
        </div>
      ))}
    </div>
  );
}
