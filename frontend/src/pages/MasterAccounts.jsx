import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { UserPlus, IdCard, Printer, Trash2, X } from "lucide-react";
import StudentIdCard from "@/components/StudentIdCard";
const ROLES = [
  {v:"siswa", l:"Siswa"}, {v:"guru", l:"Guru / Wali Kelas"}, {v:"kepsek", l:"Kepala Sekolah"},
  {v:"staff_tu", l:"Staff TU"}, {v:"ketua_osis", l:"Ketua OSIS"},
  {v:"ketua_kelas", l:"Ketua Kelas"}, {v:"admin_perpus", l:"Admin Perpustakaan"},
  {v:"admin_absensi", l:"Admin Absensi"}, {v:"super_admin", l:"Super Admin"},
];

export default function MasterAccounts() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [cardFor, setCardFor] = useState(null);
  const [filter, setFilter] = useState("");
  const load = () => api.get("/users").then(r=>setUsers(r.data));
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => !filter || u.name?.toLowerCase().includes(filter.toLowerCase()) || u.email.includes(filter) || u.role.includes(filter));

  return (
    <div className="space-y-6" data-testid="accounts-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Kelola Akun Master</h1>
          <p className="mt-1 text-sm text-slate-500">Buat, edit, dan kelola akun untuk seluruh warga sekolah. Setiap akun siswa otomatis mendapat barcode NISN permanen & Kartu Pelajar.</p>
        </div>
        <div className="flex gap-2">
          <a href="/print-cards" target="_blank" rel="noreferrer" data-testid="bulk-print-link"
            className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-semibold flex items-center gap-2 hover:border-sky-400 transition-all">
            🖨️ Cetak Kartu Massal
          </a>
          <button data-testid="create-account-button" onClick={()=>setShowCreate(true)}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all">
            <UserPlus className="w-4 h-4"/>Buat Akun Baru
          </button>
        </div>
      </div>

      <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Cari nama, email, atau role..."
        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th><th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u=>(
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">{u.role}</span></td>
                  <td className="px-4 py-3 text-slate-600">{u.kelas || "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {u.role === "siswa" && (
                      <button data-testid="student-id-card-modal-trigger" onClick={()=>setCardFor(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">
                        <IdCard className="w-3.5 h-3.5"/>Kartu
                      </button>
                    )}
                    <button onClick={async()=>{if(confirm("Hapus akun ini?")){await api.delete(`/users/${u.id}`); toast.success("Akun dihapus"); load();}}}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateModal onClose={()=>setShowCreate(false)} onCreated={()=>{load(); setShowCreate(false);}}/>}
      {cardFor && <CardModal student={cardFor} onClose={()=>setCardFor(null)}/>}
    </div>
  );
}

function CreateModal({onClose, onCreated}) {
  const [form, setForm] = useState({email:"", password:"", name:"", role:"siswa", nisn:"", kelas:"", jurusan:"IPA", photo:"", phone:"", parent_name:"", parent_email:"", parent_phone:"", student_id:"", subjects:[]});
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
    // Drop empty optional fields so EmailStr/validators don't reject "" values
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
                <Input label="NISN" v={form.nisn} on={v=>setForm({...form,nisn:v})}/>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kelas</label>
                  <select data-testid="new-account-kelas" value={form.kelas} onChange={e=>setForm({...form,kelas:e.target.value})}
                    className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                    <option value="">-- Pilih kelas --</option>
                    {classList.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  {classList.length===0 && <p className="mt-1 text-[10px] text-amber-600">Belum ada kelas. Buat kelas dulu di menu Ruang Kelas.</p>}
                </div>
              </div>
              <div className="-mt-1">
                <button type="button" data-testid="nisn-generate" onClick={()=>setForm({...form,nisn:String(Math.floor(1000000000+Math.random()*9000000000))})}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-800">Buat NISN acak otomatis</button>
              </div>
              <Input label={form.role==="siswa" ? "Nomor WhatsApp Aktif (wajib)" : "Nomor WhatsApp"} v={form.phone} on={v=>setForm({...form,phone:v})} required={form.role==="siswa"} placeholder="08xxxxxxxxxx" data-testid="new-account-phone"/>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nama Ortu" v={form.parent_name} on={v=>setForm({...form,parent_name:v})}/>
                <Input label="Email Ortu" type="email" v={form.parent_email} on={v=>setForm({...form,parent_email:v})}/>
              </div>
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
