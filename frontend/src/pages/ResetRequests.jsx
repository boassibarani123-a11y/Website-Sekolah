import { PageHeader, StatStrip, UnderlineTabs } from "@/components/zx/ui";
import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ShieldAlert, Check, X, History, CheckCheck, Inbox } from "lucide-react";
import { ResetRejectModal, AuditLogList } from "@/components/reset/ResetModals";

const STATUS = {
  pending: { l: "Menunggu", c: "bg-amber-100 text-amber-700" },
  approved: { l: "Disetujui", c: "bg-emerald-100 text-emerald-700" },
  rejected: { l: "Ditolak", c: "bg-rose-100 text-rose-700" },
};

function RequestCard({ r, onApprove, onReject }) {
  return (
    <div data-testid={`reset-request-${r.id}`} className="group bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap hover:shadow-md hover:border-slate-300 transition-[box-shadow,border-color]">
      <div className="flex items-center gap-4 min-w-0">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-heading font-extrabold text-lg flex items-center justify-center shrink-0">{(r.name || "?")[0]}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading font-bold text-slate-900">{r.name}</p>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">{r.role}{r.kelas ? ` · ${r.kelas}` : ""}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS[r.status]?.c}`} data-testid={`reset-status-${r.id}`}>{STATUS[r.status]?.l}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{r.email}</p>
          <p className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${r.identity_match ? "text-emerald-700" : "text-rose-600"}`} data-testid={`reset-identity-${r.id}`}>
            {r.identity_match ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}{r.identity_match ? "Email + NISN cocok" : "Identitas tidak cocok"} ({r.identifier_hint})
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Diajukan {new Date(r.updated_at || r.created_at).toLocaleString("id-ID")}{r.processed_by && ` · Diproses ${r.processed_by}`}{r.reject_reason && ` · Alasan: ${r.reject_reason}`}</p>
        </div>
      </div>
      {r.status === "pending" && (
        <div className="flex gap-2">
          <button data-testid={`reset-reject-${r.id}`} onClick={() => onReject(r)} className="px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:border-rose-400 hover:text-rose-600 transition-colors"><X className="w-4 h-4" />Tolak</button>
          <button data-testid={`reset-approve-${r.id}`} onClick={() => onApprove(r)} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors"><Check className="w-4 h-4" />Setujui</button>
        </div>
      )}
    </div>
  );
}

export default function ResetRequests() {
  const [list, setList] = useState([]);
  const [tab, setTab] = useState("pending");
  const [rejectFor, setRejectFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => {
    if (tab === "audit") return;
    api.get(`/admin/reset-requests${tab === "all" ? "" : `?status=${tab}`}`).then(r => setList(r.data)).catch(() => toast.error("Gagal memuat permintaan"));
  };
  useEffect(load, [tab]); // eslint-disable-line
  const approve = async (r) => {
    if (!window.confirm(`Setujui password baru untuk ${r.name}?`)) return;
    try { await api.post(`/admin/reset-requests/${r.id}/approve`, {}); toast.success("Password baru diaktifkan"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyetujui"); }
  };
  const approveAll = async () => {
    if (!window.confirm("Setujui semua permintaan yang identitasnya cocok?")) return;
    setBusy(true);
    try { const r = await api.post("/admin/reset-requests/approve-all"); toast.success(`${r.data.approved} permintaan disetujui${r.data.skipped ? `, ${r.data.skipped} perlu ditinjau manual` : ""}`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };
  const pending = list.filter(r => r.status === "pending").length;
  return (
    <div className="space-y-6" data-testid="reset-requests-page">
      <PageHeader title="Permintaan Reset Password" subtitle="Pengguna sudah membuat password baru sendiri. Password baru aktif setelah Anda menyetujuinya."
        actions={tab === "pending" && pending > 0 && <button data-testid="reset-approve-all" disabled={busy} onClick={approveAll} className="zx-btn-primary disabled:opacity-60"><CheckCheck className="w-4 h-4" />Setujui semua ({pending})</button>}/>
      <StatStrip items={[
        { label: "Menunggu persetujuan", value: pending, hint: "Perlu ditinjau" },
        { label: "Disetujui", value: list.filter(r => r.status === "approved").length, hint: "Pada daftar saat ini" },
        { label: "Ditolak", value: list.filter(r => r.status === "rejected").length, hint: "Pada daftar saat ini" },
      ]}/>
      <UnderlineTabs value={tab} onChange={setTab} testid="reset-tab" tabs={[["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"], ["all", "Semua"], ["audit", "Audit log", History]]}/>
      {tab === "audit" ? <AuditLogList /> : (
        <div className="space-y-3">
          {list.length === 0 && <div data-testid="reset-empty" className="py-16 text-center text-slate-400"><Inbox className="w-12 h-12 mx-auto text-slate-300" /><p className="mt-3">Tidak ada permintaan.</p></div>}
          {list.map(r => <RequestCard key={r.id} r={r} onApprove={approve} onReject={setRejectFor} />)}
        </div>
      )}
      {rejectFor && <ResetRejectModal req={rejectFor} onClose={() => setRejectFor(null)} onDone={() => { setRejectFor(null); load(); }} />}
    </div>
  );
}
