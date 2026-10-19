import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Hash, Check, UserCheck } from "lucide-react";

const PILL = { hadir: "bg-emerald-600", izin: "bg-sky-600", sakit: "bg-amber-500", alpa: "bg-rose-600" };

export function ManualPanel({ station, onDone }) {
  const [status, setStatus] = useState("hadir");
  const [nisn, setNisn] = useState("");
  const [last, setLast] = useState(null);

  const submit = async () => {
    if (!nisn) return;
    try {
      const r = await api.post("/attendance/scan", { nisn, method: "manual", status, station_id: station.id, station_name: station.name });
      setLast({ ...r.data.student, status, at: new Date() });
      toast.success(`${r.data.student.name} - ${status.toUpperCase()}`);
      setNisn("");
      onDone?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal absen");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full" data-testid="manual-panel">
      <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2"><Hash className="w-5 h-5 text-sky-600"/>Absensi Manual (NISN)</h2>
      <div className="flex gap-2 mb-4">
        {Object.keys(PILL).map(s => (
          <button key={s} onClick={() => setStatus(s)} data-testid={`att-status-${s}`}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase transition-colors ${status === s ? "bg-sky-600 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>
        ))}
      </div>
      <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Hash className="w-3 h-3"/>Input Manual NISN (jika kartu hilang / QR error)</label>
      <div className="mt-1.5 flex gap-2">
        <input value={nisn} onChange={e => setNisn(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="mis. 0099887766"
          data-testid="manual-nisn-input" className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-sm bg-white"/>
        <button data-testid="manual-nisn-submit" onClick={submit}
          className="px-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-1"><Check className="w-4 h-4"/></button>
      </div>
      {last && (
        <div data-testid="recognition-panel" className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5"/>Siswa Dikenali</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-heading font-extrabold text-lg overflow-hidden">
              {last.photo ? <img src={last.photo} alt={last.name} className="w-full h-full object-cover"/> : (last.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p data-testid="recognition-name" className="font-heading font-bold text-slate-900 truncate">{last.name}</p>
              <p className="text-xs text-slate-600">{last.kelas || "-"}{last.nisn ? ` · NISN ${last.nisn}` : ""}</p>
            </div>
            <span className={`ml-auto px-2.5 py-1 text-[10px] font-bold uppercase rounded-full text-white ${PILL[last.status]}`}>{last.status}</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-700/70">Tercatat {last.at.toLocaleTimeString("id-ID")}</p>
        </div>
      )}
    </div>
  );
}
