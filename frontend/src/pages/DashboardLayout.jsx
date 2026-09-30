import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { GraduationCap, LayoutDashboard, UsersRound, QrCode, Boxes, ClipboardList,
  BrainCircuit, Camera, PiggyBank, HandCoins, Vote, Trophy, Megaphone, MessageSquareWarning,
  LogOut, ChevronDown, BarChart3, FileText, MessageSquare, CalendarDays, UserPlus2, Settings as SettingsIcon, IdCard, Info, School } from "lucide-react";
import { useState } from "react";
import NotificationBell from "@/components/NotificationBell";

const MENU = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: "*" },
  { to: "/school-info", label: "Informasi Sekolah", icon: Info, roles: "*" },
  { to: "/my-card", label: "Kartu Saya", icon: IdCard, roles: ["siswa","ketua_kelas","ketua_osis"] },
  { to: "/accounts", label: "Kelola Akun", icon: UsersRound, roles: ["super_admin"] },
  { to: "/settings", label: "Pengaturan", icon: SettingsIcon, roles: ["super_admin"] },
  { to: "/admin-ppdb", label: "Admin PPDB", icon: UserPlus2, roles: ["super_admin","kepsek","staff_tu"] },
  { to: "/analytics", label: "Analitik", icon: BarChart3, roles: ["kepsek","super_admin"] },
  { to: "/attendance", label: "Presensi QR", icon: QrCode, roles: "*" },
  { to: "/calendar", label: "Kalender", icon: CalendarDays, roles: "*" },
  { to: "/schoolgram", label: "Schoolgram", icon: Camera, roles: "*" },
  { to: "/inventory", label: "Inventaris", icon: Boxes, roles: "*" },
  { to: "/classes", label: "Kelas", icon: School, roles: "*" },
  { to: "/reports", label: "Rapor Digital", icon: FileText, roles: ["guru","kepsek","super_admin","siswa","orang_tua"] },
  { to: "/chats", label: "Chat Wali-Ortu", icon: MessageSquare, roles: ["guru","orang_tua","super_admin"] },
  { to: "/uang-kas", label: "Uang Kas", icon: PiggyBank, roles: "*" },
  { to: "/social-fund", label: "Dana Sosial", icon: HandCoins, roles: ["super_admin","kepsek","ketua_osis"] },
  { to: "/elections", label: "Pemilu OSIS", icon: Vote, roles: "*" },
  { to: "/achievements", label: "Prestasi", icon: Trophy, roles: "*" },
  { to: "/announcements", label: "Pengumuman", icon: Megaphone, roles: "*" },
  { to: "/feedback", label: "Kritik & Saran", icon: MessageSquareWarning, roles: "*" },
];

const ROLE_LABEL = {
  super_admin: "Super Admin", kepsek: "Kepala Sekolah", staff_tu: "Staff TU",
  guru: "Guru / Wali Kelas", siswa: "Siswa", ketua_osis: "Ketua OSIS", ketua_kelas: "Ketua Kelas",
  orang_tua: "Orang Tua",
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const visible = MENU.filter(m => m.roles === "*" || m.roles.includes(user.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30 overflow-hidden">
            {settings.school_logo_url ? <img src={settings.school_logo_url} alt="" className="w-full h-full object-contain"/> : <GraduationCap className="w-6 h-6"/>}
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-extrabold tracking-tight truncate">{settings.school_name}</h1>
            <p className="text-[10px] text-slate-400 font-mono-alt tracking-wider truncate">{settings.footer_text || "MANAJEMEN SEKOLAH"}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visible.map(m => (
            <NavLink key={m.to} to={m.to} end={m.to==="/"} data-testid={`nav-${m.label.toLowerCase().replace(/\s/g,"-")}`}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-sky-600 text-white shadow-md shadow-sky-600/30" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              <m.icon className="w-4 h-4"/>{m.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-sm font-bold">{user.name?.[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-sky-300 truncate">{ROLE_LABEL[user.role]}</p>
            </div>
            <button data-testid="logout-button" onClick={async()=>{await logout(); nav("/login");}} className="text-slate-400 hover:text-rose-400 transition-colors">
              <LogOut className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between lg:justify-end gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <GraduationCap className="w-6 h-6 text-sky-600"/>
            <h1 className="font-heading font-bold text-slate-900">{settings.school_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell/>
            <button data-testid="menu-toggle" onClick={()=>setOpen(!open)} className="lg:hidden p-2 rounded-lg bg-slate-100">
              <ChevronDown className={`w-5 h-5 transition-transform ${open?"rotate-180":""}`}/>
            </button>
          </div>
        </header>
        {open && (
          <div className="lg:hidden bg-slate-900 text-white p-3 space-y-1 max-h-[60vh] overflow-y-auto">
            {visible.map(m=>(
              <NavLink key={m.to} to={m.to} end={m.to==="/"} onClick={()=>setOpen(false)}
                className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${isActive?"bg-sky-600":"hover:bg-slate-800 text-slate-300"}`}>
                <m.icon className="w-4 h-4"/>{m.label}
              </NavLink>
            ))}
            <button onClick={async()=>{await logout(); nav("/login");}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-400 hover:bg-rose-500/10">
              <LogOut className="w-4 h-4"/>Keluar
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><Outlet/></main>
      </div>
    </div>
  );
}
