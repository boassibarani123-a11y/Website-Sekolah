import { useEffect, useRef } from "react";
import { Hand, MicOff, Crown, Eye, UserX } from "lucide-react";
import { initials, ROLE_LABEL } from "./liveUtils";

export function TrackVideo({ track, className = "", mirror = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!track || !el) return;
    track.attach(el);
    return () => { track.detach(el); };
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted className={`${className} ${mirror ? "-scale-x-100" : ""}`} />;
}

export function SoundWave({ active }) {
  return (
    <span className="flex items-end gap-[2px] h-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`w-[3px] rounded-full bg-cyan-300 ${active ? "live-wave" : "h-[3px] opacity-40"}`}
          style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}

export function VideoTile({ person, track, speaking, hand, micMuted, isSelf, size = "sm", canKick, onKick }) {
  const role = person.role;
  const big = size === "lg";
  return (
    <div data-testid={`live-tile-${person.user_id}`}
      className={`group relative overflow-hidden rounded-2xl bg-[#0d1424] border transition-[border-color,box-shadow] duration-300
        ${speaking ? "border-cyan-400/80 shadow-[0_0_0_3px_rgba(34,211,238,0.18)]" : "border-white/[0.07]"}
        ${big ? "w-full h-full" : "w-[150px] h-[96px] shrink-0"}`}>
      {track ? (
        <TrackVideo track={track} mirror={isSelf} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,#1b2a44,#0b111d)]">
          <div className={`grid place-items-center rounded-full font-heading font-bold text-white
            ${role === "host" ? "bg-gradient-to-br from-cyan-400 to-blue-600" : "bg-gradient-to-br from-slate-600 to-slate-700"}
            ${big ? "w-28 h-28 text-4xl" : "w-11 h-11 text-sm"}`}>
            {initials(person.name)}
          </div>
        </div>
      )}
      {hand && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold flex items-center gap-1 animate-bounce">
          <Hand className="w-3 h-3" />Angkat tangan
        </div>
      )}
      {canKick && !isSelf && (
        <button data-testid={`live-kick-${person.user_id}`} onClick={onKick} title="Keluarkan"
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white">
          <UserX className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 px-2.5 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-1.5">
        {role === "host" ? <Crown className="w-3 h-3 text-amber-300 shrink-0" /> : role === "monitor" ? <Eye className="w-3 h-3 text-slate-300 shrink-0" /> : null}
        <span className={`truncate text-white font-semibold ${big ? "text-sm" : "text-[11px]"}`}>
          {person.name}{isSelf ? " (Anda)" : ""}
        </span>
        {big && <span className="text-[10px] text-white/50">{ROLE_LABEL[role]}</span>}
        <span className="ml-auto flex items-center gap-1">
          {micMuted ? <MicOff className="w-3 h-3 text-rose-300" /> : <SoundWave active={speaking} />}
        </span>
      </div>
    </div>
  );
}
