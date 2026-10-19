import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Download, Users, ShieldAlert, ScanFace } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GateDisplay } from "@/components/attendance/GateDisplay";
import { canDeleteScan, deleteScan, deleteAllScans } from "@/components/attendance/scanDelete";
import { Trash2 } from "lucide-react";
import { StationPanel } from "@/components/attendance/StationPanel";
import { ManualPanel } from "@/components/attendance/ManualPanel";
import { StatCounters } from "@/components/attendance/StatCounters";
import { useScannerInput, beep, alarm, getStation, todayWib, getGateDir, saveGateDir, gateKind } from "@/components/attendance/scannerUtils";

const ATTENDANCE_ROLES = ["piket_gerbang", "super_admin", "staff_tu", "kepsek"];

export default function Attendance() {
  const { user } = useAuth();
  const isOperator = user && ATTENDANCE_ROLES.includes(user.role);
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [newId, setNewId] = useState(null);
  const [station, setStation] = useState(getStation);
  const [dir, setDirState] = useState(getGateDir);
  const setDir = (d) => { saveGateDir(d); setDirState(d); };
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [isFull, setIsFull] = useState(false);
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

  const gateScan = useCallback(async (code) => {
    let res;
    try {
      const r = await api.post("/attendance/scan", { nisn: code, method: "barcode", status: "hadir", direction: dir, station_id: station.id, station_name: station.name });
      res = { kind: gateKind(r.data), student: r.data.student, at: r.data.scanned_at, code, gate: r.data.gate };
    } catch (e) {
      res = { kind: "err", code, at: new Date().toISOString(), message: e.response?.data?.detail || "Gagal terhubung ke server" };
    }
    res.key = `${Date.now()}-${Math.random()}`;
    if (res.kind === "alert") alarm(); else beep(res.kind !== "err");
    setCurrent(res);
    setHistory(h => [res, ...h].slice(0, 8));
    clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => setCurrent(null), 4000);
    if (res.kind === "ok" || res.kind === "alert") load();
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
            Halaman presensi gerbang hanya dapat dibuka oleh <b>Piket Gerbang</b> atau admin sekolah.
            Siswa melakukan presensi dengan men-scan barcode NISN di Kartu Pelajar pada alat scanner di gerbang.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 att-soft" data-testid="attendance-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Presensi Gerbang</h1>
          <p className="mt-1 text-sm text-slate-500">Scanner barcode di gerbang langsung mencatat kehadiran siswa · {stats?.date}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <Link to="/face-attendance" data-testid="attendance-face-mode-button"
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors">
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

      <StatCounters stats={stats}/>

      <div ref={gateRef} className={isFull ? "gate-full bg-white" : ""}>
        <GateDisplay current={current} history={history} station={station} onFullscreen={toggleFull} isFull={isFull} rows={rows} stats={stats} newId={newId} dir={dir} setDir={setDir}/>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-stretch" data-testid="attendance-tools-row">
        <ManualPanel station={station} onDone={load}/>
        <StationPanel station={station} setStation={setStation}/>
      </div>

      <LiveLog rows={rows} newId={newId} canDelete={canDeleteScan(user)} onDelete={(r)=>deleteScan(r, "siswa", load)} onDeleteAll={()=>deleteAllScans("siswa", load)}/>
    </div>
  );
}

function LiveLog({ rows, newId, canDelete, onDelete, onDeleteAll }) {
  const methodBadge = (m)=> m==="barcode"?{t:"Barcode",c:"bg-violet-100 text-violet-700"}:m==="manual"?{t:"Manual",c:"bg-slate-200 text-slate-600"}:{t:"QR",c:"bg-sky-100 text-sky-700"};
  const statusBadge = (s)=> ({hadir:"bg-emerald-100 text-emerald-700",izin:"bg-sky-100 text-sky-700",sakit:"bg-amber-100 text-amber-700",alpa:"bg-rose-100 text-rose-700"}[s]||"bg-slate-100 text-slate-600");
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" data-testid="attendance-live-log">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-heading text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-sky-600"/>Log Presensi Real-time <span className="text-xs font-normal text-slate-400">({rows.length})</span></h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-600" data-testid="live-indicator">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"/>Live
        </span>
        {canDelete && <button data-testid="attendance-delete-all" onClick={onDeleteAll} className="ml-2 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5"/>Hapus Semua Hari Ini</button>}
      </div>
      <div className="max-h-[460px] overflow-y-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="px-4 py-3">No</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Kelas</th>
              <th className="px-4 py-3">Waktu Scan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3">Perangkat</th><th className="px-4 py-3">Bukti</th>{canDelete && <th className="px-4 py-3"/>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length===0 && <tr><td colSpan={canDelete ? 9 : 8} className="px-4 py-10 text-center text-slate-400 italic" data-testid="attendance-log-empty">Belum ada absensi hari ini. Scan barcode NISN untuk mulai.</td></tr>}
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
                  {canDelete && <td className="px-4 py-3"><button data-testid={`attendance-delete-${r.id}`} title="Hapus data scan" onClick={()=>onDelete(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
