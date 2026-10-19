import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Library, Plus, Search, Pencil, Trash2, X } from "lucide-react";

const inp = "w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-teal-600 outline-none text-sm bg-white";
const LEVELS = [["mudah", "Mudah"], ["sedang", "Sedang"], ["sulit", "Sukar"]];
const CATS = [["keduanya", "Ujian & Quiz"], ["ujian", "Ujian"], ["quiz", "Quiz"]];
const TONE = { Mudah: "bg-emerald-100 text-emerald-700", Sedang: "bg-amber-100 text-amber-700", Sukar: "bg-rose-100 text-rose-700" };
const levelKey = (lbl) => (LEVELS.find(([, l]) => l === lbl) || ["sedang"])[0];

function BankForm({ initial, subjects, onClose, onSaved }) {
  const [f, setF] = useState(initial ? { subject: initial.subject || "", kelas: initial.kelas || "", type: initial.type, q: initial.q,
    options: initial.type === "mc" ? [...initial.options] : ["", "", "", ""], answer: initial.answer || 0,
    level: levelKey(initial.difficulty_label), category: initial.category || "keduanya" }
    : { subject: subjects[0] || "", kelas: "", type: "mc", q: "", options: ["", "", "", ""], answer: 0, level: "sedang", category: "keduanya" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (again) => {
    setBusy(true);
    try {
      initial ? await api.patch(`/question-bank/${initial.id}`, f) : await api.post("/question-bank", f);
      toast.success("Soal disimpan ke Bank Soal");
      if (again) setF({ ...f, q: "", options: ["", "", "", ""], answer: 0 }); else onSaved();
      if (again) onSaved(true);
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="bank-form-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white"><h3 className="font-heading font-bold text-lg">{initial ? "Edit Soal" : "Buat Soal Baru"}</h3><button onClick={onClose} data-testid="bank-form-close"><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600 uppercase">Mata Pelajaran
              <select data-testid="bank-form-subject" value={f.subject} onChange={set("subject")} className={`mt-1 ${inp}`}>
                <option value="">— Pilih mapel —</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select></label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Tingkat / Kelas (opsional)<input data-testid="bank-form-kelas" value={f.kelas} onChange={set("kelas")} placeholder="mis. X" className={`mt-1 ${inp}`} /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-slate-600 uppercase">Tipe<select data-testid="bank-form-type" value={f.type} onChange={set("type")} className={`mt-1 ${inp}`}><option value="mc">Pilihan Ganda</option><option value="essay">Esai</option></select></label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Kesukaran<select data-testid="bank-form-level" value={f.level} onChange={set("level")} className={`mt-1 ${inp}`}>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600 uppercase">Untuk<select data-testid="bank-form-category" value={f.category} onChange={set("category")} className={`mt-1 ${inp}`}>{CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <textarea data-testid="bank-form-q" rows={3} value={f.q} onChange={set("q")} placeholder="Tulis pertanyaan..." className={inp} />
          {f.type === "mc" && (
            <div className="space-y-1.5">
              {f.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" data-testid={`bank-form-answer-${i}`} checked={f.answer === i} onChange={() => setF({ ...f, answer: i })} className="accent-teal-700" />
                  <input data-testid={`bank-form-option-${i}`} value={o} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} onChange={e => { const ops = [...f.options]; ops[i] = e.target.value; setF({ ...f, options: ops }); }} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              ))}
              {f.options.length < 6 && <button onClick={() => setF({ ...f, options: [...f.options, ""] })} className="text-xs font-semibold text-teal-700">+ Opsi</button>}
              <p className="text-[11px] text-slate-400">Pilih bulatan untuk menandai kunci jawaban.</p>
            </div>
          )}
        </div>
        <div className="p-5 border-t flex gap-2">
          {!initial && <button data-testid="bank-form-save-again" disabled={busy} onClick={() => save(true)} className="flex-1 py-2.5 border-2 border-teal-700 text-teal-700 rounded-xl font-semibold disabled:opacity-60">Simpan & Buat Lagi</button>}
          <button data-testid="bank-form-save" disabled={busy} onClick={() => save(false)} className="flex-1 py-2.5 bg-teal-700 text-white rounded-xl font-semibold disabled:opacity-60">Simpan</button>
        </div>
      </div>
    </div>
  );
}

export default function QuestionBank() {
  const [data, setData] = useState({ items: [], subjects: [] });
  const [subjects, setSubjects] = useState([]);
  const [subj, setSubj] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (subj) p.set("subject", subj); if (type) p.set("type", type); if (q) p.set("q", q);
    api.get(`/question-bank?${p}`).then(r => setData(r.data)).catch(() => {});
  }, [subj, type, q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get("/subjects").then(r => setSubjects(r.data.map(s => s.name))).catch(() => {}); }, []);
  const del = async (it) => {
    if (!window.confirm("Hapus soal ini dari Bank Soal?")) return;
    try { await api.delete(`/question-bank/${it.id}`); toast.success("Soal dihapus"); load(); } catch { toast.error("Gagal menghapus"); }
  };
  const allSubj = [...new Set([...subjects, ...data.subjects])];
  return (
    <div className="space-y-6" data-testid="question-bank-page">
      <div className="rounded-3xl bg-gradient-to-br from-teal-950 via-slate-950 to-slate-900 text-white p-7 sm:p-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-300">Simpan sekali, pakai berkali-kali</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold mt-2 flex items-center gap-3"><Library className="w-9 h-9 text-teal-300" />Bank Soal</h1>
          <p className="mt-2 text-slate-300 text-sm max-w-xl">Siapkan soal ujian & quiz di sini. Tarik kapan saja saat membuat ujian, quiz, atau pengajuan ujian ke Super Admin.</p>
        </div>
        <button data-testid="bank-new" onClick={() => setForm({})} className="px-5 py-3 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold flex items-center gap-2"><Plus className="w-5 h-5" />Buat Soal</button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="flex items-center gap-2 px-3 rounded-xl border border-slate-200 bg-white"><Search className="w-4 h-4 text-slate-400" /><input data-testid="bank-page-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari soal" className="py-2 text-sm outline-none" /></label>
        <select data-testid="bank-page-subject" value={subj} onChange={e => setSubj(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"><option value="">Semua mapel</option>{allSubj.map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select data-testid="bank-page-type" value={type} onChange={e => setType(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"><option value="">Semua tipe</option><option value="mc">Pilihan Ganda</option><option value="essay">Esai</option></select>
        <span className="ml-auto text-sm text-slate-500" data-testid="bank-count">{data.items.length} soal</span>
      </div>
      <div className="space-y-2">
        {data.items.length === 0 && <p data-testid="bank-page-empty" className="text-center text-slate-400 py-14">Belum ada soal. Klik "Buat Soal" untuk mulai.</p>}
        {data.items.map((it, i) => (
          <div key={it.id} data-testid={`bank-row-${it.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 whitespace-pre-wrap">{it.q}</p>
              {it.type === "mc" && <ol className="mt-1 text-xs text-slate-600 grid sm:grid-cols-2 gap-x-4">{it.options.map((o, oi) => <li key={oi} className={oi === it.answer ? "font-bold text-emerald-700" : ""}>{String.fromCharCode(65 + oi)}. {o}{oi === it.answer ? " ✓" : ""}</li>)}</ol>}
              <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-semibold">
                <span className="px-1.5 py-0.5 rounded bg-slate-100">{it.type === "mc" ? "PG" : "Esai"}</span>
                {it.subject && <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700">{it.subject}</span>}
                {it.kelas && <span className="px-1.5 py-0.5 rounded bg-slate-100">Kelas {it.kelas}</span>}
                {it.difficulty_label && <span className={`px-1.5 py-0.5 rounded ${TONE[it.difficulty_label] || "bg-slate-100"}`}>{it.difficulty_label}</span>}
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{(CATS.find(([k]) => k === (it.category || "keduanya")) || CATS[0])[1]}</span>
                <span className="text-slate-400 font-normal">dipakai {it.used_count || 0}×</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button data-testid={`bank-edit-${it.id}`} onClick={() => setForm(it)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
              <button data-testid={`bank-del-${it.id}`} onClick={() => del(it)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
      {form && <BankForm initial={form.id ? form : null} subjects={allSubj} onClose={() => setForm(null)} onSaved={(keep) => { load(); if (!keep) setForm(null); }} />}
    </div>
  );
}
