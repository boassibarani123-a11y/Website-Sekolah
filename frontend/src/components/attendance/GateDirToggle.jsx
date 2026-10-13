import { LogIn, LogOut, Repeat } from "lucide-react";

const OPTS = [["auto", "Otomatis", Repeat], ["masuk", "Masuk", LogIn], ["keluar", "Keluar", LogOut]];

export function GateDirToggle({ value, onChange }) {
  return (
    <div className="inline-flex bg-white ring-1 ring-slate-200 rounded-full p-1" data-testid="gate-direction-toggle" title="Arah scan di gerbang">
      {OPTS.map(([k, l, I]) => (
        <button key={k} data-testid={`gate-direction-${k}`} onClick={() => onChange(k)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${value === k ? (k === "keluar" ? "bg-sky-600 text-white" : k === "masuk" ? "bg-emerald-600 text-white" : "bg-slate-900 text-white") : "text-slate-600 hover:text-slate-900"}`}>
          <I className="w-3.5 h-3.5" />{l}
        </button>
      ))}
    </div>
  );
}
