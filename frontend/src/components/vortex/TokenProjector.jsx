import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/apiClient";
import { X, Maximize, Minimize, Eye, EyeOff, KeyRound } from "lucide-react";
import { VortexLogo, mmss } from "./VortexLogo";
import { secondsUntil } from "./examExport";

function useNow() {
  const [, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(t => t + 1), 1000); return () => clearInterval(i); }, []);
}

export function TokenProjector({ exam, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [hide, setHide] = useState(false);
  const [full, setFull] = useState(false);
  const offset = useRef(0);
  const ref = useRef(null);
  useNow();
  useEffect(() => {
    const load = () => api.get(`/exams/${exam.id}/token`).then(r => { offset.current = new Date(r.data.server_now).getTime() - Date.now(); setD(r.data); })
      .catch(e => setErr(e.response?.data?.detail || "Gagal memuat token"));
    load(); const t = setInterval(load, 30000); return () => clearInterval(t);
  }, [exam.id]);
  useEffect(() => {
    const f = () => setFull(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const toggleFull = () => document.fullscreenElement ? document.exitFullscreen?.() : ref.current?.requestFullscreen?.().catch(() => {});

  const toStart = d && secondsUntil(d.start_at, offset.current);
  const toEnd = d && secondsUntil(d.end_at, offset.current);
  const phase = !d ? null : toStart > 0 ? "start" : d.end_at && toEnd === 0 ? "ended" : d.end_at ? "end" : "open";
  const big = phase === "start" ? toStart : phase === "end" ? toEnd : null;
  const label = { start: "Ujian dimulai dalam", end: "Sisa waktu jadwal ujian", ended: "Jadwal ujian telah berakhir", open: d?.time_limit ? `Durasi pengerjaan ${d.time_limit} menit` : "Ujian sedang dibuka" }[phase];
  const urgent = phase === "end" && big <= 300;
  const chars = (d?.token || "").split("");

  return createPortal(
    <div ref={ref} className="fixed inset-0 z-[60] bg-slate-950 text-white flex flex-col" data-testid="token-projector">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-40 -top-40 w-[36rem] h-[36rem] rounded-full border-[70px] border-teal-700/10" />
        <div className="absolute -right-32 -bottom-48 w-[42rem] h-[42rem] rounded-full border-[90px] border-teal-500/10" />
      </div>
      <div className="relative flex items-center justify-between p-6 sm:p-8">
        <VortexLogo dark />
        <div className="flex items-center gap-2">
          <button data-testid="token-hide-toggle" onClick={() => setHide(h => !h)} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center gap-2 transition-colors">{hide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}{hide ? "Tampilkan" : "Sembunyikan"}</button>
          <button data-testid="token-fullscreen" onClick={toggleFull} className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center gap-2 transition-colors">{full ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{full ? "Keluar" : "Layar Penuh"}</button>
          <button data-testid="token-close" onClick={onClose} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6">
        {err && <p className="text-rose-300 text-lg" data-testid="token-error">{err}</p>}
        {d && (
          <>
            <p className="text-teal-300 uppercase tracking-[0.35em] text-sm font-bold">{d.subject || "Ujian"} · Kelas {d.kelas}</p>
            <h2 className="mt-3 font-heading text-3xl sm:text-5xl font-extrabold max-w-5xl leading-tight">{d.title}</h2>
            <p className="mt-10 text-white/50 uppercase tracking-[0.3em] text-xs font-bold flex items-center gap-2"><KeyRound className="w-4 h-4" />Token Ujian</p>
            {d.token ? (
              <div data-testid="token-value" className="mt-4 flex gap-3 sm:gap-5 flex-wrap justify-center">
                {chars.map((c, i) => (
                  <span key={i} className="w-[14vw] max-w-[9rem] aspect-[3/4] rounded-3xl bg-white/[0.06] ring-1 ring-teal-400/30 flex items-center justify-center font-mono font-black text-[10vw] sm:text-[7rem] leading-none text-teal-200 animate-[tokenGlow_3s_ease-in-out_infinite]" style={{ animationDelay: `${i * 120}ms` }}>
                    {hide ? "•" : c}
                  </span>
                ))}
              </div>
            ) : <p data-testid="token-missing" className="mt-6 text-amber-300 max-w-md">Token ujian ini dibuat sebelum fitur proyektor aktif. Edit ujian dan isi ulang token agar dapat ditampilkan.</p>}
            <div className="mt-12" data-testid="token-countdown">
              <p className="text-white/60 text-sm uppercase tracking-[0.25em] font-semibold">{label}</p>
              {big !== null && <p data-testid="token-countdown-value" className={`mt-2 font-mono font-black tabular-nums text-6xl sm:text-8xl ${urgent ? "text-rose-400 animate-pulse" : "text-white"}`}>{mmss(big)}</p>}
            </div>
          </>
        )}
      </div>
      <p className="relative text-center pb-6 text-white/40 text-sm">Pengawas: {d?.teacher_name || "-"} · Jangan bagikan token di luar ruang ujian</p>
    </div>,
    document.body
  );
}
