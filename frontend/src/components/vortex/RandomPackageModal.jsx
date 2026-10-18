import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Shuffle, AlertTriangle, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { vgInput } from "./VortexLogo";

const LEVELS = [["mudah", "Mudah", "bg-emerald-100 text-emerald-700"], ["sedang", "Sedang", "bg-amber-100 text-amber-700"], ["sulit", "Sulit", "bg-rose-100 text-rose-700"]];
const TONE = { Mudah: "bg-emerald-100 text-emerald-700", Sedang: "bg-amber-100 text-amber-700", Sukar: "bg-rose-100 text-rose-700" };

function LevelInput({ k, label, tone, value, stock, onChange }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between"><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${tone}`}>{label}</span>
        <span data-testid={`rp-stock-${k}`} className="text-[11px] text-slate-500">stok {stock ?? "…"}</span></div>
      <input data-testid={`rp-count-${k}`} type="number" min={0} max={100} value={value} onChange={e => onChange(Math.max(0, +e.target.value || 0))} className={`mt-2 ${vgInput}`} />
    </div>
  );
}

function PreviewList({ res }) {
  return (
    <div className="space-y-2" data-testid="rp-preview">
      {res.warnings.map(w => <p key={w} data-testid="rp-warning" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{w}</p>)}
      {res.questions.map((q, i) => (
        <div key={q.bank_id} data-testid={`rp-item-${i}`} className="border border-slate-200 rounded-xl p-3 bg-white">
          <div className="flex items-center gap-2 text-[10px] mb-1"><span className="font-bold text-slate-400">#{i + 1}</span>
            <span className={`px-1.5 py-0.5 rounded font-bold ${TONE[q.level]}`}>{q.level}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold">{q.type === "mc" ? "PG" : "Esai"}</span>
            {q.discrimination_label && <span className="text-slate-500">daya beda {q.discrimination_label}</span>}</div>
          <p className="text-sm font-semibold">{q.q}</p>
        </div>
      ))}
      {!res.questions.length && <p className="text-sm text-slate-500 text-center py-6">Tidak ada soal yang cocok di Bank Soal.</p>}
    </div>
  );
}

export function RandomPackageModal({ subject, onClose, onPick }) {
  const [subj, setSubj] = useState(subject || "");
  const [type, setType] = useState("");
  const [excludePoor, setExcludePoor] = useState(true);
  const [counts, setCounts] = useState({ mudah: 3, sedang: 4, sulit: 3 });
  const [stock, setStock] = useState({});
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams({ exclude_poor: excludePoor });
    if (subj) p.set("subject", subj);
    if (type) p.set("type", type);
    api.get(`/question-bank/stock?${p}`).then(r => setStock(r.data)).catch(() => setStock({}));
  }, [subj, type, excludePoor]);

  const generate = async () => {
    setBusy(true);
    try { const r = await api.post("/exams/random-package", { subject: subj || null, type: type || null, exclude_poor: excludePoor, ...counts }); setRes(r.data); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal membuat paket"); }
    finally { setBusy(false); }
  };
  const use = () => { onPick(res.questions.map(({ type, q, options, answer }) => ({ type, q, options: [...options], answer }))); toast.success(`${res.total} soal acak ditambahkan`); };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4" data-testid="random-package-modal">
      <div className="bg-[#F4F6F5] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b bg-white rounded-t-2xl">
          <h3 className="font-heading font-bold flex items-center gap-2"><Shuffle className="w-5 h-5 text-teal-700" />Paket Soal Acak</h3>
          <button data-testid="rp-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2">
            <input data-testid="rp-subject" value={subj} onChange={e => setSubj(e.target.value)} placeholder="Mapel (kosong = semua)" className={vgInput} />
            <select data-testid="rp-type" value={type} onChange={e => setType(e.target.value)} className={vgInput}>
              <option value="">Semua tipe</option><option value="mc">Pilihan Ganda</option><option value="essay">Esai</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map(([k, l, t]) => <LevelInput key={k} k={k} label={l} tone={t} value={counts[k]} stock={stock[k]} onChange={v => setCounts({ ...counts, [k]: v })} />)}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600"><input data-testid="rp-exclude-poor" type="checkbox" checked={excludePoor} onChange={e => setExcludePoor(e.target.checked)} className="accent-teal-700" />Lewati soal dengan daya beda "Jelek"</label>
          <button data-testid="rp-generate" disabled={busy} onClick={generate} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : res ? <RefreshCw className="w-4 h-4" /> : <Shuffle className="w-4 h-4" />}{res ? "Acak Ulang" : "Buat Paket & Pratinjau"}</button>
          {res && <PreviewList res={res} />}
        </div>
        <div className="p-4 border-t bg-white rounded-b-2xl flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500" data-testid="rp-total">{res ? `${res.total} soal siap` : "Belum ada pratinjau"}</p>
          <button data-testid="rp-use" disabled={!res?.total} onClick={use} className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Tambahkan ke Ujian</button>
        </div>
      </div>
    </div>
  );
}
