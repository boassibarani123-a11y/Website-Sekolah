import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import api from "@/lib/apiClient";
import { subscribe, syncQueue, getQueue } from "@/lib/offlineQueue";

export default function OfflineStatus() {
  const [s, setS] = useState({ offline: false, pending: 0, syncing: false });
  const [open, setOpen] = useState(false);
  const prev = useRef(null);

  useEffect(() => subscribe((st) => {
    if (prev.current && prev.current.offline !== st.offline) {
      if (st.offline) toast.warning(st.slow ? "Jaringan lelet — beralih ke Mode Offline" : "Koneksi terputus — Mode Offline aktif", { description: "Input tetap disimpan di perangkat & dikirim otomatis saat online." });
      else toast.success("Kembali online", { description: st.pending ? `Menyinkronkan ${st.pending} data…` : undefined });
    }
    prev.current = st; setS(st);
  }), []);
  useEffect(() => {
    const onSync = (e) => toast.success(`${e.detail.sent} data offline berhasil disinkronkan ke server`);
    window.addEventListener("offline-synced", onSync);
    return () => window.removeEventListener("offline-synced", onSync);
  }, []);

  const tone = s.offline ? "bg-amber-100 text-amber-800 ring-amber-300" : s.pending ? "bg-sky-100 text-sky-800 ring-sky-300" : "bg-emerald-50 text-emerald-700 ring-emerald-200";
  const Icon = s.syncing ? RefreshCw : s.offline ? WifiOff : s.pending ? CloudUpload : Wifi;
  const label = s.syncing ? "Sinkronisasi…" : s.offline ? (s.slow ? "Offline (lelet)" : "Offline") : s.pending ? `${s.pending} antre` : "Online";

  return (
    <div className="relative">
      <button data-testid="offline-status-button" onClick={() => setOpen((o) => !o)} title="Status koneksi"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold ring-1 transition-colors ${tone}`}>
        <Icon className={`w-4 h-4 ${s.syncing ? "animate-spin" : ""}`} />
        <span data-testid="offline-status-label" className="hidden sm:inline">{label}</span>
        {s.pending > 0 && <span data-testid="offline-pending-count" className="sm:hidden tabular-nums">{s.pending}</span>}
      </button>
      {open && (
        <div data-testid="offline-status-panel" className="absolute right-0 mt-2 w-72 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 text-sm">
          <p className="font-heading font-bold text-slate-900">{s.offline ? "Mode Offline" : "Terhubung ke server"}</p>
          <p className="text-xs text-slate-500 mt-1">Saat jaringan putus atau lelet, semua input (absensi, komentar, pesan, dll.) disimpan di perangkat ini lalu otomatis dikirim ke database saat koneksi kembali.</p>
          <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
            {getQueue().slice(-8).reverse().map((q) => (
              <div key={q.id} className="flex justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50"><span className="font-semibold text-slate-700">{q.label}</span><span className="text-slate-400 tabular-nums">{new Date(q.at).toLocaleTimeString("id-ID")}</span></div>
            ))}
            {s.pending === 0 && <p className="text-xs text-emerald-600 font-semibold">Semua data sudah tersinkron.</p>}
          </div>
          <button data-testid="offline-sync-now" disabled={s.offline || s.syncing || !s.pending}
            onClick={async () => { const n = await syncQueue(api); if (!n) toast.info("Tidak ada data yang terkirim"); }}
            className="mt-3 w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />Sinkronkan Sekarang
          </button>
        </div>
      )}
    </div>
  );
}
