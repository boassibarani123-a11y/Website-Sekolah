import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, GraduationCap, ArrowUpRight, LogOut } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { visibleGroups } from "./menu";

function Group({ g, idx, onNavigate }) {
  const { pathname } = useLocation();
  const active = g.items.some(m => (m.to === "/" ? pathname === "/" : pathname.startsWith(m.to)));
  const [open, setOpen] = useState(active || idx === 0);
  return (
    <div className="mb-1">
      <button data-testid={`nav-group-${g.id}`} onClick={() => setOpen(o => !o)}
        className="zx-group-btn w-full flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 hover:text-slate-800">
        <span className="font-mono-alt text-slate-400">{String(idx + 1).padStart(2, "0")}</span>{g.label}
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${open ? "" : "-rotate-90"}`}/>
      </button>
      {open && (
        <div className="space-y-0.5 pb-2">
          {g.items.map(m => (
            <NavLink key={m.label} to={m.to} end={m.to === "/"} onClick={onNavigate}
              data-testid={`nav-${m.label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) => `zx-nav-item group flex items-center gap-2.5 pl-3 pr-3 py-[7px] rounded-lg text-[13px] transition-colors ${isActive ? "zx-nav-active" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"}`}>
              <span className="zx-nav-dot w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"/>
              <span className="truncate">{m.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ user, onLogout, onNavigate }) {
  const { settings } = useSettings();
  const groups = visibleGroups(user);
  return (
    <div className="zx-sidebar h-full flex flex-col bg-white">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3" data-testid="sidebar-school">
        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden shrink-0">
          {settings.school_logo_url ? <img src={settings.school_logo_url} alt="Logo sekolah" className="w-full h-full object-contain"/> : <GraduationCap className="w-5 h-5 text-sky-600"/>}
        </div>
        <div className="min-w-0">
          <p title={settings.school_name} className="font-heading text-[14px] font-semibold text-slate-900 leading-tight line-clamp-2">{settings.school_name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Tahun ajaran {settings.academic_year}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 no-scrollbar">
        {groups.map((g, i) => <Group key={g.id} g={g} idx={i} onNavigate={onNavigate}/>)}
      </nav>
      <div className="px-5 py-4 border-t border-slate-100">
        <p className="text-[13px] font-semibold text-slate-900">Butuh bantuan?</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Temukan panduan untuk sekolah Anda.</p>
        <a href="/dokumentasi" data-testid="sidebar-help-link" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-sky-600 hover:underline">Pusat bantuan<ArrowUpRight className="w-3 h-3"/></a>
        <button data-testid="logout-button-sidebar" onClick={onLogout}
          className="mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors">
          <LogOut className="w-4 h-4"/>Keluar
        </button>
      </div>
    </div>
  );
}
