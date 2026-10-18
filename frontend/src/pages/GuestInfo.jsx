import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useSettings } from "@/context/SettingsContext";
import { Clock, ShieldCheck, CalendarDays, DoorClosed, UserCheck } from "lucide-react";
import { daysLabel } from "@/components/guests/guestMeta";

export default function GuestInfo() {
  const { settings } = useSettings();
  const [h, setH] = useState(null);
  useEffect(() => { api.get("/public/guest-hours").then(r => setH(r.data)).catch(() => {}); }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 text-white flex items-center justify-center p-6" data-testid="guest-info-page">
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-center gap-3">
          {settings?.school_logo_url && <img src={settings.school_logo_url} alt="" className="w-12 h-12 object-contain" />}
          <p className="font-heading font-bold text-lg">{settings?.school_full_name || settings?.school_name || "SMA NEGERI 1 LAGUBOTI"}</p>
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">Informasi Kunjungan Tamu</h1>
        {!h ? <p className="text-slate-400">Memuat…</p> : (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
                <Clock className="w-7 h-7 text-emerald-300" />
                <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Jam Kunjungan</p>
                <p data-testid="guest-info-hours" className="font-heading text-3xl font-extrabold mt-1">{h.start.replace(":", ".")}–{h.end.replace(":", ".")} WIB</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
                <CalendarDays className="w-7 h-7 text-emerald-300" />
                <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Hari</p>
                <p data-testid="guest-info-days" className="font-heading text-3xl font-extrabold mt-1">{daysLabel(h.days)}</p>
              </div>
            </div>
            <div data-testid="guest-info-status" className={`rounded-2xl px-5 py-4 font-bold flex items-center gap-3 ${h.open_now ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
              {h.open_now ? <UserCheck className="w-6 h-6" /> : <DoorClosed className="w-6 h-6" />}
              {h.open_now ? `Saat ini (${h.now} WIB) dalam jam kunjungan. Silakan melapor ke petugas piket.` : `Saat ini (${h.now} WIB) di luar jam kunjungan.`}
            </div>
            <div className="rounded-3xl bg-white text-slate-800 p-6">
              <p className="font-heading font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" />Aturan Kunjungan</p>
              <p data-testid="guest-info-note" className="mt-2 text-sm leading-relaxed">{h.note}</p>
              <ol className="mt-4 text-sm space-y-1.5 list-decimal list-inside text-slate-600">
                <li>Setiap tamu wajib melapor dan dicatat oleh petugas piket gerbang.</li>
                <li>Di luar jam kunjungan, petugas piket akan meminta izin kepada Kepala Sekolah.</li>
                <li>Tamu hanya boleh masuk setelah permintaan disetujui.</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
