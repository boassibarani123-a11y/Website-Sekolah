import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Trash2, Timer, Lock, AlertTriangle, CalendarClock, Shuffle, ListChecks, AlignLeft, Plus, Library } from "lucide-react";
import { VortexLogo, vgInput, toLocalInput } from "./VortexLogo";
import { QuestionBankPicker } from "./QuestionBankPicker";

const blankMc = () => ({ type: "mc", q: "", options: ["", "", "", ""], answer: 0 });
const blankEssay = () => ({ type: "essay", q: "", options: [], answer: 0 });

function QuestionCard({ q, qi, onChange, onRemove }) {
  const set = (patch) => onChange({ ...q, ...patch });
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2" data-testid={`exam-question-${qi}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Soal {qi + 1}</span>
        <div className="flex items-center gap-2">
          <select data-testid={`exam-question-type-${qi}`} value={q.type}
            onChange={e => set(e.target.value === "essay" ? { type: "essay", options: [] } : { type: "mc", options: q.options?.length ? q.options : ["", "", "", ""], answer: 0 })}
            className="text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white">
            <option value="mc">Pilihan Ganda</option>
            <option value="essay">Esai</option>
          </select>
          <button data-testid={`exam-question-remove-${qi}`} onClick={onRemove} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <textarea data-testid={`exam-question-text-${qi}`} rows={2} placeholder="Tulis pertanyaan..." value={q.q}
        onChange={e => set({ q: e.target.value })} className={vgInput} />
      {q.type === "mc" ? (
        <div className="space-y-1.5">
          {q.options.map((o, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" data-testid={`exam-q${qi}-answer-${oi}`} checked={q.answer === oi} onChange={() => set({ answer: oi })} className="accent-teal-700" title="Kunci jawaban" />
              <input data-testid={`exam-q${qi}-option-${oi}`} placeholder={`Opsi ${String.fromCharCode(65 + oi)}`} value={o}
                onChange={e => { const ops = [...q.options]; ops[oi] = e.target.value; set({ options: ops }); }}
                className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white" />
              {q.options.length > 2 && (
                <button onClick={() => { const ops = q.options.filter((_, i) => i !== oi); set({ options: ops, answer: q.answer >= ops.length ? 0 : q.answer === oi ? 0 : q.answer > oi ? q.answer - 1 : q.answer }); }}
                  className="text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          {q.options.length < 6 && <button onClick={() => set({ options: [...q.options, ""] })} className="text-xs font-semibold text-teal-700 hover:underline">+ Opsi</button>}
          <p className="text-[10px] text-slate-400">Pilih bulatan di sebelah opsi untuk menandai kunci jawaban.</p>
        </div>
      ) : <p className="text-[11px] text-slate-500 italic">Siswa menjawab dengan teks bebas. Nilai (0–100) diinput guru pada menu hasil.</p>}
    </div>
  );
}

function ScheduleFields({ startAt, endAt, setStartAt, setEndAt }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><CalendarClock className="w-3 h-3" />Mulai</label>
        <input data-testid="exam-start-at-input" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={`mt-1 ${vgInput}`} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><CalendarClock className="w-3 h-3" />Selesai</label>
        <input data-testid="exam-end-at-input" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={`mt-1 ${vgInput}`} />
      </div>
    </div>
  );
}

export function ExamEditor({ klass, subjects = [], initial, onClose, onDone }) {
  const isEdit = !!initial?.id;
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(klass?.id || initial?.class_id || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [subject, setSubject] = useState(initial?.subject || subjects[0] || "");
  const [qs, setQs] = useState(initial?.questions?.length
    ? initial.questions.map(q => ({ type: q.type || "mc", q: q.q, options: [...(q.options || [])], answer: q.answer ?? 0 }))
    : [blankMc()]);
  const [password, setPassword] = useState("");
  const [timeLimit, setTimeLimit] = useState(initial?.time_limit || "");
  const [maxViolations, setMaxViolations] = useState(initial?.max_violations || 3);
  const [startAt, setStartAt] = useState(toLocalInput(initial?.start_at));
  const [endAt, setEndAt] = useState(toLocalInput(initial?.end_at));
  const [shuffleQ, setShuffleQ] = useState(initial?.shuffle_questions ?? true);
  const [shuffleO, setShuffleO] = useState(initial?.shuffle_options ?? true);
  const [kkm, setKkm] = useState(initial?.kkm ?? 75);
  const [busy, setBusy] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  useEffect(() => { if (!klass) api.get("/classes").then(r => setClasses(r.data)).catch(() => {}); }, [klass]);
  const selClass = klass || classes.find(c => c.id === classId);
  const subjOpts = subjects.length ? subjects : (selClass?.subjects || []);

  const submit = async () => {
    if (!title.trim()) return toast.error("Judul ujian wajib diisi");
    if (!selClass && !isEdit) return toast.error("Pilih kelas tujuan");
    if (!isEdit && !password.trim()) return toast.error("Token ujian wajib diisi");
    if (!qs.length || qs.some(q => !q.q.trim())) return toast.error("Semua soal harus memiliki pertanyaan");
    const body = {
      title, subject, questions: qs, time_limit: +timeLimit || 0, max_violations: +maxViolations || 3,
      start_at: startAt ? new Date(startAt).toISOString() : "", end_at: endAt ? new Date(endAt).toISOString() : "",
      shuffle_questions: shuffleQ, shuffle_options: shuffleO, kkm: Math.min(100, Math.max(0, +kkm || 0)),
    };
    setBusy(true);
    try {
      if (isEdit) {
        if (password.trim()) body.password = password.trim();
        await api.patch(`/exams/${initial.id}`, body);
        toast.success("Ujian diperbarui");
      } else {
        await api.post("/exams", { ...body, start_at: body.start_at || null, end_at: body.end_at || null,
          kelas: selClass.name, class_id: selClass.id, password: password.trim() });
        toast.success("Ujian diterbitkan");
      }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="exam-editor-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3"><VortexLogo size="sm" /><span className="text-slate-300">/</span><h3 className="font-heading font-bold">{isEdit ? "Edit Ujian" : "Buat Ujian"}</h3></div>
          <button data-testid="exam-editor-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <input data-testid="exam-title-input" placeholder="Judul ujian, mis. PTS Matematika Ganjil" value={title} onChange={e => setTitle(e.target.value)} className={vgInput} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Kelas Tujuan</label>
              {klass || isEdit ? <p className="mt-1 px-3 py-2.5 rounded-xl bg-slate-100 text-sm font-semibold">{klass?.name || initial?.kelas}</p> : (
                <select data-testid="exam-class-select" value={classId} onChange={e => { setClassId(e.target.value); setSubject(""); }} className={`mt-1 ${vgInput}`}>
                  <option value="">{classes.length ? "— Pilih kelas —" : "Memuat kelas..."}</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Mata Pelajaran</label>
              {subjOpts.length > 0 ? (
                <select data-testid="exam-subject-select" value={subject} onChange={e => setSubject(e.target.value)} className={`mt-1 ${vgInput}`}>
                  <option value="">— Pilih mapel —</option>
                  {subjOpts.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : <input data-testid="exam-subject-input" placeholder="Mapel" value={subject} onChange={e => setSubject(e.target.value)} className={`mt-1 ${vgInput}`} />}
            </div>
          </div>
          <ScheduleFields startAt={startAt} endAt={endAt} setStartAt={setStartAt} setEndAt={setEndAt} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Timer className="w-3 h-3" />Durasi (mnt)</label>
              <input data-testid="exam-time-limit-input" type="number" min={0} max={600} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="0 = bebas" className={`mt-1 ${vgInput}`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Maks. Pelanggaran</label>
              <input data-testid="exam-max-violations-input" type="number" min={1} max={10} value={maxViolations} onChange={e => setMaxViolations(e.target.value)} className={`mt-1 ${vgInput}`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">KKM</label>
              <input data-testid="exam-kkm-input" type="number" min={0} max={100} value={kkm} onChange={e => setKkm(e.target.value)} className={`mt-1 ${vgInput}`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Token {isEdit ? "" : "*"}</label>
              <input data-testid="exam-password-input" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? "Tetap" : "mis. VG2026"} className={`mt-1 ${vgInput} font-mono uppercase`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input data-testid="exam-shuffle-questions" type="checkbox" checked={shuffleQ} onChange={e => setShuffleQ(e.target.checked)} className="accent-teal-700" /><Shuffle className="w-3.5 h-3.5 text-slate-500" />Acak urutan soal</label>
            <label className="flex items-center gap-2"><input data-testid="exam-shuffle-options" type="checkbox" checked={shuffleO} onChange={e => setShuffleO(e.target.checked)} className="accent-teal-700" /><Shuffle className="w-3.5 h-3.5 text-slate-500" />Acak urutan opsi</label>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="font-heading font-bold text-sm">Daftar Soal <span className="text-slate-400 font-normal">({qs.length})</span></p>
            <button data-testid="exam-open-bank" onClick={() => setBankOpen(true)} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold flex items-center gap-1.5"><Library className="w-3.5 h-3.5" />Ambil dari Bank Soal</button>
          </div>
          {qs.map((q, qi) => (
            <QuestionCard key={qi} q={q} qi={qi} onChange={nq => setQs(qs.map((x, i) => i === qi ? nq : x))} onRemove={() => setQs(qs.filter((_, i) => i !== qi))} />
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button data-testid="exam-add-mc" onClick={() => setQs([...qs, blankMc()])} className="py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-teal-600 hover:text-teal-700 flex items-center justify-center gap-1.5 transition-colors"><Plus className="w-4 h-4" /><ListChecks className="w-4 h-4" />Pilihan Ganda</button>
            <button data-testid="exam-add-essay" onClick={() => setQs([...qs, blankEssay()])} className="py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-teal-600 hover:text-teal-700 flex items-center justify-center gap-1.5 transition-colors"><Plus className="w-4 h-4" /><AlignLeft className="w-4 h-4" />Esai</button>
          </div>
        </div>
        {bankOpen && <QuestionBankPicker subject={subject} onClose={() => setBankOpen(false)}
          onPick={(picked) => { setQs([...qs.filter(q => q.q.trim()), ...picked]); setBankOpen(false); }} />}
        <div className="p-5 border-t">
          <button data-testid="save-exam-button" disabled={busy} onClick={submit} className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold disabled:opacity-60 transition-colors">{busy ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Terbitkan Ujian"}</button>
        </div>
      </div>
    </div>
  );
}
