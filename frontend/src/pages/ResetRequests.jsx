import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, ShieldAlert, Check, X, Copy, History } from "lucide-react";
import { ResetApproveModal, ResetRejectModal, TempPasswordModal, AuditLogList } from "@/components/reset/ResetModals";

const STATUS = {
  pending: { l: "Pending", c: "bg-amber-100 text-amber-700" },
  approved: { l: "Disetujui", c: "bg-emerald-100 text-emerald-700" },
  rejected: { l: "Ditolak", c: "bg-rose-100 text-rose-700" },
};

export default function ResetRequests() {
  const [list, setList] = useState([]);
  const [tab, setTab] = useState("pending");
  const [approveFor, setApproveFor] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [issued, setIssued] = useState(null);
  const load = () => {
    if (tab === "audit") return;
    api.get(`/admin/reset-requests${tab === "all" ? "" : `?status=${tab}`}`).then(r => setList(r.data)).catch(() => toast.error("Gagal memuat permintaan"));
  };
  useEffect(load, [tab]); // eslint-disable-line
  return (
    <div className="space-y-6" data-testid="reset-requests-page">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2"><KeyRound className="w-7 h-7 text-sky-600"/>Permintaan Reset Password</h1>
        <p className="mt-1 text-sm text-slate-500">Verifikasi identitas pengguna secara langsung sebelum menyetujui. Password sementara berlaku 30 menit dan wajib diganti saat login.</p>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[["pending","Pending"],["approved","Disetujui"],["rejected","Ditolak"],["all","Semua"],["audit","Audit Log"]].map(([k,l]) => (
          <button key={k} data-testid={`reset-tab-${k}`} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${tab===k ? "bg-slate-900 text-white" : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-400"}`}>
            {k === "audit" && <History className="w-3.5 h-3.5"/>}{l}</button>
        ))}
      </div>
      {tab === "audit" ? <AuditLogList/> : (
        <div className="space-y-3">
          {list.length === 0 && <p data-testid="reset-empty" className="text-slate-400 italic">Tidak ada permintaan.</p>}
          {list.map(r => (
            <div key={r.id} data-testid={`reset-request-${r.id}`} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900">{r.name}</p>
                  <span className="text-xs text-slate-500">{r.email}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold">{r.role}{r.kelas ? ` · ${r.kelas}` : ""}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS[r.status]?.c}`} data-testid={`reset-status-${r.id}`}>{STATUS[r.status]?.l}</span>
                </div>
                <p className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${r.identity_match ? "text-emerald-700" : "text-rose-600"}`} data-testid={`reset-identity-${r.id}`}>
                  {r.identity_match ? <ShieldCheck className="w-4 h-4"/> : <ShieldAlert className="w-4 h-4"/>}
                  {r.identity_match ? "Identitas cocok" : "Identitas TIDAK cocok"} ({r.identifier_hint})
                </p>
                {r.note && <p className="mt-1 text-xs text-slate-600">Catatan: {r.note}</p>}
                <p className="mt-1 text-[11px] text-slate-400">Diajukan {new Date(r.updated_at || r.created_at).toLocaleString("id-ID")}
                  {r.processed_by && ` · Diproses ${r.processed_by}`}{r.verification_method && ` (${r.verification_method})`}{r.reject_reason && ` · Alasan: ${r.reject_reason}`}</p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button data-testid={`reset-approve-${r.id}`} onClick={() => setApproveFor(r)} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-emerald-700"><Check className="w-4 h-4"/>Setujui</button>
                  <button data-testid={`reset-reject-${r.id}`} onClick={() => setRejectFor(r)} className="px-3 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-rose-700"><X className="w-4 h-4"/>Tolak</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {approveFor && <ResetApproveModal req={approveFor} onClose={() => setApproveFor(null)} onDone={(d) => { setApproveFor(null); setIssued(d); load(); }}/>}
      {rejectFor && <ResetRejectModal req={rejectFor} onClose={() => setRejectFor(null)} onDone={() => { setRejectFor(null); load(); }}/>}
      {issued && <TempPasswordModal data={issued} onClose={() => setIssued(null)} CopyIcon={Copy}/>}
    </div>
  );
}
