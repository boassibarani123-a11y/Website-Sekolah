import { Radio, Lock, Users, Wifi, WifiOff } from "lucide-react";
import { fmtCountdown } from "./liveUtils";

export function TeacherStatus({ online, late, name, joinedBefore }) {
  return (
    <div data-testid="live-teacher-status" className="flex items-center gap-2 text-xs">
      <span className="relative flex w-2.5 h-2.5">
        {online && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />}
        <span className={`relative w-2.5 h-2.5 rounded-full ${online ? "bg-emerald-400" : late ? "bg-amber-400" : "bg-slate-500"}`} />
      </span>
      <span className={online ? "text-emerald-300 font-semibold" : late ? "text-amber-300" : "text-slate-400"}>
        {online ? `${name || "Guru"} online` : joinedBefore ? "Guru keluar sementara" : "Guru belum bergabung"}
      </span>
    </div>
  );
}

export function LiveTopBar({ klass, session, remainingMs, teacherOnline, teacherLate, count, socketOk }) {
  const urgent = remainingMs < 5 * 60 * 1000;
  return (
    <header data-testid="live-topbar"
      className="relative z-20 mx-3 mt-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-bold tracking-wider">
          <Radio className="w-3.5 h-3.5 animate-pulse" />LIVE
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{klass.name}</p>
          <h2 data-testid="live-subject" className="font-heading font-bold text-white text-base md:text-lg truncate">{session.subject}</h2>
        </div>
      </div>
      <TeacherStatus online={teacherOnline} late={teacherLate} name={session.teacher_name} joinedBefore={!!session.teacher_joined_at} />
      <div className="flex items-center gap-4 ml-auto">
        {session.locked && <span className="flex items-center gap-1 text-amber-300 text-xs font-semibold"><Lock className="w-3.5 h-3.5" />Terkunci</span>}
        <span className="flex items-center gap-1 text-white/60 text-xs"><Users className="w-3.5 h-3.5" />{count}</span>
        {socketOk ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-rose-400" />}
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Sisa waktu</p>
          <p data-testid="live-countdown" className={`font-mono-alt text-xl font-bold tabular-nums ${urgent ? "text-amber-300" : "text-cyan-300"}`}>
            {fmtCountdown(remainingMs)}
          </p>
        </div>
      </div>
    </header>
  );
}
