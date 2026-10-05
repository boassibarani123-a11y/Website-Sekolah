import { useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { QrCode, Download, Camera as CamIcon, Users, Check, UserCheck, Hash, ShieldAlert } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { useAuth } from "@/context/AuthContext";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const ATTENDANCE_ROLES = ["siswa", "ketua_kelas", "ketua_osis", "super_admin"];

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
  const scannerRef = useRef(null);
  const lockRef = useRef(false);

  const load = () => {
    api.get("/attendance/stats").then(r=>setStats(r.data)).catch(()=>{});
    api.get("/attendance").then(r=>setRows(r.data)).catch(()=>{});
  };
  useEffect(() => { if (isOperator) load(); }, [isOperator]);

  const submit = async (payload) => {
    try {
      const r = await api.post("/attendance/scan", { ...payload, status });
      setLastScan({ ...r.data.student, status, at: new Date(), proof: payload.photo || null });
      toast.success(`${r.data.student.name} - ${status.toUpperCase()}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal absen");
    }
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
            Fitur presensi QR/Barcode hanya dapat digunakan oleh <b>siswa</b>.
            Silakan masuk dengan akun siswa untuk melakukan absensi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Presensi Barcode</h1>
          <p className="mt-1 text-sm text-slate-500">Scan barcode NISN di Kartu Pelajar dengan alat USB atau input manual NISN · {stats?.date}</p>
        </div>
        {user?.role !== "siswa" && (
        <button data-testid="attendance-export-excel-button" onClick={exportXlsx}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2">
          <Download className="w-4 h-4"/>Export Excel
        </button>
        )}
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
        <BarcodeScanner onScan={(code)=>submit({ nisn: code, method: "barcode" })}/>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-sky-600"/>Log Presensi Hari Ini</h2>
          <div className="max-h-[400px] overflow-y-auto -mx-2 px-2">
            {rows.length===0 && <p className="text-sm text-slate-400 italic">Belum ada absensi.</p>}
            <div className="space-y-2">
              {rows.slice(0, 30).map(r=>(
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.photo && (
                      <a href={r.photo} target="_blank" rel="noreferrer" data-testid={`attendance-photo-${r.id}`} title="Foto bukti scan">
                        <img src={r.photo} alt="bukti" className="w-9 h-9 rounded-lg object-cover border border-slate-200"/>
                      </a>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{r.student_name}</p>
                      <p className="text-[11px] text-slate-500">{r.kelas} · {new Date(r.scanned_at).toLocaleTimeString("id-ID")}
                        <span data-testid={`attendance-method-${r.id}`} className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${r.method==="barcode"?"bg-violet-100 text-violet-700":r.method==="manual"?"bg-slate-200 text-slate-600":"bg-sky-100 text-sky-700"}`}>{r.method==="barcode"?"Barcode":r.method==="manual"?"Manual":"QR"}</span></p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full ${
                    r.status==="hadir"?"bg-emerald-100 text-emerald-700":
                    r.status==="izin"?"bg-sky-100 text-sky-700":
                    r.status==="sakit"?"bg-amber-100 text-amber-700":"bg-rose-100 text-rose-700"
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
