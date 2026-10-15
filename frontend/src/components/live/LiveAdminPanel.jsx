import { useEffect, useState } from "react";
import { Power, VideoOff, ShieldCheck, Server } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";
import { Switch } from "@/components/ui/switch";

const MODES = [
  ["follow", "Ikuti sekolah"],
  ["on", "Selalu buka"],
  ["off", "Tutup kelas ini"],
];

function HealthBadge() {
  const [h, setH] = useState(null);
  useEffect(() => { api.get("/live/health").then((r) => setH(r.data)).catch(() => {}); }, []);
  if (!h) return null;
  const ok = h.server_api && h.public_url_set;
  return (
    <span data-testid="live-health" className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <Server className="w-3.5 h-3.5" />
      {ok ? `Server video siap (${h.latency_ms} ms)` : h.server_api ? "Server video jalan, alamat publik belum diisi" : "Server video belum terpasang"}
    </span>
  );
}

export function LiveAdminPanel({ klass, state, onChanged }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); onChanged(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    setBusy(false);
  };
  const setGlobal = (enabled) => {
    if (!enabled && !window.confirm("Tutup Kelas Live untuk seluruh sekolah? Sesi yang sedang berjalan akan dihentikan.")) return;
    run(() => api.put("/live/settings", { enabled }), enabled ? "Kelas Live dibuka untuk seluruh sekolah" : "Kelas Live ditutup untuk seluruh sekolah");
  };
  const setMode = (mode) => run(() => api.put(`/classes/${klass.id}/live-mode`, { mode }), "Pengaturan kelas disimpan");
  return (
    <div data-testid="live-admin-panel" className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
      <div className="flex items-center gap-2 text-slate-800 font-heading font-bold"><ShieldCheck className="w-4 h-4 text-sky-600" />Pengaturan Kelas Live</div>
      <label className="flex items-center gap-3 text-sm text-slate-700">
        <Switch data-testid="live-global-switch" checked={state.global_enabled} disabled={busy} onCheckedChange={setGlobal} />
        Seluruh sekolah: <b className={state.global_enabled ? "text-emerald-600" : "text-rose-600"}>{state.global_enabled ? "Aktif" : "Ditutup"}</b>
      </label>
      <div className="flex items-center gap-2 text-sm text-slate-700">
        <span>Kelas ini:</span>
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {MODES.map(([k, l]) => (
            <button key={k} data-testid={`live-mode-${k}`} disabled={busy} onClick={() => setMode(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${state.class_mode === k ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="ml-auto"><HealthBadge /></div>
    </div>
  );
}

export function LiveClosedCard({ state }) {
  const byClass = state.class_mode === "off";
  return (
    <div data-testid="live-closed" className="relative rounded-3xl p-8 md:p-10 bg-[#0b1220] text-white overflow-hidden live-grid-bg">
      <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-rose-600/25 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-400/30 grid place-items-center"><VideoOff className="w-8 h-8 text-rose-300" /></div>
        <div className="flex-1 min-w-[220px]">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] text-rose-300"><Power className="w-3.5 h-3.5" />DINONAKTIFKAN</p>
          <h3 data-testid="live-closed-title" className="font-heading text-3xl md:text-4xl font-bold mt-1">ZOOM DITUTUP</h3>
          <p className="text-sm text-white/60 mt-2 max-w-xl">
            {byClass ? "Kelas Live untuk kelas ini sedang ditutup." : "Kelas Live sedang dinonaktifkan oleh sekolah."} Pembelajaran kembali tatap muka di sekolah seperti biasa.
            Fitur ini akan dibuka lagi bila diperlukan.
          </p>
        </div>
      </div>
    </div>
  );
}
