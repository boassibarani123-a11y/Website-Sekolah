import { useSettings } from "@/context/SettingsContext";
import { semesterLabel } from "./menu";

export default function AppFooter({ className = "" }) {
  const { settings } = useSettings();
  const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return (
    <footer data-testid="app-footer" className={`zx-footer !pr-28 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-slate-500 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
        <span>{settings.school_name} • {semesterLabel(settings.academic_year)}</span>
        <span>Terakhir diperbarui {now} WIB</span>
      </div>
      <a href="/dokumentasi" data-testid="footer-zynex" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
        <span>Ditenagai oleh</span>
        <span className="inline-flex items-center rounded-md bg-white px-1.5 py-0.5"><img src="/zynex-wordmark.png" alt="Zynex LMS" className="h-5 w-auto"/></span>
      </a>
    </footer>
  );
}
