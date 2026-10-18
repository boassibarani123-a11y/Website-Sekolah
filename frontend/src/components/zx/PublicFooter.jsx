import { useLocation } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";

const PUBLIC = ["/login", "/forgot-password", "/reset-password", "/change-password", "/ppdb", "/struktur-organisasi", "/dokumentasi", "/presentasi", "/galeri", "/profil-sekolah", "/konfirmasi-absensi", "/info-tamu", "/print-cards"];

export default function PublicFooter() {
  const { pathname } = useLocation();
  const { settings } = useSettings();
  if (!PUBLIC.includes(pathname)) return null;
  return (
    <footer data-testid="public-footer" className="no-print flex flex-wrap items-center justify-between gap-3 px-6 sm:px-10 py-4 bg-white border-t border-slate-200 text-[11.5px] text-slate-500">
      <span>© {new Date().getFullYear()} {settings.school_name}</span>
      <span className="flex items-center gap-2">Ditenagai oleh <img src="/zynex-wordmark.png" alt="Zynex LMS" className="h-5 w-auto"/></span>
    </footer>
  );
}
