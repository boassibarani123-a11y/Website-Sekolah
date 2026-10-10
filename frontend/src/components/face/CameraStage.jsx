import { Loader2, CameraOff, RefreshCw } from "lucide-react";

export function CameraStage({ videoRef, canvasRef, state, error, hint, hintTone = "sky", onRetry, children, mirror = true }) {
  const tone = { sky: "bg-sky-500/90", amber: "bg-amber-500/90", rose: "bg-rose-600/90", emerald: "bg-emerald-600/90" }[hintTone];
  return (
    <div data-testid="camera-stage" className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 ring-1 ring-white/10">
      <video ref={videoRef} muted playsInline className={`absolute inset-0 w-full h-full object-cover ${mirror ? "-scale-x-100" : ""}`} />
      <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${mirror ? "-scale-x-100" : ""}`} />
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
      {state === "ready" && <div className="absolute inset-[12%] rounded-[40%] border-2 border-dashed border-white/25 pointer-events-none" />}
      {state === "ready" && hint && (
        <div data-testid="camera-hint" className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-white text-sm font-semibold backdrop-blur ${tone} transition-colors`}>{hint}</div>
      )}
      {children}
    </div>
  );
}
