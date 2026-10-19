import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Check, X, ShieldAlert } from "lucide-react";

function Request({ g, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const decide = async (approve) => {
    setBusy(true);
    try { await api.post(`/guests/${g.id}/decision`, { approve, note }); toast.success(approve ? "Tamu disetujui masuk" : "Tamu ditolak"); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-200" data-testid={`approval-${g.id}`}>
      <p className="font-heading font-bold text-slate-900">{g.name} <span className="text-sm font-semibold text-slate-500">· {g.institution}</span></p>
      <p className="text-sm text-slate-600 mt-0.5">Ingin bertemu <b>{g.host || "-"}</b> · {g.purpose}</p>
      <p className="text-xs text-slate-400 mt-0.5">Datang {g.arrival_time || g.visit_time || "-"} · diajukan oleh {g.requested_by || "-"}{g.phone ? ` · HP ${g.phone}` : ""}</p>
      <input data-testid={`approval-note-${g.id}`} value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan (opsional)"
        className="mt-3 w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-amber-500 outline-none" />
      <div className="mt-3 flex gap-2">
        <button data-testid={`approval-approve-${g.id}`} disabled={busy} onClick={() => decide(true)} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"><Check className="w-4 h-4" />Setujui</button>
        <button data-testid={`approval-reject-${g.id}`} disabled={busy} onClick={() => decide(false)} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60"><X className="w-4 h-4" />Tolak</button>
      </div>
    </div>
  );
}

export function ApprovalPanel({ pending, onDone }) {
  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-3" data-testid="approval-panel">
      <p className="font-heading font-bold text-amber-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5" />Permintaan Izin Tamu di Luar Jam Kunjungan ({pending.length})</p>
      {pending.length === 0 && <p className="text-sm text-amber-800/70" data-testid="approval-empty">Tidak ada permintaan yang menunggu.</p>}
      <div className="grid md:grid-cols-2 gap-3">{pending.map(g => <Request key={g.id} g={g} onDone={onDone} />)}</div>
    </div>
  );
}
