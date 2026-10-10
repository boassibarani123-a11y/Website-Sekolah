import { Loader2, CameraOff, RefreshCw } from "lucide-react";

const TICKS = 72;
const TONE = { idle: "#475569", scanning: "#38bdf8", success: "#34d399", error: "#f43f5e", confirm: "#f59e0b" };

// Cincin ala Face ID: garis-garis di sekeliling lingkaran menyala sesuai progres pemindaian.
function FaceIdRing({ progress = 0, status = "idle" }) {
  const lit = status === "success" || status === "error" ? TICKS : Math.round(Math.min(1, progress) * TICKS);
  return (
    <svg viewBox="0 0 200 200" className={`absolute inset-0 w-full h-full ${status === "idle" ? "faceid-spin" : ""} ${status === "error" ? "faceid-shake" : ""}`} data-testid="faceid-ring" data-status={status}>
      {Array.from({ length: TICKS }).map((_, i) => {
        const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
        const on = i < lit;
        const r1 = 89, r2 = on ? 99 : 95;
        return (
          <line key={i} x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)} x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
            stroke={on ? TONE[status === "idle" ? "scanning" : status] : "rgba(255,255,255,0.18)"} strokeWidth="2.2" strokeLinecap="round"
            style={{ transition: "stroke 220ms ease, x2 220ms ease, y2 220ms ease", opacity: status === "idle" ? 0.35 + 0.65 * ((i % 18) / 18) : 1 }} />
        );
      })}
    </svg>
  );
}

function SuccessCheck() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto w-1/3 h-1/3 faceid-pop" data-testid="faceid-success">
      <circle cx="50" cy="50" r="46" fill="rgba(16,185,129,0.85)" />
      <path d="M30 52 L45 66 L71 37" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className="faceid-check" />
    </svg>
  );
}

export function CameraStage({ videoRef, canvasRef, state, error, hint, hintTone = "sky", onRetry, children, mirror = true, progress = 0, status = "idle" }) {
  const tone = { sky: "bg-sky-500/90", amber: "bg-amber-500/90", rose: "bg-rose-600/90", emerald: "bg-emerald-600/90" }[hintTone];
  return (
    <div data-testid="camera-stage" className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#1e293b_0%,#020617_70%)] ring-1 ring-white/10 flex items-center justify-center">
      <div className="relative h-[86%] aspect-square">
        <div className={`absolute inset-[7%] rounded-full overflow-hidden bg-slate-900 transition-shadow duration-500 ${status === "success" ? "shadow-[0_0_60px_rgba(52,211,153,0.55)]" : status === "error" ? "shadow-[0_0_50px_rgba(244,63,94,0.5)]" : status === "scanning" ? "shadow-[0_0_40px_rgba(56,189,248,0.35)] faceid-breathe" : ""}`}>
          <video ref={videoRef} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${mirror ? "-scale-x-100" : ""}`} />
          <canvas ref={canvasRef} className="hidden" />
          {status === "scanning" && <div className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-sky-400/25 to-transparent faceid-sweep pointer-events-none" />}
          {status === "success" && <div className="absolute inset-0 bg-emerald-500/20" />}
        </div>
        {state === "ready" && <FaceIdRing progress={progress} status={status} />}
        {state === "ready" && status === "success" && <SuccessCheck />}
      </div>
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950/80" data-testid="camera-loading">
          <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
          <p className="mt-3 font-semibold">Memuat model pengenalan wajah…</p>
          <p className="text-xs text-slate-400 mt-1">Pertama kali ±12MB, berikutnya tersimpan di cache browser</p>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white bg-slate-950/90 p-6" data-testid="camera-error">
          <CameraOff className="w-10 h-10 text-rose-400" />
          <p className="mt-3 font-semibold max-w-sm">{error}</p>
          <button data-testid="camera-retry-button" onClick={onRetry} className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center gap-2 transition-colors">
            <RefreshCw className="w-4 h-4" />Coba Lagi
          </button>
        </div>
      )}
      {state === "ready" && hint && (
        <div data-testid="camera-hint" className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-semibold backdrop-blur whitespace-nowrap ${tone} transition-colors`}>{hint}</div>
      )}
      {children}
    </div>
  );
}
