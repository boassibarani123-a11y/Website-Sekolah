import { useEffect, useState } from "react";
import { ScanBarcode, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { LiveScanTable } from "./LiveScanTable";

const fmt = (iso) => (iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "");

const STYLE = {
  ok: { bg: "bg-emerald-600", ring: "ring-emerald-300", label: "MASUK", Icon: CheckCircle2 },
  dup: { bg: "bg-amber-500", ring: "ring-amber-200", label: "SUDAH ABSEN", Icon: AlertTriangle },
  err: { bg: "bg-rose-600", ring: "ring-rose-300", label: "DITOLAK", Icon: XCircle },
};

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="text-right">
      <p className="font-heading text-4xl font-extrabold tabular-nums">{now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
      <p className="text-xs text-slate-400">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
    </div>
  );
}

function ResultCard({ r }) {
  if (!r) {
    return (
      <div data-testid="gate-idle" className="h-full min-h-[320px] rounded-3xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
        <div className="absolute inset-x-10 h-0.5 bg-sky-400/70 shadow-[0_0_20px_#38bdf8] animate-[gateScan_2.4s_ease-in-out_infinite]"/>
        <ScanBarcode className="w-20 h-20 text-sky-400"/>
        <p className="mt-4 font-heading text-3xl font-extrabold">Silakan Scan Kartu Pelajar</p>
        <p className="mt-2 text-slate-400">Arahkan barcode NISN ke alat scanner</p>
      </div>
    );
  }
  const s = STYLE[r.kind];
  return (
    <div data-testid="gate-result" data-kind={r.kind} className={`${s.bg} h-full min-h-[320px] rounded-3xl p-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 fade-in duration-200`}>
      <div className={`w-32 h-32 shrink-0 aspect-square rounded-full bg-white/20 ring-8 ${s.ring} overflow-hidden flex items-center justify-center text-5xl font-extrabold`}>
        {r.student?.photo ? <img src={r.student.photo} alt="" className="w-full h-full object-cover"/> : r.student ? (r.student.name || "?")[0].toUpperCase() : <s.Icon className="w-16 h-16"/>}
      </div>
      <p data-testid="gate-result-label" className="mt-5 font-heading text-5xl font-black tracking-wide flex items-center gap-3"><s.Icon className="w-10 h-10"/>{s.label}</p>
      {r.student ? (
        <>
          <p data-testid="gate-result-name" className="mt-3 font-heading text-3xl font-extrabold">{r.student.name}</p>
          <p className="mt-1 text-lg text-white/85">{r.student.kelas ? `Kelas ${r.student.kelas} · ` : ""}NISN {r.student.nisn || r.code}</p>
          <p className="mt-3 px-4 py-1.5 rounded-full bg-black/20 font-semibold">{r.kind === "dup" ? `Sudah tercatat pukul ${fmt(r.at)}` : `Tercatat pukul ${fmt(r.at)}`}</p>
        </>
      ) : (
        <p data-testid="gate-result-error" className="mt-3 text-xl font-semibold">{r.message} <span className="font-mono opacity-80">({r.code})</span></p>
      )}
    </div>
  );
}

export function GateDisplay({ current, history, station, onFullscreen, isFull, rows = [], stats, newId }) {
  if (isFull) {
    return (
      <div data-testid="gate-display" className="bg-slate-950 text-white p-6 h-screen flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Presensi Gerbang</p>
            <p data-testid="gate-station-name" className="font-heading text-2xl font-extrabold">{station.name}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>Scanner siap · Live</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock/>
            <button data-testid="gate-fullscreen-button" onClick={onFullscreen} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">Keluar Layar Penuh</button>
          </div>
        </div>
        <div className="h-[38vh] min-h-[280px] shrink-0"><ResultCard r={current}/></div>
        <LiveScanTable rows={rows} stats={stats} newId={newId}/>
      </div>
    );
  }
  return (
    <div data-testid="gate-display" className="bg-slate-950 text-white rounded-3xl p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Presensi Gerbang</p>
          <p data-testid="gate-station-name" className="font-heading text-2xl font-extrabold">{station.name}</p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>Scanner siap</span>
        </div>
        <div className="flex items-start gap-3">
          <Clock/>
          <button data-testid="gate-fullscreen-button" onClick={onFullscreen} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">{isFull ? "Keluar Layar Penuh" : "Layar Penuh"}</button>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2"><ResultCard r={current}/></div>
        <div className="bg-white/5 rounded-3xl p-4" data-testid="gate-history">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Scan Terakhir</p>
          {history.length === 0 && <p className="text-sm text-slate-500 italic">Belum ada scan.</p>}
          <ul className="space-y-2">
            {history.map(h => (
              <li key={h.key} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${h.kind === "ok" ? "bg-emerald-400" : h.kind === "dup" ? "bg-amber-400" : "bg-rose-500"}`}/>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{h.student?.name || h.code}</p>
                  <p className="text-[11px] text-slate-400 truncate">{h.student?.kelas || h.message}</p>
                </div>
                <span className="text-[11px] tabular-nums text-slate-400">{fmt(h.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
