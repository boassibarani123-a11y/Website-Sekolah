import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Lock, Maximize, AlertTriangle, Timer, CheckCircle2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { inp, mmss, DEFAULT_RULES, VortexMark, VG } from "./brand";
import { useAntiCheat, enterFullscreen, exitFullscreen } from "./useAntiCheat";
import { QuestionTable } from "./QuestionTable";
import { ExamNavigator } from "./ExamNavigator";

export function ExamTakeModal({ exam, onClose, onDone }) {
  const [phase, setPhase] = useState("gate");
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const answersRef = useRef([]); answersRef.current = answers;
  const finishedRef = useRef(false);
  const sentRef = useRef(false);
  const maxV = exam.max_violations || 3;

  const submitRef = useRef(() => {});
  const onExceeded = useCallback(() => submitRef.current(true), []);
  const ac = useAntiCheat({ active: phase === "running", examId: exam.id, maxV, finishedRef, onExceeded });

  const submit = useCallback(async (auto = false) => {
    if (sentRef.current) return;
    sentRef.current = true; finishedRef.current = true;
    try {
      const r = await api.post("/exams/attempt", { exam_id: exam.id, answers: answersRef.current, violations: ac.violationsRef.current, auto_submitted: auto });
      exitFullscreen(); setResult({ ...r.data, auto }); setPhase("done");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal mengirim jawaban");
      sentRef.current = false; finishedRef.current = false;
    }
  }, [exam.id, ac.violationsRef]);
  submitRef.current = submit;

  useEffect(() => () => exitFullscreen(), []);

  const start = async (password) => {
    const fs = enterFullscreen();
    try {
      const r = await api.post(`/exams/${exam.id}/start`, { password });
      await fs;
      if (r.data.expired) { exitFullscreen(); toast.error("Waktu ujian sudah habis"); return submit(true); }
      if (!document.fullscreenElement) ac.setLocked(true);
      const n = r.data.questions.length;
      setAnswers(Array.from({ length: n }, (_, i) => r.data.answers?.[i] ?? (r.data.questions[i].type === "essay" ? "" : -1)));
      ac.setViolations(r.data.violations || 0); ac.violationsRef.current = r.data.violations || 0;
      setData(r.data); setPhase("running");
    } catch (e) { exitFullscreen(); toast.error(e.response?.data?.detail || "Gagal memulai ujian"); }
  };

  if (phase === "gate") return <Gate exam={exam} onClose={onClose} onStart={start} />;
  if (phase === "done") return <Done result={result} violations={ac.violations} onDone={onDone} />;
  return <Running exam={exam} data={data} answers={answers} setAnswers={setAnswers} ac={ac} maxV={maxV} submit={submit} finishedRef={finishedRef} />;
}

function Gate({ exam, onClose, onStart }) {
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const rules = exam.rules?.length ? exam.rules : DEFAULT_RULES;
  const go = async () => {
    if (!agree) return toast.error("Centang persetujuan peraturan terlebih dahulu");
    if (!pw.trim()) return toast.error("Masukkan password ujian");
    setBusy(true); await onStart(pw.trim()); setBusy(false);
  };
  const info = [["Jumlah soal", `${exam.question_count} (${exam.question_count - (exam.essay_count || 0)} PG · ${exam.essay_count || 0} essay)`],
    ["Durasi", exam.time_limit ? `${exam.time_limit} menit` : "Tanpa batas"], ["Soal per halaman", exam.per_page || 10],
    ["Navigasi", exam.allow_back !== false ? "Boleh kembali ke halaman sebelumnya" : "Hanya maju (tidak bisa kembali)"],
    ["Maks. pelanggaran", `${exam.max_violations || 3}×`], ["KKM", exam.passing_grade ?? 70]];
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-3" data-testid="exam-password-modal">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[94vh] overflow-y-auto shadow-2xl">
        <div className="relative bg-slate-950 text-white p-6 rounded-t-3xl overflow-hidden">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-indigo-600/40 blur-3xl" />
          <button onClick={onClose} data-testid="exam-gate-close" className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
          <div className="relative"><VortexMark dark /><h3 className="mt-4 font-heading text-2xl font-black">{exam.title}</h3>
            {exam.description && <p className="text-sm text-indigo-100/70 mt-1">{exam.description}</p>}</div>
        </div>
        <div className="p-6 space-y-5">
          <table className="w-full text-sm rounded-xl overflow-hidden" data-testid="exam-gate-info">
            <tbody className="divide-y divide-slate-100">{info.map(([k, v]) => <tr key={k}><td className="py-2 text-slate-500 w-44">{k}</td><td className="py-2 font-semibold text-slate-900">{v}</td></tr>)}</tbody>
          </table>
          {exam.instructions && <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-sm text-sky-900 whitespace-pre-wrap" data-testid="exam-gate-instructions"><p className="font-semibold mb-1">Petunjuk</p>{exam.instructions}</div>}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4" data-testid="exam-gate-rules">
            <p className="font-semibold text-amber-900 flex items-center gap-1.5 text-sm"><AlertTriangle className="w-4 h-4" />Peraturan Ujian</p>
            <ol className="mt-2 space-y-1.5 text-[13px] text-amber-900 list-decimal list-inside">{rules.map((r, i) => <li key={i}>{r}</li>)}</ol>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer"><input data-testid="exam-agree-checkbox" type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />Saya telah membaca dan menyetujui seluruh peraturan ujian.</label>
          <div><label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Lock className="w-3 h-3" />Password Ujian</label>
            <input data-testid="exam-start-password-input" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="Masukkan password dari guru" className={`mt-1 ${inp}`} /></div>
          <button data-testid="exam-start-button" disabled={busy} onClick={go} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"><Maximize className="w-4 h-4" />{busy ? "Memulai…" : "Mulai Ujian (Layar Penuh)"}</button>
        </div>
      </div>
    </div>
  );
}

function Running({ exam, data, answers, setAnswers, ac, maxV, submit, finishedRef }) {
  const per = data.per_page || 10, allowBack = data.allow_back !== false, qs = data.questions;
  const pages = Math.max(1, Math.ceil(qs.length / per));
  const [page, setPage] = useState(Math.min(data.current_page || 0, pages - 1));
  const [maxPage, setMaxPage] = useState(data.current_page || 0);
  const [flags, setFlags] = useState({});
  const [left, setLeft] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const answersRef = useRef(answers); answersRef.current = answers;
  const pageRef = useRef(page); pageRef.current = page;

  useEffect(() => {
    if (!data.time_limit) return;
    const offset = new Date(data.server_now).getTime() - Date.now(), deadline = new Date(data.deadline).getTime();
    const tick = () => { const s = Math.max(0, Math.round((deadline - (Date.now() + offset)) / 1000)); setLeft(s); if (s === 0) { clearInterval(t); submit(true); } };
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data, submit]);

  useEffect(() => {
    const t = setInterval(() => { if (!finishedRef.current) api.post(`/exams/${exam.id}/progress`, { page: pageRef.current, answers: answersRef.current }).catch(() => {}); }, 30000);
    return () => clearInterval(t);
  }, [exam.id, finishedRef]);

  const goPage = async (p, scrollTo) => {
    if (!allowBack && p < maxPage) return toast.error("Tidak bisa kembali ke halaman sebelumnya");
    try {
      const r = await api.post(`/exams/${exam.id}/progress`, { page: p, answers: answersRef.current });
      setPage(p); setMaxPage(m => Math.max(m, r.data.current_page));
      setTimeout(() => document.getElementById(`exam-q-${scrollTo ?? p * per}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan jawaban"); }
  };
  const requestPage = (p, i) => (p === page ? document.getElementById(`exam-q-${i}`)?.scrollIntoView({ behavior: "smooth" })
    : !allowBack && p > page ? setConfirm({ type: "page", p, i }) : goPage(p, i));
  const setAnswer = (i, v) => setAnswers(a => a.map((x, j) => (j === i ? v : x)));
  const isDone = (q, i) => (q.type === "essay" ? !!(answers[i] || "").trim() : answers[i] >= 0 && answers[i] !== null);
  const unanswered = qs.filter((q, i) => !isDone(q, i)).length;
  const warn = left !== null && left <= 60;

  return (
    <div className="fixed inset-0 bg-slate-100 z-[60] overflow-y-auto select-none" data-testid="exam-running">
      {ac.locked && (
        <div data-testid="exam-lock-overlay" className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center text-center text-white p-6">
          <div className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center animate-pulse"><Lock className="w-10 h-10" /></div>
          <p className="mt-5 font-heading text-3xl font-black">Ujian Terkunci</p>
          <p className="mt-2 text-slate-300 max-w-md">Anda keluar dari layar penuh atau berpindah jendela. Pelanggaran tercatat <b className="text-rose-400">{ac.violations}/{maxV}</b>.</p>
          <button data-testid="exam-resume-fullscreen" onClick={() => enterFullscreen().then(() => { if (document.fullscreenElement) ac.setLocked(false); })}
            className="mt-6 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold flex items-center gap-2 transition-colors"><Maximize className="w-5 h-5" />Kembali ke Layar Penuh</button>
          <p className="mt-8 text-[11px] font-mono text-slate-500">Dilindungi oleh {VG.full}</p>
        </div>
      )}
      <header className="sticky top-0 z-10 bg-slate-950 text-white shadow-lg">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0"><VortexMark size="sm" dark /><span className="hidden sm:block h-6 w-px bg-white/20" /><h3 className="font-heading font-bold truncate" data-testid="exam-running-title">{exam.title}</h3></div>
          <div className="flex items-center gap-2 shrink-0">
            <span data-testid="exam-violation-count" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${ac.violations > 0 ? "bg-rose-600" : "bg-white/10"}`}><AlertTriangle className="w-4 h-4" />{ac.violations}/{maxV}</span>
            {data.time_limit > 0 && left !== null && <span data-testid="exam-timer" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-sm ${warn ? "bg-rose-600 animate-pulse" : "bg-white/10"}`}><Timer className="w-4 h-4" />{mmss(left)}</span>}
          </div>
        </div>
        <div className="h-1 bg-white/10"><div className="h-full bg-cyan-400 transition-[width] duration-500" style={{ width: `${((page + 1) / pages) * 100}%` }} /></div>
      </header>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 grid lg:grid-cols-[1fr_280px] gap-5">
        <main className="space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="font-semibold text-slate-700" data-testid="exam-page-indicator">Halaman {page + 1} dari {pages}</p>
            <p className="text-xs text-slate-500">Soal {page * per + 1}–{Math.min(qs.length, (page + 1) * per)} dari {qs.length}</p>
          </div>
          {data.instructions && page === 0 && <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-sm text-sky-900 whitespace-pre-wrap">{data.instructions}</div>}
          <QuestionTable questions={qs.slice(page * per, (page + 1) * per)} start={page * per} answers={answers} flags={flags}
            onAnswer={setAnswer} onFlag={i => setFlags(f => ({ ...f, [i]: !f[i] }))} />
          <div className="flex items-center justify-between gap-3">
            {allowBack && page > 0 ? <button data-testid="exam-prev-page" onClick={() => goPage(page - 1)} className="px-5 py-3 rounded-xl bg-white border border-slate-200 font-semibold flex items-center gap-1.5 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" />Sebelumnya</button> : <span />}
            {page < pages - 1
              ? <button data-testid="exam-next-page" onClick={() => (allowBack ? goPage(page + 1) : setConfirm({ type: "page", p: page + 1 }))} className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-1.5 hover:bg-indigo-700">Berikutnya<ChevronRight className="w-4 h-4" /></button>
              : <button data-testid="submit-exam-button" onClick={() => setConfirm({ type: "submit" })} className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold flex items-center gap-1.5 hover:bg-slate-800"><Send className="w-4 h-4" />Selesai & Kirim</button>}
          </div>
        </main>
        <aside className="lg:sticky lg:top-24 self-start space-y-3">
          <ExamNavigator questions={qs} answers={answers} flags={flags} page={page} perPage={per} allowBack={allowBack} maxPage={maxPage} onGo={requestPage} />
          <button data-testid="exam-submit-sidebar" onClick={() => setConfirm({ type: "submit" })} className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Kirim Jawaban</button>
        </aside>
      </div>
      {confirm && <ConfirmBox confirm={confirm} unanswered={unanswered} flagged={Object.values(flags).filter(Boolean).length} total={qs.length}
        onCancel={() => setConfirm(null)} onOk={() => { const c = confirm; setConfirm(null); c.type === "submit" ? submit(false) : goPage(c.p, c.i); }} />}
    </div>
  );
}

function ConfirmBox({ confirm, unanswered, flagged, total, onCancel, onOk }) {
  const isSubmit = confirm.type === "submit";
  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/60 flex items-center justify-center p-4" data-testid="exam-confirm-box">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <h4 className="font-heading font-bold text-lg">{isSubmit ? "Kirim jawaban sekarang?" : "Lanjut ke halaman berikutnya?"}</h4>
        {isSubmit ? (
          <table className="w-full text-sm mt-3"><tbody className="divide-y divide-slate-100">
            <tr><td className="py-1.5 text-slate-500">Terjawab</td><td className="py-1.5 text-right font-bold">{total - unanswered}/{total}</td></tr>
            <tr><td className="py-1.5 text-slate-500">Belum dijawab</td><td className={`py-1.5 text-right font-bold ${unanswered ? "text-rose-600" : ""}`}>{unanswered}</td></tr>
            <tr><td className="py-1.5 text-slate-500">Ragu-ragu</td><td className="py-1.5 text-right font-bold text-amber-600">{flagged}</td></tr>
          </tbody></table>
        ) : <p className="text-sm text-slate-600 mt-2">Ujian ini <b>tidak mengizinkan kembali</b>. Jawaban pada halaman sebelumnya akan dikunci dan tidak dapat diubah lagi.</p>}
        <div className="mt-5 flex gap-2">
          <button data-testid="exam-confirm-cancel" onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 font-semibold text-sm hover:bg-slate-200">Batal</button>
          <button data-testid="exam-confirm-ok" onClick={onOk} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700">{isSubmit ? "Kirim" : "Lanjut"}</button>
        </div>
      </div>
    </div>
  );
}

function Done({ result, violations, onDone }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4" data-testid="exam-done-modal">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-8 text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
        <h3 className="font-heading font-black text-2xl mt-3">Ujian Selesai</h3>
        {result?.auto && <p className="text-xs text-amber-600 font-semibold mt-1">Dikirim otomatis</p>}
        <p className="text-sm text-slate-500 mt-2">Terjawab {result?.answered}/{result?.question_count} soal · {violations} pelanggaran.</p>
        {result?.show_score && result.score != null && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4" data-testid="exam-done-score">
            <p className="font-heading text-4xl font-black text-indigo-600">{Math.round(result.percent)}</p>
            <p className="text-xs text-slate-500">Skor {result.score}/{result.total}{result.status === "pending" ? " (sementara)" : ""}</p>
          </div>
        )}
        {result?.status === "pending" && <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-xl p-2.5">Jawaban essay sedang menunggu koreksi guru. Nilai akhir akan diperbarui setelah dikoreksi.</p>}
        <button data-testid="exam-close-done" onClick={onDone} className="mt-5 w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Tutup</button>
        <p className="mt-4 text-[10px] font-mono text-slate-400">{VG.full}</p>
      </div>
    </div>
  );
}
