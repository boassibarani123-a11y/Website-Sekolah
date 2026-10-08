import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, X, Trash2, Pencil, ShieldCheck, Timer, Lock, AlertTriangle, Maximize, CheckCircle2 } from "lucide-react";

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function ClassExam({ klass, subject, teachSubjects, isTeacher, canManage }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [taking, setTaking] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);

  const load = useCallback(() => {
    const q = subject && subject !== "all" ? `&subject=${encodeURIComponent(subject)}` : "";
    api.get(`/exams?class_id=${klass.id}${q}`).then(r => setList(r.data)).catch(() => {});
  }, [klass.id, subject]);
  useEffect(() => { load(); }, [load]);

  const del = async (ex) => {
    if (!window.confirm(`Hapus ujian "${ex.title}"?`)) return;
    try { await api.delete(`/exams/${ex.id}`); toast.success("Ujian dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-4" data-testid="class-exam-tab">
      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800 flex items-start gap-2">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <span>Ujian <b>Anti-Nyontek</b>: butuh password untuk masuk, otomatis mulai & masuk layar penuh. Pindah tab / keluar layar penuh akan tercatat sebagai pelanggaran; setelah batas pelanggaran, ujian dikirim otomatis.</span>
      </div>

      {canManage && (
        <button data-testid="new-exam-button" onClick={() => setShowNew(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" />Buat Ujian
        </button>
      )}

      {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">Belum ada ujian{subject && subject !== "all" ? ` untuk ${subject}` : ""}.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(ex => (
          <div key={ex.id} data-testid={`exam-card-${ex.id}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
                {ex.subject && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">{ex.subject}</span>}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700"><Lock className="w-3 h-3" />Berpassword</span>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button data-testid={`edit-exam-${ex.id}`} onClick={() => setEditItem(ex)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                  <button data-testid={`delete-exam-${ex.id}`} onClick={() => del(ex)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            <h3 className="font-heading font-bold mt-3">{ex.title}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {ex.question_count ?? (ex.questions || []).length} soal
              {ex.time_limit ? ` · ⏱ ${ex.time_limit} menit` : ""}
              {` · maks ${ex.max_violations || 3}× pelanggaran`}
            </p>
            {!isTeacher ? (
              <button data-testid={`take-exam-${ex.id}`} onClick={() => setTaking(ex)}
                className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">Mulai Ujian</button>
            ) : (
              <button data-testid={`exam-results-${ex.id}`} onClick={() => setResultsFor(ex)}
                className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">Lihat Hasil</button>
            )}
          </div>
        ))}
      </div>

      {showNew && <ExamModal klass={klass} subjects={teachSubjects} onClose={() => setShowNew(false)} onDone={() => { load(); setShowNew(false); }} />}
      {editItem && <ExamModal klass={klass} subjects={teachSubjects} initial={editItem} onClose={() => setEditItem(null)} onDone={() => { load(); setEditItem(null); }} />}
      {taking && <ExamTakeModal exam={taking} onClose={() => setTaking(null)} onDone={() => setTaking(null)} />}
      {resultsFor && <ExamResultsModal exam={resultsFor} onClose={() => setResultsFor(null)} />}
    </div>
  );
}

function ExamModal({ klass, subjects, initial, onClose, onDone }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial?.title || "");
  const [subject, setSubject] = useState(initial?.subject || subjects[0] || "");
  const [qs, setQs] = useState(initial?.questions?.length
    ? initial.questions.map(q => ({ q: q.q, options: [...(q.options || ["", "", "", ""])], answer: q.answer ?? 0 }))
    : [{ q: "", options: ["", "", "", ""], answer: 0 }]);
  const [password, setPassword] = useState("");
  const [timeLimit, setTimeLimit] = useState(initial?.time_limit || "");
  const [maxViolations, setMaxViolations] = useState(initial?.max_violations || 3);
  const [busy, setBusy] = useState(false);
  const add = () => setQs([...qs, { q: "", options: ["", "", "", ""], answer: 0 }]);

  const submit = async () => {
    if (!title.trim()) return toast.error("Judul ujian wajib diisi");
    if (!isEdit && !password.trim()) return toast.error("Ujian wajib memiliki password");
    setBusy(true);
    try {
      if (isEdit) {
        const body = { title, subject, questions: qs, time_limit: +timeLimit || 0, max_violations: +maxViolations || 3 };
        if (password.trim()) body.password = password.trim();
        await api.patch(`/exams/${initial.id}`, body);
        toast.success("Ujian diperbarui");
      } else {
        await api.post("/exams", { title, kelas: klass.name, class_id: klass.id, subject, questions: qs, time_limit: +timeLimit || 0, max_violations: +maxViolations || 3, password: password.trim() });
        toast.success("Ujian dibuat");
      }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">{isEdit ? "Edit Ujian" : "Buat Ujian Anti-Nyontek"}</h3>
          <button onClick={onClose} className="p-1.5"><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-3">
          <input data-testid="exam-title-input" placeholder="Judul ujian" value={title} onChange={e => setTitle(e.target.value)} className={inp} />
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Mata Pelajaran</label>
            {subjects.length > 0 ? (
              <select data-testid="exam-subject-select" value={subject} onChange={e => setSubject(e.target.value)} className={`mt-1 ${inp}`}>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input placeholder="Mapel" value={subject} onChange={e => setSubject(e.target.value)} className={`mt-1 ${inp}`} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Timer className="w-3 h-3" />Batas Waktu (menit)</label>
              <input data-testid="exam-time-limit-input" type="number" min={0} max={600} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="0 = tanpa batas" className={`mt-1 ${inp}`} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Maks. Pelanggaran</label>
              <input data-testid="exam-max-violations-input" type="number" min={1} max={10} value={maxViolations} onChange={e => setMaxViolations(e.target.value)} className={`mt-1 ${inp}`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Password Ujian {isEdit ? "(kosongkan jika tidak diubah)" : "*"}</label>
            <input data-testid="exam-password-input" type="text" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={isEdit ? "Kosongkan jika tidak ingin mengubah" : "Password untuk masuk ujian"} className={`mt-1 ${inp}`} />
            <p className="mt-1 text-[10px] text-slate-400">Siswa harus memasukkan password ini untuk memulai ujian. Ujian langsung mulai setelah password benar.</p>
          </div>
          {qs.map((q, qi) => (
            <div key={qi} className="p-3 bg-slate-50 rounded-xl space-y-2 relative">
              <button onClick={() => setQs(qs.filter((_, i) => i !== qi))} className="absolute top-2 right-2 text-rose-500"><Trash2 className="w-4 h-4" /></button>
              <input placeholder={`Soal #${qi + 1}`} value={q.q} onChange={e => { const c = [...qs]; c[qi].q = e.target.value; setQs(c); }} className="w-full px-3 py-2 border rounded-lg text-sm" />
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" checked={q.answer === oi} onChange={() => { const c = [...qs]; c[qi].answer = oi; setQs(c); }} />
                  <input placeholder={`Opsi ${oi + 1}`} value={o} onChange={e => { const c = [...qs]; c[qi].options[oi] = e.target.value; setQs(c); }} className="flex-1 px-2 py-1 border rounded text-sm" />
                </div>
              ))}
            </div>
          ))}
          <button onClick={add} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:border-indigo-500">+ Tambah Soal</button>
          <button data-testid="save-exam-button" disabled={busy} onClick={submit} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold disabled:opacity-60">{busy ? "Menyimpan..." : "Simpan Ujian"}</button>
        </div>
      </div>
    </div>
  );
}

export function ExamTakeModal({ exam, onClose, onDone }) {
  const [phase, setPhase] = useState("password"); // password | running | done
  const [password, setPassword] = useState("");
  const [starting, setStarting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(null);
  const [violations, setViolations] = useState(0);
  const [busy, setBusy] = useState(false);
  const maxV = exam.max_violations || 3;

  const answersRef = useRef(answers); answersRef.current = answers;
  const violationsRef = useRef(0);
  const sentRef = useRef(false);
  const finishedRef = useRef(false);
  const timerRef = useRef(null);

  const exitFullscreen = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* noop */ }
  };

  const submit = useCallback(async (auto = false) => {
    if (sentRef.current) return;
    sentRef.current = true;
    finishedRef.current = true;
    setBusy(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const r = await api.post("/exams/attempt", {
        exam_id: exam.id, answers: answersRef.current,
        violations: violationsRef.current, auto_submitted: auto,
      });
      exitFullscreen();
      setPhase("done");
      toast[auto ? "warning" : "success"](
        `${auto ? "Ujian dikirim otomatis. " : ""}Skor: ${r.data.score}/${r.data.total} (${r.data.percent.toFixed(0)}%)`
      );
    } catch (e) {
      exitFullscreen();
      toast.error(e.response?.data?.detail || "Gagal mengirim jawaban");
      sentRef.current = false;
      setBusy(false);
    }
  }, [exam.id]);

  const registerViolation = useCallback(async (reason) => {
    if (finishedRef.current || sentRef.current) return;
    try {
      const r = await api.post(`/exams/${exam.id}/violation`);
      violationsRef.current = r.data.violations;
      setViolations(r.data.violations);
      if (r.data.exceeded) {
        toast.error(`Batas pelanggaran tercapai (${r.data.violations}/${r.data.max_violations}). Ujian dikirim otomatis.`);
        submit(true);
      } else {
        toast.warning(`Peringatan ${r.data.violations}/${r.data.max_violations}: ${reason}. Jangan tinggalkan halaman ujian!`);
      }
    } catch (e) {
      // local fallback
      violationsRef.current += 1;
      setViolations(violationsRef.current);
      if (violationsRef.current >= maxV) submit(true);
    }
  }, [exam.id, submit, maxV]);

  // Anti-cheat listeners (only while running)
  useEffect(() => {
    if (phase !== "running") return;
    const onVisibility = () => { if (document.hidden) registerViolation("berpindah tab / meminimalkan jendela"); };
    const onBlur = () => { if (!document.hasFocus()) registerViolation("jendela ujian kehilangan fokus"); };
    const onFsChange = () => {
      if (!document.fullscreenElement && !finishedRef.current) registerViolation("keluar dari mode layar penuh");
    };
    const blockCtx = (e) => e.preventDefault();
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("contextmenu", blockCtx);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("contextmenu", blockCtx);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [phase, registerViolation]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); exitFullscreen(); }, []);

  const start = async () => {
    if (!password.trim()) return toast.error("Masukkan password ujian");
    setStarting(true);
    try {
      const r = await api.post(`/exams/${exam.id}/start`, { password: password.trim() });
      // Enter fullscreen (triggered by this user gesture)
      try { await document.documentElement.requestFullscreen(); } catch (e) { /* some browsers block */ }
      setQuestions(r.data.questions || []);
      setAnswers(Array((r.data.questions || []).length).fill(-1));
      setViolations(r.data.violations || 0);
      violationsRef.current = r.data.violations || 0;
      setPhase("running");
      if (r.data.time_limit) {
        const offset = new Date(r.data.server_now).getTime() - Date.now();
        const deadline = new Date(r.data.deadline).getTime();
        const tick = () => {
          const s = Math.max(0, Math.round((deadline - (Date.now() + offset)) / 1000));
          setLeft(s);
          if (s === 0) { clearInterval(timerRef.current); submit(true); }
        };
        tick(); timerRef.current = setInterval(tick, 1000);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal memulai ujian");
    } finally { setStarting(false); }
  };

  const warn = left !== null && left <= 60;

  // Password gate
  if (phase === "password") {
    return (
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="exam-password-modal">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between p-5 border-b">
            <h3 className="font-heading font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-600" />{exam.title}</h3>
            <button onClick={onClose} className="p-1.5"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <p className="font-semibold flex items-center gap-1.5 mb-1"><AlertTriangle className="w-4 h-4" />Aturan Ujian Anti-Nyontek</p>
              <ul className="list-disc list-inside space-y-0.5 text-[13px]">
                <li>Ujian akan langsung dimulai setelah password benar.</li>
                <li>Layar akan masuk mode <b>penuh (fullscreen)</b>.</li>
                <li>Pindah tab / keluar fullscreen = pelanggaran.</li>
                <li>Maksimal <b>{maxV}×</b> pelanggaran, lebih dari itu ujian dikirim otomatis.</li>
                {exam.time_limit ? <li>Batas waktu <b>{exam.time_limit} menit</b>.</li> : null}
              </ul>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Password Ujian</label>
              <input data-testid="exam-start-password-input" type="password" autoFocus value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") start(); }}
                placeholder="Masukkan password dari guru" className={`mt-1 ${inp}`} />
            </div>
            <button data-testid="exam-start-button" disabled={starting} onClick={start}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-indigo-700">
              <Maximize className="w-4 h-4" />{starting ? "Memulai..." : "Mulai Ujian (Layar Penuh)"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done screen
  if (phase === "done") {
    return (
      <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4" data-testid="exam-done-modal">
        <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-heading font-bold text-xl mt-3">Ujian Selesai</h3>
          <p className="text-sm text-slate-500 mt-1">Jawabanmu sudah terkirim. Jumlah pelanggaran tercatat: <b>{violations}</b>.</p>
          <button data-testid="exam-close-done" onClick={onDone} className="mt-5 w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Tutup</button>
        </div>
      </div>
    );
  }

  // Running (fullscreen) — fixed cover, no close button
  return (
    <div className="fixed inset-0 bg-slate-100 z-[60] overflow-y-auto" data-testid="exam-running">
      <div className="sticky top-0 bg-indigo-700 text-white z-10 flex items-center justify-between gap-3 px-5 py-3 shadow">
        <h3 className="font-heading font-bold truncate flex items-center gap-2"><ShieldCheck className="w-5 h-5" />{exam.title}</h3>
        <div className="flex items-center gap-3 shrink-0">
          <span data-testid="exam-violation-count" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${violations > 0 ? "bg-rose-500" : "bg-indigo-500"}`}>
            <AlertTriangle className="w-4 h-4" />{violations}/{maxV}
          </span>
          {exam.time_limit > 0 && left !== null && (
            <span data-testid="exam-timer" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-sm ${warn ? "bg-rose-500 animate-pulse" : "bg-indigo-500"}`}>
              <Timer className="w-4 h-4" />{mmss(left)}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-5 space-y-4">
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />Tetap di halaman ini. Pindah tab atau keluar layar penuh akan menambah pelanggaran.
        </div>
        {questions.map((q, i) => (
          <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl">
            <p className="font-semibold text-sm mb-2">{i + 1}. {q.q}</p>
            <div className="space-y-1.5">
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="radio" checked={answers[i] === oi} onChange={() => { const a = [...answers]; a[i] = oi; setAnswers(a); }} />{o}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button data-testid="submit-exam-button" disabled={busy} onClick={() => submit(false)}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-60 hover:bg-slate-800">
          {busy ? "Mengirim..." : "Selesai & Kirim Jawaban"}
        </button>
      </div>
    </div>
  );
}

function ExamResultsModal({ exam, onClose }) {
  const [attempts, setAttempts] = useState(null);
  useEffect(() => {
    api.get(`/exams/${exam.id}/results`).then(r => setAttempts(r.data.attempts || [])).catch(() => setAttempts([]));
  }, [exam.id]);
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">Hasil: {exam.title}</h3>
          <button onClick={onClose} className="p-1.5"><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-2" data-testid="exam-results-list">
          {attempts === null && <p className="text-slate-400 italic text-sm">Memuat...</p>}
          {attempts && attempts.length === 0 && <p className="text-slate-400 italic text-sm">Belum ada siswa yang mengerjakan.</p>}
          {attempts && attempts.map(a => (
            <div key={a.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{a.student_name}</p>
                <p className="text-[11px] text-slate-500">{(a.submitted_at || "").slice(0, 16).replace("T", " ")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.auto_submitted && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">Auto</span>}
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${a.violations > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{a.violations || 0} pelanggaran</span>
                <span className="font-heading font-bold text-slate-900">{a.score}/{a.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none";
