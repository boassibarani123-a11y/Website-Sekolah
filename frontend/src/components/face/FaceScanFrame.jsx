import { Loader2, CameraOff, RefreshCw, Check } from "lucide-react";

const TONES = {
  searching: { c: "#38bdf8", pill: "bg-white text-slate-700" },
  scanning: { c: "#34d399", pill: "bg-emerald-500 text-white" },
  success: { c: "#10b981", pill: "bg-emerald-500 text-white" },
  confirm: { c: "#fbbf24", pill: "bg-amber-400 text-amber-950" },
  fail: { c: "#f43f5e", pill: "bg-rose-500 text-white" },
};

function Corners({ color, pulse }) {
  const d = ["M8 30 V14 a6 6 0 0 1 6 -6 H30", "M70 8 H86 a6 6 0 0 1 6 6 V30", "M92 70 V86 a6 6 0 0 1 -6 6 H70", "M30 92 H14 a6 6 0 0 1 -6 -6 V70"];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`absolute inset-[7%] w-[86%] h-[86%] pointer-events-none ${pulse ? "animate-[faceBreath_2.4s_ease-in-out_infinite]" : ""}`}>
      {d.map((p, i) => <path key={i} d={p} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ transition: "stroke 200ms" }} />)}
    </svg>
  );
}

export function FaceScanFrame({ videoRef, canvasRef, state, error, onRetry, progress = 0, status = "searching", hint, sub, children }) {
  const t = TONES[status] || TONES.searching;
  return (
    <div className="flex flex-col items-center w-full" data-testid="faceid-stage">
      <div className={`relative w-full max-w-[400px] aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-[0_30px_80px_-30px_rgba(14,116,144,0.55)] ${status === "fail" ? "animate-[fidShake_400ms_ease-in-out]" : ""}`}>
        <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(15,23,42,0.55)_100%)] pointer-events-none" />
        {state === "ready" && <Corners color={t.c} pulse={status === "searching"} />}
        {state === "ready" && status === "scanning" && <div className="absolute inset-x-[12%] h-0.5 rounded-full bg-emerald-300 shadow-[0_0_18px_#6ee7b7] animate-[gateScan_1.6s_ease-in-out_infinite]" />}
        {state === "ready" && (
          <div className="absolute bottom-5 inset-x-10 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${(status === "success" ? 1 : progress) * 100}%`, background: t.c }} />
          </div>
        )}
        {status === "success" && (
          <div className="absolute inset-0 bg-emerald-500/35 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200" data-testid="faceid-success">
            <span className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-300"><Check className="w-14 h-14 text-emerald-500" strokeWidth={3} /></span>
          </div>
        )}
        {state === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white" data-testid="camera-loading">
            <Loader2 className="w-10 h-10 animate-spin text-sky-300" /><p className="mt-3 font-semibold">Menyiapkan Face ID…</p>
            <p className="text-xs text-white/50 mt-1">Pertama kali ±12MB, berikutnya lebih cepat</p>
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white text-center p-8" data-testid="camera-error">
            <CameraOff className="w-10 h-10 text-rose-400" /><p className="mt-3 text-sm max-w-xs">{error}</p>
            <button data-testid="camera-retry-button" onClick={onRetry} className="mt-4 px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-semibold flex items-center gap-2 hover:bg-sky-100 transition-colors"><RefreshCw className="w-4 h-4" />Coba Lagi</button>
          </div>
        )}
        {children}
      </div>
      <p data-testid="camera-hint" className={`mt-6 px-6 py-2.5 rounded-full text-lg font-semibold shadow-sm ring-1 ring-slate-200 transition-colors ${t.pill}`}>{hint}</p>
      {sub && <p className="mt-2 text-slate-500 text-sm text-center">{sub}</p>}
    </div>
  );
}
