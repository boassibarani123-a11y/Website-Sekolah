import { ShieldCheck } from "lucide-react";

export const VG = { name: "VortexGuard", version: "v1.0", full: "VortexGuard v1.0", tagline: "Secure Exam Engine" };

export const inp = "w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-colors bg-white";

export const mmss = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
};

export const DEFAULT_RULES = [
  "Ujian hanya dapat dikerjakan satu kali dan wajib dikerjakan secara mandiri.",
  "Layar akan masuk mode penuh (fullscreen) selama ujian berlangsung.",
  "Berpindah tab, meminimalkan jendela, atau keluar layar penuh dihitung sebagai pelanggaran.",
  "Jika batas pelanggaran tercapai, jawaban dikirim otomatis.",
  "Dilarang menyalin, menempel, atau mengambil tangkapan layar soal.",
  "Jawaban tersimpan otomatis setiap berpindah halaman.",
];

export const newPG = () => ({ type: "pg", q: "", options: ["", "", "", ""], answer: 0, points: 1 });
export const newEssay = () => ({ type: "essay", q: "", options: [], answer: 0, points: 10, rubric: "", max_words: 0 });

export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");
export const wordCount = (s) => ((s || "").trim() ? s.trim().split(/\s+/).length : 0);
export const LETTERS = "ABCDEFGH";

export const examWindow = (ex) => {
  const now = Date.now();
  if (ex.start_at && now < new Date(ex.start_at).getTime()) return "scheduled";
  if (ex.end_at && now > new Date(ex.end_at).getTime()) return "closed";
  return "open";
};

export const WINDOW_BADGE = {
  open: { label: "Dibuka", cls: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "Terjadwal", cls: "bg-sky-100 text-sky-700" },
  closed: { label: "Ditutup", cls: "bg-slate-200 text-slate-600" },
};

export function VortexMark({ size = "md", dark = false }) {
  const box = size === "sm" ? "w-7 h-7" : "w-10 h-10";
  return (
    <span className="inline-flex items-center gap-2.5" data-testid="vortexguard-brand">
      <span className={`${box} rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30`}>
        <ShieldCheck className={size === "sm" ? "w-4 h-4 text-white" : "w-5 h-5 text-white"} />
      </span>
      <span className="leading-tight">
        <span className={`block font-heading font-black tracking-tight ${size === "sm" ? "text-sm" : "text-base"} ${dark ? "text-white" : "text-slate-900"}`}>
          {VG.name} <span className="text-cyan-400">{VG.version}</span>
        </span>
        {size !== "sm" && <span className={`block text-[10px] uppercase tracking-[0.2em] font-mono ${dark ? "text-indigo-200" : "text-slate-500"}`}>{VG.tagline}</span>}
      </span>
    </span>
  );
}

export function Toggle({ checked, onChange, label, desc, testid }) {
  return (
    <label className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 cursor-pointer transition-colors">
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {desc && <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} data-testid={testid} onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
