import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { QrCode, ScanFace, ClipboardCheck, DoorOpen, CalendarCheck, Contact, Users, UserCheck, Hourglass } from "lucide-react";

const TILES = [
  { to: "/attendance", label: "Absensi Barcode", icon: QrCode, tone: "bg-sky-600", sub: { to: "/face-attendance", label: "Face ID", icon: ScanFace } },
  { to: "/absensi-harian", label: "Absensi Guru & Siswa", icon: ClipboardCheck, tone: "bg-indigo-600" },
  { to: "/izin-keluar", label: "Izin Keluar (IK)", icon: DoorOpen, tone: "bg-orange-500" },
  { to: "/attendance-recap", label: "Rekap Absensi", icon: CalendarCheck, tone: "bg-emerald-600" },
  { to: "/guests", label: "Kunjungan Tamu", icon: Contact, tone: "bg-slate-900" },
];

export default function PiketGateDashboard() {
  const { user } = useAuth();
  const [g, setG] = useState(null);
  const [att, setAtt] = useState(null);
  useEffect(() => {
    const load = () => { api.get("/guests/summary").then(r => setG(r.data)).catch(() => {}); api.get("/attendance/stats").then(r => setAtt(r.data)).catch(() => {}); };
    load(); const t = setInterval(load, 20000); return () => clearInterval(t);
  }, []);
  const stats = [
    ["Siswa Hadir", att?.hadir, Users, "text-emerald-600", "piket-stat-hadir"],
    ["Tamu Hari Ini", g?.today, Contact, "text-sky-600", "piket-stat-guests-today"],
    ["Tamu di Dalam", g?.inside, UserCheck, "text-emerald-600", "piket-stat-guests-inside"],
    ["Menunggu Izin", g?.pending, Hourglass, "text-amber-600", "piket-stat-guests-pending"],
  ];
  return (
    <div className="space-y-8" data-testid="piket-gate-dashboard">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-600">Piket Gerbang</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1">Halo, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(([l, v, Icon, c, id]) => (
          <div key={l} className="bg-white border border-slate-200 rounded-2xl p-5">
            <Icon className={`w-6 h-6 ${c}`} />
            <p data-testid={id} className="mt-2 font-heading text-3xl font-extrabold text-slate-900 tabular-nums">{v ?? "—"}</p>
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">{l}</p>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map(t => (
          <div key={t.to} className={`${t.tone} text-white rounded-3xl p-6 min-h-[150px] flex flex-col justify-between shadow-lg transition-transform hover:-translate-y-0.5`}>
            <Link to={t.to} data-testid={`piket-tile-${t.to.slice(1)}`} className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center"><t.icon className="w-7 h-7" /></span>
              <span className="font-heading text-xl font-extrabold">{t.label}</span>
            </Link>
            {t.sub && (
              <Link to={t.sub.to} data-testid="piket-tile-face-attendance" className="mt-4 self-start px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 font-bold text-sm flex items-center gap-2"><t.sub.icon className="w-4 h-4" />Absensi {t.sub.label}</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
