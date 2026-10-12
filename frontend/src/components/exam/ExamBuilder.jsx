import { useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, FileText, ListChecks, Settings2, ShieldAlert, Plus, PenLine } from "lucide-react";
import { inp, newPG, newEssay, toLocalInput, fromLocalInput, Toggle, VortexMark } from "./brand";
import { QuestionEditor } from "./QuestionEditor";
import { RulesEditor } from "./RulesEditor";

const TABS = [["info", "Informasi", FileText], ["soal", "Soal", ListChecks], ["tampilan", "Tampilan & Navigasi", Settings2], ["aturan", "Keamanan & Aturan", ShieldAlert]];

const fromInitial = (ex, subjects) => ({
  title: ex.title || "", subject: ex.subject || subjects[0] || "", description: ex.description || "", instructions: ex.instructions || "",
  questions: ex.questions?.length ? ex.questions.map(q => ({ ...newPG(), ...q, options: [...(q.options || [])] })) : [newPG()],
  time_limit: ex.time_limit || "", max_violations: ex.max_violations || 3, per_page: ex.per_page || 10,
  allow_back: ex.allow_back !== false, shuffle_questions: ex.shuffle_questions !== false, shuffle_options: ex.shuffle_options !== false,
  show_score: ex.show_score !== false, show_review: !!ex.show_review, passing_grade: ex.passing_grade ?? 70,
  start_at: toLocalInput(ex.start_at), end_at: toLocalInput(ex.end_at), rules: ex.rules || [], password: "",
});

export function ExamBuilder({ klass, subjects, initial, onClose, onDone }) {
  const isEdit = !!initial.id;
  const [f, setF] = useState(() => fromInitial(initial, subjects));
  const [tab, setTab] = useState("info");
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF(s => ({ ...s, ...patch }));
  const setQ = (i, q) => set({ questions: f.questions.map((x, j) => (j === i ? q : x)) });
  const moveQ = (i, d) => { const c = [...f.questions]; [c[i], c[i + d]] = [c[i + d], c[i]]; set({ questions: c }); };

  const summary = useMemo(() => {
    const qs = f.questions, essay = qs.filter(q => q.type === "essay").length;
    const pts = qs.reduce((s, q) => s + (+q.points || 0), 0);
    return { total: qs.length, essay, pg: qs.length - essay, pts, pages: Math.max(1, Math.ceil(qs.length / (+f.per_page || 10))) };
  }, [f.questions, f.per_page]);

  const submit = async () => {
    if (!f.title.trim()) { setTab("info"); return toast.error("Judul ujian wajib diisi"); }
    if (!isEdit && !f.password.trim()) { setTab("aturan"); return toast.error("Ujian wajib memiliki password"); }
    const body = {
      title: f.title.trim(), subject: f.subject, description: f.description, instructions: f.instructions,
      questions: f.questions.map(q => ({ ...q, points: +q.points || 1 })), time_limit: +f.time_limit || 0,
      max_violations: +f.max_violations || 3, per_page: +f.per_page || 10, allow_back: f.allow_back,
      shuffle_questions: f.shuffle_questions, shuffle_options: f.shuffle_options, show_score: f.show_score, show_review: f.show_review,
      passing_grade: +f.passing_grade || 0, start_at: fromLocalInput(f.start_at), end_at: fromLocalInput(f.end_at),
      rules: f.rules.filter(r => r.trim()),
    };
    if (f.password.trim()) body.password = f.password.trim();
    setBusy(true);
    try {
      if (isEdit) await api.patch(`/exams/${initial.id}`, body);
      else await api.post("/exams", { ...body, kelas: klass.name, class_id: klass.id });
      toast.success(isEdit ? "Ujian diperbarui" : "Ujian dibuat");
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" data-testid="exam-builder">
      <div className="bg-slate-50 rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-950 text-white">
          <div className="flex items-center gap-4 min-w-0"><VortexMark size="sm" dark /><span className="hidden sm:block h-6 w-px bg-white/20" />
            <h3 className="font-heading font-bold truncate">{isEdit ? "Edit Ujian" : "Buat Ujian Baru"} · {klass.name}</h3></div>
          <button data-testid="exam-builder-close" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 px-3 sm:px-5 pt-3 overflow-x-auto bg-white border-b border-slate-200">
          {TABS.map(([k, l, Icon]) => (
            <button key={k} data-testid={`builder-tab-${k}`} onClick={() => setTab(k)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${tab === k ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              <Icon className="w-4 h-4" />{l}{k === "soal" && <span className="ml-1 px-1.5 rounded-full bg-slate-100 text-[10px]">{summary.total}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden grid lg:grid-cols-[1fr_260px]">
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
            {tab === "info" && <InfoTab f={f} set={set} subjects={subjects} />}
            {tab === "soal" && (
              <>
                {f.questions.map((q, i) => (
                  <QuestionEditor key={i} q={q} idx={i} total={f.questions.length} onChange={(nq) => setQ(i, nq)} onMove={(d) => moveQ(i, d)}
                    onDuplicate={() => { const c = [...f.questions]; c.splice(i + 1, 0, { ...q, options: [...q.options] }); set({ questions: c }); }}
                    onDelete={() => set({ questions: f.questions.filter((_, j) => j !== i) })} />
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <button data-testid="add-pg-question" onClick={() => set({ questions: [...f.questions, newPG()] })} className="py-3 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors"><Plus className="w-4 h-4" />Soal Pilihan Ganda</button>
                  <button data-testid="add-essay-question" onClick={() => set({ questions: [...f.questions, newEssay()] })} className="py-3 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-semibold text-slate-600 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors"><PenLine className="w-4 h-4" />Soal Essay</button>
                </div>
              </>
            )}
            {tab === "tampilan" && <DisplayTab f={f} set={set} pages={summary.pages} />}
            {tab === "aturan" && <SecurityTab f={f} set={set} isEdit={isEdit} />}
          </div>
          <aside className="hidden lg:flex flex-col gap-3 p-5 border-l border-slate-200 bg-white overflow-y-auto">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Ringkasan</p>
            {[["Total soal", summary.total], ["Pilihan ganda", summary.pg], ["Essay", summary.essay], ["Total bobot", summary.pts],
              ["Soal / halaman", f.per_page], ["Jumlah halaman", summary.pages], ["Navigasi", f.allow_back ? "Boleh kembali" : "Maju saja"],
              ["Durasi", f.time_limit ? `${f.time_limit} mnt` : "Tanpa batas"], ["KKM", f.passing_grade], ["Peraturan", f.rules.length]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm border-b border-dashed border-slate-100 pb-2"><span className="text-slate-500">{l}</span><b className="text-slate-900">{v}</b></div>
            ))}
          </aside>
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white border-t border-slate-200">
          <p className="text-xs text-slate-500 hidden sm:block">{summary.total} soal · {summary.pages} halaman · bobot {summary.pts}</p>
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
            <button data-testid="save-exam-button" disabled={busy} onClick={submit} className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">{busy ? "Menyimpan…" : "Simpan Ujian"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const Label = ({ children }) => <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{children}</label>;

function InfoTab({ f, set, subjects }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div><Label>Judul Ujian *</Label><input data-testid="exam-title-input" value={f.title} onChange={e => set({ title: e.target.value })} placeholder="mis. Penilaian Akhir Semester Bahasa Indonesia" className={`mt-1 ${inp}`} /></div>
      <div><Label>Mata Pelajaran</Label>
        {subjects.length > 0
          ? <select data-testid="exam-subject-select" value={f.subject} onChange={e => set({ subject: e.target.value })} className={`mt-1 ${inp}`}>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select>
          : <input data-testid="exam-subject-input" value={f.subject} onChange={e => set({ subject: e.target.value })} placeholder="Mapel" className={`mt-1 ${inp}`} />}
      </div>
      <div><Label>Deskripsi</Label><textarea data-testid="exam-description-input" rows={2} value={f.description} onChange={e => set({ description: e.target.value })} placeholder="Cakupan materi, tujuan ujian…" className={`mt-1 ${inp}`} /></div>
      <div><Label>Petunjuk Pengerjaan</Label><textarea data-testid="exam-instructions-input" rows={4} value={f.instructions} onChange={e => set({ instructions: e.target.value })} placeholder="Petunjuk yang ditampilkan kepada siswa sebelum dan selama ujian…" className={`mt-1 ${inp}`} /></div>
    </div>
  );
}

function DisplayTab({ f, set, pages }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <Label>Jumlah Soal per Halaman</Label>
        <div className="flex flex-wrap gap-2 items-center">
          {[1, 5, 10, 15, 20, 25].map(n => (
            <button key={n} type="button" data-testid={`per-page-${n}`} onClick={() => set({ per_page: n })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${+f.per_page === n ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{n}</button>
          ))}
          <input data-testid="per-page-input" type="number" min={1} max={50} value={f.per_page} onChange={e => set({ per_page: e.target.value })} className="w-24 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm" />
        </div>
        <p className="text-xs text-slate-500">Dengan {f.questions.length} soal, ujian terbagi menjadi <b>{pages} halaman</b>.</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
        <Toggle testid="toggle-allow-back" checked={f.allow_back} onChange={v => set({ allow_back: v })} label="Izinkan kembali ke halaman sebelumnya"
          desc={f.allow_back ? "Siswa bebas berpindah halaman maju & mundur." : "Siswa hanya bisa maju. Halaman yang sudah dilewati dikunci (dijaga server)."} />
        <Toggle testid="toggle-shuffle-questions" checked={f.shuffle_questions} onChange={v => set({ shuffle_questions: v })} label="Acak urutan soal" desc="Setiap siswa mendapat urutan soal berbeda." />
        <Toggle testid="toggle-shuffle-options" checked={f.shuffle_options} onChange={v => set({ shuffle_options: v })} label="Acak urutan opsi PG" desc="Pilihan jawaban diacak per siswa." />
        <Toggle testid="toggle-show-score" checked={f.show_score} onChange={v => set({ show_score: v })} label="Tampilkan nilai ke siswa" desc="Siswa melihat nilainya setelah mengirim jawaban." />
        <Toggle testid="toggle-show-review" checked={f.show_review} onChange={v => set({ show_review: v })} label="Tampilkan komentar koreksi ke siswa" desc="Siswa dapat melihat komentar per soal essay setelah dikoreksi." />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-3 gap-4">
        <div><Label>Batas Waktu (menit)</Label><input data-testid="exam-time-limit-input" type="number" min={0} max={600} value={f.time_limit} onChange={e => set({ time_limit: e.target.value })} placeholder="0 = tanpa batas" className={`mt-1 ${inp}`} /></div>
        <div><Label>Waktu Buka</Label><input data-testid="exam-start-at-input" type="datetime-local" value={f.start_at} onChange={e => set({ start_at: e.target.value })} className={`mt-1 ${inp}`} /></div>
        <div><Label>Waktu Tutup</Label><input data-testid="exam-end-at-input" type="datetime-local" value={f.end_at} onChange={e => set({ end_at: e.target.value })} className={`mt-1 ${inp}`} /></div>
        <div><Label>KKM (0-100)</Label><input data-testid="exam-passing-grade-input" type="number" min={0} max={100} value={f.passing_grade} onChange={e => set({ passing_grade: e.target.value })} className={`mt-1 ${inp}`} /></div>
      </div>
    </div>
  );
}

function SecurityTab({ f, set, isEdit }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-2 gap-4">
        <div><Label>Password Ujian {isEdit ? "(kosongkan jika tidak diubah)" : "*"}</Label>
          <input data-testid="exam-password-input" value={f.password} onChange={e => set({ password: e.target.value })} placeholder={isEdit ? "Kosongkan jika tidak diubah" : "Password untuk masuk ujian"} className={`mt-1 ${inp}`} /></div>
        <div><Label>Maks. Pelanggaran</Label>
          <input data-testid="exam-max-violations-input" type="number" min={1} max={20} value={f.max_violations} onChange={e => set({ max_violations: e.target.value })} className={`mt-1 ${inp}`} /></div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5"><RulesEditor rules={f.rules} onChange={rules => set({ rules })} /></div>
    </div>
  );
}
