import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { Users, GraduationCap, Boxes, ClipboardList, BrainCircuit, Camera, Clock, TrendingUp, Trophy, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ROLE_LABEL = {super_admin:"Super Admin", kepsek:"Kepala Sekolah", staff_tu:"Staff Tata Usaha", guru:"Guru", siswa:"Siswa", ketua_osis:"Ketua OSIS", ketua_kelas:"Ketua Kelas", admin_perpus:"Admin Perpustakaan"};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [att, setAtt] = useState(null);
  const [ann, setAnn] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const showHighlights = ["siswa", "guru"].includes(user.role);
  useEffect(()=>{
    api.get("/stats").then(r=>setStats(r.data));
    api.get("/attendance/stats").then(r=>setAtt(r.data));
    api.get("/announcements").then(r=>setAnn(r.data.slice(0,3)));
    if (showHighlights) api.get("/gallery?category=Prestasi").then(r=>setHighlights(r.data.slice(0,4))).catch(()=>{});
  },[showHighlights]);

  const cards = [
    { label: "Total Siswa", value: stats?.siswa ?? "—", icon: GraduationCap, color: "sky" },
    { label: "Total Guru", value: stats?.guru ?? "—", icon: Users, color: "emerald" },
    { label: "Inventaris", value: stats?.inventory ?? "—", icon: Boxes, color: "amber" },
    { label: "Tugas Aktif", value: stats?.assignments ?? "—", icon: ClipboardList, color: "indigo" },
    { label: "Mini-Quiz", value: stats?.quizzes ?? "—", icon: BrainCircuit, color: "rose" },
    { label: "Post Schoolgram", value: stats?.posts ?? "—", icon: Camera, color: "purple" },
  ];
  const colors = {
    sky: "from-sky-500 to-sky-600 shadow-sky-500/30",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/30",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/30",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/30",
    rose: "from-rose-500 to-rose-600 shadow-rose-500/30",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/30",
  };

  return (
    <div className="space-y-8" data-testid="dashboard-root">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Selamat datang, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-slate-500 text-sm">{ROLE_LABEL[user.role]} · {new Date().toLocaleDateString("id-ID", {weekday:"long", day:"numeric", month:"long", year:"numeric"})}</p>
        </div>
        <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-mono-alt text-slate-600">
          <Clock className="w-3.5 h-3.5 inline mr-1.5"/>Semester Genap 2025/2026
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c=>(
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[c.color]} shadow-lg flex items-center justify-center text-white`}><c.icon className="w-5 h-5"/></div>
            <p className="mt-3 text-2xl font-heading font-extrabold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {showHighlights && highlights.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="dashboard-highlights">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500"/>Sorotan Prestasi Terbaru</h2>
            <Link to="/achievements" className="text-sm text-sky-600 font-semibold flex items-center gap-1 hover:text-sky-800">Lihat semua <ArrowRight className="w-3.5 h-3.5"/></Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {highlights.map(h=>(
              <div key={h.id} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50" data-testid="highlight-card">
                <div className="h-24 bg-gradient-to-br from-sky-500 to-indigo-700 relative flex items-center justify-center">
                  {h.image_url ? <img src={h.image_url} alt={h.title} className="absolute inset-0 w-full h-full object-cover"/> : <Trophy className="w-7 h-7 text-white/70"/>}
                  {h.level && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">{h.level}</span>}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-slate-900 line-clamp-2 leading-snug">{h.title}</p>
                  {h.date && <p className="text-[10px] text-slate-400 mt-1">{h.date}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-sky-600"/>Presensi Hari Ini</h2>
            <span className="text-xs font-mono-alt text-slate-500">{att?.date}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Hadir" value={att?.hadir} color="emerald"/>
            <StatBox label="Izin" value={att?.izin} color="sky"/>
            <StatBox label="Sakit" value={att?.sakit} color="amber"/>
            <StatBox label="Alpa" value={att?.alpa} color="rose"/>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
            Belum absen: <b className="text-slate-900">{att?.belum_absen ?? 0}</b> dari {att?.total_siswa ?? 0} siswa
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-heading text-lg font-bold text-slate-900 mb-4">📢 Pengumuman Terbaru</h2>
          {ann.length===0 && <p className="text-sm text-slate-400 italic">Belum ada pengumuman.</p>}
          <div className="space-y-3">
            {ann.map(a=>(
              <div key={a.id} className="p-3 bg-slate-50 rounded-xl border-l-4 border-sky-500">
                <h3 className="font-semibold text-slate-900 text-sm">{a.title}</h3>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{a.content}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">{a.author} · {new Date(a.created_at).toLocaleDateString("id-ID")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({label, value, color}) {
  const bg = {emerald:"bg-emerald-50 text-emerald-900 border-emerald-200", sky:"bg-sky-50 text-sky-900 border-sky-200",
              amber:"bg-amber-50 text-amber-900 border-amber-200", rose:"bg-rose-50 text-rose-900 border-rose-200"}[color];
  return <div className={`${bg} border p-3 rounded-xl text-center`}>
    <p className="text-2xl font-heading font-extrabold">{value ?? 0}</p>
    <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">{label}</p>
  </div>;
}
