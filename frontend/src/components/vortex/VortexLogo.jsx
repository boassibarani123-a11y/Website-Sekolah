import { Tornado } from "lucide-react";

export const VG_NAME = "Vortex Guard";

export function VortexLogo({ size = "md", dark = false }) {
  const box = size === "sm" ? "w-8 h-8" : "w-11 h-11";
  const icon = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return (
    <div className="flex items-center gap-2.5" data-testid="vortex-guard-logo">
      <span className={`${box} rounded-xl bg-teal-700 text-teal-50 flex items-center justify-center shadow-sm ring-1 ring-teal-900/20`}>
        <Tornado className={icon} />
      </span>
      <span className="leading-none">
        <span className={`block font-heading font-extrabold tracking-tight ${size === "sm" ? "text-base" : "text-xl"} ${dark ? "text-white" : "text-slate-900"}`}>
          Vortex<span className="text-teal-500"> Guard</span>
        </span>
        {size !== "sm" && <span className={`block text-[10px] uppercase tracking-[0.25em] mt-1 ${dark ? "text-teal-200" : "text-slate-500"}`}>Sistem Ujian Online</span>}
      </span>
    </div>
  );
}

export const vgInput = "w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 outline-none text-sm transition-colors";

export const STATUS_META = {
  open: { label: "Dibuka", cls: "bg-emerald-100 text-emerald-700" },
  upcoming: { label: "Terjadwal", cls: "bg-sky-100 text-sky-700" },
  ended: { label: "Berakhir", cls: "bg-slate-200 text-slate-600" },
};

export const fmtDT = (iso) => iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "";

export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const mmss = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
};
