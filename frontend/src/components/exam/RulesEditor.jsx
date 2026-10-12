import { ChevronUp, ChevronDown, Trash2, Plus, RotateCcw } from "lucide-react";
import { DEFAULT_RULES } from "./brand";

export function RulesEditor({ rules, onChange }) {
  const set = (i, v) => onChange(rules.map((r, j) => (j === i ? v : r)));
  const move = (i, d) => { const c = [...rules]; [c[i], c[i + d]] = [c[i + d], c[i]]; onChange(c); };
  return (
    <div className="space-y-2" data-testid="rules-editor">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Peraturan Ujian <span className="text-slate-400 font-normal">({rules.length})</span></p>
        <button type="button" data-testid="rules-use-default" onClick={() => onChange([...DEFAULT_RULES])}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Pakai aturan standar</button>
      </div>
      {rules.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada peraturan khusus. Siswa akan melihat aturan standar {""}VortexGuard.</p>}
      {rules.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 text-xs font-mono text-slate-400 text-right">{i + 1}.</span>
          <input data-testid={`rule-input-${i}`} value={r} onChange={e => set(i, e.target.value)} placeholder="Tulis peraturan…"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none" />
          <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
          <button type="button" disabled={i === rules.length - 1} onClick={() => move(i, 1)} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
          <button type="button" data-testid={`rule-delete-${i}`} onClick={() => onChange(rules.filter((_, j) => j !== i))} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" data-testid="rule-add" onClick={() => onChange([...rules, ""])}
        className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors"><Plus className="w-3.5 h-3.5" />Tambah peraturan</button>
    </div>
  );
}
