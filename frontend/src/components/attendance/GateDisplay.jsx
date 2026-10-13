import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { LiveScanTable } from "./LiveScanTable";
import { PresenceCard } from "./PresenceCard";

const fmt = (iso) => (iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "");

export function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="text-right">
      <p className="font-heading text-3xl font-extrabold tabular-nums text-slate-900">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
      <p className="text-xs text-slate-500">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}

function Header({ station, onFullscreen, isFull }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Presensi Gerbang · Barcode</p>
        <p data-testid="gate-station-name" className="font-heading text-2xl font-extrabold text-slate-900">{station.name}</p>
        <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Scanner siap{isFull ? " · Live" : ""}</span>
      </div>
      <div className="flex items-start gap-3">
        <Clock />
        <button data-testid="gate-fullscreen-button" onClick={onFullscreen} className="px-3.5 py-2 rounded-full bg-white ring-1 ring-slate-200 hover:ring-sky-400 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-shadow">
          {isFull ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{isFull ? "Keluar Layar Penuh" : "Layar Penuh"}
        </button>
      </div>
    </div>
  );
}

export function GateDisplay({ current, history, station, onFullscreen, isFull, rows = [], stats, newId }) {
  if (isFull) {
    return (
      <div data-testid="gate-display" className="bg-gradient-to-b from-sky-50 to-white p-6 h-screen flex flex-col">
        <Header station={station} onFullscreen={onFullscreen} isFull />
        <div className="h-[46vh] min-h-[320px] shrink-0 max-w-3xl w-full mx-auto"><PresenceCard r={current} mode="barcode" /></div>
        <LiveScanTable rows={rows} stats={stats} newId={newId} />
      </div>
    );
  }
  return (
    <div data-testid="gate-display" className="bg-gradient-to-b from-sky-50 to-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
      <Header station={station} onFullscreen={onFullscreen} isFull={false} />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><PresenceCard r={current} mode="barcode" /></div>
        <div className="bg-white border border-slate-200 rounded-[2rem] p-4" data-testid="gate-history">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Scan Terakhir</p>
          {history.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada scan.</p>}
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.key} className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50">
                <span className="w-10 h-10 rounded-xl overflow-hidden bg-white ring-1 ring-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                  {h.student?.photo ? <img src={h.student.photo} alt="" className="w-full h-full object-cover" /> : (h.student?.name || "!")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{h.student?.name || h.code}</p>
                  <p className="text-[11px] text-slate-500 truncate">{h.student?.kelas || h.message}</p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${h.kind === "ok" ? "bg-emerald-500" : h.kind === "dup" ? "bg-amber-400" : "bg-rose-500"}`} />
                <span className="text-[11px] tabular-nums text-slate-500">{fmt(h.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
