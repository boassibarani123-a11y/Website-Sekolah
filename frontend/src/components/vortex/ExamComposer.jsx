import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Plus, ListChecks, AlignLeft, Library, Shuffle, Lock } from "lucide-react";
import { vgInput, toLocalInput } from "./VortexLogo";
import { QuestionCard, ScheduleFields, EXAM_TYPES, blankMc, blankEssay } from "./ExamEditor";
import { QuestionBankPicker } from "./QuestionBankPicker";
import { RandomPackageModal } from "./RandomPackageModal";

const Lbl = ({ children }) => <label className="text-xs font-semibold text-slate-600 uppercase">{children}</label>;

function ClassPicker({ classes, sel, setSel }) {
  const grades = [...new Set(classes.map(c => (c.name.match(/^[A-Z]+/) || [""])[0]).filter(Boolean))];
  const toggle = (id) => setSel(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  const pickGrade = (g) => setSel([...new Set([...sel, ...classes.filter(c => c.name.startsWith(g)).map(c => c.id)])]);
  return (
    <div className="space-y-2" data-testid="composer-class-picker">
      <div className="flex flex-wrap gap-1.5">
        {grades.map(g => <button key={g} type="button" data-testid={`composer-grade-${g}`} onClick={() => pickGrade(g)} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold">+ Semua kelas {g}</button>)}
        <button type="button" data-testid="composer-class-all" onClick={() => setSel(classes.map(c => c.id))} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold">Pilih semua</button>
        <button type="button" data-testid="composer-class-clear" onClick={() => setSel([])} className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold">Kosongkan</button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 max-h-40 overflow-y-auto">
        {classes.map(c => (
          <label key={c.id} className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${sel.includes(c.id) ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-200"}`}>
            <input type="checkbox" data-testid={`composer-class-${c.name}`} checked={sel.includes(c.id)} onChange={() => toggle(c.id)} className="accent-teal-700" />{c.name}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{sel.length} kelas dipilih · soal sama untuk semua kelas, urutan soal & opsi diacak per siswa.</p>
    </div>
  );
}

export function ExamComposer({ mode = "request", initial, onClose, onDone }) {
  const bulk = mode === "bulk";
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [f, setF] = useState({
    exam_type: initial?.exam_type || "UTS", title: initial?.title || "", subject: initial?.subject || "",
    start: toLocalInput(initial?.start_at), end: toLocalInput(initial?.end_at),
    time_limit: initial?.time_limit ?? 90, kkm: initial?.kkm ?? 75, note: initial?.note || "", password: "", max_violations: 3,
  });
  const [sel, setSel] = useState(initial?.class_ids || []);
  const [qs, setQs] = useState(initial?.questions?.length ? initial.questions.map(q => ({ ...q, options: [...(q.options || [])] })) : [blankMc()]);
  const [busy, setBusy] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [randOpen, setRandOpen] = useState(false);
  useEffect(() => {
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
    api.get("/subjects").then(r => setSubjects(r.data.map(s => s.name))).catch(() => {});
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const addPicked = (picked) => setQs([...qs.filter(q => q.q.trim()), ...picked]);

  const save = async (submit) => {
    if (!f.title.trim() || !f.subject) return toast.error("Judul dan mata pelajaran wajib diisi");
    if (!sel.length) return toast.error("Pilih minimal satu kelas");
    if (!f.start || !f.end) return toast.error("Tanggal & jam mulai/selesai wajib diisi");
    if (qs.some(q => !q.q.trim())) return toast.error("Semua soal harus memiliki pertanyaan");
    if (bulk && f.password.trim().length < 3) return toast.error("Token ujian minimal 3 karakter");
    const body = { exam_type: f.exam_type, title: f.title.trim(), subject: f.subject, class_ids: sel, questions: qs,
      start_at: new Date(f.start).toISOString(), end_at: new Date(f.end).toISOString(), time_limit: +f.time_limit || 0, kkm: +f.kkm || 0 };
    setBusy(true);
    try {
      if (bulk) {
        const r = await api.post("/exams/bulk", { ...body, password: f.password.trim(), max_violations: +f.max_violations || 3 });
        toast.success(`${r.data.created} ujian dibuat untuk ${r.data.created} kelas`);
      } else {
        const payload = { ...body, note: f.note };
        initial?.id ? await api.patch(`/exam-requests/${initial.id}?submit=${submit}`, payload) : await api.post(`/exam-requests?submit=${submit}`, payload);
        toast.success(submit ? "Pengajuan dikirim ke Super Admin" : "Draf disimpan");
      }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail?.[0]?.msg || e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="exam-composer-modal">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold text-lg">{bulk ? "Buat Ujian Massal" : initial?.id ? "Edit Pengajuan Ujian" : "Siapkan Soal & Ajukan Ujian"}</h3>
          <button data-testid="composer-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex gap-1.5 flex-wrap">
            {EXAM_TYPES.map(t => <button key={t} type="button" data-testid={`composer-type-${t}`} onClick={() => setF({ ...f, exam_type: t })} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${f.exam_type === t ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>{t}</button>)}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Lbl>Judul Ujian</Lbl><input data-testid="composer-title" value={f.title} onChange={set("title")} placeholder="mis. UTS Matematika Ganjil" className={`mt-1 ${vgInput}`} /></div>
            <div><Lbl>Mata Pelajaran</Lbl>
              <select data-testid="composer-subject" value={f.subject} onChange={set("subject")} className={`mt-1 ${vgInput}`}>
                <option value="">— Pilih mapel —</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div><Lbl>Kelas Peserta</Lbl><div className="mt-1"><ClassPicker classes={classes} sel={sel} setSel={setSel} /></div></div>
          <ScheduleFields startAt={f.start} endAt={f.end} setStartAt={(v) => setF(s => ({ ...s, start: v }))} setEndAt={(v) => setF(s => ({ ...s, end: v }))} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Lbl>Durasi (menit)</Lbl><input data-testid="composer-time-limit" type="number" min={0} max={600} value={f.time_limit} onChange={set("time_limit")} className={`mt-1 ${vgInput}`} /></div>
            <div><Lbl>KKM</Lbl><input data-testid="composer-kkm" type="number" min={0} max={100} value={f.kkm} onChange={set("kkm")} className={`mt-1 ${vgInput}`} /></div>
            {bulk && <>
              <div><Lbl><Lock className="w-3 h-3 inline" /> Token *</Lbl><input data-testid="composer-token" value={f.password} onChange={set("password")} placeholder="mis. UTS2026" className={`mt-1 ${vgInput} font-mono uppercase`} /></div>
              <div><Lbl>Maks. Pelanggaran</Lbl><input data-testid="composer-max-violations" type="number" min={1} max={10} value={f.max_violations} onChange={set("max_violations")} className={`mt-1 ${vgInput}`} /></div>
            </>}
          </div>
          {!bulk && <div><Lbl>Catatan untuk Super Admin</Lbl><textarea data-testid="composer-note" rows={2} value={f.note} onChange={set("note")} className={`mt-1 ${vgInput}`} /></div>}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="font-heading font-bold text-sm">Daftar Soal <span className="text-slate-400 font-normal">({qs.length})</span></p>
            <div className="flex gap-1.5">
              <button data-testid="composer-open-random" onClick={() => setRandOpen(true)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1.5"><Shuffle className="w-3.5 h-3.5" />Paket Acak</button>
              <button data-testid="composer-open-bank" onClick={() => setBankOpen(true)} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold flex items-center gap-1.5"><Library className="w-3.5 h-3.5" />Ambil dari Bank Soal</button>
            </div>
          </div>
          {qs.map((q, qi) => <QuestionCard key={qi} q={q} qi={qi} onChange={nq => setQs(qs.map((x, i) => i === qi ? nq : x))} onRemove={() => setQs(qs.filter((_, i) => i !== qi))} />)}
          <div className="grid grid-cols-2 gap-2">
            <button data-testid="composer-add-mc" onClick={() => setQs([...qs, blankMc()])} className="py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /><ListChecks className="w-4 h-4" />Pilihan Ganda</button>
            <button data-testid="composer-add-essay" onClick={() => setQs([...qs, blankEssay()])} className="py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /><AlignLeft className="w-4 h-4" />Esai</button>
          </div>
        </div>
        {bankOpen && <QuestionBankPicker subject={f.subject} onClose={() => setBankOpen(false)} onPick={(p) => { addPicked(p); setBankOpen(false); }} />}
        {randOpen && <RandomPackageModal subject={f.subject} onClose={() => setRandOpen(false)} onPick={(p) => { addPicked(p); setRandOpen(false); }} />}
        <div className="p-5 border-t flex gap-2">
          {bulk ? <button data-testid="composer-create-bulk" disabled={busy} onClick={() => save(true)} className="flex-1 py-3 bg-teal-700 text-white rounded-xl font-semibold disabled:opacity-60">{busy ? "Membuat..." : `Buat Ujian untuk ${sel.length} Kelas`}</button> : <>
            <button data-testid="composer-save-draft" disabled={busy} onClick={() => save(false)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-semibold disabled:opacity-60">Simpan Draf</button>
            <button data-testid="composer-submit" disabled={busy} onClick={() => save(true)} className="flex-1 py-3 bg-teal-700 text-white rounded-xl font-semibold disabled:opacity-60">Kirim ke Super Admin</button>
          </>}
        </div>
      </div>
    </div>
  );
}
