import { PageHeader } from "@/components/zx/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { ScanFace, Maximize, Minimize, ScanBarcode, Eye, UserPlus, Camera, GraduationCap, Users, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LiveScanTable } from "@/components/attendance/LiveScanTable";
import { PresenceCard } from "@/components/attendance/PresenceCard";
import { Clock } from "@/components/attendance/GateDisplay";
import { beep, alarm, getStation, todayWib, getGateDir, saveGateDir, gateKind } from "@/components/attendance/scannerUtils";
import { GateDirToggle } from "@/components/attendance/GateDirToggle";
import { canDeleteScan, deleteScan, deleteAllScans } from "@/components/attendance/scanDelete";
import { FaceScanFrame } from "@/components/face/FaceScanFrame";
import { DigitPad } from "@/components/face/DigitPad";
import { useFaceCamera } from "@/components/face/useFaceCamera";
import { detectFaces, eyeAspect, meanDescriptor, listCameras } from "@/components/face/faceUtils";

const OPS = ["piket_gerbang", "super_admin", "staff_tu", "kepsek"];
const STABLE_FRAMES = 4;

function useLiveLogs() {
  const [log, setLog] = useState({ siswa: [], guru: [], sStats: null, gStats: null, newId: null });
  const tops = useRef({});
  const load = useCallback(() => {
    const d = todayWib();
    const mark = (k, rows) => {
      const top = rows[0]?.id;
      const fresh = top && tops.current[k] && top !== tops.current[k];
      tops.current[k] = top;
      if (fresh) { setLog(l => ({ ...l, newId: top })); setTimeout(() => setLog(l => ({ ...l, newId: null })), 2500); }
    };
    Promise.all([
      api.get(`/attendance?date=${d}`).catch(() => ({ data: [] })),
      api.get(`/attendance/stats?date=${d}`).catch(() => ({ data: null })),
      api.get(`/teacher-attendance?date=${d}`).catch(() => ({ data: { rows: [], stats: null } })),
    ]).then(([s, st, g]) => {
      mark("s", s.data); mark("g", g.data.rows || []);
      const gs = g.data.stats;
      setLog(l => ({ ...l, siswa: s.data, sStats: st.data, guru: g.data.rows || [],
        gStats: gs ? { ...gs, belum_absen: gs.belum, total_siswa: gs.total } : null }));
    });
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);
  return { log, load };
}

function LogTabs({ tab, setTab, log }) {
  return (
    <div className="flex bg-sky-50 rounded-full p-1 ring-1 ring-sky-100" data-testid="face-log-tabs">
      {[["siswa", "Siswa", Users, log.siswa.length], ["guru", "Guru", GraduationCap, log.guru.length]].map(([k, l, I, n]) => (
        <button key={k} data-testid={`face-log-tab-${k}`} onClick={() => setTab(k)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${tab === k ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
          <I className="w-3.5 h-3.5" />{l}<span className="tabular-nums opacity-70">{n}</span>
        </button>
      ))}
    </div>
  );
}

export default function FaceAttendance() {
  const { user } = useAuth();
  const [cams, setCams] = useState([]);
  const [camId, setCamId] = useState("");
  const { videoRef, canvasRef, apiRef, state, error, retry } = useFaceCamera(camId);
  const [hint, setHint] = useState("Arahkan wajah ke bingkai");
  const [progress, setProgress] = useState(0);
  const [fid, setFid] = useState("searching");
  const [current, setCurrent] = useState(null);
  const [liveness, setLiveness] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [pending, setPending] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [tab, setTab] = useState("siswa");
  const { log, load } = useLiveLogs();
  const delProps = (kind) => canDeleteScan(user) ? { onDelete: (r) => deleteScan(r, kind, load), onDeleteAll: () => deleteAllScans(kind, load) } : {};
  const station = useRef(getStation()).current;
  const [dir, setDirState] = useState(getGateDir);
  const dirRef = useRef(dir); dirRef.current = dir;
  const setDir = (d) => { saveGateDir(d); setDirState(d); };
  const wrapRef = useRef(null);
  const busy = useRef(false);
  const buf = useRef([]);
  const blink = useRef({ open: false, blinked: false });
  const clearT = useRef(null);

  useEffect(() => { listCameras().then(setCams); }, [state]);
  useEffect(() => {
    const onFs = () => setIsFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const reset = () => { buf.current = []; blink.current = { open: false, blinked: false }; setProgress(0); setTimeout(() => { busy.current = false; setFid("searching"); setHint("Arahkan wajah ke bingkai"); }, 2200); };
  const show = (res) => {
    if (res.kind === "alert") alarm(); else beep(res.kind !== "err");
    setCurrent({ ...res, key: `${Date.now()}` }); setFid(res.kind === "err" ? "fail" : "success");
    setHint(res.kind === "err" ? "Wajah belum dikenali" : res.kind === "dup" ? "Sudah tercatat" : res.kind === "alert" ? "Keluar tanpa izin!" : "Berhasil!");
    if (res.guru) setTab("guru"); else if (res.student) setTab("siswa");
    clearTimeout(clearT.current);
    clearT.current = setTimeout(() => setCurrent(null), 3800);
  };
  const okResult = (d) => ({ kind: gateKind(d), gate: d.gate, student: d.student, at: d.scanned_at, code: `${d.confidence}%`, guru: d.kind === "guru", confirmed: d.confirmed });

  const submit = useCallback(async (descriptor) => {
    busy.current = true;
    try {
      const r = await api.post("/attendance/face-scan", { descriptor, direction: dirRef.current, station_id: station.id, station_name: station.name });
      if (r.data.needs_confirm) { setFid("confirm"); setHint("Konfirmasi identitas"); beep(false); setPending(descriptor); return; }
      show(okResult(r.data)); load();
    } catch (e) {
      show({ kind: "err", at: new Date().toISOString(), message: e.response?.data?.detail || "Gagal terhubung ke server" });
    }
    reset();
  }, [station, load]); // eslint-disable-line

  const confirmPin = async (digits) => {
    setPinBusy(true);
    try {
      const r = await api.post("/attendance/face-confirm", { descriptor: pending, digits, direction: dirRef.current, station_id: station.id, station_name: station.name });
      show(okResult(r.data)); load();
    } catch (e) { show({ kind: "err", at: new Date().toISOString(), message: e.response?.data?.detail || "Digit tidak cocok" }); }
    setPinBusy(false); setPending(null); reset();
  };

  useEffect(() => {
    if (state !== "ready") return;
    let alive = true, timer;
    const loop = async () => {
      const video = videoRef.current;
      if (!alive) return;
      if (!busy.current && video?.readyState >= 2) {
        try {
          const dets = await detectFaces(apiRef.current, video);
          if (dets.length === 0) { buf.current = []; setProgress(0); setFid("searching"); setHint("Arahkan wajah ke bingkai"); }
          else if (dets.length > 1) { buf.current = []; setProgress(0); setHint("Satu orang saja ya"); }
          else if (dets[0].detection.box.width < video.videoWidth * 0.18) { buf.current = []; setProgress(0); setHint("Mendekat sedikit"); }
          else {
            setFid("scanning");
            const ear = eyeAspect(dets[0].landmarks);
            if (ear > 0.27) blink.current.open = true;
            if (blink.current.open && ear < 0.21) blink.current.blinked = true;
            buf.current = [...buf.current, Array.from(dets[0].descriptor)].slice(-STABLE_FRAMES);
            setProgress(buf.current.length / STABLE_FRAMES * (liveness && !blink.current.blinked ? 0.75 : 1));
            if (liveness && !blink.current.blinked) setHint("Kedipkan mata");
            else if (buf.current.length >= STABLE_FRAMES) { setHint("Mengenali…"); await submit(meanDescriptor(buf.current)); }
            else setHint("Tahan sebentar…");
          }
        } catch { /* skip frame */ }
      }
      timer = setTimeout(loop, 170);
    };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [state, liveness, submit, videoRef, apiRef]);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.().catch(() => toast.error("Layar penuh tidak didukung"));
  };

  if (user && !OPS.includes(user.role)) return <p className="text-center text-slate-500 py-20" data-testid="face-access-denied">Halaman ini khusus Piket Gerbang / admin sekolah.</p>;

  const chip = "px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ring-1";
  const table = tab === "guru"
    ? <LiveScanTable who="Guru" rows={log.guru} stats={log.gStats} newId={log.newId} tabs={<LogTabs tab={tab} setTab={setTab} log={log} />} {...delProps("guru")} />
    : <LiveScanTable rows={log.siswa} stats={log.sStats} newId={log.newId} tabs={<LogTabs tab={tab} setTab={setTab} log={log} />} {...delProps("siswa")} />;

  return (
    <div className="space-y-6" data-testid="face-attendance-page">
      <PageHeader title="Absensi Face Recognition" subtitle="Satu kamera untuk siswa dan guru. Catatan siswa masuk ke presensi siswa, catatan guru masuk ke Absensi Guru."
        actions={<>
          <Link to="/attendance" data-testid="face-back-barcode" className="zx-btn-ghost"><ScanBarcode className="w-4 h-4" />Mode barcode</Link>
          <Link to="/teacher-attendance" data-testid="face-go-teacher-log" className="zx-btn-ghost"><ClipboardCheck className="w-4 h-4" />Absensi guru</Link>
          <Link to="/face-enroll" data-testid="face-go-enroll" className="zx-btn-primary"><UserPlus className="w-4 h-4" />Daftarkan wajah</Link>
        </>}/>

      <div ref={wrapRef} className={`bg-white p-6 sm:p-8 relative ${isFull ? "h-screen flex flex-col overflow-hidden" : "zx-card"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="zx-panel-title">Pemindai wajah • {station.name}</p>
            <span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold ${state === "ready" ? "text-emerald-600" : state === "error" ? "text-rose-600" : "text-amber-600"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />{state === "ready" ? "Kamera aktif" : state === "error" ? "Kamera bermasalah" : "Menyiapkan…"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {cams.length > 1 && (
              <label className={`${chip} bg-white ring-slate-200 text-slate-700`}>
                <Camera className="w-4 h-4" />
                <select data-testid="face-camera-select" value={camId} onChange={e => setCamId(e.target.value)} className="bg-transparent outline-none max-w-[160px]">
                  <option value="">Kamera default</option>
                  {cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Kamera ${i + 1}`}</option>)}
                </select>
              </label>
            )}
            <GateDirToggle value={dir} onChange={setDir} />
            <button data-testid="face-liveness-toggle" onClick={() => setLiveness(v => !v)} className={`${chip} ${liveness ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-slate-700 ring-slate-200 hover:ring-sky-400"}`}><Eye className="w-4 h-4" />Anti-Foto {liveness ? "ON" : "OFF"}</button>
            <button data-testid="face-fullscreen-button" onClick={toggleFull} className={`${chip} bg-white text-slate-700 ring-slate-200 hover:ring-sky-400`}>{isFull ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{isFull ? "Keluar" : "Layar Penuh"}</button>
            {isFull && <Clock />}
          </div>
        </div>
        <div className={`grid lg:grid-cols-2 gap-8 items-center ${isFull ? "shrink-0" : ""}`}>
          <div className="relative">
            <FaceScanFrame videoRef={videoRef} canvasRef={canvasRef} state={state} error={error} onRetry={retry} progress={progress} status={fid} hint={hint}
              sub={fid === "searching" ? "Posisikan wajah di dalam bingkai, lalu tahan sebentar" : null}>
              {pending && <DigitPad busy={pinBusy} onSubmit={confirmPin} onCancel={() => { setPending(null); reset(); }} />}
            </FaceScanFrame>
          </div>
          <div className={isFull ? "h-[52vh]" : "min-h-[420px] h-full"}><PresenceCard r={current} mode="face" /></div>
        </div>
        {isFull && table}
      </div>

      {!isFull && table}
    </div>
  );
}
