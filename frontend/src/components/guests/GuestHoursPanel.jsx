import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";
import { DAY_NAMES } from "./guestMeta";

export function GuestHoursPanel({ hours, onSaved }) {
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (hours) setF({ start: hours.start, end: hours.end, days: hours.days, note: hours.note || "" }); }, [hours]);
  if (!f) return null;
  const toggleDay = (d) => setF({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] });
  const save = async () => {
    setBusy(true);
    try { const r = await api.put("/guest-hours", f); toast.success("Jam kunjungan disimpan"); onSaved(r.data); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); } finally { setBusy(false); }
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4" data-testid="guest-hours-panel">
      <p className="font-heading font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-600" />Pengaturan Jam Kunjungan</p>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs font-bold uppercase text-slate-500">Mulai<input data-testid="guest-hours-start" type="time" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} className="block mt-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm" /></label>
        <label className="text-xs font-bold uppercase text-slate-500">Selesai<input data-testid="guest-hours-end" type="time" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} className="block mt-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm" /></label>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_NAMES.map((n, i) => (
            <button key={n} type="button" data-testid={`guest-hours-day-${i + 1}`} onClick={() => toggleDay(i + 1)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${f.days.includes(i + 1) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>{n.slice(0, 3)}</button>
          ))}
        </div>
      </div>
      <textarea data-testid="guest-hours-note" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} rows={2} placeholder="Aturan kunjungan"
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm" />
      <button data-testid="guest-hours-save" disabled={busy} onClick={save} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" />Simpan Jam Kunjungan</button>
    </div>
  );
}
