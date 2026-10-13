import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Search, Library, Trash2, CheckCircle2 } from "lucide-react";
import { vgInput } from "./VortexLogo";

const TONE = { Mudah: "bg-emerald-100 text-emerald-700", Sedang: "bg-amber-100 text-amber-700", Sukar: "bg-rose-100 text-rose-700",
  Baik: "bg-emerald-100 text-emerald-700", Cukup: "bg-amber-100 text-amber-700", Jelek: "bg-rose-100 text-rose-700" };
const Chip = ({ t }) => t && t !== "-" ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${TONE[t] || "bg-slate-100 text-slate-600"}`}>{t}</span> : null;

function BankItem({ it, checked, onToggle, onDelete }) {
  return (
    <div data-testid={`bank-item-${it.id}`} className={`border rounded-xl p-3 bg-white flex gap-3 ${checked ? "border-teal-600 ring-2 ring-teal-600/20" : "border-slate-200"}`}>
      <input type="checkbox" data-testid={`bank-select-${it.id}`} checked={checked} onChange={onToggle} className="mt-1 w-4 h-4 accent-teal-700" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{it.q}</p>
        {it.type === "mc" && <p className="text-[11px] text-slate-500 mt-1 truncate">{it.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}${i === it.answer ? " ✓" : ""}`).join("   ")}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-slate-500">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold">{it.type === "mc" ? "PG" : "Esai"}</span>
          {it.subject && <span className="px-1.5 py-0.5 rounded bg-slate-100">{it.subject}</span>}
          <Chip t={it.difficulty_label} /><Chip t={it.discrimination_label} />
          {it.avg_score != null && <span>rata esai {it.avg_score}</span>}
          <span>dari "{it.source_exam_title}" · dipakai {it.used_count || 0}×</span>
        </div>
      </div>
      <button data-testid={`bank-delete-${it.id}`} onClick={onDelete} className="p-1.5 h-fit text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

export function QuestionBankPicker({ subject, onClose, onPick }) {
  const [data, setData] = useState(null);
  const [subj, setSubj] = useState(subject || "");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);
  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (subj) p.set("subject", subj);
    if (type) p.set("type", type);
    if (q) p.set("q", q);
    api.get(`/question-bank?${p}`).then(r => setData(r.data)).catch(() => setData({ items: [], subjects: [] }));
  }, [subj, type, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const del = async (it) => {
    if (!window.confirm("Hapus soal ini dari bank soal?")) return;
    try { await api.delete(`/question-bank/${it.id}`); setSel(s => s.filter(x => x !== it.id)); load(); } catch { toast.error("Gagal menghapus"); }
  };
  const use = async () => {
    try { const r = await api.post("/question-bank/use", { ids: sel }); onPick(r.data); toast.success(`${r.data.length} soal ditambahkan dari Bank Soal`); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal mengambil soal"); }
  };
  const items = data?.items || [];
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4" data-testid="bank-picker-modal">
      <div className="bg-[#F4F6F5] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b bg-white rounded-t-2xl">
          <h3 className="font-heading font-bold flex items-center gap-2"><Library className="w-5 h-5 text-teal-700" />Bank Soal</h3>
          <button data-testid="bank-picker-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2 bg-white border-b">
          <label className="col-span-3 sm:col-span-1 flex items-center gap-2 px-3 rounded-xl border border-slate-200"><Search className="w-4 h-4 text-slate-400" />
            <input data-testid="bank-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari soal" className="py-2 text-sm outline-none w-full bg-transparent" /></label>
          <select data-testid="bank-subject-filter" value={subj} onChange={e => setSubj(e.target.value)} className={vgInput}>
            <option value="">Semua mapel</option>
            {[...new Set([subject, ...(data?.subjects || [])].filter(Boolean))].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select data-testid="bank-type-filter" value={type} onChange={e => setType(e.target.value)} className={vgInput}>
            <option value="">Semua tipe</option><option value="mc">Pilihan Ganda</option><option value="essay">Esai</option>
          </select>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto flex-1" data-testid="bank-list">
          {data === null && <p className="text-slate-400 italic text-sm">Memuat...</p>}
          {data && !items.length && <p data-testid="bank-empty" className="text-slate-400 text-sm text-center py-10">Bank soal masih kosong. Simpan soal berkualitas dari menu <b>Analisis</b> ujian.</p>}
          {items.map(it => <BankItem key={it.id} it={it} checked={sel.includes(it.id)} onDelete={() => del(it)}
            onToggle={() => setSel(s => s.includes(it.id) ? s.filter(x => x !== it.id) : [...s, it.id])} />)}
        </div>
        <div className="p-4 border-t bg-white rounded-b-2xl flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{sel.length} soal dipilih</p>
          <button data-testid="bank-use-button" disabled={!sel.length} onClick={use} className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Tambahkan ke Ujian</button>
        </div>
      </div>
    </div>
  );
}
