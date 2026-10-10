import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { ScanFace, Search, CheckCircle2, Circle, Trash2, RotateCcw, Save, Loader2, ArrowLeft, UserRound, ShieldCheck } from "lucide-react";
import { CameraStage } from "@/components/face/CameraStage";
import { useFaceCamera } from "@/components/face/useFaceCamera";
import { detectFaces, drawBoxes, snapshotFace } from "@/components/face/faceUtils";

const POSES = ["Lihat lurus ke kamera", "Toleh sedikit ke kiri", "Toleh sedikit ke kanan", "Angkat dagu sedikit", "Lihat lurus lagi"];
const BACKEND = process.env.REACT_APP_BACKEND_URL;

function StudentList({ data, selected, onPick, q, setQ, kelas, setKelas }) {
  const kelasOpts = useMemo(() => [...new Set((data?.students || []).map(s => s.kelas).filter(Boolean))].sort(), [data]);
  const pct = data?.total ? Math.round((data.enrolled / data.total) * 100) : 0;
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col max-h-[calc(100vh-200px)] min-h-[480px]" data-testid="face-student-list">
      <div className="p-5 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-heading font-extrabold text-slate-900">Daftar Siswa</p>
          <span data-testid="face-enrolled-stat" className="text-xs font-bold text-slate-500 tabular-nums">{data?.enrolled ?? 0}/{data?.total ?? 0} terdaftar</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-[width] duration-700" style={{ width: `${pct}%` }} /></div>
        <div className="flex gap-2">
          <label className="flex-1 flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 focus-within:border-sky-500">
            <Search className="w-4 h-4 text-slate-400" />
            <input data-testid="face-student-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / NISN" className="py-2 outline-none text-sm w-full" />
          </label>
          <select data-testid="face-kelas-filter" value={kelas} onChange={e => setKelas(e.target.value)} className="border-2 border-slate-200 rounded-xl px-2 text-sm outline-none focus:border-sky-500">
            <option value="">Semua kelas</option>
            {kelasOpts.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2">
        {!data && <p className="text-center text-slate-400 py-10 text-sm">Memuat…</p>}
        {data?.students.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">Tidak ada siswa.</p>}
        {data?.students.map(s => (
          <button key={s.id} data-testid={`face-student-${s.id}`} onClick={() => onPick(s)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors ${selected?.id === s.id ? "bg-sky-50 ring-2 ring-sky-400" : "hover:bg-slate-50"}`}>
            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {s.face_photo || s.photo ? <img src={s.face_photo || s.photo} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
              <p className="text-[11px] text-slate-500">{s.kelas || "—"} · NISN {s.nisn || "—"}</p>
            </div>
            {s.enrolled ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Enroller({ student, onDone }) {
  const { videoRef, canvasRef, apiRef, state, error, retry } = useFaceCamera("");
  const [phase, setPhase] = useState("idle"); // idle | capturing | review | saving
  const [samples, setSamples] = useState([]);
  const [hint, setHint] = useState({ text: "Tekan Mulai Rekam", tone: "sky" });
  const shot = useRef(null);
  const phaseRef = useRef(phase); phaseRef.current = phase;

  useEffect(() => { setPhase("idle"); setSamples([]); shot.current = null; }, [student.id]);

  useEffect(() => {
    if (state !== "ready") return;
    let alive = true, timer, lastAt = 0;
    const loop = async () => {
      if (!alive) return;
      const video = videoRef.current;
      if (video?.readyState >= 2) {
        try {
          const dets = await detectFaces(apiRef.current, video, true);
          drawBoxes(canvasRef.current, video, dets, dets.length === 1 ? "#34d399" : "#f59e0b");
          if (phaseRef.current === "capturing") {
            if (dets.length !== 1) setHint({ text: dets.length ? "Hanya satu wajah di kamera" : "Wajah tidak terlihat", tone: "amber" });
            else if (dets[0].detection.box.width < video.videoWidth * 0.22) setHint({ text: "Mendekat ke kamera", tone: "amber" });
            else if (dets[0].detection.score < 0.8) setHint({ text: "Cahaya kurang / wajah buram", tone: "amber" });
            else if (Date.now() - lastAt > 900) {
              lastAt = Date.now();
              if (!shot.current) shot.current = await snapshotFace(video, dets[0].detection.box);
              setSamples(prev => {
                const next = [...prev, Array.from(dets[0].descriptor)];
                if (next.length >= POSES.length) { setPhase("review"); setHint({ text: "Rekam selesai", tone: "emerald" }); }
                else setHint({ text: POSES[next.length], tone: "sky" });
                return next;
              });
            }
          }
        } catch { /* skip frame */ }
      }
      timer = setTimeout(loop, 160);
    };
    loop();
    return () => { alive = false; clearTimeout(timer); };
  }, [state, videoRef, canvasRef, apiRef]);

  const begin = () => { setSamples([]); shot.current = null; setPhase("capturing"); setHint({ text: POSES[0], tone: "sky" }); };
  const save = async () => {
    setPhase("saving");
    try {
      let photo = null;
      if (shot.current) {
        const fd = new FormData(); fd.append("file", shot.current, "face.jpg");
        const up = await api.post("/upload", fd); photo = `${BACKEND}${up.data.url}`;
      }
      await api.post("/face/enroll", { student_id: student.id, descriptors: samples, photo });
      toast.success(`Wajah ${student.name} berhasil didaftarkan`);
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan data wajah");
      setPhase("review");
    }
  };
  const remove = async () => {
    if (!window.confirm(`Hapus data wajah ${student.name}?`)) return;
    try { await api.delete(`/face/enroll/${student.id}`); toast.success("Data wajah dihapus"); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-2xl space-y-5" data-testid="face-enroller">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">Pendaftaran Wajah</p>
          <p data-testid="face-enroll-student-name" className="font-heading text-2xl font-extrabold">{student.name}</p>
          <p className="text-sm text-slate-400">{student.kelas || "—"} · NISN {student.nisn || "—"} {student.enrolled && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase">Sudah terdaftar</span>}</p>
        </div>
        {student.enrolled && <button data-testid="face-delete-button" onClick={remove} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-600 text-sm font-semibold flex items-center gap-2 transition-colors"><Trash2 className="w-4 h-4" />Hapus Data Wajah</button>}
      </div>
      <div className="grid md:grid-cols-5 gap-5">
        <div className="md:col-span-3"><CameraStage videoRef={videoRef} canvasRef={canvasRef} state={state} error={error} hint={phase === "idle" ? "" : hint.text} hintTone={hint.tone} onRetry={retry} /></div>
        <div className="md:col-span-2 space-y-3">
          {POSES.map((p, i) => {
            const done = i < samples.length, active = phase === "capturing" && i === samples.length;
            return (
              <div key={p} data-testid={`face-pose-${i}`} className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${done ? "bg-emerald-500/15" : active ? "bg-sky-500/20 ring-1 ring-sky-400" : "bg-white/5"}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${done ? "bg-emerald-500" : active ? "bg-sky-500 animate-pulse" : "bg-white/10"}`}>{done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}</span>
                <span className={`text-sm font-semibold ${done ? "text-emerald-200" : active ? "text-white" : "text-slate-400"}`}>{p}</span>
              </div>
            );
          })}
          {phase === "idle" && <button data-testid="face-start-capture" disabled={state !== "ready"} onClick={begin} className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"><ScanFace className="w-5 h-5" />{student.enrolled ? "Rekam Ulang Wajah" : "Mulai Rekam Wajah"}</button>}
          {phase === "capturing" && <button data-testid="face-cancel-capture" onClick={() => setPhase("idle")} className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold transition-colors">Batal</button>}
          {(phase === "review" || phase === "saving") && (
            <div className="grid grid-cols-2 gap-2">
              <button data-testid="face-retake" onClick={begin} disabled={phase === "saving"} className="py-3 rounded-2xl bg-white/10 hover:bg-white/20 font-semibold flex items-center justify-center gap-2 transition-colors"><RotateCcw className="w-4 h-4" />Ulangi</button>
              <button data-testid="face-save" onClick={save} disabled={phase === "saving"} className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">{phase === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Simpan</button>
            </div>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed flex gap-1.5"><ShieldCheck className="w-4 h-4 shrink-0 text-sky-400" />Yang disimpan hanya kode numerik wajah (128 angka) + 1 foto kecil, bukan video. Sistem menolak jika wajah mirip siswa lain yang sudah terdaftar.</p>
        </div>
      </div>
    </div>
  );
}

export default function FaceEnroll() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [kelas, setKelas] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    const p = new URLSearchParams(); if (q) p.set("q", q); if (kelas) p.set("kelas", kelas);
    return api.get(`/face/students?${p}`).then(r => {
      setData(r.data);
      setSelected(sel => {
        const want = sel?.id || params.get("student");
        return r.data.students.find(s => s.id === want) || sel;
      });
    }).catch(() => setData({ students: [], total: 0, enrolled: 0 }));
  }, [q, kelas, params]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-6" data-testid="face-enroll-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/face-attendance" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800"><ArrowLeft className="w-4 h-4" />Presensi Wajah</Link>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 mt-1 flex items-center gap-2"><ScanFace className="w-8 h-8 text-sky-600" />Daftarkan Wajah Siswa</h1>
          <p className="mt-1 text-sm text-slate-500">Pilih siswa, tekan Mulai Rekam, lalu ikuti 5 arahan pose. Kamera merekam otomatis.</p>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <StudentList data={data} selected={selected} onPick={setSelected} q={q} setQ={setQ} kelas={kelas} setKelas={setKelas} />
        <div className="lg:col-span-2">
          {selected ? <Enroller student={selected} onDone={load} /> : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center" data-testid="face-enroll-empty">
              <ScanFace className="w-14 h-14 text-slate-300 mx-auto" />
              <p className="mt-3 font-semibold text-slate-600">Pilih siswa dari daftar di sebelah kiri</p>
              <p className="text-sm text-slate-400">Kamera akan aktif setelah siswa dipilih.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
