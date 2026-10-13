import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/apiClient";
import { X, Maximize, Minimize, AlertTriangle, CheckCircle2, Clock3, PauseCircle, Search, FileSpreadsheet, FileText, Volume2, VolumeX, Siren } from "lucide-react";
import { toast } from "sonner";
import { VortexLogo, mmss } from "./VortexLogo";
import { downloadExamExport } from "./examExport";

const STATE = {
  mengerjakan: { label: "Mengerjakan", cls: "bg-teal-50 border-teal-200", dot: "bg-teal-500", Icon: Clock3 },
  melanggar: { label: "Batas pelanggaran", cls: "bg-rose-50 border-rose-300", dot: "bg-rose-500", Icon: AlertTriangle },
  selesai: { label: "Selesai", cls: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", Icon: CheckCircle2 },
  belum: { label: "Belum mulai", cls: "bg-white border-slate-200", dot: "bg-slate-300", Icon: PauseCircle },
};
const ORDER = { melanggar: 0, mengerjakan: 1, belum: 2, selesai: 3 };

function alarm(ctxRef) {
  try {
    const ctx = ctxRef.current || (ctxRef.current = new (window.AudioContext || window.webkitAudioContext)());
    if (ctx.state === "suspended") ctx.resume();
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = i % 2 ? 660 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.21);
    });
  } catch { /* audio unavailable */ }
}

function Tile({ s, left, flash }) {
  const st = STATE[s.state];
  const pct = s.total ? Math.round((s.answered / s.total) * 100) : 0;
  const idle = s.state === "mengerjakan" && s.idle_seconds > 90;
  return (
    <div data-testid={`proctor-tile-${s.id}`} data-state={s.state} data-flash={flash ? "1" : "0"} className={`relative rounded-2xl border-2 p-4 transition-colors ${st.cls} ${s.violations > 0 && s.state === "mengerjakan" ? "border-amber-300" : ""} ${flash ? "!border-rose-500 !bg-rose-50 animate-[proctorFlash_0.9s_ease-in-out_4] shadow-[0_0_0_4px_rgba(244,63,94,0.25)]" : ""}`}>
      {flash && <span data-testid={`proctor-new-${s.id}`} className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider shadow">Pelanggaran baru</span>}
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-white ring-1 ring-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 shrink-0">
          {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : (s.name || "?")[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-900 truncate">{s.name}</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${s.state === "mengerjakan" ? "animate-pulse" : ""}`} />{st.label}{idle ? " · tidak aktif" : ""}</p>
        </div>
        {s.violations > 0 && <span data-testid={`proctor-violations-${s.id}`} className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold">{s.violations}×</span>}
      </div>
      {s.state !== "belum" && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1"><span>{s.answered}/{s.total} soal</span>
            {s.state === "selesai" ? <b className="text-emerald-700">Nilai {Math.round(s.percent || 0)}</b>
              : left !== null && <b data-testid={`proctor-remaining-${s.id}`} className={`tabular-nums ${left <= 300 ? "text-rose-600" : "text-slate-700"}`}>{mmss(left)}</b>}
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className={`h-full rounded-full ${s.state === "selesai" ? "bg-emerald-500" : "bg-teal-500"}`} style={{ width: `${pct}%` }} /></div>
          {s.last_violation && <p className="mt-2 text-[11px] text-rose-700 flex items-center gap-1 min-w-0"><AlertTriangle className="w-3 h-3 shrink-0" /><span className="truncate">{s.last_violation.reason} · {new Date(s.last_violation.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span></p>}
        </div>
      )}
    </div>
  );
}

export function LiveProctor({ exam, onClose }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("semua");
  const [q, setQ] = useState("");
  const [full, setFull] = useState(false);
  const [tick, setTick] = useState(0);
  const fetchedAt = useRef(0);
  const prev = useRef(null);
  const audio = useRef(null);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(true);
  const [flash, setFlash] = useState({});
  const [alerts, setAlerts] = useState([]);
  const ref = useRef(null);

  const detect = (students) => {
    const map = Object.fromEntries(students.map(s => [s.id, s.violations || 0]));
    if (prev.current) {
      const hit = students.filter(s => (s.violations || 0) > (prev.current[s.id] ?? 0));
      if (hit.length) {
        const now = Date.now();
        setFlash(f => ({ ...f, ...Object.fromEntries(hit.map(s => [s.id, now])) }));
        setAlerts(a => [...hit.map(s => ({ key: `${s.id}-${s.violations}`, id: s.id, name: s.name, count: s.violations, reason: s.last_violation?.reason || "pelanggaran", at: s.last_violation?.at })), ...a].slice(0, 6));
        if (soundRef.current) alarm(audio);
        toast.error(`${hit.map(s => s.name).join(", ")} melakukan pelanggaran`);
      }
    }
    prev.current = map;
  };
  const [mode, setMode] = useState("connecting");
  const apply = (data) => { fetchedAt.current = Date.now(); detect(data.students); setD(data); setErr(""); };
  const load = useCallback(() => api.get(`/exams/${exam.id}/live`).then(r => apply(r.data))
    .catch(e => setErr(e.response?.data?.detail || "Gagal memuat data pengawasan")), [exam.id]); // eslint-disable-line
  useEffect(() => {
    let poll = null, fails = 0;
    const es = new EventSource(`${process.env.REACT_APP_BACKEND_URL}/api/exams/${exam.id}/live/stream`, { withCredentials: true });
    const startPoll = () => { if (!poll) { setMode("polling"); load(); poll = setInterval(load, 4000); } };
    es.addEventListener("live", (e) => { fails = 0; setMode("live"); if (poll) { clearInterval(poll); poll = null; } apply(JSON.parse(e.data)); });
    es.addEventListener("ping", () => { fails = 0; setMode("live"); });
    es.onerror = () => { fails += 1; if (fails >= 2 || es.readyState === EventSource.CLOSED) startPoll(); };
    const guard = setTimeout(() => { if (!fetchedAt.current || Date.now() - fetchedAt.current > 5000) startPoll(); }, 5000);
    return () => { es.close(); clearInterval(poll); clearTimeout(guard); };
  }, [exam.id, load]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => () => { audio.current?.close?.(); }, []);
  const isFlash = (id) => flash[id] && Date.now() - flash[id] < 15000;
  useEffect(() => {
    const f = () => setFull(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const elapsed = fetchedAt.current ? Math.floor((Date.now() - fetchedAt.current) / 1000) + tick * 0 : 0;
  const list = useMemo(() => (d?.students || [])
    .filter(s => (filter === "semua" || s.state === filter) && (!q || s.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (b.violations || 0) - (a.violations || 0) || a.name.localeCompare(b.name)), [d, filter, q]);
  const c = d?.counts || {};

  return createPortal(
    <div ref={ref} className="fixed inset-0 z-[60] bg-[#F4F6F5] flex flex-col" data-testid="live-proctor">
      <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <VortexLogo size="sm" dark />
          <div className="min-w-0">
            <p className="font-heading font-bold truncate">{exam.title}</p>
            <p data-testid="proctor-connection" data-mode={mode} className="text-xs text-teal-200 flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full animate-pulse ${mode === "live" ? "bg-emerald-400" : mode === "polling" ? "bg-amber-400" : "bg-slate-400"}`} />Pengawas langsung · Kelas {exam.kelas} · {mode === "live" ? "Real-time (tersambung)" : mode === "polling" ? "Mode cadangan · tiap 4 detik" : "Menyambungkan…"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {exam.can_export && <>
            <button data-testid="proctor-export-xlsx" onClick={() => downloadExamExport(exam, "xlsx")} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" />Excel</button>
            <button data-testid="proctor-export-pdf" onClick={() => downloadExamExport(exam, "pdf")} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5"><FileText className="w-4 h-4" />PDF</button>
          </>}
          <button data-testid="proctor-sound-toggle" onClick={() => { setSound(v => !v); if (!sound) alarm(audio); }} className={`px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 ${sound ? "bg-rose-500 hover:bg-rose-600" : "bg-white/10 hover:bg-white/20"}`}>{sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}Bunyi {sound ? "ON" : "OFF"}</button>
          <button data-testid="proctor-fullscreen" onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : ref.current?.requestFullscreen?.().catch(() => {})} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5">{full ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{full ? "Keluar" : "Layar Penuh"}</button>
          <button data-testid="proctor-close" onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="px-6 py-4 flex items-center gap-3 flex-wrap border-b border-slate-200 bg-white">
        {[["semua", "Semua", (d?.students || []).length], ["mengerjakan", "Mengerjakan", c.mengerjakan], ["melanggar", "Batas pelanggaran", c.melanggar], ["belum", "Belum mulai", c.belum], ["selesai", "Selesai", c.selesai]].map(([k, l, n]) => (
          <button key={k} data-testid={`proctor-filter-${k}`} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {l} <span className="tabular-nums opacity-70">{n ?? 0}</span>
          </button>
        ))}
        <span data-testid="proctor-total-violations" className="px-4 py-2 rounded-full bg-rose-50 text-rose-700 text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{d?.total_violations ?? 0} pelanggaran</span>
        <label className="ml-auto flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2"><Search className="w-4 h-4 text-slate-400" />
          <input data-testid="proctor-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari siswa" className="bg-transparent outline-none text-sm w-40" /></label>
      </div>
      {alerts.length > 0 && (
        <div className="px-6 py-3 bg-rose-600 text-white flex items-center gap-3 flex-wrap" data-testid="proctor-alert-banner">
          <Siren className="w-5 h-5 animate-pulse shrink-0" />
          <div className="flex gap-2 flex-wrap flex-1 min-w-0">
            {alerts.map(a => <span key={a.key} data-testid={`proctor-alert-${a.id}`} className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">{a.name} · {a.reason} · {a.count}×{a.at ? ` · ${new Date(a.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}</span>)}
          </div>
          <button data-testid="proctor-alert-clear" onClick={() => setAlerts([])} className="px-3 py-1 rounded-full bg-white text-rose-700 text-xs font-bold">Tandai dibaca</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        {err && <p className="text-rose-600" data-testid="proctor-error">{err}</p>}
        {!d && !err && <p className="text-slate-400 italic">Memuat…</p>}
        {d && list.length === 0 && <p className="text-slate-400 italic text-center py-16">Tidak ada siswa pada filter ini.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3" data-testid="proctor-grid">
          {list.map(s => <Tile key={s.id} s={s} flash={isFlash(s.id)} left={s.remaining_seconds == null ? null : Math.max(0, s.remaining_seconds - elapsed)} />)}
        </div>
      </div>
    </div>,
    document.body
  );
}
