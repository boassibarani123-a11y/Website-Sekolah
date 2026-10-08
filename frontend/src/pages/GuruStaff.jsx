import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { GraduationCap, Download, UserPlus2, Pencil, KeyRound, Trash2, BookOpen, X, Search } from "lucide-react";

const STAFF_ROLES = ["guru", "staff_tu", "kepsek", "admin_perpus", "admin_absensi"];
const LABELS = { guru: "Guru", staff_tu: "Staff TU", kepsek: "Kepala Sekolah", admin_perpus: "Admin Perpustakaan", admin_absensi: "Admin Absensi" };

export default function GuruStaff() {
  const { user } = useAuth();
  const nav = useNavigate();
  const isSuper = user?.role === "super_admin";
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [divisi, setDivisi] = useState("");
  const [edit, setEdit] = useState(null);
  const [subjFor, setSubjFor] = useState(null);

  const load = () => api.get("/users").then(r => setRows(r.data.filter(u => STAFF_ROLES.includes(u.role)))).catch(() => {});
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(u =>
    (!q || u.name?.toLowerCase().includes(q.toLowerCase()) || (u.nip || "").includes(q) || (u.email || "").includes(q)) &&
    (!divisi || u.role === divisi)
  );

  const resetPw = async (u) => {
    const pw = prompt(`Password baru untuk ${u.name}:`);
    if (!pw) return;
    try { await api.patch(`/users/${u.id}`, { password: pw }); toast.success("Password direset"); }
    catch { toast.error("Gagal reset password"); }
  };
  const del = async (u) => {
    if (!window.confirm(`Hapus akun ${u.name}?`)) return;
    try { await api.delete(`/users/${u.id}`); toast.success("Akun dihapus"); load(); }
    catch { toast.error("Gagal menghapus"); }
  };
  const exportXlsx = async () => {
    try {
      const r = await api.get("/users/staff/export/xlsx", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href = url; a.download = "Daftar_Guru_Staff.xlsx"; a.click();
    } catch { toast.error("Gagal export"); }
  };

  return (
    <div className="space-y-6" data-testid="guru-staff-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-3"><GraduationCap className="w-8 h-8 text-sky-600" /> Daftar Guru &amp; Staff</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola data guru &amp; staff sekolah</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="staff-export" onClick={exportXlsx} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700"><Download className="w-4 h-4" />Export</button>
          {isSuper && <button data-testid="staff-add" onClick={() => nav("/accounts")} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700"><UserPlus2 className="w-4 h-4" />Tambah Guru &amp; Staff</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input data-testid="staff-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Nama Guru & Staff / NIP" className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" />
        </div>
        <select value={divisi} onChange={e => setDivisi(e.target.value)} className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm">
          <option value="">Pilih Divisi</option>
          {STAFF_ROLES.map(r => <option key={r} value={r}>{LABELS[r]}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-3">No</th><th className="px-4 py-3">Nama Lengkap</th><th className="px-4 py-3">NIP</th>
                <th className="px-4 py-3">Divisi</th><th className="px-4 py-3">Username</th><th className="px-4 py-3 text-center">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50" data-testid={`staff-row-${u.id}`}>
                  <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 font-mono-alt text-slate-700">{u.nip || "—"}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">{LABELS[u.role]}</span></td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {u.role === "guru" && <button data-testid={`staff-subj-${u.id}`} onClick={() => setSubjFor(u)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Mapel</button>}
                      {isSuper && <button data-testid={`staff-edit-${u.id}`} onClick={() => setEdit({ ...u })} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1"><Pencil className="w-3.5 h-3.5" />Ubah</button>}
                      {isSuper && <button data-testid={`staff-reset-${u.id}`} onClick={() => resetPw(u)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />Reset</button>}
                      {isSuper && <button data-testid={`staff-del-${u.id}`} onClick={() => del(u)} className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Hapus</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">Menampilkan {filtered.length} guru &amp; staff</div>
      </div>

      {edit && <EditModal item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {subjFor && <SubjectsModal item={subjFor} onClose={() => setSubjFor(null)} onSaved={() => { setSubjFor(null); load(); }} />}
    </div>
  );
}

function EditModal({ item, onClose, onSaved }) {
  const [f, setF] = useState({ name: item.name || "", role: item.role, nip: item.nip || "" });
  const inp = "mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";
  const save = async () => {
    try { await api.patch(`/users/${item.id}`, f); toast.success("Data diperbarui"); onSaved(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()} data-testid="staff-edit-modal">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">Ubah Guru / Staff</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-3">
          <div><label className="text-[11px] font-semibold uppercase text-slate-500">Nama Lengkap</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={inp} data-testid="staff-edit-name" /></div>
          <div><label className="text-[11px] font-semibold uppercase text-slate-500">NIP</label><input value={f.nip} onChange={e => setF({ ...f, nip: e.target.value })} className={inp} data-testid="staff-edit-nip" /></div>
          <div><label className="text-[11px] font-semibold uppercase text-slate-500">Divisi</label>
            <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })} className={inp} data-testid="staff-edit-role">
              {STAFF_ROLES.map(r => <option key={r} value={r}>{LABELS[r]}</option>)}
            </select></div>
          <div><label className="text-[11px] font-semibold uppercase text-slate-500">Username</label><input value={item.email} disabled className={`${inp} bg-slate-100 text-slate-500`} /></div>
        </div>
        <div className="p-5 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold">Batal</button>
          <button data-testid="staff-edit-save" onClick={save} className="flex-1 py-2.5 bg-sky-600 text-white rounded-xl font-semibold">Simpan</button>
        </div>
      </div>
    </div>
  );
}

function SubjectsModal({ item, onClose, onSaved }) {
  const [txt, setTxt] = useState((item.subjects || []).join(", "));
  const save = async () => {
    const subjects = txt.split(",").map(s => s.trim()).filter(Boolean);
    try { await api.patch(`/users/${item.id}`, { subjects }); toast.success("Mata pelajaran disimpan"); onSaved(); }
    catch { toast.error("Gagal menyimpan"); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()} data-testid="staff-subjects-modal">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">Mata Pelajaran — {item.name}</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5">
          <label className="text-[11px] font-semibold uppercase text-slate-500">Mapel (pisahkan dengan koma)</label>
          <textarea rows={3} value={txt} onChange={e => setTxt(e.target.value)} placeholder="Matematika, Fisika" className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" data-testid="staff-subjects-input" />
        </div>
        <div className="p-5 border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold">Batal</button>
          <button data-testid="staff-subjects-save" onClick={save} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold">Simpan</button>
        </div>
      </div>
    </div>
  );
}
