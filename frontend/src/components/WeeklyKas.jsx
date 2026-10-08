import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, AlertCircle } from "lucide-react";

const rupiah = (n) => `Rp ${(n || 0).toLocaleString("id-ID")}`;
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });

export function WeeklyKas({ classId, data, canPay, onPay }) {
  const key = `kas-weekly-amount-${classId}`;
  const [amount, setAmount] = useState(() => +localStorage.getItem(key) || 5000);
  const [busyId, setBusyId] = useState(null);
  const [showPaid, setShowPaid] = useState(false);
  if (!data) return null;
  const pay = async (s) => {
    if (!amount || amount <= 0) return toast.error("Isi nominal kas mingguan");
    localStorage.setItem(key, amount);
    setBusyId(s.id);
    try { await onPay(s, amount); } finally { setBusyId(null); }
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" data-testid="weekly-kas-card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-heading font-bold flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-amber-500" />Tagihan Kas Minggu Ini</h3>
          <p className="text-xs text-slate-500 mt-0.5">{fmt(data.week_start)} – {fmt(data.week_end)} · <span data-testid="weekly-kas-summary">{data.paid.length}/{data.total} siswa sudah bayar</span></p>
        </div>
        {canPay && (
          <label className="text-xs text-slate-600 flex items-center gap-2">Nominal / minggu
            <input data-testid="weekly-kas-amount" type="number" value={amount || ""} onChange={e => setAmount(+e.target.value)} className="w-28 px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm" />
          </label>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Belum bayar ({data.unpaid.length})</p>
        {data.unpaid.length === 0 ? (
          <p data-testid="weekly-kas-all-paid" className="mt-2 text-sm text-emerald-600 font-semibold">Semua siswa sudah bayar kas minggu ini.</p>
        ) : (
          <div className="mt-2 grid sm:grid-cols-2 gap-2" data-testid="weekly-kas-unpaid-list">
            {data.unpaid.map(s => (
              <div key={s.id} data-testid={`weekly-unpaid-${s.id}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-100">
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>{s.nisn && <p className="text-[10px] text-slate-500">NISN {s.nisn}</p>}</div>
                {canPay && (
                  <button data-testid={`weekly-pay-${s.id}`} disabled={busyId === s.id} onClick={() => pay(s)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold disabled:opacity-60">
                    {busyId === s.id ? "..." : "Tandai Bayar"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {data.paid.length > 0 && (
        <div className="mt-4">
          <button data-testid="weekly-kas-toggle-paid" onClick={() => setShowPaid(v => !v)} className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Sudah bayar ({data.paid.length}) {showPaid ? "▲" : "▼"}
          </button>
          {showPaid && (
            <div className="mt-2 flex flex-wrap gap-2" data-testid="weekly-kas-paid-list">
              {data.paid.map(s => <span key={s.id} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium">{s.name} · {rupiah(s.amount)}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
