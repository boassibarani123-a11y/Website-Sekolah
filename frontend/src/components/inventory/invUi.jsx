import { X } from "lucide-react";
import api from "@/lib/apiClient";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export const CONDITIONS = ["Baik", "Perbaikan", "Rusak", "Hilang"];
export const CONDITION_STYLE = {
  Baik: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Perbaikan: "bg-amber-100 text-amber-700 border-amber-200",
  Rusak: "bg-rose-100 text-rose-700 border-rose-200",
  Hilang: "bg-slate-800 text-white border-slate-800",
};
export const CONDITION_COLOR = { Baik: "#10b981", Perbaikan: "#f59e0b", Rusak: "#f43f5e", Hilang: "#334155" };
export const STATUS_STYLE = {
  "Menunggu Approval": "bg-sky-100 text-sky-700 border-sky-200",
  Disetujui: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Ditolak: "bg-rose-100 text-rose-700 border-rose-200",
  Dikembalikan: "bg-slate-100 text-slate-700 border-slate-200",
};
export const ROLE_LABEL = {
  super_admin: "Super Admin", kepsek: "Kepala Sekolah", staff_tu: "Staff TU", guru: "Guru", siswa: "Siswa",
  ketua_osis: "Ketua OSIS", ketua_kelas: "Ketua Kelas", orang_tua: "Orang Tua", admin_perpus: "Admin Perpustakaan", admin_absensi: "Admin Absensi",
};
export const inp = "w-full mt-1 px-3 py-2.5 border border-slate-200 bg-white rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 outline-none text-sm transition-colors";
export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
export const qrValue = (item) => `INV:${item.id}`;

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api.post("/upload", fd);
  return `${BACKEND}${r.data.url}`;
}

export function loanLabel(r) {
  const late = r.status === "Disetujui" && r.return_date && r.return_date < todayISO();
  return { late, label: r.status === "Disetujui" ? (late ? "Terlambat" : "Dipinjam") : r.status,
    cls: late ? "bg-rose-100 text-rose-700 border-rose-200" : STATUS_STYLE[r.status] || "bg-slate-100 text-slate-600 border-slate-200" };
}

export function CondBadge({ c, testid }) {
  return <span data-testid={testid} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${CONDITION_STYLE[c] || CONDITION_STYLE.Baik}`}>{c || "Baik"}</span>;
}

export function Field({ label, children }) {
  return <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>{children}</div>;
}

export function Modal({ title, onClose, children, wide = false, testid }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid={testid}>
      <div className={`bg-white rounded-3xl w-full shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-heading font-bold text-lg text-slate-900">{title}</h3>
          <button data-testid="modal-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
