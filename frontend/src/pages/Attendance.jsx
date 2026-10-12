import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { QrCode, Download, Camera as CamIcon, Users, Check, UserCheck, Hash, ShieldAlert, ScanFace } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GateDisplay } from "@/components/attendance/GateDisplay";
import { StationPanel } from "@/components/attendance/StationPanel";
import { useScannerInput, beep, getStation, todayWib } from "@/components/attendance/scannerUtils";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const ATTENDANCE_ROLES = ["admin_absensi", "super_admin", "staff_tu", "kepsek"];

export default function Attendance() {
  const { user } = useAuth();
  const isOperator = user && ATTENDANCE_ROLES.includes(user.role);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [manual, setManual] = useState("");
  const [manualNisn, setManualNisn] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const [status, setStatus] = useState("hadir");
  const [scanning, setScanning] = useState(false);
  const [newId, setNewId] = useState(null);
  const [station, setStation] = useState(getStation);
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [isFull, setIsFull] = useState(false);
  const scannerRef = useRef(null);
  const lockRef = useRef(false);
  const topRef = useRef(null);
  const gateRef = useRef(null);
  const clearRef = useRef(null);

  const load = () => {
    const d = todayWib();
    api.get(`/attendance/stats?date=${d}`).then(r=>setStats(r.data)).catch(()=>{});
    api.get(`/attendance?date=${d}`).then(r=>{
      setRows(r.data);
      const top = r.data[0]?.id;
      if (top && topRef.current && top !== topRef.current) {
        setNewId(top);
        setTimeout(()=>setNewId(null), 2500);
      }
      topRef.current = top;
    }).catch(()=>{});
  };
  useEffect(() => {
    if (!isOperator) return;
    load();
    const t = setInterval(load, isFull ? 3000 : 5000); // live auto-refresh (faster in fullscreen)
    return () => clearInterval(t);
  }, [isOperator, isFull]);

  const submit = async (payload) => {
    try {
      const r = await api.post("/attendance/scan", { ...payload, status, station_id: station.id, station_name: station.name });
      setLastScan({ ...r.data.student, status, at: new Date(), proof: payload.photo || null });
      toast.success(`${r.data.student.name} - ${status.toUpperCase()}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal absen");
    }
  };

  const gateScan = useCallback(async (code) => {
    let res;
    try {
      const r = await api.post("/attendance/scan", { nisn: code, method: "barcode", status: "hadir", station_id: station.id, station_name: station.name });
      res = { kind: r.data.duplicate ? "dup" : "ok", student: r.data.student, at: r.data.scanned_at, code };
    } catch (e) {
      res = { kind: "err", code, at: new Date().toISOString(), message: e.response?.data?.detail || "Gagal terhubung ke server" };
    }
    res.key = `${Date.now()}-${Math.random()}`;
    beep(res.kind !== "err");
    setCurrent(res);
    setHistory(h => [res, ...h].slice(0, 8));
    clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => setCurrent(null), 4000);
    if (res.kind === "ok") load();
  }, [station]); // eslint-disable-line
  useScannerInput(gateScan, !!isOperator);

  useEffect(() => {
    const onFs = () => setIsFull(document.fullscreenElement === gateRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => { document.removeEventListener("fullscreenchange", onFs); clearTimeout(clearRef.current); };
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else gateRef.current?.requestFullscreen?.().catch(() => toast.error("Layar penuh tidak didukung browser ini"));
  };

  // Capture a JPEG frame from the live scanner video (anti buddy-punching proof)
  const captureSnapshot = async () => {
    try {
      const video = document.querySelector("#qr-reader video");
      if (!video || !video.videoWidth) return null;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("file", blob, "presensi.jpg");
      const up = await api.post("/upload", fd);
      return `${BACKEND}${up.data.url}`;
    } catch { return null; }
  };

  const startCam = async () => {
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    await new Promise(r => setTimeout(r, 120)); // let #qr-reader become visible
    const cam = new Html5Qrcode("qr-reader");
    scannerRef.current = cam;
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    const onOk = async (txt) => {
      if (lockRef.current) return;          // debounce repeated detections
      lockRef.current = true;
      const photo = await captureSnapshot(); // snapshot proof before submitting
      await submit({ qr_code: txt, photo, method: "qr" });
      setTimeout(() => { lockRef.current = false; }, 2500);
    };
    try {
      // Prefer rear camera; fall back to any available camera (laptop/desktop webcam)
      try {
        await cam.start({ facingMode: "environment" }, config, onOk, () => {});
      } catch (e1) {
        const cams = await Html5Qrcode.getCameras();
        if (cams && cams.length) await cam.start(cams[0].id, config, onOk, () => {});
        else throw e1;
      }
    } catch (e) {
      toast.error("Kamera tidak tersedia / izin ditolak. Pakai Input Manual NISN atau QR di bawah.");
      setScanning(false);
    }
  };
  const stopCam = async () => {
    try { await scannerRef.current?.stop(); } catch(e){}
    setScanning(false);
  };
  useEffect(()=>()=>{stopCam();},[]);

  const exportXlsx = async () => {
    const r = await api.get(`/attendance/export?date=${stats?.date || ""}`, { responseType:"blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a"); a.href = url; a.download = `absensi_${stats?.date}.xlsx`; a.click();
  };

  if (user && !isOperator) {
    return (
      <div className="max-w-xl mx-auto mt-10" data-testid="attendance-access-denied">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7"/>
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 mt-4">Akses Presensi Tidak Tersedia</h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Halaman presensi gerbang hanya dapat dibuka oleh <b>Admin Absensi</b> atau admin sekolah.
            Siswa melakukan presensi dengan men-scan barcode NISN di Kartu Pelajar pada alat scanner di gerbang.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Presensi Gerbang</h1>
          <p className="mt-1 text-sm text-slate-500">Scanner barcode di gerbang langsung mencatat kehadiran siswa · {stats?.date}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <Link to="/face-attendance" data-testid="attendance-face-mode-button"
          className="px-4 py-2.5 bg-slate-900 hover:bg-sky-600 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors">
          <ScanFace className="w-4 h-4"/>Scanner Down? Pakai Wajah
        </Link>
        {user?.role !== "siswa" && (
        <button data-testid="attendance-export-excel-button" onClick={exportXlsx}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2">
          <Download className="w-4 h-4"/>Export Excel
        </button>
        )}
        </div>
      </div>

      <div ref={gateRef} className={isFull ? "gate-full bg-slate-950" : ""}>
        <GateDisplay current={current} history={history} station={station} onFullscreen={toggleFull} isFull={isFull} rows={rows} stats={stats} newId={newId}/>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Counter label="Hadir" value={stats?.hadir} color="emerald"/>
        <Counter label="Izin" value={stats?.izin} color="sky"/>
        <Counter label="Sakit" value={stats?.sakit} color="amber"/>
        <Counter label="Alpa" value={stats?.alpa} color="rose"/>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2"><Hash className="w-5 h-5 text-sky-600"/>Absensi Manual (NISN)</h2>
          <div className="flex gap-2 mb-4">
            {["hadir","izin","sakit","alpa"].map(s=>(
              <button key={s} onClick={()=>setStatus(s)} data-testid={`att-status-${s}`}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase transition-all ${status===s?"bg-sky-600 text-white shadow":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>
            ))}
          </div>
          <div className="mt-2 space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Hash className="w-3 h-3"/>Input Manual NISN (jika kartu hilang / QR error)</label>
              <div className="mt-1.5 flex gap-2">
                <input value={manualNisn} onChange={e=>setManualNisn(e.target.value)} placeholder="mis. 0099887766"
                  data-testid="manual-nisn-input"
                  className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-sm"/>
                <button data-testid="manual-nisn-submit" onClick={()=>{if(manualNisn){submit({nisn:manualNisn, method:"manual"}); setManualNisn("");}}}
                  className="px-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-1"><Check className="w-4 h-4"/></button>
              </div>
            </div>
          </div>

          {lastScan && (
            <div data-testid="recognition-panel" className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5"/>Siswa Dikenali</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-heading font-extrabold text-lg overflow-hidden">
                  {lastScan.photo ? <img src={lastScan.photo} alt={lastScan.name} className="w-full h-full object-cover"/> : (lastScan.name||"?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p data-testid="recognition-name" className="font-heading font-bold text-slate-900 truncate">{lastScan.name}</p>
                  <p className="text-xs text-slate-600">{lastScan.kelas || "-"}{lastScan.nisn ? ` · NISN ${lastScan.nisn}` : ""}</p>
                </div>
                <span className={`ml-auto px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                  lastScan.status==="hadir"?"bg-emerald-600 text-white":
                  lastScan.status==="izin"?"bg-sky-600 text-white":
                  lastScan.status==="sakit"?"bg-amber-500 text-white":"bg-rose-600 text-white"
                }`}>{lastScan.status}</span>
              </div>
              <p className="mt-2 text-[11px] text-emerald-700/70">Tercatat {lastScan.at.toLocaleTimeString("id-ID")}</p>
            </div>
          )}
        </div>
        <StationPanel station={station} setStation={setStation}/>
        </div>
      </div>

      <LiveLog rows={rows} newId={newId}/>
    </div>
  );
}

function LiveLog({ rows, newId }) {
  const methodBadge = (m)=> m==="barcode"?{t:"Barcode",c:"bg-violet-100 text-violet-700"}:m==="manual"?{t:"Manual",c:"bg-slate-200 text-slate-600"}:{t:"QR",c:"bg-sky-100 text-sky-700"};
  const statusBadge = (s)=> ({hadir:"bg-emerald-100 text-emerald-700",izin:"bg-sky-100 text-sky-700",sakit:"bg-amber-100 text-amber-700",alpa:"bg-rose-100 text-rose-700"}[s]||"bg-slate-100 text-slate-600");
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" data-testid="attendance-live-log">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-heading text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-sky-600"/>Log Presensi Real-time <span className="text-xs font-normal text-slate-400">({rows.length})</span></h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600" data-testid="live-indicator">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"/>Live
        </span>
      </div>
      <div className="max-h-[460px] overflow-y-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="px-4 py-3">No</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Kelas</th>
              <th className="px-4 py-3">Waktu Scan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3">Perangkat</th><th className="px-4 py-3">Bukti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length===0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 italic" data-testid="attendance-log-empty">Belum ada absensi hari ini. Scan barcode NISN untuk mulai.</td></tr>}
            {rows.map((r,i)=>{
              const mb = methodBadge(r.method);
              return (
                <tr key={r.id} data-testid={`attendance-log-row-${r.id}`}
                  className={`transition-colors ${r.id===newId ? "bg-emerald-50 animate-in fade-in slide-in-from-top-1" : "hover:bg-slate-50"}`}>
                  <td className="px-4 py-3 text-slate-400">{i+1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.student_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.kelas || "—"}</td>
                  <td className="px-4 py-3 font-mono-alt text-slate-600">{new Date(r.scanned_at).toLocaleTimeString("id-ID")}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${mb.c}`}>{mb.t}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.station_name || "—"}</td>
                  <td className="px-4 py-3">{r.photo ? <a href={r.photo} target="_blank" rel="noreferrer" data-testid={`attendance-photo-${r.id}`}><img src={r.photo} alt="bukti" className="w-9 h-9 rounded-lg object-cover border border-slate-200"/></a> : <span className="text-slate-300">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Counter({label, value, color}) {
  const c = {emerald:"from-emerald-500 to-emerald-600", sky:"from-sky-500 to-sky-600",
              amber:"from-amber-500 to-amber-600", rose:"from-rose-500 to-rose-600"}[color];
  return <div className={`bg-gradient-to-br ${c} text-white p-5 rounded-2xl shadow-lg`}>
    <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
    <p className="mt-2 font-heading text-4xl font-extrabold">{value ?? 0}</p>
  </div>;
}
