const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 5).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

// Pemilih jam: dropdown jam & menit terpisah (langkah 5 menit) + tombol jam cepat.
export function TimeSelect({ value, onChange, quick = [], testid }) {
  const [h, m] = (value || "07:00").split(":");
  const mm = MINUTES.includes(m) ? m : String(Math.round(Number(m || 0) / 5) * 5 % 60).padStart(2, "0");
  const cls = "flex-1 px-2 py-2 rounded-lg border border-slate-300 text-sm bg-white font-mono tabular-nums focus:border-sky-500 outline-none";
  return (
    <div className="space-y-1.5" data-testid={testid}>
      <div className="flex items-center gap-1">
        <select data-testid={`${testid}-hour`} aria-label="Jam" value={h} onChange={(e) => onChange(`${e.target.value}:${mm}`)} className={cls}>
          {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <span className="font-bold text-slate-400">:</span>
        <select data-testid={`${testid}-minute`} aria-label="Menit" value={mm} onChange={(e) => onChange(`${h}:${e.target.value}`)} className={cls}>
          {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {quick.map((q) => (
            <button key={q} type="button" data-testid={`${testid}-quick-${q.replace(":", "")}`} onClick={() => onChange(q)}
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-colors ${value === q ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-sky-100"}`}>{q}</button>
          ))}
        </div>
      )}
    </div>
  );
}
