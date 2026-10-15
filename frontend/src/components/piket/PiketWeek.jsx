import { ChevronLeft, ChevronRight, Plus, CalendarDays, DoorOpen } from "lucide-react";
import { STATUS, addDays, fmtDay, initials } from "./piketUtils";

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500" data-testid="piket-legend">
      {Object.entries(STATUS).map(([k, s]) => <span key={k} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</span>)}
    </div>
  );
}

function ShiftChip({ s, canManage, onEdit }) {
  const st = STATUS[s.status];
  return (
    <button data-testid={`piket-shift-${s.id}`} onClick={() => canManage && onEdit(s)}
      className={`text-left rounded-2xl p-2.5 pr-3 ring-1 ring-slate-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-[transform,box-shadow] relative overflow-hidden flex items-center gap-2.5 min-w-[210px] ${canManage ? "cursor-pointer" : "cursor-default"}`}>
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${st.bar}`} />
      <span className="font-heading font-black text-slate-800 tabular-nums text-sm pl-1.5 w-[86px] shrink-0">{s.start_time}–{s.end_time}</span>
      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-emerald-400 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{initials(s.teacher_name)}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{s.teacher_name}</p>
        <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label} · <DoorOpen className="w-2.5 h-2.5" />{s.gate}</p>
      </div>
    </button>
  );
}

export function PiketWeek({ weekStart, setWeekStart, today, shifts, canManage, onAdd, onEdit, nowHHMM }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="piket-week">
      <div className="flex items-center justify-between gap-3 flex-wrap p-5 border-b border-slate-100">
        <div>
          <p className="font-heading text-lg font-extrabold text-slate-900 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-sky-600" />
            {fmtDay(days[0], { day: "numeric", month: "short" })} – {fmtDay(days[6], { day: "numeric", month: "short", year: "numeric" })}</p>
          <div className="mt-2"><StatusLegend /></div>
        </div>
        <div className="flex items-center gap-1">
          <button data-testid="piket-week-prev" onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronLeft className="w-5 h-5" /></button>
          <button data-testid="piket-week-today" onClick={() => setWeekStart(null)} className="px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-slate-100">Minggu Ini</button>
          <button data-testid="piket-week-next" onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-2 rounded-xl hover:bg-slate-100"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {days.map(d => {
          const list = shifts.filter(s => s.date === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
          const isToday = d === today;
          return (
            <div key={d} data-testid={`piket-day-${d}`} className={`flex items-stretch gap-4 px-5 py-3 ${isToday ? "bg-sky-50/70" : d < today ? "opacity-70" : ""}`}>
              <div className="w-16 shrink-0 text-center py-1">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-sky-600" : "text-slate-400"}`}>{fmtDay(d, { weekday: "short" })}</p>
                <p className={`font-heading text-2xl font-black leading-none mt-0.5 ${isToday ? "text-sky-700" : "text-slate-800"}`}>{fmtDay(d, { day: "numeric" })}</p>
                {isToday && <p className="text-[9px] font-bold text-sky-600 uppercase mt-1">Hari ini {nowHHMM}</p>}
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-2 min-h-[56px]">
                {list.length === 0 && <p className="text-xs text-slate-300 italic">Belum ada piket</p>}
                {list.map(s => <ShiftChip key={s.id} s={s} canManage={canManage} onEdit={onEdit} />)}
              </div>
              {canManage && d >= today && (
                <button data-testid={`piket-add-${d}`} onClick={() => onAdd(d)} title="Tambah shift"
                  className="self-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-500 flex items-center justify-center transition-colors shrink-0"><Plus className="w-4 h-4" /></button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
