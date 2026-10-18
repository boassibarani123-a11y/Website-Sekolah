import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { UserPlus, IdCard, Printer, Trash2, X, Pencil, Search, AlertTriangle, CheckCircle2, XCircle, ScanFace, FileSpreadsheet } from "lucide-react";
import StudentIdCard from "@/components/StudentIdCard";
import { BulkDeleteModal } from "@/components/accounts/BulkDeleteModal";
import { ImportStudentsModal } from "@/components/accounts/ImportStudentsModal";
import { PageHeader, StatStrip, StatusText } from "@/components/zx/ui";

const ROLES = [
  {v:"siswa", l:"Siswa"}, {v:"guru", l:"Guru / Wali Kelas"}, {v:"kepsek", l:"Kepala Sekolah"},
  {v:"staff_tu", l:"Staff TU"}, {v:"ketua_osis", l:"Ketua OSIS"},
  {v:"ketua_kelas", l:"Ketua Kelas"}, {v:"admin_perpus", l:"Admin Perpustakaan"},
  {v:"piket_gerbang", l:"Piket Gerbang"}, {v:"super_admin", l:"Super Admin"},
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(r=>[r.v, r.l]));
const ROLE_BADGE = {
  super_admin: "bg-violet-100 text-violet-700 border-violet-200", kepsek: "bg-amber-100 text-amber-700 border-amber-200",
  staff_tu: "bg-indigo-100 text-indigo-700 border-indigo-200", guru: "bg-emerald-100 text-emerald-700 border-emerald-200",
  siswa: "bg-sky-100 text-sky-700 border-sky-200", ketua_osis: "bg-rose-100 text-rose-700 border-rose-200",
  ketua_kelas: "bg-teal-100 text-teal-700 border-teal-200", admin_perpus: "bg-cyan-100 text-cyan-700 border-cyan-200",
  piket_gerbang: "bg-orange-100 text-orange-700 border-orange-200",
};
const STUDENT_LIKE = ["siswa","ketua_kelas","ketua_osis"];
const TABS = [
  { id: "all", l: "Semua akun" }, { id: "siswa", l: "Siswa", roles: STUDENT_LIKE },
  { id: "guru", l: "Guru & staf", roles: ["guru", "kepsek", "staff_tu", "admin_perpus", "piket_gerbang"] }, { id: "admin", l: "Admin", roles: ["super_admin"] },
];

export default function MasterAccounts() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [cardFor, setCardFor] = useState(null);
  const [editFor, setEditFor] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState("");
  const [allClasses, setAllClasses] = useState([]);
  useEffect(() => { api.get("/classes").then(r => setAllClasses(r.data)).catch(() => {}); }, []);
  const [bulk, setBulk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [limit, setLimit] = useState(100);
  const [tab, setTab] = useState("all");
  const kelasOpts = [...new Set([...allClasses.map(c => c.name), ...users.map(u => u.kelas)].filter(Boolean))].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
  const [faces, setFaces] = useState({});
  const navigate = useNavigate();
  const load = () => {
    api.get("/users").then(r=>setUsers(r.data));
    api.get("/face/students").then(r=>setFaces(Object.fromEntries(r.data.students.map(s=>[s.id, s.enrolled])))).catch(()=>{});
  };
  useEffect(() => { load(); }, []);

  const tabRoles = TABS.find(t => t.id === tab)?.roles;
  const activeCount = users.filter(u => u.is_active !== false).length;
  const filtered = users.filter(u => {
    if (tabRoles && !tabRoles.includes(u.role)) return false;
    const text = !filter || u.name?.toLowerCase().includes(filter.toLowerCase()) || u.email.includes(filter.toLowerCase()) || (u.nisn||"").includes(filter) || (u.nis||"").includes(filter);
    const role = !roleFilter || u.role === roleFilter;
    const active = u.is_active !== false;
    const status = !statusFilter || (statusFilter === "active" ? active : !active);
    const kelas = !kelasFilter || u.kelas === kelasFilter;
    return text && role && status && kelas;
  });

  const doDelete = async () => {
    if (!delFor) return;
    await api.delete(`/users/${delFor.id}`);
    toast.success("Akun dihapus"); setDelFor(null); load();
  };

  return (
    <div className="space-y-6" data-testid="accounts-page">
      <PageHeader title="Kelola Akun" subtitle="Kelola akses, peran, dan keamanan seluruh warga sekolah. Setiap akun siswa otomatis mendapat barcode NISN & Kartu Pelajar."
        actions={<>
          <a href="/print-cards" target="_blank" rel="noreferrer" data-testid="bulk-print-link" className="zx-btn-ghost"><Printer className="w-4 h-4"/>Cetak kartu massal</a>
          <button data-testid="import-students-button" onClick={()=>setImporting(true)} className="zx-btn-ghost"><FileSpreadsheet className="w-4 h-4"/>Impor Excel</button>
          <button data-testid="bulk-delete-button" onClick={()=>setBulk(true)} className="zx-btn-ghost !text-rose-600"><Trash2 className="w-4 h-4"/>Hapus massal</button>
          <button data-testid="create-account-button" onClick={()=>setShowCreate(true)} className="zx-btn-primary"><UserPlus className="w-4 h-4"/>Tambah akun</button>
        </>}/>

      <StatStrip items={[
        { label: "Seluruh akun", value: users.length.toLocaleString("id-ID"), hint: "Siswa, guru, staf, dan administrator" },
        { label: "Akun aktif", value: activeCount.toLocaleString("id-ID"), hint: `${users.length ? Math.round(activeCount/users.length*1000)/10 : 0}% dari seluruh akun` },
        { label: "Siswa belum daftar wajah", value: users.filter(u=>u.role==="siswa" && !faces[u.id]).length, hint: "Perlu didaftarkan untuk Face ID" },
        { label: "Akun dinonaktifkan", value: users.length - activeCount, hint: "Tidak memiliki akses masuk" },
      ]}/>

      <section className="zx-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <h2 className="zx-panel-title">Direktori akun</h2>
          <button onClick={()=>setImporting(true)} className="text-[12px] text-sky-600 font-medium hover:underline">Impor akun ↗</button>
        </div>
        <p className="text-[12px] text-slate-500 mt-1">Atur peran dan hak akses sesuai kebutuhan sekolah</p>
        <div className="mt-4 flex gap-6 border-b border-slate-100 overflow-x-auto no-scrollbar" data-testid="accounts-tabs">
          {TABS.map(t => {
            const n = users.filter(u => !t.roles || t.roles.includes(u.role)).length;
            const on = tab === t.id;
            return <button key={t.id} data-testid={`accounts-tab-${t.id}`} onClick={()=>{setTab(t.id); setRoleFilter("");}}
              className={`pb-2.5 -mb-px text-[13px] whitespace-nowrap border-b-2 transition-colors ${on ? "border-sky-600 text-sky-700 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.l} ({n})</button>;
          })}
        </div>
        <div className="mt-4 grid sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/>
            <input data-testid="accounts-search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Cari nama, NIS, NISN, atau email..." className="zx-input !pl-10"/>
          </div>
          <select data-testid="accounts-role-filter" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="zx-input sm:col-span-2">
            <option value="">Semua peran</option>
            {ROLES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
          <select data-testid="accounts-kelas-filter" value={kelasFilter} onChange={e=>setKelasFilter(e.target.value)} className="zx-input sm:col-span-2">
            <option value="">Semua kelas</option>
            {kelasOpts.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <select data-testid="accounts-status-filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="zx-input sm:col-span-2">
            <option value="">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="zx-table min-w-[820px]">
            <thead><tr><th>Nama pengguna</th><th>Email</th><th>Peran</th><th>Kelas</th><th>Status</th><th>Wajah</th><th className="!text-right">Aksi</th></tr></thead>
            <tbody>
              {filtered.slice(0, limit).map(u=>{
                const active = u.is_active !== false;
                return (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors" data-testid={`account-row-${u.id}`}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center text-[11px] font-semibold overflow-hidden shrink-0">
                        {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover"/> : (u.name?.[0] || "?")}
                      </span>
                      <div className="min-w-0"><p className="font-medium text-slate-900 truncate">{u.name}</p>{(u.nis || u.nip) && <p className="text-[11px] text-slate-400">{u.nis ? `NIS ${u.nis}` : `NIP ${u.nip}`}</p>}</div>
                    </div>
                  </td>
                  <td className="!text-slate-600">{u.email}</td>
                  <td className="!text-slate-600">{ROLE_LABEL[u.role] || u.role}</td>
                  <td className="!text-slate-600">{u.kelas || "—"}</td>
                  <td>{active ? <StatusText tone="green">Aktif</StatusText> : <StatusText tone="slate">Nonaktif</StatusText>}</td>
                  <td data-testid={`face-status-${u.id}`}>
                    {u.role !== "siswa" ? <span className="text-slate-300">—</span> : faces[u.id]
                      ? <StatusText tone="green">Terdaftar</StatusText>
                      : <button data-testid={`face-enroll-${u.id}`} onClick={()=>navigate(`/face-enroll?student=${u.id}`)} className="text-[12.5px] font-medium text-amber-600 hover:underline">Daftarkan</button>}
                  </td>
                  <td className="text-right whitespace-nowrap space-x-3">
                    {u.role === "siswa" && <button data-testid="student-id-card-modal-trigger" onClick={()=>setCardFor(u)} className="text-[12.5px] font-medium text-slate-700 hover:text-sky-600 inline-flex items-center gap-1"><IdCard className="w-3.5 h-3.5"/>Kartu</button>}
                    <button data-testid={`edit-account-${u.id}`} onClick={()=>setEditFor(u)} className="text-[12.5px] font-medium text-sky-600 hover:underline">Kelola</button>
                    <button data-testid={`delete-account-${u.id}`} onClick={()=>setDelFor(u)} title="Hapus" className="text-rose-500 hover:text-rose-700 align-middle"><Trash2 className="w-3.5 h-3.5"/></button>
                  </td>
                </tr>
              );})}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="!py-12 text-center !text-slate-400" data-testid="accounts-empty">Tidak ada akun yang cocok dengan filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[12px] text-slate-500" data-testid="accounts-count">Menampilkan {Math.min(limit, filtered.length)} dari {filtered.length} akun ({users.length} total)</p>
          {filtered.length > limit && <button data-testid="accounts-show-more" onClick={()=>setLimit(l=>l+200)} className="text-[12.5px] font-semibold text-sky-600 hover:underline">Tampilkan lebih banyak ({filtered.length - limit} lagi)</button>}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-sky-100 bg-sky-50/70 p-5"><p className="text-[13.5px] font-semibold text-sky-800">Akses berbasis peran</p><p className="text-[12px] text-slate-600 mt-1">Tersedia 9 peran: super admin, kepala sekolah, staff TU, guru/wali kelas, siswa, ketua kelas, ketua OSIS, admin perpustakaan, dan piket gerbang. Setiap akun hanya membuka fitur sesuai perannya.</p></div>
        <div className="rounded-[14px] border border-emerald-100 bg-emerald-50/70 p-5"><p className="text-[13.5px] font-semibold text-emerald-800">Kartu pelajar otomatis</p><p className="text-[12px] text-slate-600 mt-1">Setiap akun siswa langsung mendapat kartu pelajar berisi nama, NIS, NISN, logo sekolah, dan barcode. Cetak satuan lewat tombol Kartu atau massal lewat Cetak kartu massal.</p></div>
      </div>

      {showCreate && <CreateModal onClose={()=>setShowCreate(false)} onCreated={()=>{load(); setShowCreate(false);}}/>}
      {editFor && <EditModal user={editFor} onClose={()=>setEditFor(null)} onSaved={()=>{load(); setEditFor(null);}}/>}
      {cardFor && <CardModal student={cardFor} onClose={()=>setCardFor(null)}/>}
      {bulk && <BulkDeleteModal users={users} kelasOpts={kelasOpts} onClose={()=>setBulk(false)} onDone={()=>{setBulk(false); load();}}/>}
      {importing && <ImportStudentsModal kelasOpts={kelasOpts} onClose={()=>setImporting(false)} onDone={load}/>}
      {delFor && <DeleteConfirm user={delFor} onClose={()=>setDelFor(null)} onConfirm={doDelete}/>}
    </div>
  );
}

function DeleteConfirm({ user, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="delete-confirm-modal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto"><AlertTriangle className="w-7 h-7"/></div>
        <h3 className="mt-4 font-heading text-xl font-bold text-slate-900">Hapus Akun?</h3>
        <p className="mt-1.5 text-sm text-slate-500">Akun <b className="text-slate-800">{user.name}</b> ({user.email}) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
          <button data-testid="confirm-delete-button" disabled={busy} onClick={async()=>{setBusy(true); try{await onConfirm();}finally{setBusy(false);}}}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold disabled:opacity-60">
            {busy ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || "", role: user.role, password: "", kelas: user.kelas || "",
    nisn: user.nisn || "", nis: user.nis || "", nip: user.nip || "", phone: user.phone || "",
    is_active: user.is_active !== false,
  });
  const [classList, setClassList] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/classes").then(r=>setClassList(r.data)).catch(()=>{}); }, []);
  const isStudent = STUDENT_LIKE.includes(form.role);

  const submit = async e => {
    e.preventDefault(); setBusy(true);
    const payload = { name: form.name, role: form.role, is_active: form.is_active };
    if (form.password.trim()) payload.password = form.password.trim();
    ["kelas","nisn","nis","nip","phone"].forEach(k=>{
      if ((form[k]||"").trim() !== "") payload[k] = form[k].trim();
    });
    try { await api.patch(`/users/${user.id}`, payload); toast.success("Akun diperbarui"); onSaved(); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal memperbarui akun"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" data-testid="edit-account-modal">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="font-heading text-xl font-bold">Edit Akun</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <Field label="Nama Lengkap"><input data-testid="edit-name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required className={inp}/></Field>
          <Field label="Email (tidak dapat diubah)"><input value={user.email} disabled className={`${inp} bg-slate-50 text-slate-400`}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <select data-testid="edit-role" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className={inp}>
                {ROLES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </Field>
            <Field label="Password Baru (opsional)"><input data-testid="edit-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Kosongkan jika tetap" className={inp}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {isStudent
              ? <Field label="NISN"><input value={form.nisn} onChange={e=>setForm({...form,nisn:e.target.value})} className={inp}/></Field>
              : <Field label="NIP"><input value={form.nip} onChange={e=>setForm({...form,nip:e.target.value})} className={inp}/></Field>}
            <Field label="Kelas">
              <select value={form.kelas} onChange={e=>setForm({...form,kelas:e.target.value})} className={inp}>
                <option value="">— Tidak ada —</option>
                {classList.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Nomor WhatsApp"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="08xxxxxxxxxx" className={inp}/></Field>
          {isStudent && <Field label="NIS"><input data-testid="edit-nis" value={form.nis} onChange={e=>setForm({...form,nis:e.target.value})} className={inp}/></Field>}
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-800">Status Akun Aktif</p>
              <p className="text-xs text-slate-400">Akun nonaktif tidak dapat login.</p>
            </div>
            <input data-testid="edit-active-toggle" type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} className="w-5 h-5 accent-sky-600"/>
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="submit-edit-account" disabled={busy} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy?"Menyimpan...":"Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inp = "mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none";
function Field({ label, children }) {
  return <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>{children}</div>;
}

function CreateModal({onClose, onCreated}) {
  const [form, setForm] = useState({email:"", password:"", name:"", role:"siswa", nisn:"", nis:"", kelas:"", photo:"", phone:"", student_id:"", subjects:[]});
  const [classList, setClassList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/classes").then(r=>setClassList(r.data)).catch(()=>{});
    api.get("/subjects").then(r=>setSubjectList(r.data)).catch(()=>{});
  }, []);
  const toggleSubject = (name) => setForm(f => ({...f, subjects: f.subjects.includes(name) ? f.subjects.filter(s=>s!==name) : [...f.subjects, name]}));
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    const payload = {};
    Object.entries(form).forEach(([k, v]) => {
      if (Array.isArray(v)) { if (v.length) payload[k] = v; }
      else if (typeof v === "string" ? v.trim() !== "" : v != null) payload[k] = v;
    });
    try { await api.post("/users", payload); toast.success("Akun berhasil dibuat"); onCreated(); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal membuat akun"); }
    finally { setBusy(false); }
  };
  const onFile = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    api.post("/upload", fd).then(r => {
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      setForm({...form, photo: url});
    }).catch(() => toast.error("Gagal upload"));
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">Buat Akun Baru</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <Input label="Nama Lengkap" v={form.name} on={v=>setForm({...form,name:v})} required/>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" v={form.email} on={v=>setForm({...form,email:v})} required/>
            <Input label="Password" v={form.password} on={v=>setForm({...form,password:v})} required/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Role</label>
            <select data-testid="new-account-role" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
              {ROLES.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>
          {(form.role==="siswa" || form.role==="ketua_kelas" || form.role==="ketua_osis") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="NISN" v={form.nisn} on={v=>setForm({...form,nisn:v})} data-testid="new-account-nisn"/>
                <Input label="NIS" v={form.nis} on={v=>setForm({...form,nis:v})} placeholder="Nomor Induk Siswa" data-testid="new-account-nis"/>
              </div>
              <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kelas</label>
                  <select data-testid="new-account-kelas" value={form.kelas} onChange={e=>setForm({...form,kelas:e.target.value})}
                    className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                    <option value="">-- Pilih kelas --</option>
                    {classList.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  {classList.length===0 && <p className="mt-1 text-[10px] text-amber-600">Belum ada kelas. Buat kelas dulu di menu Ruang Kelas.</p>}
              </div>
              <div className="-mt-1">
                <button type="button" data-testid="nisn-generate" onClick={()=>setForm({...form,nisn:String(Math.floor(1000000000+Math.random()*9000000000))})}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800">Buat NISN acak otomatis</button>
              </div>
              <Input label={form.role==="siswa" ? "Nomor WhatsApp Aktif (wajib)" : "Nomor WhatsApp"} v={form.phone} on={v=>setForm({...form,phone:v})} required={form.role==="siswa"} placeholder="08xxxxxxxxxx" data-testid="new-account-phone"/>
            </>
          )}
          {form.role === "guru" && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mata Pelajaran yang Diampu</label>
                <div className="mt-1.5 flex flex-wrap gap-2" data-testid="guru-subjects">
                  {subjectList.length===0 && <p className="text-[11px] text-amber-600">Belum ada mapel. Tambahkan di Ruang Kelas → Kelola Mapel.</p>}
                  {subjectList.map(s=>(
                    <button type="button" key={s.id} data-testid={`subject-pick-${s.name}`} onClick={()=>toggleSubject(s.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${form.subjects.includes(s.name) ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-sky-400"}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">Guru otomatis dapat mengakses semua kelas yang memuat mapel ini.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Wali Kelas (opsional)</label>
                <select value={form.kelas} onChange={e=>setForm({...form,kelas:e.target.value})}
                  className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                  <option value="">-- Bukan wali kelas --</option>
                  {classList.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">Penetapan wali kelas resmi dilakukan di menu Ruang Kelas.</p>
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Foto (opsional)</label>
            <input type="file" accept="image/*" onChange={onFile} className="mt-1 w-full text-sm"/>
            {form.photo && <img src={form.photo} alt="" className="mt-2 w-20 h-24 object-cover rounded-lg border"/>}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="submit-new-account" disabled={busy} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy?"Menyimpan...":"Simpan Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CardModal({student, onClose}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 no-print">
          <h3 className="font-heading text-xl font-bold">Kartu Pelajar</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col items-center bg-gradient-to-br from-slate-50 to-slate-100">
          <StudentIdCard student={student}/>
          <div className="mt-6 no-print flex gap-2 w-full">
            <button data-testid="print-student-id-card-button" onClick={()=>window.print()}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4"/>Cetak (Print)
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 text-center no-print">Ukuran KTP Standar (85.6 × 53.98 mm). Cetak di kertas foto/PVC untuk hasil terbaik.</p>
        </div>
      </div>
    </div>
  );
}

function Input({label, v, on, ...p}) {
  return <div>
    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
    <input value={v} onChange={e=>on(e.target.value)} {...p}
      className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
  </div>;
}
