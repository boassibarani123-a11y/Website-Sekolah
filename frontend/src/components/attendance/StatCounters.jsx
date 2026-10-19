const TONES = {
  hadir: "bg-emerald-50 border-emerald-200 text-emerald-700",
  izin: "bg-sky-50 border-sky-200 text-sky-700",
  sakit: "bg-amber-50 border-amber-200 text-amber-700",
  alpa: "bg-rose-50 border-rose-200 text-rose-700",
};

export function StatCounters({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="attendance-counters">
      {Object.entries(TONES).map(([k, c]) => (
        <div key={k} data-testid={`attendance-counter-${k}`} className={`border rounded-2xl p-5 ${c}`}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">{k}</p>
          <p className="mt-2 font-heading text-4xl font-extrabold tabular-nums">{stats?.[k] ?? 0}</p>
        </div>
      ))}
    </div>
  );
}
