import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { STATUS, addDays, fmtDay, initials } from "./piketUtils";

export function PiketWeek({ weekStart, setWeekStart, today, shifts, canManage, onAdd, onEdit, nowHHMM }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="piket-week">
      <div className="flex items-center justify-between gap-3 flex-wrap p-5 border-b border-slate-100">
        <p className="font-heading text-lg font-extrabold text-slate-900 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-sky-600" />
          {fmtDay(days[0], { day: "numeric", month: "short" })} – {fmtDay(days[6], { day: "numeric", month: "short", year: "numeric" })}</p>
        <div className="flex items-center gap-1">
          <button data-testid="piket-week-prev" onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
          <button data-testid="piket-week-today" onClick={() => setWeekStart(null)} className="px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-slate-100">Minggu Ini</button>
          <button data-testid="piket-week-next" onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {days.map(d => {
          const list = shifts.filter(s => s.date === d);
          const isToday = d === today;
          return (
            <div key={d} data-testid={`piket-day-${d}`} className={`min-h-[220px] p-3 flex flex-col gap-2 ${isToday ? "bg-sky-50/60" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-sky-600" : "text-slate-400"}`}>{fmtDay(d, { weekday: "short" })}</p>
                  <p className={`font-heading text-2xl font-black ${isToday ? "text-sky-700" : "text-slate-800"}`}>{fmtDay(d, { day: "numeric" })}</p>
                </div>
                {canManage && d >= today && (
                  <button data-testid={`piket-add-${d}`} onClick={() => onAdd(d)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-500 flex items-center justify-center transition-colors"><Plus className="w-4 h-4" /></button>
                )}
              </div>
              {isToday && <p className="text-[10px] font-bold text-sky-600 uppercase">Sekarang {nowHHMM}</p>}
              {list.length === 0 && <p className="text-[11px] text-slate-300 italic mt-2">Kosong</p>}
              {list.map(s => {
                const st = STATUS[s.status];
                return (
                  <button key={s.id} data-testid={`piket-shift-${s.id}`} onClick={() => canManage && onEdit(s)}
                    className={`text-left rounded-2xl p-2.5 ring-1 ring-slate-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] relative overflow-hidden ${canManage ? "cursor-pointer" : "cursor-default"}`}>
                    <span className={`absolute left-0 top-0 bottom-0 w-1 ${st.bar}`} />
                    <div className="flex items-center gap-2 pl-1">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{initials(s.teacher_name)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{s.teacher_name}</p>
                        <p className="text-[10px] text-slate-500 tabular-nums">{s.start_time}–{s.end_time}</p>
                      </div>
                    </div>
                    <div className="mt-1.5 pl-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500"><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label} · {s.gate}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
