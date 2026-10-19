import { useState } from "react";
import { toast } from "sonner";
import { Check, Ban, Undo2, User, Search, CalendarClock } from "lucide-react";
import api from "@/lib/apiClient";
import { ROLE_LABEL, loanLabel, UnitChips, UnitBadge } from "./invUi";
import { ReturnModal } from "./ItemForms";

const FILTERS = ["Semua", "Menunggu Approval", "Disetujui", "Terlambat", "Dikembalikan", "Ditolak"];

export function LoansView({ reqs, isStaff, onChange }) {
  const [f, setF] = useState("Semua");
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("all");
  const uOf = (r) => r.unit || "Umum";
  const [returning, setReturning] = useState(null);
  const act = async (id, status) => {
    try { await api.patch(`/borrow/${id}?status=${status}`); toast.success(`Permintaan ${status === "Disetujui" ? "disetujui" : "ditolak"}`); onChange(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const match = (r) => f === "Semua" || (f === "Terlambat" ? loanLabel(r).late : r.status === f);
  const unitCounts = reqs.reduce((a, r) => ({ ...a, all: a.all + 1, [uOf(r)]: (a[uOf(r)] || 0) + 1 }), { all: 0 });
  const list = reqs.filter(r => (unit === "all" || uOf(r) === unit) && match(r) && (!q || `${r.item_name} ${r.requester_name}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s) => reqs.filter(r => s === "Semua" || (s === "Terlambat" ? loanLabel(r).late : r.status === s)).length;
  return (
    <div className="space-y-4">
      <UnitChips value={unit} onChange={setUnit} counts={unitCounts} testid="borrow-unit-filter" />
      <div className="flex gap-2 flex-wrap items-center" data-testid="borrow-status-filter">
        {FILTERS.map(s => (
          <button key={s} data-testid={`borrow-filter-${s.replace(/\s/g, "-")}`} onClick={() => setF(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${f === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"}`}>
            {s === "Disetujui" ? "Dipinjam" : s} ({count(s)})</button>
        ))}
        <label className="ml-auto flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3.5 py-2"><Search className="w-4 h-4 text-slate-400" />
          <input data-testid="borrow-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari barang / peminjam" className="outline-none text-sm w-44" /></label>
      </div>
      {list.length === 0 && <p className="text-slate-400 italic py-8 text-center">Belum ada permintaan.</p>}
      <div className="grid lg:grid-cols-2 gap-3">
        {list.map(r => { const l = loanLabel(r); return (
          <div key={r.id} data-testid={`borrow-request-${r.id}`} className={`bg-white border rounded-3xl p-5 ${l.late ? "border-rose-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading font-bold text-slate-900">{r.item_name} <span className="text-slate-400 text-sm font-normal">× {r.quantity}</span></p>
                {uOf(r) !== "Umum" && <div className="mt-1 flex items-center gap-2 flex-wrap"><UnitBadge u={uOf(r)} testid={`borrow-unit-${r.id}`} />
                  {r.use_date && <span data-testid={`borrow-lab-session-${r.id}`} className="text-[11px] font-semibold text-slate-600">{r.subject} · {r.use_date} {r.start_time}–{r.end_time}</span>}</div>}
                <div className="mt-1.5 flex items-center gap-2 flex-wrap" data-testid={`borrower-info-${r.id}`}>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold"><User className="w-3 h-3" />{r.requester_name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">{ROLE_LABEL[r.requester_role] || r.requester_role || "—"}</span>
                  {r.requester_kelas && <span className="text-[11px] text-slate-500">Kelas {r.requester_kelas}</span>}
                </div>
              </div>
              <span data-testid={`borrow-status-${r.id}`} className={`px-2.5 py-1 text-xs font-semibold rounded-full border shrink-0 ${l.cls}`}>{l.label}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">{r.purpose}</p>
            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />Diajukan {(r.created_at || "").slice(0, 10)} · Kembali {r.return_date}{r.return_condition ? ` · Kondisi kembali: ${r.return_condition}` : ""}</p>
            {isStaff && (r.status === "Menunggu Approval" || r.status === "Disetujui") && (
              <div className="mt-4 flex gap-2">
                {r.status === "Menunggu Approval" && <>
                  <button data-testid={`borrow-approve-${r.id}`} onClick={() => act(r.id, "Disetujui")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" />Setujui</button>
                  <button data-testid={`borrow-reject-${r.id}`} onClick={() => act(r.id, "Ditolak")} className="flex-1 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><Ban className="w-4 h-4" />Tolak</button>
                </>}
                {r.status === "Disetujui" && <button data-testid={`borrow-return-${r.id}`} onClick={() => setReturning(r)} className="flex-1 py-2 bg-slate-900 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><Undo2 className="w-4 h-4" />Catat Pengembalian</button>}
              </div>
            )}
          </div>); })}
      </div>
      {returning && <ReturnModal loan={returning} onClose={() => setReturning(null)} onDone={() => { setReturning(null); onChange(); }} />}
    </div>
  );
}
