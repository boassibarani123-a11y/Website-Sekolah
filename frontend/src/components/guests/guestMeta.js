export const GUEST_STATUS = {
  dijadwalkan: { l: "Dijadwalkan", c: "bg-sky-100 text-sky-700" },
  hadir: { l: "Diizinkan Masuk", c: "bg-emerald-100 text-emerald-700" },
  menunggu: { l: "Menunggu Persetujuan", c: "bg-amber-100 text-amber-800" },
  ditolak: { l: "Ditolak — Tidak Boleh Masuk", c: "bg-rose-100 text-rose-700" },
  selesai: { l: "Selesai / Sudah Keluar", c: "bg-slate-200 text-slate-600" },
  batal: { l: "Batal", c: "bg-slate-100 text-slate-500" },
};

export const statusOf = (g) =>
  g.status === "hadir" && g.approval === "disetujui"
    ? { l: "Disetujui — Boleh Masuk", c: "bg-emerald-100 text-emerald-700" }
    : GUEST_STATUS[g.status] || GUEST_STATUS.dijadwalkan;

export const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export const daysLabel = (days = []) => {
  const s = [...days].sort((a, b) => a - b);
  const contiguous = s.length > 1 && s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  return contiguous ? `${DAY_NAMES[s[0] - 1]}–${DAY_NAMES[s[s.length - 1] - 1]}` : s.map(d => DAY_NAMES[d - 1]).join(", ");
};

export const hoursLabel = (h) => (h ? `${h.start.replace(":", ".")}–${h.end.replace(":", ".")} WIB, ${daysLabel(h.days)}` : "—");
