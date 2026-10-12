import { useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { AlertTriangle, X, Check } from "lucide-react";

const ROLE_OPTS = [
  ["siswa", "Siswa"], ["ketua_kelas", "Ketua Kelas"], ["ketua_osis", "Ketua OSIS"], ["guru", "Guru"],
  ["staff_tu", "Staff TU"], ["kepsek", "Kepala Sekolah"], ["admin_perpus", "Admin Perpus"],
  ["admin_absensi", "Admin Absensi"], ["super_admin", "Super Admin (selain Anda)"],
];

export function BulkDeleteModal({ users, kelasOpts, onClose, onDone }) {
  const [roles, setRoles] = useState(["siswa"]);
  const [kelas, setKelas] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const count = (r) => users.filter(u => u.role === r && (!kelas || u.kelas === kelas)).length;
  const total = useMemo(() => roles.reduce((n, r) => n + count(r), 0), [roles, kelas, users]); // eslint-disable-line
  const toggle = (r) => setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post("/users/bulk-delete", { roles, kelas: kelas || null, confirm });
      toast.success(`${r.data.deleted} akun dihapus`); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="bulk-delete-modal">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-gradient-to-br from-rose-600 to-rose-700 text-white p-6 relative">
          <button data-testid="bulk-delete-close" onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/15"><X className="w-5 h-5" /></button>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
          <h3 className="font-heading text-2xl font-extrabold mt-3">Hapus Akun Massal</h3>
          <p className="text-rose-100 text-sm mt-1">Pilih role yang ingin dihapus. Role lain tidak akan tersentuh dan akun Anda sendiri selalu aman.</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Role yang dihapus</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTS.map(([v, l]) => {
                const on = roles.includes(v);
                return (
                  <button key={v} type="button" data-testid={`bulk-role-${v}`} onClick={() => toggle(v)}
                    className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${on ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    <span className="flex items-center gap-2"><span className={`w-4 h-4 rounded flex items-center justify-center ${on ? "bg-rose-600 text-white" : "border-2 border-slate-300"}`}>{on && <Check className="w-3 h-3" />}</span>{l}</span>
                    <span className="text-xs tabular-nums opacity-70">{count(v)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Batasi ke kelas (opsional)</p>
            <select data-testid="bulk-kelas" value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-rose-500">
              <option value="">Semua kelas</option>
              {kelasOpts.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-600"><b data-testid="bulk-total" className="text-rose-600 text-lg">{total}</b> akun akan dihapus permanen beserta data wajahnya.</p>
            <input data-testid="bulk-confirm-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder='Ketik "HAPUS" untuk konfirmasi'
              className="mt-3 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl font-mono tracking-widest outline-none focus:border-rose-500" />
          </div>
          <button data-testid="bulk-delete-submit" disabled={busy || !roles.length || confirm.trim().toUpperCase() !== "HAPUS"} onClick={submit}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-40 transition-colors">{busy ? "Menghapus..." : `Hapus ${total} Akun`}</button>
        </div>
      </div>
    </div>
  );
}
