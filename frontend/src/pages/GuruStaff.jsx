import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PageHeader, StatStrip } from "@/components/zx/ui";
import { GraduationCap, Download, UserPlus2, Pencil, KeyRound, Trash2, BookOpen, X, Search, LayoutGrid, List, MessageCircle, Phone, School, Mail } from "lucide-react";

const STAFF_ROLES = ["guru", "staff_tu", "kepsek", "admin_perpus", "piket_gerbang"];
const LABELS = { guru: "Guru", staff_tu: "Staff TU", kepsek: "Kepala Sekolah", admin_perpus: "Admin Perpustakaan", piket_gerbang: "Piket Gerbang" };
const ROLE_BADGE = {
  guru: "bg-emerald-100 text-emerald-700", staff_tu: "bg-indigo-100 text-indigo-700",
  kepsek: "bg-amber-100 text-amber-700", admin_perpus: "bg-cyan-100 text-cyan-700", piket_gerbang: "bg-orange-100 text-orange-700",
};

const waLink = (phone) => {
  const d = (phone || "").replace(/\D/g, "");
  if (!d) return null;
  const n = d.startsWith("0") ? "62" + d.slice(1) : d;
  return `https://wa.me/${n}`;
};

export default function GuruStaff() {
  const { user } = useAuth();
  const nav = useNavigate();
  const isSuper = user?.role === "super_admin";
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [divisi, setDivisi] = useState("");
  const [view, setView] = useState("grid");
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
      <PageHeader title="Guru & Staff" subtitle="Kenali para pendidik dan tenaga kependidikan sekolah."
        actions={<>
          <button data-testid="staff-export" onClick={exportXlsx} className="zx-btn-ghost"><Download className="w-4 h-4" />Export</button>
          {isSuper && <button data-testid="staff-add" onClick={() => nav("/accounts")} className="zx-btn-primary"><UserPlus2 className="w-4 h-4" />Tambah pegawai</button>}
        </>}/>
      <StatStrip items={[
        { label: "Total pegawai", value: rows.length, hint: "Tim hebat di balik pendidikan" },
        { label: "Guru aktif", value: rows.filter(u => u.role === "guru" && u.is_active !== false).length, hint: `${new Set(rows.flatMap(u => u.subjects || [])).size} mata pelajaran` },
        { label: "Tenaga kependidikan", value: rows.filter(u => u.role !== "guru").length, hint: "Administrasi & operasional" },
        { label: "Wali kelas", value: rows.filter(u => u.kelas).length, hint: "Guru dengan kelas binaan" },
      ]}/>
      <div className="flex gap-6 border-b border-slate-200/80 overflow-x-auto no-scrollbar" data-testid="staff-tabs">
        {[["", "Semua pegawai"], ...STAFF_ROLES.map(r => [r, LABELS[r]])].map(([v, l]) => (
          <button key={v || "all"} data-testid={`staff-tab-${v || "all"}`} onClick={() => setDivisi(v)} className={`pb-2.5 -mb-px text-[13px] whitespace-nowrap border-b-2 ${divisi === v ? "border-sky-600 text-sky-700 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{l}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input data-testid="staff-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama, NIP, atau mata pelajaran..." className="zx-input !pl-9" />
        </div>
        <select value={divisi} onChange={e => setDivisi(e.target.value)} className="zx-input !w-auto">
          <option value="">Semua Divisi</option>
          {STAFF_ROLES.map(r => <option key={r} value={r}>{LABELS[r]}</option>)}
        </select>
        <div className="flex rounded-xl border-2 border-slate-200 overflow-hidden">
          <button data-testid="view-grid" onClick={() => setView("grid")} title="Tampilan Kartu" className={`p-2.5 ${view === "grid" ? "bg-sky-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}><LayoutGrid className="w-4 h-4" /></button>
          <button data-testid="view-table" onClick={() => setView("table")} title="Tampilan Tabel" className={`p-2.5 ${view === "table" ? "bg-sky-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="staff-grid">
          {filtered.map(u => {
            const wa = waLink(u.phone);
            return (
              <div key={u.id} data-testid={`staff-card-${u.id}`} className="zx-card hover:border-sky-200 transition-colors overflow-hidden">
                <div className="p-5 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center text-[15px] font-semibold overflow-hidden shrink-0">
                    {u.photo ? <img src={u.photo} alt={u.name} className="w-full h-full object-cover" /> : (u.name?.[0] || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-bold text-slate-900 truncate">{u.name}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[u.role] || "bg-slate-100 text-slate-700"}`}>{LABELS[u.role]}</span>
                    <p className="mt-1 text-xs text-slate-500 font-mono-alt">NIP {u.nip || "—"}</p>
                  </div>
                </div>
                <div className="px-5 pb-3 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{u.email}</span></p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />{u.phone || "—"}</p>
                </div>
                {/* Penugasan */}
                <div className="px-5 pb-4 pt-2 border-t border-slate-100 space-y-2" data-testid={`staff-assignment-${u.id}`}>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Penugasan</p>
                  <p className="flex items-center gap-2 text-xs text-slate-700"><School className="w-3.5 h-3.5 text-sky-500 shrink-0" />Wali Kelas: <b>{u.kelas || "—"}</b></p>
                  {u.role === "guru" && (
                    <div className="flex items-start gap-2 text-xs text-slate-700">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {(u.subjects && u.subjects.length) ? u.subjects.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-medium">{s}</span>) : <span className="text-slate-400">Belum ada mapel</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  {wa
                    ? <a data-testid={`staff-wa-${u.id}`} href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>
                    : <span className="text-[11px] text-slate-400 italic">No WA belum diisi</span>}
                  {u.role === "guru" && <button data-testid={`staff-subj-${u.id}`} onClick={() => setSubjFor(u)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold"><BookOpen className="w-3.5 h-3.5" />Mapel</button>}
                  {isSuper && <button data-testid={`staff-edit-${u.id}`} onClick={() => setEdit({ ...u })} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold"><Pencil className="w-3.5 h-3.5" />Ubah</button>}
                  {isSuper && <button data-testid={`staff-reset-${u.id}`} onClick={() => resetPw(u)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"><KeyRound className="w-3.5 h-3.5" />Reset</button>}
                  {isSuper && <button data-testid={`staff-del-${u.id}`} onClick={() => del(u)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full p-10 text-center text-slate-400 italic bg-white border border-slate-200 rounded-2xl">Tidak ada data.</div>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">No</th><th className="px-4 py-3">Nama Lengkap</th><th className="px-4 py-3">NIP</th>
                  <th className="px-4 py-3">Divisi</th><th className="px-4 py-3">Penugasan</th><th className="px-4 py-3">WhatsApp</th><th className="px-4 py-3 text-center">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u, i) => {
                  const wa = waLink(u.phone);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50" data-testid={`staff-row-${u.id}`}>
                      <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">{u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : (u.name?.[0] || "?")}</span>
                          <span className="font-semibold text-slate-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono-alt text-slate-700">{u.nip || "—"}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] || "bg-slate-100 text-slate-700"}`}>{LABELS[u.role]}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <span className="block">Wali: <b className="text-slate-800">{u.kelas || "—"}</b></span>
                        {u.role === "guru" && <span className="block text-slate-500 truncate max-w-[180px]">{(u.subjects && u.subjects.length) ? u.subjects.join(", ") : "Belum ada mapel"}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {wa ? <a data-testid={`staff-wa-${u.id}`} href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600"><MessageCircle className="w-3.5 h-3.5" />{u.phone}</a> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {u.role === "guru" && <button data-testid={`staff-subj-${u.id}`} onClick={() => setSubjFor(u)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />Mapel</button>}
                          {isSuper && <button data-testid={`staff-edit-${u.id}`} onClick={() => setEdit({ ...u })} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1"><Pencil className="w-3.5 h-3.5" />Ubah</button>}
                          {isSuper && <button data-testid={`staff-reset-${u.id}`} onClick={() => resetPw(u)} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" />Reset</button>}
                          {isSuper && <button data-testid={`staff-del-${u.id}`} onClick={() => del(u)} className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Hapus</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Tidak ada data.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">Menampilkan {filtered.length} guru &amp; staff</div>
        </div>
      )}

      {edit && <EditModal item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {subjFor && <SubjectsModal item={subjFor} onClose={() => setSubjFor(null)} onSaved={() => { setSubjFor(null); load(); }} />}
    </div>
  );
}

function useAssignData(item) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
    api.get("/subjects").then(r => setSubjects(r.data.map(x => x.name))).catch(() => {});
  }, []);
  const homeroom = classes.find(c => c.homeroom_teacher_id === item.id)?.id || "";
  return { classes, subjects, homeroom };
}

function EditModal({ item, onClose, onSaved }) {
  const [f, setF] = useState({ name: item.name || "", role: item.role, nip: item.nip || "", phone: item.phone || "" });
  const { classes, subjects, homeroom } = useAssignData(item);
  const [hr, setHr] = useState(null);
  const [subs, setSubs] = useState(item.subjects || []);
  const inp = "mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";
  const homeroomVal = hr ?? homeroom;
  const toggle = (n) => setSubs(subs.includes(n) ? subs.filter(x => x !== n) : [...subs, n]);
  const save = async () => {
    try {
      await api.patch(`/users/${item.id}`, f);
      await api.put(`/users/${item.id}/assignment`, { homeroom_class_id: homeroomVal || null, subjects: subs });
      toast.success("Data & penugasan diperbarui"); onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="staff-edit-modal">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">Ubah Guru / Staff</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-3">
          <div><label className="text-[11px] font-semibold uppercase text-slate-500">Nama Lengkap</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={inp} data-testid="staff-edit-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] font-semibold uppercase text-slate-500">NIP</label><input value={f.nip} onChange={e => setF({ ...f, nip: e.target.value })} className={inp} data-testid="staff-edit-nip" /></div>
            <div><label className="text-[11px] font-semibold uppercase text-slate-500">No. WhatsApp</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="08xxxxxxxxxx" className={inp} data-testid="staff-edit-phone" /></div>
          </div>
          <div><label className="text-[11px] font-semibold uppercase text-slate-500">Divisi / Jabatan Utama</label>
            <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })} className={inp} data-testid="staff-edit-role">
              {STAFF_ROLES.map(r => <option key={r} value={r}>{LABELS[r]}</option>)}
            </select></div>
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 space-y-3" data-testid="staff-assignment">
            <p className="text-xs font-bold text-sky-800 uppercase tracking-wide">Penugasan Tambahan</p>
            <p className="text-[11px] text-sky-700/80">Jabatan apa pun (mis. Kepala Sekolah) boleh juga menjadi wali kelas atau guru mapel. Akun mendapat akses fitur mengajar sesuai penugasan.</p>
            <div><label className="text-[11px] font-semibold uppercase text-slate-500">Wali Kelas</label>
              <select value={homeroomVal} onChange={e => setHr(e.target.value)} className={inp} data-testid="staff-edit-homeroom">
                <option value="">— Bukan wali kelas —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.homeroom_teacher_id && c.homeroom_teacher_id !== item.id ? ` (wali: ${c.homeroom_teacher_name || "lain"})` : ""}</option>)}
              </select></div>
            <div><label className="text-[11px] font-semibold uppercase text-slate-500">Mengajar Mapel</label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[...new Set([...subjects, ...subs])].map(n => <button key={n} type="button" data-testid={`staff-subject-${n}`} onClick={() => toggle(n)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${subs.includes(n) ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{n}</button>)}
                {subjects.length === 0 && <span className="text-xs text-slate-400">Belum ada mapel. Tambahkan di menu Kelas.</span>}
              </div></div>
          </div>
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
  const { homeroom } = useAssignData(item);
  const [txt, setTxt] = useState((item.subjects || []).join(", "));
  const save = async () => {
    const subjects = txt.split(",").map(s => s.trim()).filter(Boolean);
    try { await api.put(`/users/${item.id}/assignment`, { homeroom_class_id: homeroom || null, subjects }); toast.success("Mata pelajaran disimpan"); onSaved(); }
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
