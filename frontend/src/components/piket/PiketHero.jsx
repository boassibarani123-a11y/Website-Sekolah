import { ShieldCheck, Hourglass, LogIn, LogOut, DoorOpen } from "lucide-react";
import { STATUS, fmtDur, initials, fmtDay } from "./piketUtils";

function Avatar({ s, size = "w-12 h-12" }) {
  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-white font-bold flex items-center justify-center overflow-hidden shrink-0`}>
      {s.teacher_photo ? <img src={s.teacher_photo} alt="" className="w-full h-full object-cover" /> : initials(s.teacher_name)}
    </div>
  );
}

function ActiveCard({ s, now }) {
  const st = STATUS[s.status];
  const start = new Date(s.start_iso).getTime(), end = new Date(s.end_iso).getTime();
  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  return (
    <div data-testid={`piket-active-${s.id}`} className="bg-white/10 backdrop-blur rounded-2xl p-4 ring-1 ring-white/15">
      <div className="flex items-center gap-3">
        <Avatar s={s} />
        <div className="min-w-0 flex-1">
          <p className="font-heading font-extrabold text-lg truncate">{s.teacher_name}</p>
          <p className="text-xs text-white/70 flex items-center gap-1"><DoorOpen className="w-3 h-3" />{s.gate} · {s.start_time}–{s.end_time}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ${st.chip}`}>{st.label}</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden"><div className={`h-full ${st.bar} transition-[width] duration-1000`} style={{ width: `${pct}%` }} /></div>
      <div className="mt-1.5 flex justify-between text-[11px] text-white/70 tabular-nums">
        <span>{s.checked_in_at ? `Check-in ${new Date(s.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}${s.late_minutes ? ` (telat ${s.late_minutes}m)` : ""}` : "Belum check-in"}</span>
        <span>Sisa {fmtDur(end - now)}</span>
      </div>
    </div>
  );
}

export function PiketHero({ data, now, onPresence, busy }) {
  const active = data?.active || [];
  const next = data?.next;
  const mine = data?.mine;
  const mineStart = mine ? new Date(mine.start_iso).getTime() : 0;
  const canIn = mine && !mine.checked_in_at && now >= mineStart - 30 * 60000;
  const canOut = mine && mine.checked_in_at && !mine.checked_out_at;
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-900 to-slate-900 text-white p-6" data-testid="piket-hero">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />Penjaga Gerbang Saat Ini</p>
            <p className="font-heading text-4xl font-black tabular-nums mt-1" data-testid="piket-clock">{new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
            <p className="text-sm text-white/60">{new Date(now).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · WIB</p>
          </div>
          {next && (
            <div className="text-right bg-white/10 rounded-2xl px-4 py-3" data-testid="piket-next">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 flex items-center gap-1 justify-end"><Hourglass className="w-3 h-3" />Shift berikutnya</p>
              <p className="font-semibold">{next.teacher_name}</p>
              <p className="text-xs text-white/70">{fmtDay(next.date)} · {next.start_time} · {next.gate}</p>
              <p className="font-heading font-extrabold text-sky-300 tabular-nums">dalam {fmtDur(new Date(next.start_iso).getTime() - now)}</p>
            </div>
          )}
        </div>
        <div className="relative mt-5 grid sm:grid-cols-2 gap-3">
          {active.length === 0 && <p className="text-white/60 italic text-sm" data-testid="piket-no-active">Tidak ada shift piket yang sedang berlangsung.</p>}
          {active.map(s => <ActiveCard key={s.id} s={s} now={now} />)}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col" data-testid="piket-mine">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Shift Saya</p>
        {!mine ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
            <ShieldCheck className="w-10 h-10 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">Anda tidak punya jadwal piket mendatang.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mt-3">
              <Avatar s={mine} />
              <div>
                <p className="font-heading font-extrabold text-slate-900">{fmtDay(mine.date, { weekday: "long", day: "numeric", month: "long" })}</p>
                <p className="text-sm text-slate-500">{mine.start_time}–{mine.end_time} · {mine.gate}</p>
              </div>
            </div>
            <span className={`mt-3 self-start px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ${STATUS[mine.status].chip}`}>{STATUS[mine.status].label}</span>
            {mine.notes && <p className="mt-2 text-xs text-slate-500 italic">"{mine.notes}"</p>}
            <p className="mt-3 text-sm text-slate-600">{now < mineStart ? <>Mulai dalam <b className="tabular-nums">{fmtDur(mineStart - now)}</b></> : <>Berakhir dalam <b className="tabular-nums">{fmtDur(new Date(mine.end_iso).getTime() - now)}</b></>}</p>
            <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
              <button data-testid="piket-checkin-button" disabled={!canIn || busy} onClick={() => onPresence(mine, "checkin")}
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><LogIn className="w-4 h-4" />Check-in</button>
              <button data-testid="piket-checkout-button" disabled={!canOut || busy} onClick={() => onPresence(mine, "checkout")}
                className="py-3 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><LogOut className="w-4 h-4" />Check-out</button>
            </div>
            {!canIn && !mine.checked_in_at && <p className="mt-2 text-[11px] text-slate-400 text-center">Check-in dibuka 30 menit sebelum shift.</p>}
          </>
        )}
      </div>
    </div>
  );
}
