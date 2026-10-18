import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Menu, Moon, Sun, Palette, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/context/ThemeContext";
import { useSettings } from "@/context/SettingsContext";
import api from "@/lib/apiClient";
import { findCrumb, ROLE_LABEL } from "./menu";

const PRESETS = ["#0284C7", "#7C3AED", "#059669", "#DC2626", "#EA580C", "#0F766E", "#DB2777", "#1D4ED8"];

function ThemeMenu() {
  const { settings, refresh } = useSettings();
  const [open, setOpen] = useState(false);
  const setBrand = async (c) => { try { await api.patch("/settings", { primary_color: c }); refresh(); setOpen(false); } catch {} };
  return (
    <div className="relative">
      <button data-testid="theme-menu-toggle" onClick={() => setOpen(o => !o)} title="Tema Warna" className="zx-icon-btn"><Palette className="w-[18px] h-[18px]"/></button>
      {open && (
        <div data-testid="theme-menu" className="absolute right-0 mt-2 p-3 bg-white rounded-xl shadow-xl border border-slate-200 z-50 w-48">
          <p className="text-xs font-semibold text-slate-500 mb-2">Warna Tema Sekolah</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map(c => <button key={c} data-testid={`theme-color-${c.replace('#', '')}`} onClick={() => setBrand(c)} style={{ backgroundColor: c }} className="w-8 h-8 rounded-lg hover:scale-110 transition-transform"/>)}
          </div>
          <input type="color" aria-label="Pilih warna" defaultValue={settings.primary_color || '#0284C7'} onChange={e => setBrand(e.target.value)} className="mt-3 w-full h-8 rounded cursor-pointer"/>
        </div>
      )}
    </div>
  );
}

function UserMenu({ user, onLogout }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button data-testid="profile-button" onClick={() => setOpen(o => !o)} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors">
        <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[13px] font-semibold overflow-hidden shrink-0">
          {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover"/> : (user.name?.[0] || "?")}
        </span>
        <span className="hidden sm:block text-[13px] text-slate-700 max-w-[140px] truncate">{user.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400"/>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5" data-testid="user-menu" onMouseLeave={() => setOpen(false)}>
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500">{ROLE_LABEL[user.role]}</p>
          </div>
          <button data-testid="user-menu-profile" onClick={() => { setOpen(false); nav("/profile"); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><UserIcon className="w-4 h-4"/>Profil saya</button>
          <button data-testid="logout-button" onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"><LogOut className="w-4 h-4"/>Keluar</button>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ user, onLogout, onMenu }) {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const c = findCrumb(pathname);
  return (
    <header className="zx-topbar sticky top-0 z-30 h-14 px-4 sm:px-8 flex items-center justify-between gap-3 bg-white/85 backdrop-blur border-b border-slate-200/70">
      <div className="flex items-center gap-2 min-w-0 text-[13px] text-slate-500" data-testid="breadcrumb">
        <button data-testid="menu-toggle" onClick={onMenu} className="lg:hidden zx-icon-btn -ml-1"><Menu className="w-5 h-5"/></button>
        <Home className="w-3.5 h-3.5 shrink-0 hidden sm:block"/>
        <span className="hidden sm:inline truncate">{c.group}</span>
        <span className="hidden sm:inline text-slate-300">/</span>
        <span className="text-slate-800 truncate" data-testid="breadcrumb-current">{c.label}</span>
      </div>
      <div className="flex items-center gap-1">
        <button data-testid="dark-toggle" onClick={toggle} title="Mode Gelap" className="zx-icon-btn">{dark ? <Sun className="w-[18px] h-[18px]"/> : <Moon className="w-[18px] h-[18px]"/>}</button>
        {user.role === "super_admin" && <ThemeMenu/>}
        <NotificationBell/>
        <UserMenu user={user} onLogout={onLogout}/>
      </div>
    </header>
  );
}
