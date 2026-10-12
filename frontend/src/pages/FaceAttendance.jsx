import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { ScanFace, Maximize, Minimize, ScanBarcode, Eye, UserPlus, Camera, GraduationCap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LiveScanTable } from "@/components/attendance/LiveScanTable";
import { beep, getStation, todayWib } from "@/components/attendance/scannerUtils";
import { FaceIdStage } from "@/components/face/FaceIdStage";
import { DigitPad } from "@/components/face/DigitPad";
import { useFaceCamera } from "@/components/face/useFaceCamera";
import { detectFaces, eyeAspect, meanDescriptor, listCameras } from "@/components/face/faceUtils";

const OPS = ["admin_absensi", "super_admin", "staff_tu", "kepsek"];
const STABLE_FRAMES = 4;
const fmt = (iso) => iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

function ResultPanel({ r }) {
  if (!r) return (
    <div data-testid="gate-idle" className="h-full rounded-[2rem] bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center text-center p-8">
      <ScanFace className="w-16 h-16 text-white/30" />
      <p className="mt-4 text-2xl font-semibold text-white">Lihat ke Kamera</p>
      <p className="mt-1 text-white/50 text-sm">Siswa & guru dikenali otomatis dalam ±1 detik</p>
    </div>
  );
  const ok = r.kind !== "err";
  return (
    <div data-testid="gate-result" data-kind={r.kind} className={`h-full rounded-[2rem] p-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200 ${ok ? "bg-gradient-to-b from-[#30d158]/25 to-transparent border border-[#30d158]/40" : "bg-gradient-to-b from-[#ff453a]/25 to-transparent border border-[#ff453a]/40"}`}>
      <div className="w-28 h-28 rounded-full overflow-hidden bg-white/10 ring-4 ring-white/20 flex items-center justify-center text-4xl font-bold text-white">
        {r.student?.photo ? <img src={r.student.photo} alt="" className="w-full h-full object-cover" /> : (r.student?.name || "!")[0]}
      </div>
      {r.student ? (
        <>
          <p data-testid="gate-result-name" className="mt-5 text-3xl font-bold text-white tracking-tight">{r.student.name}</p>
          <p className="mt-1 text-white/70 flex items-center gap-1.5">{r.guru && <GraduationCap className="w-4 h-4" />}{r.guru ? "Guru" : `Kelas ${r.student.kelas || "-"}`} · Kecocokan {r.code}{r.confirmed ? " · terverifikasi digit" : ""}</p>
          <p data-testid="gate-result-label" className={`mt-4 px-4 py-1.5 rounded-full text-sm font-semibold ${r.kind === "dup" ? "bg-white/15 text-white" : "bg-[#30d158] text-black"}`}>{r.kind === "dup" ? `Sudah tercatat ${fmt(r.at)}` : `Hadir · ${fmt(r.at)}`}</p>
        </>
      ) : <p data-testid="gate-result-error" className="mt-5 text-xl font-semibold text-white">{r.message}</p>}
    </div>
  );
}

export default function FaceAttendance() {
  const { user } = useAuth();
  const [cams, setCams] = useState([]);
  const [camId, setCamId] = useState("");
  const { videoRef, canvasRef, apiRef, state, error, retry } = useFaceCamera(camId);
  const [hint, setHint] = useState("Arahkan wajah ke lingkaran");
  const [progress, setProgress] = useState(0);
  const [fid, setFid] = useState("searching");
  const [current, setCurrent] = useState(null);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [newId, setNewId] = useState(null);
  const [liveness, setLiveness] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [pending, setPending] = useState(null);
  const [pinBusy, setPinBusy] = useState(false);
  const station = useRef(getStation()).current;
  const wrapRef = useRef(null);
  const busy = useRef(false);
  const buf = useRef([]);
  const blink = useRef({ open: false, blinked: false });
  const clearT = useRef(null);
  const topRef = useRef(null);

  const load = useCallback(() => {
    const d = todayWib();
    api.get(`/attendance/stats?date=${d}`).then(r => setStats(r.data)).catch(() => {});
    api.get(`/attendance?date=${d}`).then(r => {
      setRows(r.data);
      const top = r.data[0]?.id;
      if (top && topRef.current && top !== topRef.current) { setNewId(top); setTimeout(() => setNewId(null), 2500); }
      topRef.current = top;
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);
  useEffect(() => { listCameras().then(setCams); }, [state]);
  useEffect(() => {
    const onFs = () => setIsFull(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const reset = () => { buf.current = []; blink.current = { open: false, blinked: false }; setProgress(0); setTimeout(() => { busy.current = false; setFid("searching"); }, 2200); };
  const show = (res) => {
    beep(res.kind !== "err");
    setCurrent(res); setFid(res.kind === "err" ? "fail" : "success");
    setHint(res.kind === "err" ? "Tidak dikenali" : res.kind === "dup" ? "Sudah tercatat" : "Berhasil");
    clearTimeout(clearT.current);
    clearT.current = setTimeout(() => setCurrent(null), 3800);
  };
  const okResult = (d) => ({ kind: d.duplicate ? "dup" : "ok", student: d.student, at: d.scanned_at, code: `${d.confidence}%`, guru: d.kind === "guru", confirmed: d.confirmed });

  const submit = useCallback(async (descriptor) => {
    busy.current = true;
    try {
      const r = await api.post("/attendance/face-scan", { descriptor, station_id: station.id, station_name: station.name });
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
      const r = await api.post("/attendance/face-confirm", { descriptor: pending, digits, station_id: station.id, station_name: station.name });
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
          if (dets.length === 0) { buf.current = []; setProgress(0); setFid("searching"); setHint("Arahkan wajah ke lingkaran"); }
          else if (dets.length > 1) { buf.current = []; setProgress(0); setHint("Satu orang saja di depan kamera"); }
          else if (dets[0].detection.box.width < video.videoWidth * 0.18) { buf.current = []; setProgress(0); setHint("Dekatkan wajah"); }
          else {
            setFid("scanning");
            const ear = eyeAspect(dets[0].landmarks);
            if (ear > 0.27) blink.current.open = true;
            if (blink.current.open && ear < 0.21) blink.current.blinked = true;
            buf.current = [...buf.current, Array.from(dets[0].descriptor)].slice(-STABLE_FRAMES);
            setProgress(buf.current.length / STABLE_FRAMES * (liveness && !blink.current.blinked ? 0.75 : 1));
            if (liveness && !blink.current.blinked) setHint("Kedipkan mata");
            else if (buf.current.length >= STABLE_FRAMES) { setHint("Mengenali…"); await submit(meanDescriptor(buf.current)); }
            else setHint("Tahan sebentar");
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

  if (user && !OPS.includes(user.role)) return <p className="text-center text-slate-500 py-20" data-testid="face-access-denied">Halaman ini khusus Admin Absensi / admin sekolah.</p>;

  return (
    <div className="space-y-6" data-testid="face-attendance-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Face ID · Siswa & Guru</p>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2"><ScanFace className="w-8 h-8 text-sky-600" />Presensi Wajah</h1>
          <p className="mt-1 text-sm text-slate-500">Satu kamera untuk semua. Sistem otomatis membedakan siswa dan guru, dan meminta konfirmasi digit bila ada wajah yang sangat mirip.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/attendance" data-testid="face-back-barcode" className="px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white font-semibold text-slate-700 hover:border-sky-400 flex items-center gap-2 transition-colors"><ScanBarcode className="w-4 h-4" />Mode Barcode</Link>
          <Link to="/face-enroll" data-testid="face-go-enroll" className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-sky-600 flex items-center gap-2 transition-colors"><UserPlus className="w-4 h-4" />Daftarkan Wajah</Link>
        </div>
      </div>

      <div ref={wrapRef} className={`bg-black text-white p-6 sm:p-8 relative ${isFull ? "h-screen flex flex-col overflow-hidden" : "rounded-[2.5rem] shadow-2xl"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="font-semibold text-lg">{station.name}</p>
            <span className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium ${state === "ready" ? "text-[#30d158]" : state === "error" ? "text-[#ff453a]" : "text-[#ffd60a]"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />{state === "ready" ? "Live" : state === "error" ? "Kamera bermasalah" : "Menyiapkan…"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {cams.length > 1 && (
              <label className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2 text-xs font-semibold">
                <Camera className="w-4 h-4" />
                <select data-testid="face-camera-select" value={camId} onChange={e => setCamId(e.target.value)} className="bg-transparent outline-none max-w-[160px]">
                  <option value="" className="text-slate-900">Kamera default</option>
                  {cams.map((c, i) => <option key={c.deviceId} value={c.deviceId} className="text-slate-900">{c.label || `Kamera ${i + 1}`}</option>)}
                </select>
              </label>
            )}
            <button data-testid="face-liveness-toggle" onClick={() => setLiveness(v => !v)} className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${liveness ? "bg-[#30d158] text-black" : "bg-white/10 hover:bg-white/20"}`}><Eye className="w-4 h-4" />Anti-Foto {liveness ? "ON" : "OFF"}</button>
            <button data-testid="face-fullscreen-button" onClick={toggleFull} className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors">{isFull ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{isFull ? "Keluar" : "Layar Penuh"}</button>
          </div>
        </div>
        <div className={`grid lg:grid-cols-2 gap-8 items-center ${isFull ? "shrink-0" : ""}`}>
          <div className="relative py-2">
            <FaceIdStage videoRef={videoRef} canvasRef={canvasRef} state={state} error={error} onRetry={retry} progress={progress} status={fid} hint={hint}
              sub={fid === "searching" ? "Posisikan wajah di dalam lingkaran" : null} />
            {pending && <DigitPad busy={pinBusy} onSubmit={confirmPin} onCancel={() => { setPending(null); reset(); }} />}
          </div>
          <div className={isFull ? "h-[46vh]" : "min-h-[360px] h-full"}><ResultPanel r={current} /></div>
        </div>
        {isFull && <LiveScanTable rows={rows} stats={stats} newId={newId} />}
      </div>

      {!isFull && <div className="bg-slate-950 text-white rounded-3xl p-1 flex flex-col max-h-[520px]"><LiveScanTable rows={rows} stats={stats} newId={newId} /></div>}
    </div>
  );
}
