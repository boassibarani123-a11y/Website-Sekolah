import { Loader2, CameraOff, RefreshCw } from "lucide-react";

const TICKS = 72;
const COLORS = { idle: "#3a3a3c", scan: "#30d158", fail: "#ff453a", warn: "#ffd60a" };

function TickRing({ progress, status }) {
  const lit = status === "success" ? TICKS : Math.round(progress * TICKS);
  const color = status === "fail" ? COLORS.fail : status === "confirm" ? COLORS.warn : COLORS.scan;
  return (
    <svg viewBox="0 0 200 200" className={`absolute inset-0 w-full h-full ${status === "searching" ? "animate-[fidSpin_6s_linear_infinite]" : ""}`}>
      {Array.from({ length: TICKS }).map((_, i) => {
        const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
        const on = i < lit || status === "fail" || status === "confirm";
        const r1 = 92, r2 = on ? 99 : 97;
        return <line key={i} x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)} x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
          stroke={on ? color : status === "searching" && i % 12 < 4 ? "#636366" : COLORS.idle} strokeWidth="1.8" strokeLinecap="round" style={{ transition: "stroke 160ms, x2 160ms, y2 160ms" }} />;
      })}
    </svg>
  );
}

function SuccessMark() {
  return (
    <div className="absolute inset-[9%] rounded-full bg-[#30d158]/90 flex items-center justify-center animate-in fade-in zoom-in-90 duration-300" data-testid="faceid-success">
      <svg viewBox="0 0 52 52" className="w-1/2 h-1/2"><path d="M14 27 l8 8 l16 -18" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="[stroke-dasharray:48] animate-[fidDraw_450ms_ease-out_forwards] [stroke-dashoffset:48]" /></svg>
    </div>
  );
}

export function FaceIdStage({ videoRef, canvasRef, state, error, onRetry, progress = 0, status = "searching", hint, sub }) {
  return (
    <div className="flex flex-col items-center" data-testid="faceid-stage">
      <div className={`relative w-full max-w-[380px] aspect-square ${status === "fail" ? "animate-[fidShake_400ms_ease-in-out]" : ""}`}>
        <TickRing progress={progress} status={status} />
        <div className="absolute inset-[9%] rounded-full overflow-hidden bg-black ring-1 ring-white/10">
          <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_rgba(0,0,0,0.65)] pointer-events-none" />
          {state === "loading" && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white" data-testid="camera-loading"><Loader2 className="w-9 h-9 animate-spin text-white/80" /><p className="mt-3 text-sm text-white/70">Menyiapkan Face ID…</p></div>}
          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white text-center p-8" data-testid="camera-error">
              <CameraOff className="w-9 h-9 text-[#ff453a]" /><p className="mt-3 text-sm">{error}</p>
              <button data-testid="camera-retry-button" onClick={onRetry} className="mt-4 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4" />Coba Lagi</button>
            </div>
          )}
        </div>
        {status === "success" && <SuccessMark />}
      </div>
      <p data-testid="camera-hint" className="mt-7 text-white text-xl font-semibold tracking-tight text-center min-h-[28px]">{hint}</p>
      {sub && <p className="mt-1 text-white/50 text-sm text-center">{sub}</p>}
    </div>
  );
}
