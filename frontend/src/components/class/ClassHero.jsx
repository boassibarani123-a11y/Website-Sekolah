import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { School, Users, BookOpen, ClipboardList, BrainCircuit, ShieldCheck, UserCog, PiggyBank, Network, CalendarClock } from "lucide-react";

function CountUp({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf, t0;
    const step = (t) => { t0 = t0 || t; const p = Math.min(1, (t - t0) / 700); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export function ClassHero({ klass, counts, isTeacher, onReschedule }) {
  const tiles = [
    { k: "siswa", label: "Siswa", icon: Users, v: klass.student_count ?? counts.siswa ?? 0 },
    { k: "mapel", label: "Mapel", icon: BookOpen, v: (klass.subjects || []).length },
    { k: "tugas", label: "Tugas", icon: ClipboardList, v: counts.tugas },
    { k: "quiz", label: "Mini-Quiz", icon: BrainCircuit, v: counts.quiz },
    { k: "ujian", label: "Ujian", icon: ShieldCheck, v: counts.ujian },
  ];
  return (
    <div data-testid="class-hero" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-800 to-slate-950 text-white p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />
      <div className="absolute -right-6 -bottom-16 font-heading font-black text-[180px] leading-none text-white/[0.07] select-none tracking-tighter">{klass.name}</div>
      <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25 flex items-center justify-center"><School className="w-8 h-8" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Ruang Kelas</p>
            <h1 data-testid="class-hero-name" className="font-heading text-4xl font-black tracking-tight">{klass.name}</h1>
            <p className="text-sm text-sky-100/80 max-w-xl">{klass.description || "Wadah tugas, kuis, ujian, kas, dan pengurus kelas."}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-2xl px-3 py-2 ring-1 ring-white/15" data-testid="class-hero-homeroom">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center font-bold text-sm">{(klass.homeroom_teacher_name || "?")[0].toUpperCase()}</span>
            <div><p className="text-[10px] uppercase tracking-wider text-white/60 flex items-center gap-1"><UserCog className="w-3 h-3" />Wali Kelas</p><p className="text-sm font-semibold">{klass.homeroom_teacher_name || "Belum ditetapkan"}</p></div>
          </div>
          {isTeacher && (
            <button data-testid="open-reschedule-button" onClick={onReschedule}
              className="px-4 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-colors">
              <CalendarClock className="w-4 h-4" />Berhalangan
            </button>
          )}
        </div>
      </div>
      <div className="relative mt-7 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {tiles.map((t, i) => (
          <div key={t.k} data-testid={`class-stat-${t.k}`} style={{ animationDelay: `${i * 70}ms` }}
            className="bg-white/10 backdrop-blur rounded-2xl p-4 ring-1 ring-white/10 hover:bg-white/15 hover:-translate-y-0.5 transition-[transform,background-color] animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both">
            <t.icon className="w-5 h-5 text-sky-200" />
            <p className="font-heading text-3xl font-black mt-2 tabular-nums"><CountUp value={t.v || 0} /></p>
            <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { k: "tugas", label: "Tugas", icon: ClipboardList, tone: "from-sky-500 to-sky-600" },
  { k: "quiz", label: "Mini-Quiz", icon: BrainCircuit, tone: "from-violet-500 to-fuchsia-500" },
  { k: "ujian", label: "Ujian", icon: ShieldCheck, tone: "from-indigo-500 to-indigo-700" },
  { k: "kas", label: "Uang Kas", icon: PiggyBank, tone: "from-emerald-500 to-teal-500" },
  { k: "bph", label: "BPH", icon: Network, tone: "from-amber-500 to-orange-500" },
];

export function ClassTabs({ tab, setTab, counts }) {
  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-slate-50/80 backdrop-blur" data-testid="class-tabs">
      <div className="flex gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        {TABS.map(t => {
          const on = tab === t.k;
          const c = counts[t.k];
          return (
            <button key={t.k} data-testid={`tab-${t.k}`} onClick={() => setTab(t.k)}
              className={`relative flex-1 min-w-[120px] px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${on ? "text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>
              {on && <span className={`absolute inset-0 rounded-xl bg-gradient-to-br ${t.tone} shadow-lg animate-in zoom-in-95 fade-in duration-200`} />}
              <t.icon className="w-4 h-4 relative" /><span className="relative">{t.label}</span>
              {typeof c === "number" && <span className={`relative px-1.5 min-w-[20px] rounded-full text-[10px] font-bold tabular-nums ${on ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{c}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useClassCounts(classId) {
  const [counts, setCounts] = useState({ tugas: 0, quiz: 0, ujian: 0 });
  useEffect(() => {
    const n = (p) => api.get(p).then(r => (Array.isArray(r.data) ? r.data.length : 0)).catch(() => 0);
    Promise.all([n(`/assignments?class_id=${classId}`), n(`/quizzes?class_id=${classId}`), n(`/exams?class_id=${classId}`)])
      .then(([tugas, quiz, ujian]) => setCounts({ tugas, quiz, ujian }));
  }, [classId]);
  return counts;
}
