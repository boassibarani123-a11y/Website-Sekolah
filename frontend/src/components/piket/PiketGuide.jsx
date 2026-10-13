import { useState } from "react";
import { CalendarPlus, LogIn, LogOut, X, Clock4 } from "lucide-react";
import { STATUS } from "./piketUtils";

const STEPS = [
  { Icon: CalendarPlus, t: "1. Jadwal dibuat", d: "Admin/TU menjadwalkan guru penjaga per shift & gerbang." },
  { Icon: LogIn, t: "2. Check-in saat datang", d: "Tombol aktif 30 menit sebelum shift. Lewat 10 menit = terlambat." },
  { Icon: LogOut, t: "3. Check-out setelah selesai", d: "Durasi jaga tercatat otomatis untuk laporan bulanan." },
];

export function PiketGuide() {
  const [open, setOpen] = useState(() => localStorage.getItem("piket-guide-hidden") !== "1");
  if (!open) return null;
  return (
    <div className="relative grid sm:grid-cols-3 gap-3 rounded-3xl bg-sky-50 border border-sky-100 p-4" data-testid="piket-guide">
      <button data-testid="piket-guide-close" onClick={() => { localStorage.setItem("piket-guide-hidden", "1"); setOpen(false); }} className="absolute top-2 right-2 p-1 text-sky-400 hover:text-sky-700"><X className="w-4 h-4" /></button>
      {STEPS.map(({ Icon, t, d }) => (
        <div key={t} className="flex gap-3">
          <span className="w-9 h-9 rounded-xl bg-white text-sky-600 flex items-center justify-center shrink-0 shadow-sm"><Icon className="w-4 h-4" /></span>
          <div><p className="text-sm font-bold text-slate-800">{t}</p><p className="text-xs text-slate-500">{d}</p></div>
        </div>
      ))}
    </div>
  );
}

export function TodayTimeline({ shifts }) {
  const list = [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm" data-testid="piket-today">
      <p className="font-heading font-extrabold text-slate-900 flex items-center gap-2"><Clock4 className="w-5 h-5 text-sky-600" />Piket Hari Ini</p>
      {list.length === 0 ? <p className="text-sm text-slate-400 italic mt-3" data-testid="piket-today-empty">Belum ada shift untuk hari ini.</p> : (
        <ol className="mt-4 relative border-l-2 border-slate-100 ml-2 space-y-4">
          {list.map(s => {
            const st = STATUS[s.status];
            return (
              <li key={s.id} data-testid={`piket-today-${s.id}`} className="pl-5 relative">
                <span className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full ring-4 ring-white ${st.dot}`} />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm"><b className="tabular-nums">{s.start_time}–{s.end_time}</b> · <span className="font-semibold text-slate-800">{s.teacher_name}</span> <span className="text-slate-400">· {s.gate}</span></p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1 ${st.chip}`}>{st.label}</span>
                </div>
                {s.checked_in_at && <p className="text-[11px] text-slate-500 mt-0.5">Masuk {new Date(s.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{s.checked_out_at ? ` · Keluar ${new Date(s.checked_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}{s.late_minutes ? ` · telat ${s.late_minutes} mnt` : ""}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
