import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { ScanFace, Maximize, Minimize, ScanBarcode, Eye, UserPlus, Camera } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ResultCard } from "@/components/attendance/GateDisplay";
import { LiveScanTable } from "@/components/attendance/LiveScanTable";
import { beep, getStation, todayWib } from "@/components/attendance/scannerUtils";
import { CameraStage } from "@/components/face/CameraStage";
import { useFaceCamera } from "@/components/face/useFaceCamera";
import { detectFaces, drawBoxes, eyeAspect, meanDescriptor, listCameras } from "@/components/face/faceUtils";

const OPS = ["admin_absensi", "super_admin", "staff_tu", "kepsek"];
const STABLE_FRAMES = 3;

export default function FaceAttendance() {
  const { user } = useAuth();
  const [cams, setCams] = useState([]);
  const [camId, setCamId] = useState("");
  const { videoRef, canvasRef, apiRef, state, error, retry } = useFaceCamera(camId);
  const [hint, setHint] = useState({ text: "Arahkan wajah ke kamera", tone: "sky" });
  const [current, setCurrent] = useState(null);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [newId, setNewId] = useState(null);
  const [liveness, setLiveness] = useState(false);
  const [isFull, setIsFull] = useState(false);
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

  const show = (res) => {
    beep(res.kind !== "err");
    setCurrent(res);
    clearTimeout(clearT.current);
    clearT.current = setTimeout(() => setCurrent(null), 3500);
  };

  const submit = useCallback(async (descriptor) => {
    busy.current = true;
    try {
      const r = await api.post("/attendance/face-scan", { descriptor, station_id: station.id, station_name: station.name });
      show({ kind: r.data.duplicate ? "dup" : "ok", student: r.data.student, at: r.data.scanned_at, code: `${r.data.confidence}%` });
      load();
    } catch (e) {
      show({ kind: "err", code: "wajah", at: new Date().toISOString(), message: e.response?.data?.detail || "Gagal terhubung ke server" });
    }
    buf.current = []; blink.current = { open: false, blinked: false };
    setTimeout(() => { busy.current = false; }, 2500);
  }, [station, load]);

  useEffect(() => {
    if (state !== "ready") return;
    let alive = true, timer;
    const loop = async () => {
      const video = videoRef.current;
      if (!alive) return;
      if (!busy.current && video?.readyState >= 2) {
        try {
          const dets = await detectFaces(apiRef.current, video);
          drawBoxes(canvasRef.current, video, dets, dets.length === 1 ? "#34d399" : "#38bdf8");
          if (dets.length === 0) { buf.current = []; setHint({ text: "Arahkan wajah ke kamera", tone: "sky" }); }
          else if (dets.length > 1) { buf.current = []; setHint({ text: "Satu orang saja di depan kamera", tone: "amber" }); }
          else if (dets[0].detection.box.width < video.videoWidth * 0.18) { buf.current = []; setHint({ text: "Mendekat ke kamera", tone: "amber" }); }
          else {
            const ear = eyeAspect(dets[0].landmarks);
            if (ear > 0.27) blink.current.open = true;
            if (blink.current.open && ear < 0.21) blink.current.blinked = true;
            buf.current = [...buf.current, Array.from(dets[0].descriptor)].slice(-STABLE_FRAMES);
            if (liveness && !blink.current.blinked) setHint({ text: "Kedipkan mata untuk verifikasi", tone: "amber" });
            else if (buf.current.length >= STABLE_FRAMES) { setHint({ text: "Mencocokkan wajah…", tone: "emerald" }); await submit(meanDescriptor(buf.current)); }
            else setHint({ text: "Tahan sebentar…", tone: "emerald" });
          }
        } catch { /* skip frame */ }
      }
      timer = setTimeout(loop, 180);
    };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [state, liveness, submit, videoRef, canvasRef, apiRef]);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.().catch(() => toast.error("Layar penuh tidak didukung"));
  };

  if (user && !OPS.includes(user.role)) return <p className="text-center text-slate-500 py-20" data-testid="face-access-denied">Halaman ini khusus Admin Absensi / admin sekolah.</p>;

  return (
    <div className="space-y-6" data-testid="face-attendance-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Presensi Cadangan</p>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2"><ScanFace className="w-8 h-8 text-sky-600" />Presensi Wajah</h1>
          <p className="mt-1 text-sm text-slate-500">Dipakai saat scanner barcode bermasalah. Siswa cukup berdiri di depan kamera — otomatis tercatat.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/attendance" data-testid="face-back-barcode" className="px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white font-semibold text-slate-700 hover:border-sky-400 flex items-center gap-2 transition-colors"><ScanBarcode className="w-4 h-4" />Mode Barcode</Link>
          <Link to="/face-enroll" data-testid="face-go-enroll" className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-sky-600 flex items-center gap-2 transition-colors"><UserPlus className="w-4 h-4" />Daftarkan Wajah</Link>
        </div>
      </div>

      <div ref={wrapRef} className={`bg-slate-950 text-white p-6 ${isFull ? "h-screen flex flex-col overflow-hidden" : "rounded-3xl shadow-2xl"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Face Recognition</p>
            <p className="font-heading text-2xl font-extrabold">{station.name}</p>
            <span className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase ${state === "ready" ? "text-emerald-400" : state === "error" ? "text-rose-400" : "text-amber-400"}`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />{state === "ready" ? "Kamera aktif · Live" : state === "error" ? "Kamera bermasalah" : "Menyiapkan…"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {cams.length > 1 && (
              <label className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-xs font-semibold">
                <Camera className="w-4 h-4" />
                <select data-testid="face-camera-select" value={camId} onChange={e => setCamId(e.target.value)} className="bg-transparent outline-none max-w-[160px]">
                  <option value="" className="text-slate-900">Kamera default</option>
                  {cams.map((c, i) => <option key={c.deviceId} value={c.deviceId} className="text-slate-900">{c.label || `Kamera ${i + 1}`}</option>)}
                </select>
              </label>
            )}
            <button data-testid="face-liveness-toggle" onClick={() => setLiveness(v => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${liveness ? "bg-emerald-500 text-white" : "bg-white/10 hover:bg-white/20"}`}>
              <Eye className="w-4 h-4" />Anti-Foto (Kedip) {liveness ? "ON" : "OFF"}
            </button>
            <button data-testid="face-fullscreen-button" onClick={toggleFull} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors">
              {isFull ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{isFull ? "Keluar Layar Penuh" : "Layar Penuh"}
            </button>
          </div>
        </div>
        <div className={`grid lg:grid-cols-5 gap-5 ${isFull ? "shrink-0" : ""}`}>
          <div className={`lg:col-span-3 ${isFull ? "max-h-[46vh] [&>div]:max-h-[46vh]" : ""}`}>
            <CameraStage videoRef={videoRef} canvasRef={canvasRef} state={state} error={error} hint={hint.text} hintTone={hint.tone} onRetry={retry} />
          </div>
          <div className={`lg:col-span-2 ${isFull ? "h-[46vh]" : "min-h-[320px]"}`}><ResultCard r={current} idleTitle="Lihat ke Kamera" idleSub="Wajah dikenali otomatis dalam ±1 detik" /></div>
        </div>
        {isFull && <LiveScanTable rows={rows} stats={stats} newId={newId} />}
      </div>

      {!isFull && <div className="bg-slate-950 text-white rounded-3xl p-1 flex flex-col max-h-[520px]"><LiveScanTable rows={rows} stats={stats} newId={newId} /></div>}
    </div>
  );
}
