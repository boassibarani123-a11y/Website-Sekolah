import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sun, Moon, CloudSun, GraduationCap, Trophy, School, ArrowUpRight, Rocket, Star, Download, CalendarRange, Megaphone } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import PiketGateDashboard from "@/components/piket/PiketGateDashboard";
import { PageHeader, StatStrip, Panel, StatusText, EmptyState } from "@/components/zx/ui";

const STUDENT_ROLES = ["siswa", "ketua_kelas", "ketua_osis"];
const TREND_ROLES = ["kepsek", "super_admin"];

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === "piket_gerbang") return <PiketGateDashboard/>;
  return <MainDashboard/>;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return ["Selamat pagi", Sun];
  if (h < 15) return ["Selamat siang", CloudSun];
  if (h < 18) return ["Selamat sore", CloudSun];
  return ["Selamat malam", Moon];
}

function useDashboardData(role) {
  const [d, setD] = useState({ stats: null, att: null, ann: [], events: [], today: null, board: [], trend: [], prestasi: 0, mine: null });
  useEffect(() => {
    const set = (k) => (r) => setD(p => ({ ...p, [k]: r }));
    const month = new Date().toISOString().slice(0, 7);
    api.get("/stats").then(r => set("stats")(r.data)).catch(() => {});
    api.get("/attendance/stats").then(r => set("att")(r.data)).catch(() => {});
    api.get("/announcements").then(r => set("ann")(r.data.slice(0, 4))).catch(() => {});
    api.get(`/events?month=${month}`).then(r => set("events")(r.data)).catch(() => {});
    api.get("/timetable/today").then(r => set("today")(r.data)).catch(() => set("today")({ items: [] }));
    api.get("/points/leaderboard").then(r => set("board")((r.data.students || []).slice(0, 5))).catch(() => {});
    api.get("/gallery?category=Prestasi").then(r => set("prestasi")(r.data.length)).catch(() => {});
    if (TREND_ROLES.includes(role)) api.get("/analytics/kepsek").then(r => set("trend")(r.data.trend || [])).catch(() => {});
    if (STUDENT_ROLES.includes(role)) api.get("/points/me").then(r => set("mine")(r.data)).catch(() => {});
  }, [role]);
  return d;
}

function Hero({ pct, prestasi, kelas, isAdmin }) {
  return (
    <div className="zx-hero p-6 sm:p-7 flex flex-wrap items-center justify-between gap-6" data-testid="dashboard-hero">
      <div className="max-w-xl">
        <p className="zx-eyebrow">Ruang tumbuh bersama</p>
        <p className="mt-2 text-[22px] sm:text-[24px] font-semibold tracking-tight text-slate-900">Satu ruang. Seribu kemungkinan.</p>
        <p className="mt-1.5 text-[13px] text-slate-500">Pantau aktivitas belajar, kehadiran, dan kabar sekolah dalam satu tempat.</p>
        {isAdmin
          ? <a href="/dokumentasi#panduan" data-testid="admin-guide-link" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-sky-600 hover:underline"><Rocket className="w-3.5 h-3.5"/>Panduan Super Admin — mulai dari nol<ArrowUpRight className="w-3 h-3"/></a>
          : <Link to="/attendance-recap" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-sky-600 hover:underline">{pct}% siswa sudah hadir hari ini<ArrowUpRight className="w-3 h-3"/></Link>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex w-24 h-24 rounded-2xl bg-white/80 border border-sky-100 flex-col items-center justify-center text-sky-600">
          <GraduationCap className="w-7 h-7"/><span className="mt-1 text-[9px] font-semibold tracking-widest text-slate-500">TERUS BERTUMBUH</span>
        </div>
        <div className="space-y-2">
          <Chip icon={Trophy} text={`${prestasi} prestasi`} to="/achievements"/>
          <Chip icon={School} text={`${kelas} jadwal hari ini`} to="/jadwal"/>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon: Icon, text, to }) {
  return <Link to={to} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 border border-sky-100 text-[13px] font-semibold text-slate-800 hover:border-sky-300 transition-colors"><Icon className="w-4 h-4 text-sky-600"/>{text}</Link>;
}

function TrendPanel({ trend }) {
  const data = trend.map(t => ({ day: t.date.slice(8, 10) + "/" + t.date.slice(5, 7), hadir: t.hadir }));
  return (
    <Panel title="Tren kehadiran siswa" link="Lihat rekap" linkTo="/attendance-recap" subtitle="7 hari terakhir • Kehadiran tercatat" className="lg:col-span-2" testid="widget-trend">
      <div className="h-56 -ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs><linearGradient id="zxArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18}/><stop offset="100%" stopColor="var(--brand)" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid stroke="#EEF2F6" vertical={false}/>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false}/>
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={36}/>
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E4EBF2", fontSize: 12 }}/>
            <Area type="monotone" dataKey="hadir" name="Hadir" stroke="var(--brand)" strokeWidth={2.5} fill="url(#zxArea)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[12px] text-slate-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-600"/>Kehadiran siswa</p>
    </Panel>
  );
}

function AgendaPanel({ events, wide }) {
  const today = new Date().toISOString().slice(0, 10);
  const up = events.filter(e => (e.date || "") >= today).slice(0, 4);
  return (
    <Panel title="Agenda terdekat" link="Kalender" linkTo="/calendar" subtitle={new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} className={wide ? "lg:col-span-3" : ""} testid="widget-agenda">
      {up.length === 0 ? <EmptyState icon={CalendarRange} text="Belum ada agenda bulan ini."/> : (
        <div className="space-y-4">
          {up.map(e => (
            <div key={e.id}>
              <p className="text-[13.5px] font-semibold text-slate-900">{e.title} {e.category && <span className="ml-1 text-[11px] font-medium text-sky-600">{e.category}</span>}</p>
              <p className="text-[11.5px] text-slate-500 mt-0.5">{new Date(e.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{e.time ? ` • ${e.time}` : ""}{e.location ? ` • ${e.location}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SchedulePanel({ today }) {
  return (
    <Panel title="Jadwal hari ini" link="Semua" linkTo="/jadwal" subtitle={today?.day || ""} testid="widget-jadwal-today">
      {!today ? <p className="text-sm text-slate-400">Memuat...</p> : today.items.length === 0 ? <EmptyState icon={CalendarRange} text="Tidak ada jadwal hari ini."/> : (
        <div className="divide-y divide-slate-100">
          {today.items.map(it => (
            <div key={it.id} className="flex items-center gap-4 py-2.5">
              <span className="w-24 shrink-0 font-mono-alt text-[12px] text-slate-500">{it.start_time}–{it.end_time}</span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-slate-900 truncate">{it.subject}</p>
                <p className="text-[11.5px] text-slate-500 truncate">{[it.class_name, it.teacher_name, it.room].filter(Boolean).join(" • ")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function BoardPanel({ board, mine }) {
  return (
    <Panel title="Papan peringkat" link="Semua" linkTo="/leaderboard" subtitle="5 siswa dengan poin tertinggi" testid="widget-leaderboard">
      {mine && <p className="mb-3 flex items-center gap-2 text-[13px] text-amber-700"><Star className="w-4 h-4"/>Poin saya: <b>{mine.total}</b></p>}
      {board.length === 0 ? <EmptyState icon={Trophy} text="Belum ada poin."/> : (
        <div className="divide-y divide-slate-100">
          {board.map((s, i) => (
            <div key={s.user_id} className="flex items-center gap-3 py-2.5">
              <span className={`w-6 text-[12px] font-mono-alt font-semibold ${i < 3 ? "text-sky-600" : "text-slate-400"}`}>{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0"><p className="text-[13.5px] font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11.5px] text-slate-500">{s.kelas || "—"}</p></div>
              <span className="text-[13.5px] font-semibold text-slate-900 tabular-nums">{s.total}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AttentionPanel({ stats, att, ann }) {
  const rows = [];
  if (att && att.belum_absen > 0) rows.push({ a: "Siswa belum melakukan absensi", by: "Piket gerbang", when: "Hari ini", st: <StatusText tone="amber">{att.belum_absen} menunggu</StatusText>, to: "/attendance-recap" });
  if (stats?.pending_borrow > 0) rows.push({ a: "Permintaan peminjaman inventaris", by: "Pengelola inventaris", when: "Menunggu persetujuan", st: <StatusText tone="sky">{stats.pending_borrow} pengajuan</StatusText>, to: "/inventory" });
  ann.forEach(x => rows.push({ a: x.title, by: x.author, when: new Date(x.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }), st: <StatusText tone="green">Terbit</StatusText>, to: "/announcements" }));
  return (
    <Panel title="Perlu perhatian Anda" link="Lihat semua" linkTo="/announcements" testid="widget-attention">
      {rows.length === 0 ? <EmptyState icon={Megaphone} text="Semua beres. Belum ada yang perlu ditindaklanjuti."/> : (
        <div className="overflow-x-auto">
          <table className="zx-table min-w-[560px]">
            <thead><tr><th>Aktivitas</th><th>Penanggung jawab</th><th>Batas waktu</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i}><td><Link to={r.to} className="hover:text-sky-600">{r.a}</Link></td><td className="!text-slate-500">{r.by}</td><td className="!text-slate-500">{r.when}</td><td>{r.st}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function MainDashboard() {
  const { user } = useAuth();
  const d = useDashboardData(user.role);
  const [hello, Icon] = greeting();
  const total = d.att?.total_siswa || 0;
  const pct = total ? Math.round(((d.att?.hadir || 0) / total) * 1000) / 10 : 0;
  const showTrend = TREND_ROLES.includes(user.role);
  return (
    <div className="space-y-6" data-testid="dashboard-root">
      <PageHeader
        title={<span className="inline-flex items-center gap-2">{hello}, {user.name.split(" ")[0]} <Icon className="w-6 h-6 text-amber-500"/></span>}
        subtitle={`${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • Mari mulai hari dengan hal baik.`}
        actions={<button data-testid="dashboard-print" onClick={() => window.print()} className="zx-btn-primary"><Download className="w-4 h-4"/>Unduh ringkasan</button>}/>
      <Hero pct={pct} prestasi={d.prestasi} kelas={d.today?.items?.length || 0} isAdmin={user.role === "super_admin"}/>
      <StatStrip items={[
        { label: "Total siswa", value: d.stats?.siswa ?? "—", hint: "Siswa aktif terdaftar", to: "/accounts", testid: "stat-total-siswa" },
        { label: "Guru & tenaga kependidikan", value: d.stats?.guru ?? "—", hint: "Guru terdaftar", to: "/guru-staff", testid: "stat-total-guru" },
        { label: "Kehadiran hari ini", value: `${pct.toLocaleString("id-ID")}%`, hint: `${d.att?.hadir ?? 0} dari ${total} siswa hadir`, to: "/attendance-recap", testid: "stat-kehadiran" },
        { label: "Konten & tugas", value: `${d.stats?.assignments ?? 0} / ${d.stats?.quizzes ?? 0}`, hint: `Tugas / kuis • ${d.stats?.posts ?? 0} post Schoolgram`, to: "/classes", testid: "stat-konten" },
      ]}/>
      <div className="grid lg:grid-cols-3 gap-6">
        {showTrend && <TrendPanel trend={d.trend}/>}
        <AgendaPanel events={d.events} wide={!showTrend}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <SchedulePanel today={d.today}/>
        <BoardPanel board={d.board} mine={d.mine}/>
      </div>
      <AttentionPanel stats={d.stats} att={d.att} ann={d.ann}/>
    </div>
  );
}
