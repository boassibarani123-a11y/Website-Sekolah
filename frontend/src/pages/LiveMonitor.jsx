import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Users, UserCheck, AlertTriangle, VideoOff, Clock, MonitorPlay } from "lucide-react";
import api from "@/lib/apiClient";
import { fmtClock } from "@/components/live/liveUtils";

function Stat({ icon: Icon, label, value, tone, testid }) {
  return (
    <div data-testid={testid} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Icon className={`w-5 h-5 ${tone}`} />
      <p className="font-mono-alt text-3xl font-bold text-white mt-2 tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}

function ClassCard({ r }) {
  const s = r.session;
  const tone = !r.open ? "border-white/5 opacity-60" : s ? (r.teacher_online ? "border-emerald-400/40" : r.teacher_late ? "border-amber-400/50" : "border-cyan-400/30") : "border-white/5";
  return (
    <Link to={`/classes/${r.class_id}`} data-testid={`monitor-class-${r.class_id}`}
      className={`block rounded-2xl border bg-[#0d1424] p-4 hover:bg-[#111a2e] transition-colors ${tone}`}>
      <div className="flex items-center gap-2">
        <p className="font-heading font-bold text-white truncate">{r.class_name}</p>
        {s ? <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-rose-300"><Radio className="w-3 h-3 animate-pulse" />LIVE</span>
          : !r.open ? <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-white/40"><VideoOff className="w-3 h-3" />DITUTUP</span>
          : <span className="ml-auto text-[10px] text-white/30">Tidak ada sesi</span>}
      </div>
      {s ? (
        <>
          <p className="text-cyan-300 font-semibold text-sm mt-2 truncate">{s.subject}</p>
          <p className="text-xs text-white/50 truncate">{s.teacher_name} · s/d {fmtClock(s.ends_at)}</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className={`inline-flex items-center gap-1.5 ${r.teacher_online ? "text-emerald-300" : r.teacher_late ? "text-amber-300" : "text-white/40"}`}>
              <span className={`w-2 h-2 rounded-full ${r.teacher_online ? "bg-emerald-400 animate-pulse" : r.teacher_late ? "bg-amber-400" : "bg-slate-500"}`} />
              {r.teacher_online ? "Guru online" : r.teacher_late ? "Guru terlambat >10 mnt" : "Guru belum masuk"}
            </span>
            <span className="ml-auto text-white/70 tabular-nums" title="Siswa online / terdaftar"><Users className="w-3 h-3 inline mr-1" />{r.students_online}/{r.enrolled}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${r.enrolled ? Math.min(100, (r.attended / r.enrolled) * 100) : 0}%` }} />
          </div>
          <p className="text-[10px] text-white/40 mt-1">{r.attended} siswa sudah hadir (absensi live)</p>
        </>
      ) : (
        <p className="text-xs text-white/40 mt-3 flex items-center gap-1.5"><Clock className="w-3 h-3" />
          {r.next_slot ? `Berikutnya ${r.next_slot.subject} ${r.next_slot.start_time.slice(0, 5)}` : "Tidak ada jadwal lagi hari ini"}
        </p>
      )}
    </Link>
  );
}

export default function LiveMonitor() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    const load = () => api.get("/live/monitor").then((r) => { setData(r.data); setErr(null); }).catch((e) => setErr(e.response?.data?.detail || "Gagal memuat"));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  if (err) return <p className="p-8 text-rose-600">{err}</p>;
  if (!data) return <p className="p-8 text-slate-400">Memuat papan pemantau…</p>;
  const s = data.summary;
  const sorted = [...data.classes].sort((a, b) => (!!b.session - !!a.session) || a.class_name.localeCompare(b.class_name));
  return (
    <div data-testid="live-monitor-page" className="rounded-3xl bg-[#060a13] live-grid-bg p-5 md:p-8 min-h-[80vh]">
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 flex items-center gap-1.5"><MonitorPlay className="w-3.5 h-3.5" />Papan Pemantau</p>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mt-1">Kelas Live Hari Ini</h1>
        </div>
        <p className="ml-auto text-xs text-white/40">Diperbarui otomatis tiap 5 detik · {fmtClock(data.now)} WIB</p>
      </div>
      {!data.global_enabled && <p data-testid="monitor-closed-banner" className="mb-4 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-sm px-4 py-2">ZOOM DITUTUP untuk seluruh sekolah — hanya kelas dengan mode "Selalu buka" yang aktif.</p>}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat testid="monitor-stat-live" icon={Radio} tone="text-rose-300" label={`Kelas live / ${s.classes}`} value={s.live} />
        <Stat testid="monitor-stat-teachers" icon={UserCheck} tone="text-emerald-300" label="Guru online" value={s.teachers_online} />
        <Stat testid="monitor-stat-late" icon={AlertTriangle} tone="text-amber-300" label="Guru terlambat" value={s.teachers_late} />
        <Stat testid="monitor-stat-students" icon={Users} tone="text-cyan-300" label="Siswa online" value={s.students_online} />
        <Stat testid="monitor-stat-enrolled" icon={Users} tone="text-white/60" label="Total siswa" value={s.enrolled} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {sorted.map((r) => <ClassCard key={r.class_id} r={r} />)}
      </div>
    </div>
  );
}
