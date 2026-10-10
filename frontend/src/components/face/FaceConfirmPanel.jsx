import { useEffect, useRef, useState } from "react";
import { Users, Hash, X, Loader2, UserRound } from "lucide-react";

// Muncul saat 2+ siswa berwajah sangat mirip: operator/siswa scan barcode atau ketik NISN untuk memastikan.
export function FaceConfirmPanel({ candidates, onSubmit, onCancel }) {
  const [nisn, setNisn] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const submit = async (e) => {
    e?.preventDefault();
    if (!nisn.trim() || busy) return;
    setBusy(true);
    await onSubmit(nisn.trim());
    setBusy(false); setNisn("");
  };
  return (
    <div data-testid="face-confirm-panel" className="h-full min-h-[320px] rounded-3xl bg-amber-500/10 ring-2 ring-amber-400/60 p-6 flex flex-col animate-in zoom-in-95 fade-in duration-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5"><Users className="w-4 h-4" />Wajah Mirip Terdeteksi</p>
          <p className="font-heading text-xl font-extrabold mt-1">Konfirmasi dengan NISN</p>
          <p className="text-sm text-slate-300 mt-0.5">Scan barcode kartu pelajar atau ketik NISN siswa.</p>
        </div>
        <button data-testid="face-confirm-cancel" onClick={onCancel} className="p-2 rounded-xl bg-white/10 hover:bg-white/20"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        {candidates.map((c) => (
          <div key={c.id} data-testid={`face-candidate-${c.id}`} className="rounded-2xl bg-white/5 p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-2 ring-amber-400/50">
              {c.face_photo || c.photo ? <img src={c.face_photo || c.photo} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-6 h-6 text-slate-400" />}
            </div>
            <div className="min-w-0"><p className="font-semibold text-sm truncate">{c.name}</p><p className="text-[11px] text-slate-400">{c.kelas || "—"}</p></div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-auto pt-4 flex gap-2">
        <label className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-3 focus-within:ring-2 ring-amber-400">
          <Hash className="w-4 h-4 text-amber-300" />
          <input ref={ref} data-testid="face-confirm-nisn" value={nisn} onChange={(e) => setNisn(e.target.value)} placeholder="NISN / scan barcode" inputMode="numeric"
            className="bg-transparent outline-none py-3 w-full text-white placeholder:text-slate-500 font-mono" />
        </label>
        <button data-testid="face-confirm-submit" disabled={busy} className="px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-2 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}Konfirmasi
        </button>
      </form>
    </div>
  );
}
