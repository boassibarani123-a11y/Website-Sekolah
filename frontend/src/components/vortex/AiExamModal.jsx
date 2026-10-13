import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { vgInput } from "./VortexLogo";

export function AiExamModal({ subject, kelas, onClose, onPick }) {
  const [status, setStatus] = useState(null);
  const [f, setF] = useState({ material: "", mc_count: 5, essay_count: 1, level: "campuran" });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/ai/status").then(r => setStatus(r.data)).catch(() => setStatus({ configured: false })); }, []);

  const gen = async () => {
    if (f.material.trim().length < 10) return toast.error("Tempel materi minimal 10 karakter");
    setBusy(true); setRes(null);
    try { const r = await api.post("/ai/exam-generate", { ...f, subject, kelas }, { timeout: 180000 }); setRes(r.data.questions); }
    catch (e) { toast.error(e.response?.data?.detail || "AI gagal membuat soal"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4" data-testid="ai-exam-modal">
      <div className="bg-[#F4F6F5] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b bg-white rounded-t-2xl">
          <h3 className="font-heading font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-teal-700" />Buat Soal dengan AI</h3>
          <button data-testid="ai-exam-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {status && !status.configured && <p data-testid="ai-not-configured" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Fitur AI belum dikonfigurasi.</p>}
          <textarea data-testid="ai-exam-material" rows={6} value={f.material} onChange={e => setF({ ...f, material: e.target.value })} placeholder="Tempel ringkasan materi / bab yang akan diujikan..." className={vgInput} />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] font-semibold text-slate-600 uppercase">Pilihan ganda<input data-testid="ai-exam-mc" type="number" min={0} max={20} value={f.mc_count} onChange={e => setF({ ...f, mc_count: +e.target.value || 0 })} className={`mt-1 ${vgInput}`} /></label>
            <label className="text-[11px] font-semibold text-slate-600 uppercase">Esai<input data-testid="ai-exam-essay" type="number" min={0} max={10} value={f.essay_count} onChange={e => setF({ ...f, essay_count: +e.target.value || 0 })} className={`mt-1 ${vgInput}`} /></label>
            <label className="text-[11px] font-semibold text-slate-600 uppercase">Kesukaran<select data-testid="ai-exam-level" value={f.level} onChange={e => setF({ ...f, level: e.target.value })} className={`mt-1 ${vgInput}`}>
              {["campuran", "mudah", "sedang", "sulit"].map(l => <option key={l} value={l}>{l}</option>)}</select></label>
          </div>
          <button data-testid="ai-exam-generate" disabled={busy || (status && !status.configured)} onClick={gen} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{busy ? "AI sedang menyusun soal..." : "Buat Soal"}</button>
          {res && <div className="space-y-2" data-testid="ai-exam-preview">{res.map((q, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3 bg-white text-sm"><p className="font-semibold"><span className="text-slate-400 mr-1">#{i + 1}</span>{q.q}</p>
              {q.type === "mc" ? <p className="text-[11px] text-slate-500 mt-1">{q.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}${j === q.answer ? " ✓" : ""}`).join("   ")}</p> : <p className="text-[11px] text-slate-500 mt-1 italic">Esai</p>}
            </div>))}</div>}
        </div>
        <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end">
          <button data-testid="ai-exam-use" disabled={!res?.length} onClick={() => { onPick(res); toast.success(`${res.length} soal AI ditambahkan`); }} className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><CheckCircle2 className="w-4 h-4" />Tambahkan ke Ujian</button>
        </div>
      </div>
    </div>
  );
}
