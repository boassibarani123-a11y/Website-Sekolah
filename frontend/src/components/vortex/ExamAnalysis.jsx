import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { X, AlertTriangle, ChevronDown, FileSpreadsheet, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { VortexLogo } from "./VortexLogo";
import { downloadExamExport } from "./examExport";

const TONE = {
  Mudah: "bg-emerald-100 text-emerald-700", Sedang: "bg-amber-100 text-amber-700", Sukar: "bg-rose-100 text-rose-700",
  Baik: "bg-emerald-100 text-emerald-700", Cukup: "bg-amber-100 text-amber-700", Jelek: "bg-rose-100 text-rose-700",
};
const Badge = ({ label, testid }) => <span data-testid={testid} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${TONE[label] || "bg-slate-100 text-slate-500"}`}>{label}</span>;

function Stat({ label, value, tone = "text-slate-900", testid }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p data-testid={testid} className={`font-heading font-black text-2xl mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

function StatsGrid({ s }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="analysis-stats">
      <Stat label="Peserta" value={`${s.participants}/${s.roster}`} testid="analysis-participants" />
      <Stat label="Belum ikut" value={s.not_taken} tone="text-slate-500" testid="analysis-not-taken" />
      <Stat label="Rata-rata" value={s.avg} testid="analysis-avg" />
      <Stat label="Median" value={s.median} testid="analysis-median" />
      <Stat label="Tertinggi" value={s.max} tone="text-emerald-700" testid="analysis-max" />
      <Stat label="Terendah" value={s.min} tone="text-rose-600" testid="analysis-min" />
      <Stat label={`Tuntas (KKM ${s.kkm})`} value={`${s.pass_rate}%`} tone="text-teal-700" testid="analysis-pass-rate" />
      <Stat label="Jumlah tuntas" value={s.passed} testid="analysis-passed" />
    </div>
  );
}

function DistributionChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-testid="analysis-distribution">
      <p className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Distribusi Nilai</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 192 }}>
          <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v) => [`${v} siswa`, "Jumlah"]} />
            <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OptionBars({ it }) {
  return (
    <div className="space-y-1.5 pt-3" data-testid={`analysis-options-${it.no}`}>
      {it.options.map(o => (
        <div key={o.label} className="flex items-center gap-2 text-xs">
          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold shrink-0 ${o.is_key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{o.label}</span>
          <span className="w-40 truncate text-slate-600" title={o.text}>{o.text || "-"}</span>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${o.is_key ? "bg-emerald-500" : "bg-slate-400"}`} style={{ width: `${o.pct}%` }} /></div>
          <span className="w-16 text-right font-mono text-slate-500">{o.count} ({o.pct}%)</span>
          {!o.is_key && !o.effective && <span className="text-[10px] text-amber-700 font-semibold">pengecoh lemah</span>}
        </div>
      ))}
      {it.blank > 0 && <p className="text-[11px] text-slate-400">{it.blank} siswa tidak menjawab</p>}
    </div>
  );
}

function ItemRow({ it }) {
  const [open, setOpen] = useState(false);
  const mc = it.type === "mc";
  return (
    <div className={`border rounded-xl bg-white ${it.flags.length ? "border-rose-200" : "border-slate-200"}`} data-testid={`analysis-item-${it.no}`}>
      <button disabled={!mc} onClick={() => setOpen(!open)} className="w-full p-3 flex items-center gap-3 text-left">
        <span className="font-heading font-black text-slate-400 w-7 shrink-0">{it.no}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{it.q}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
            {mc ? <>
              <span>P = {it.difficulty}</span><Badge label={it.difficulty_label} testid={`analysis-difficulty-${it.no}`} />
              <span className="ml-1">D = {it.discrimination}</span><Badge label={it.discrimination_label} testid={`analysis-discrimination-${it.no}`} />
              <span className="ml-1">{it.correct}/{it.responses} benar</span>
            </> : <span data-testid={`analysis-essay-avg-${it.no}`}>Esai · rata-rata {it.avg_score ?? "-"} · {it.graded}/{it.responses} dinilai</span>}
            {it.flags.map(f => <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">{f}</span>)}
          </div>
        </div>
        {mc && <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && <div className="border-t px-4 pb-3 bg-slate-50 rounded-b-xl"><OptionBars it={it} /></div>}
    </div>
  );
}

export function ExamAnalysis({ exam, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get(`/exams/${exam.id}/analysis`).then(r => setData(r.data)).catch(e => setErr(e.response?.data?.detail || "Gagal memuat analisis")); }, [exam.id]);
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="exam-analysis-modal">
      <div className="bg-[#F4F6F5] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b bg-white rounded-t-2xl gap-3">
          <div className="flex items-center gap-3 min-w-0"><VortexLogo size="sm" /><span className="text-slate-300">/</span><h3 className="font-heading font-bold truncate">Analisis · {exam.title}</h3></div>
          <div className="flex items-center gap-2 shrink-0">
            <button data-testid="analysis-export-xlsx" onClick={() => downloadExamExport(exam, "xlsx")} className="px-3 py-1.5 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" />Excel</button>
            <button data-testid="exam-analysis-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {err && <p className="text-rose-600 text-sm" data-testid="analysis-error">{err}</p>}
          {!data && !err && <p className="text-slate-400 italic text-sm">Memuat analisis...</p>}
          {data && <>
            {!data.enough_data && <p data-testid="analysis-low-data-warning" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />Baru {data.stats.participants} siswa mengumpulkan. Analisis butir baru bermakna jika minimal 5 siswa.</p>}
            <StatsGrid s={data.stats} />
            <DistributionChart data={data.distribution} />
            <div className="flex items-center justify-between">
              <p className="font-heading font-bold text-sm">Analisis Butir Soal</p>
              <p data-testid="analysis-problem-count" className="text-xs text-rose-600 font-semibold">{data.problem_count} soal perlu ditinjau</p>
            </div>
            <p className="text-[11px] text-slate-500">P = tingkat kesukaran (proporsi benar; &gt;0,70 Mudah, 0,30–0,70 Sedang, &lt;0,30 Sukar). D = daya beda kelompok atas vs bawah 27% (≥0,30 Baik, 0,20–0,29 Cukup, &lt;0,20 Jelek). Klik soal PG untuk melihat sebaran jawaban.</p>
            <div className="space-y-2" data-testid="analysis-items">{data.items.map(it => <ItemRow key={it.no} it={it} />)}</div>
          </>}
        </div>
      </div>
    </div>
  );
}
