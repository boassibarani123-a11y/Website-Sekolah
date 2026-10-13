import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Timer, Lock, AlertTriangle, Maximize, CheckCircle2, ChevronLeft, ChevronRight, Flag, CloudUpload, KeyRound } from "lucide-react";
import { VortexLogo, vgInput, mmss } from "./VortexLogo";

const isAnswered = (a) => a !== null && a !== undefined && a !== -1 && a !== "";

const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
// iPhone Safari & in-app browsers can't fullscreen a page; they get a visibility-based guard instead.
export const canFullscreen = () => {
  const d = document.documentElement;
  const enabled = document.fullscreenEnabled ?? document.webkitFullscreenEnabled;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen) && enabled !== false;
};
export const isTouchDevice = () => window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

// Keeps the screen awake and re-acquires the lock whenever the page becomes visible again.
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let lock = null, alive = true;
    const get = () => { if (alive && !document.hidden) navigator.wakeLock.request("screen").then(l => { lock = l; }).catch(() => {}); };
    get();
    document.addEventListener("visibilitychange", get);
    return () => { alive = false; document.removeEventListener("visibilitychange", get); lock?.release?.().catch(() => {}); };
  }, [active]);
}

function useGuard({ active, onViolation, finishedRef, setLocked, fsMode }) {
  useEffect(() => {
    if (!active) return;
    const touch = isTouchDevice();
    const onVisibility = () => { if (document.hidden && !finishedRef.current) { setLocked(true); onViolation("berpindah aplikasi / tab atau meminimalkan layar"); } };
    // Mobile browsers fire spurious blur (keyboard, toolbar, notification) — only desktop uses it.
    const onBlur = () => { if (!touch && !document.hasFocus() && !finishedRef.current) { setLocked(true); onViolation("jendela ujian kehilangan fokus"); } };
    const onFs = () => {
      if (finishedRef.current || !fsMode) return;
      if (!fsEl()) { setLocked(true); onViolation("keluar dari mode layar penuh"); }
      else if (document.hasFocus()) setLocked(false);
    };
    const block = (e) => e.preventDefault();
    const onKey = (e) => {
      const k = e.key || "";
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(k) || k === "Escape" || k === "PrintScreen" || k === "ContextMenu") { e.preventDefault(); e.stopPropagation(); }
    };
    const onPop = () => { window.history.pushState(null, "", window.location.href); onViolation("mencoba kembali ke halaman sebelumnya"); };
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    const blockEvs = ["contextmenu", "copy", "cut", "paste", "dragstart"];
    const fsEvs = ["fullscreenchange", "webkitfullscreenchange"];
    window.history.pushState(null, "", window.location.href);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    fsEvs.forEach(ev => document.addEventListener(ev, onFs));
    blockEvs.forEach(ev => document.addEventListener(ev, block));
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      fsEvs.forEach(ev => document.removeEventListener(ev, onFs));
      blockEvs.forEach(ev => document.removeEventListener(ev, block));
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [active, onViolation, finishedRef, setLocked, fsMode]);
}

const exitFullscreen = () => {
  try { navigator.keyboard?.unlock?.(); window.screen?.orientation?.unlock?.(); } catch (e) { /* noop */ }
  try { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* noop */ }
};
const enterFullscreen = () => {
  if (!canFullscreen()) return Promise.resolve();
  const d = document.documentElement;
  try {
    const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: "hide" }) : d.webkitRequestFullscreen();
    return Promise.resolve(p).then(() => {
      navigator.keyboard?.lock?.().catch(() => {});
      if (isTouchDevice()) window.screen?.orientation?.lock?.("portrait").catch(() => {});
    }).catch(() => {});
  } catch (e) { return Promise.resolve(); }
};

function TokenGate({ exam, onClose, onStart, starting }) {
  const [token, setToken] = useState("");
  const maxV = exam.max_violations || 3;
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="exam-password-modal">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 bg-slate-950">
          <VortexLogo size="sm" dark />
          <button data-testid="exam-gate-close" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">{exam.subject || "Ujian"} · {exam.kelas}</p>
            <h3 className="font-heading font-bold text-xl mt-1">{exam.title}</h3>
          </div>
          <ul className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-[13px] text-slate-600 space-y-1.5">
            <li>• {exam.question_count} soal{exam.time_limit ? ` · durasi ${exam.time_limit} menit` : ""}</li>
            {canFullscreen()
              ? <li>• Layar masuk mode <b>penuh</b>; jawaban tersimpan otomatis.</li>
              : <li data-testid="exam-mobile-mode-note">• Perangkat ini tidak mendukung layar penuh (mis. iPhone) — ujian berjalan di <b>mode aman seluler</b>; jawaban tersimpan otomatis.</li>}
            {isTouchDevice() && <li data-testid="exam-mobile-lock-note">• HP otomatis masuk layar penuh{isIOS() ? "" : ", terkunci posisi tegak"} dan layar tidak akan mati selama ujian. Setiap sentuhan di luar layar penuh akan mengembalikannya.</li>}
            {isIOS() && <li data-testid="exam-ios-guided-note" className="text-amber-700">• iPhone/iPad: aktifkan <b>Akses Terpandu</b> (Pengaturan › Aksesibilitas › Akses Terpandu, lalu tekan tombol samping 3×) agar layar terkunci di ujian{!isStandalone() ? "; atau buka lewat \"Tambahkan ke Layar Utama\" untuk tampilan penuh" : ""}.</li>}
            <li>• Pindah tab / aplikasi, menutup layar, atau keluar layar penuh dicatat sebagai pelanggaran.</li>
            <li>• Maksimal <b>{maxV}×</b> pelanggaran, lalu ujian dikirim otomatis.</li>
          </ul>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><KeyRound className="w-3 h-3" />Token Ujian</label>
            <input data-testid="exam-start-password-input" type="password" autoFocus value={token}
              onChange={e => setToken(e.target.value)} onKeyDown={e => { if (e.key === "Enter") onStart(token); }}
              placeholder="Masukkan token dari pengawas" className={`mt-1 ${vgInput} font-mono tracking-widest text-base`} />
          </div>
          <button data-testid="exam-start-button" disabled={starting} onClick={() => onStart(token)}
            className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
            <Maximize className="w-4 h-4" />{starting ? "Memulai..." : "Mulai Ujian"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionNav({ questions, answers, flags, current, setCurrent }) {
  return (
    <div className="grid grid-cols-5 gap-2" data-testid="exam-question-nav">
      {questions.map((_, i) => {
        const cls = flags[i] ? "bg-amber-400 text-amber-950 border-amber-400"
          : isAnswered(answers[i]) ? "bg-teal-700 text-white border-teal-700" : "bg-white text-slate-600 border-slate-300";
        return (
          <button key={i} data-testid={`exam-nav-${i + 1}`} onClick={() => setCurrent(i)}
            className={`h-10 rounded-lg border text-sm font-bold transition-transform hover:-translate-y-0.5 ${cls} ${current === i ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}>{i + 1}</button>
        );
      })}
    </div>
  );
}

function QuestionView({ q, i, answer, setAnswer }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8" data-testid="exam-current-question">
      <p className="text-xs uppercase tracking-widest text-slate-400 mb-3">Soal {i + 1} · {q.type === "essay" ? "Esai" : "Pilihan Ganda"}</p>
      <p className="text-lg leading-relaxed text-slate-900 whitespace-pre-wrap">{q.q}</p>
      {q.type === "essay" ? (
        <textarea data-testid="exam-essay-answer" rows={8} value={answer || ""} onChange={e => setAnswer(e.target.value)}
          placeholder="Tulis jawabanmu di sini..." className={`mt-6 ${vgInput} select-text [-webkit-user-select:text] leading-relaxed text-base`} />
      ) : (
        <div className="mt-6 space-y-2.5">
          {q.options.map((o, oi) => (
            <button key={oi} data-testid={`exam-option-${oi}`} onClick={() => setAnswer(oi)}
              className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${answer === oi ? "border-teal-700 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${answer === oi ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>{String.fromCharCode(65 + oi)}</span>
              <span className="text-[15px]">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LockOverlay({ violations, maxV, onResume, fsMode }) {
  return (
    <div data-testid="exam-lock-overlay" className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center text-center text-white p-6">
      <div className="w-20 h-20 rounded-full bg-rose-600 flex items-center justify-center animate-pulse"><Lock className="w-10 h-10" /></div>
      <p className="mt-5 font-heading text-3xl font-black">Ujian Terkunci</p>
      <p className="mt-2 text-slate-300 max-w-md">Vortex Guard mendeteksi Anda {fsMode ? "keluar dari layar penuh atau berpindah jendela" : "meninggalkan halaman ujian (pindah aplikasi/tab)"}. Pelanggaran: <b className="text-rose-400">{violations}/{maxV}</b>.</p>
      <button data-testid="exam-resume-fullscreen" onClick={onResume}
        className="mt-6 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 font-bold flex items-center gap-2 transition-colors"><Maximize className="w-5 h-5" />{fsMode ? "Kembali ke Layar Penuh" : "Lanjutkan Ujian"}</button>
    </div>
  );
}

export function ExamTake({ exam, onClose, onDone }) {
  const [phase, setPhase] = useState("gate");
  const [starting, setStarting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [flags, setFlags] = useState([]);
  const [current, setCurrent] = useState(0);
  const [left, setLeft] = useState(null);
  const [violations, setViolations] = useState(0);
  const [locked, setLocked] = useState(false);
  const [fsMode, setFsMode] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const maxV = exam.max_violations || 3;
  const state = useRef({ answers: [], flags: [], violations: 0 });
  state.current.answers = answers; state.current.flags = flags;
  const sentRef = useRef(false), finishedRef = useRef(false), timerRef = useRef(null), lastVRef = useRef(0), dirtyRef = useRef(false);

  const save = useCallback(async () => {
    if (!dirtyRef.current || finishedRef.current) return;
    dirtyRef.current = false;
    try { const r = await api.post(`/exams/${exam.id}/autosave`, { answers: state.current.answers, flags: state.current.flags }); setSavedAt(r.data.saved_at); }
    catch (e) { dirtyRef.current = true; }
  }, [exam.id]);

  useEffect(() => {
    if (phase !== "running") return;
    dirtyRef.current = true;
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
  }, [answers, flags, phase, save]);

  const submit = useCallback(async (auto = false) => {
    if (sentRef.current) return;
    sentRef.current = true; finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const r = await api.post("/exams/attempt", { exam_id: exam.id, answers: state.current.answers, violations: state.current.violations, auto_submitted: auto });
      exitFullscreen(); setResult(r.data); setPhase("done");
    } catch (e) {
      exitFullscreen(); toast.error(e.response?.data?.detail || "Gagal mengirim jawaban");
      sentRef.current = false; finishedRef.current = false;
    }
  }, [exam.id]);

  const onViolation = useCallback(async (reason) => {
    if (finishedRef.current) return;
    if (Date.now() - lastVRef.current < 1500) return;
    lastVRef.current = Date.now();
    try {
      const r = await api.post(`/exams/${exam.id}/violation`, { reason });
      state.current.violations = r.data.violations; setViolations(r.data.violations);
      if (r.data.exceeded) { toast.error("Batas pelanggaran tercapai. Ujian dikirim otomatis."); submit(true); }
      else toast.warning(`Peringatan ${r.data.violations}/${r.data.max_violations}: ${reason}`);
    } catch (e) {
      state.current.violations += 1; setViolations(state.current.violations);
      if (state.current.violations >= maxV) submit(true);
    }
  }, [exam.id, submit, maxV]);

  useGuard({ active: phase === "running", onViolation, finishedRef, setLocked, fsMode });
  useWakeLock(phase === "running");
  // Mobile: any tap while out of fullscreen re-enters it automatically (requires a user gesture).
  useEffect(() => {
    if (phase !== "running" || !isTouchDevice() || !canFullscreen()) return;
    const back = () => { if (!fsEl() && !finishedRef.current) enterFullscreen().then(() => { if (fsEl()) { setFsMode(true); setLocked(false); } }); };
    document.addEventListener("pointerdown", back, true);
    return () => document.removeEventListener("pointerdown", back, true);
  }, [phase]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); exitFullscreen(); }, []);

  const start = async (token) => {
    if (!token.trim()) return toast.error("Masukkan token ujian");
    setStarting(true);
    const fs = enterFullscreen();
    try {
      const r = await api.post(`/exams/${exam.id}/start`, { password: token.trim() });
      await fs;
      // Strict fullscreen only where it actually works; touch devices that refuse it fall back to mobile mode.
      const strict = canFullscreen() && (!!fsEl() || !isTouchDevice());
      setFsMode(strict);
      setLocked(strict && !fsEl());
      const qs = r.data.questions || [];
      if (r.data.expired) { exitFullscreen(); toast.error("Waktu ujian sudah habis"); return; }
      setQuestions(qs);
      setAnswers(qs.map((_, i) => r.data.answers?.[i] ?? null));
      setFlags(qs.map((_, i) => !!r.data.flags?.[i]));
      state.current.violations = r.data.violations || 0; setViolations(r.data.violations || 0);
      setPhase("running");
      if (r.data.deadline) {
        const offset = new Date(r.data.server_now).getTime() - Date.now();
        const deadline = new Date(r.data.deadline).getTime();
        const tick = () => {
          const s = Math.max(0, Math.round((deadline - (Date.now() + offset)) / 1000));
          setLeft(s);
          if (s === 0) { clearInterval(timerRef.current); submit(true); }
        };
        tick(); timerRef.current = setInterval(tick, 1000);
      }
    } catch (e) { exitFullscreen(); toast.error(e.response?.data?.detail || "Gagal memulai ujian"); }
    finally { setStarting(false); }
  };

  if (phase === "gate") return <TokenGate exam={exam} onClose={onClose} onStart={start} starting={starting} />;

  if (phase === "done") {
    return (
      <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4" data-testid="exam-done-modal">
        <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-8 text-center">
          <CheckCircle2 className="w-14 h-14 text-teal-600 mx-auto" />
          <h3 className="font-heading font-bold text-xl mt-3">Ujian Terkirim</h3>
          {result && <p data-testid="exam-done-score" className="mt-3 font-heading text-4xl font-black text-slate-900">{Math.round(result.percent)}</p>}
          <p className="text-sm text-slate-500 mt-2">{result?.essay_pending ? "Nilai sementara (pilihan ganda). Soal esai menunggu penilaian guru." : "Nilai akhir pilihan ganda."} Pelanggaran tercatat: <b>{violations}</b>.</p>
          <button data-testid="exam-close-done" onClick={onDone} className="mt-6 w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Tutup</button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const unanswered = answers.filter(a => !isAnswered(a)).length;
  const setAnswer = (v) => setAnswers(a => a.map((x, i) => i === current ? v : x));
  const warn = left !== null && left <= 300;
  return (
    <div className="fixed inset-0 bg-[#F4F6F5] z-[60] overflow-y-auto overscroll-none select-none [-webkit-touch-callout:none]" data-testid="exam-running" data-guard-mode={fsMode ? "fullscreen" : "mobile"}>
      {locked && <LockOverlay violations={violations} maxV={maxV} fsMode={fsMode}
        onResume={() => fsMode ? enterFullscreen().then(() => { if (fsEl()) setLocked(false); }) : setLocked(false)} />}
      <header className="sticky top-0 z-10 bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-4 min-w-0"><VortexLogo size="sm" dark /><span className="hidden sm:block text-slate-400 truncate text-sm">{exam.title}</span></div>
          <div className="flex items-center gap-2 shrink-0">
            <span data-testid="exam-autosave-status" className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-400"><CloudUpload className="w-3.5 h-3.5" />{savedAt ? `Tersimpan ${new Date(savedAt).toLocaleTimeString("id-ID")}` : "Simpan otomatis aktif"}</span>
            <span data-testid="exam-violation-count" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${violations > 0 ? "bg-rose-600" : "bg-slate-800"}`}><AlertTriangle className="w-4 h-4" />{violations}/{maxV}</span>
            {left !== null && <span data-testid="exam-timer" className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-base ${warn ? "bg-rose-600 animate-pulse" : "bg-teal-700"}`}><Timer className="w-4 h-4" />{mmss(left)}</span>}
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-5 grid lg:grid-cols-[1fr_280px] gap-6">
        <main className="space-y-4">
          {q && <QuestionView q={q} i={current} answer={answers[current]} setAnswer={setAnswer} />}
          <div className="flex items-center justify-between gap-2">
            <button data-testid="exam-prev" disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-semibold text-sm flex items-center gap-1 disabled:opacity-40"><ChevronLeft className="w-4 h-4" />Sebelumnya</button>
            <button data-testid="exam-flag-toggle" onClick={() => setFlags(f => f.map((x, i) => i === current ? !x : x))}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 border transition-colors ${flags[current] ? "bg-amber-400 border-amber-400 text-amber-950" : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"}`}><Flag className="w-4 h-4" />Ragu-ragu</button>
            {current < questions.length - 1
              ? <button data-testid="exam-next" onClick={() => setCurrent(c => c + 1)} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center gap-1">Berikutnya<ChevronRight className="w-4 h-4" /></button>
              : <button data-testid="exam-finish-open" onClick={() => setConfirm(true)} className="px-4 py-2.5 rounded-xl bg-teal-700 text-white font-semibold text-sm">Selesai</button>}
          </div>
        </main>
        <aside className="bg-white border border-slate-200 rounded-2xl p-5 h-fit lg:sticky lg:top-20 space-y-4">
          <p className="font-heading font-bold text-sm">Nomor Soal</p>
          <QuestionNav questions={questions} answers={answers} flags={flags} current={current} setCurrent={setCurrent} />
          <div className="text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-teal-700" />Sudah dijawab</p>
            <p className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400" />Ragu-ragu</p>
            <p className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-slate-300" />Belum dijawab</p>
          </div>
          <button data-testid="submit-exam-button" onClick={() => setConfirm(true)} className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold text-sm transition-colors">Kumpulkan Jawaban</button>
        </aside>
      </div>
      {confirm && (
        <div className="fixed inset-0 z-[65] bg-slate-950/60 flex items-center justify-center p-4" data-testid="exam-confirm-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-heading font-bold text-lg">Kumpulkan jawaban?</h3>
            <p className="text-sm text-slate-500 mt-2">{unanswered > 0 ? <><b className="text-rose-600">{unanswered} soal</b> belum dijawab. </> : "Semua soal sudah dijawab. "}{flags.filter(Boolean).length > 0 && <><b className="text-amber-600">{flags.filter(Boolean).length}</b> soal ditandai ragu-ragu. </>}Jawaban tidak dapat diubah setelah dikirim.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button data-testid="exam-confirm-cancel" onClick={() => setConfirm(false)} className="py-2.5 rounded-xl border border-slate-200 font-semibold text-sm">Periksa Lagi</button>
              <button data-testid="exam-confirm-submit" onClick={() => { setConfirm(false); submit(false); }} className="py-2.5 rounded-xl bg-teal-700 text-white font-semibold text-sm">Kirim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
