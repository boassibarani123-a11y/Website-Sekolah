export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const mondayOf = (iso) => addDays(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
export const fmtDay = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", { ...opts, timeZone: "UTC" });

export function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 23) return `${Math.floor(h / 24)} hari ${h % 24} jam`;
  return h ? `${h}j ${String(m).padStart(2, "0")}m` : `${m}m ${String(sec).padStart(2, "0")}d`;
}

export const STATUS = {
  terjadwal: { label: "Terjadwal", chip: "bg-slate-100 text-slate-600 ring-slate-200", bar: "bg-slate-300", dot: "bg-slate-400" },
  menunggu: { label: "Menunggu Check-in", chip: "bg-amber-100 text-amber-700 ring-amber-200", bar: "bg-amber-400", dot: "bg-amber-500" },
  terlambat: { label: "Terlambat", chip: "bg-orange-100 text-orange-700 ring-orange-200", bar: "bg-orange-500", dot: "bg-orange-500" },
  bertugas: { label: "Sedang Bertugas", chip: "bg-emerald-100 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  selesai: { label: "Selesai", chip: "bg-indigo-100 text-indigo-700 ring-indigo-200", bar: "bg-indigo-400", dot: "bg-indigo-500" },
  tidak_hadir: { label: "Tidak Hadir", chip: "bg-rose-100 text-rose-700 ring-rose-200", bar: "bg-rose-500", dot: "bg-rose-500" },
};

export const PRESETS = [
  { label: "Pagi", start: "06:30", end: "07:45" },
  { label: "Istirahat", start: "10:00", end: "10:30" },
  { label: "Siang", start: "12:00", end: "13:00" },
  { label: "Pulang", start: "14:30", end: "15:30" },
];

export const initials = (n = "?") => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
