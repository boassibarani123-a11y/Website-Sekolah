import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AiAssistant from "@/components/AiAssistant";
import Sidebar from "@/components/zx/Sidebar";
import Topbar from "@/components/zx/Topbar";
import AppFooter from "@/components/zx/AppFooter";
import { PIKET_GERBANG_PATHS } from "@/components/zx/menu";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0, left: 0 }); window.scrollTo(0, 0); setOpen(false); }, [pathname]);
  if (!user) return null;
  if (user.role === "piket_gerbang" && !PIKET_GERBANG_PATHS.includes(pathname) && pathname !== "/profile") return <Navigate to="/" replace/>;
  const doLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className="zx-app h-screen flex">
      <aside className="hidden lg:block w-[248px] shrink-0 border-r border-slate-200/80" data-testid="sidebar">
        <Sidebar user={user} onLogout={doLogout}/>
      </aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" data-testid="mobile-sidebar">
          <div className="w-[270px] max-w-[85vw] h-full shadow-2xl zx-slide-in"><Sidebar user={user} onLogout={doLogout} onNavigate={() => setOpen(false)}/></div>
          <button aria-label="Tutup menu" className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => setOpen(false)}/>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <main ref={mainRef} className="zx-main flex-1 overflow-y-auto flex flex-col">
          <Topbar user={user} onLogout={doLogout} onMenu={() => setOpen(true)}/>
          <div className="flex-1 px-4 sm:px-8 lg:px-10 pt-7 pb-10 w-full max-w-[1680px]"><Outlet/></div>
          <AppFooter className="px-4 sm:px-8 lg:px-10 py-5 border-t border-slate-200/70 max-w-[1680px] w-full"/>
        </main>
      </div>
      <AiAssistant/>
    </div>
  );
}
