import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { School, Plus, X, Users, BookOpen, Pencil, Trash2, ArrowRight, UserCog, Lock, Network } from "lucide-react";

export default function Classes() {
  const { user } = useAuth();
  const isSuperAdmin = user.role === "super_admin";
  const canManageClass = () => isSuperAdmin; // only super admin creates/edits/deletes classes
  const assignHomeroom = async (classId, teacherId) => {
    try {
      await api.patch(`/classes/${classId}`, { homeroom_teacher_id: teacherId || null });
      const tName = teachers.find(t => t.id === teacherId)?.name;
      toast.success(teacherId ? `Wali kelas: ${tName} — manajemen kelas terbuka untuknya` : "Wali kelas dikosongkan");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menetapkan wali"); }
  };
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} (new) | class obj
  const [showSubjects, setShowSubjects] = useState(false);
  const load = () => api.get("/classes").then(r => setClasses(r.data));
  useEffect(() => {
    load();
    if (isSuperAdmin) api.get("/users?role=guru").then(r => setTeachers(r.data)).catch(()=>{});
  }, [isSuperAdmin]);

  const teacherName = (id) => teachers.find(t => t.id === id)?.name || "—";

  return (
    <div className="space-y-6" data-testid="classes-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <School className="w-7 h-7 text-sky-600"/>Ruang Kelas
          </h1>
          <p className="mt-1 text-sm text-slate-500">Setiap kelas adalah wadah tugas, pengumpulan tugas per mata pelajaran, dan mini-quiz.</p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <button data-testid="manage-subjects-button" onClick={()=>setShowSubjects(true)}
              className="px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-sky-400 text-slate-700 font-semibold rounded-xl flex items-center gap-2 transition-all">
              <BookOpen className="w-4 h-4"/>Kelola Mapel
            </button>
            <button data-testid="create-class-button" onClick={()=>setEditing({})}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4"/>Buat Kelas Baru
            </button>
          </div>
        )}
      </div>

      {classes.length === 0 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <School className="w-10 h-10 text-slate-300 mx-auto"/>
          <p className="mt-3 text-slate-500 font-medium">Belum ada kelas.</p>
          {isSuperAdmin && <p className="text-sm text-slate-400">Klik tombol Buat Kelas Baru untuk memulai.</p>}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => (
          <div key={c.id} data-testid={`class-card-${c.id}`} className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-[transform,box-shadow] duration-300 group overflow-hidden flex flex-col">
            <div className="relative h-28 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 px-5 pt-4 overflow-hidden">
              <div className="absolute -right-6 -bottom-10 font-heading font-black text-[110px] leading-none text-white/10 select-none tracking-tighter">{c.name}</div>
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]"/>
              <div className="relative flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25 text-white flex items-center justify-center">
                  <School className="w-5 h-5"/>
                </div>
                {canManageClass(c) && (
                  <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button data-testid={`edit-class-${c.id}`} onClick={()=>setEditing(c)} className="p-2 text-white bg-white/10 hover:bg-white/25 rounded-xl backdrop-blur transition-colors"><Pencil className="w-4 h-4"/></button>
                    <button data-testid={`delete-class-${c.id}`} onClick={async()=>{if(confirm(`Hapus kelas ${c.name}?`)){try{await api.delete(`/classes/${c.id}`); toast.success("Kelas dihapus"); load();}catch(e){toast.error(e.response?.data?.detail||"Gagal menghapus");}}}} className="p-2 text-white bg-white/10 hover:bg-rose-500 rounded-xl backdrop-blur transition-colors"><Trash2 className="w-4 h-4"/></button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 pt-4 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-2 -mt-10 relative">
              <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Users className="w-3 h-3"/>Siswa</p>
                <p data-testid={`class-student-count-${c.id}`} className="font-heading text-2xl font-extrabold text-slate-900 tabular-nums">{c.student_count ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><BookOpen className="w-3 h-3"/>Mapel</p>
                <p className="font-heading text-2xl font-extrabold text-slate-900 tabular-nums">{(c.subjects||[]).length}</p>
              </div>
            </div>
            <h3 className="font-heading font-extrabold text-2xl text-slate-900 mt-4 flex items-center gap-2 flex-wrap">
              {c.name}
              {c.has_password && (
                <span data-testid={`class-lock-badge-${c.id}`} title={c.locked ? "Butuh password" : "Dilindungi password"} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.locked ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                  <Lock className="w-3 h-3"/>{c.locked ? "Terkunci" : "Berpassword"}
                </span>
              )}
              {user.role === "guru" && c.homeroom_teacher_id === user.id && (
                <span data-testid={`wali-badge-${c.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <UserCog className="w-3 h-3"/>Wali Anda
                </span>
              )}
            </h3>
            {c.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(c.subjects||[]).slice(0,4).map((s,i)=>(
                <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{s}</span>
              ))}
              {(c.subjects||[]).length>4 && <span className="px-2 py-0.5 text-[11px] text-slate-400">+{c.subjects.length-4}</span>}
              {(c.subjects||[]).length===0 && <span className="text-[11px] text-slate-400 italic">Belum ada mapel</span>}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 text-white font-bold text-sm flex items-center justify-center">
                {(c.homeroom_teacher_name || teacherName(c.homeroom_teacher_id) || "?").replace("—","?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><UserCog className="w-3 h-3"/>Wali Kelas</p>
              {isSuperAdmin ? (
                <select data-testid={`homeroom-select-${c.id}`} value={c.homeroom_teacher_id || ""}
                  onChange={e=>assignHomeroom(c.id, e.target.value)}
                  className="mt-0.5 w-full px-2 py-1 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg bg-white focus:border-sky-500 outline-none cursor-pointer">
                  <option value="">— Belum ada wali —</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <p data-testid={`homeroom-name-${c.id}`} className="mt-0.5 text-sm font-semibold text-slate-800 truncate">{c.homeroom_teacher_name || "—"}</p>
              )}
              </div>
            </div>
            <Link to={`/classes/${c.id}`} data-testid={`open-class-${c.id}`}
              className="mt-auto pt-0 w-full">
              <span className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 group-hover:bg-sky-600 transition-colors">
                Buka Kelas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
              </span>
            </Link>
            </div>
          </div>
        ))}
      </div>

      {editing && <ClassModal klass={editing} teachers={teachers} classes={classes} onClose={()=>setEditing(null)} onDone={()=>{load(); setEditing(null);}}/>}
      {showSubjects && <SubjectsModal onClose={()=>setShowSubjects(false)}/>}
    </div>
  );
}

function ClassModal({ klass, teachers, classes = [], onClose, onDone }) {
  const isEdit = !!klass.id;
  const [name, setName] = useState(klass.name || "");
  const [description, setDescription] = useState(klass.description || "");
  const [subjects, setSubjects] = useState(klass.subjects || []);
  const [homeroom, setHomeroom] = useState(klass.homeroom_teacher_id || "");
  const [password, setPassword] = useState("");
  const [removePw, setRemovePw] = useState(false);
  const [copyBphFrom, setCopyBphFrom] = useState("");
  const [allSubjects, setAllSubjects] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/subjects").then(r=>setAllSubjects(r.data)).catch(()=>{}); }, []);
  const toggleSubject = (n) => setSubjects(s => s.includes(n) ? s.filter(x=>x!==n) : [...s, n]);
  const save = async () => {
    if (!name.trim()) return toast.error("Nama kelas wajib diisi");
    setBusy(true);
    try {
      const body = { name: name.trim(), description, subjects, homeroom_teacher_id: homeroom || null };
      if (removePw) body.remove_password = true;
      else if (password.trim()) body.password = password.trim();
      if (!isEdit && copyBphFrom) body.copy_bph_from = copyBphFrom;
      if (isEdit) await api.patch(`/classes/${klass.id}`, body);
      else await api.post("/classes", body);
      toast.success(isEdit ? "Kelas diperbarui" : "Kelas dibuat");
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">{isEdit ? "Edit Kelas" : "Buat Kelas Baru"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama Kelas *</label>
            <input data-testid="class-name-input" value={name} onChange={e=>setName(e.target.value)} placeholder="X.1"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            <p className="mt-1 text-[10px] text-slate-400">Siswa dengan kelas yang sama persis otomatis menjadi anggota kelas ini.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Deskripsi (opsional)</label>
            <textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Lock className="w-3 h-3"/>Password Kelas</label>
            <input data-testid="class-password-field" type="text" value={password} disabled={removePw} onChange={e=>setPassword(e.target.value)}
              placeholder={klass.has_password ? "Kosongkan jika tidak ingin mengubah" : "Buat password kelas (opsional)"}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none disabled:bg-slate-50"/>
            {klass.has_password && (
              <button type="button" data-testid="class-remove-password-button" onClick={()=>{setRemovePw(v=>!v); setPassword("");}}
                className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${removePw ? "bg-rose-600 border-rose-600 text-white" : "border-rose-200 text-rose-600 hover:bg-rose-50"}`}>
                <Trash2 className="w-3.5 h-3.5"/>{removePw ? "Password akan dihapus saat disimpan (klik untuk batal)" : "Hapus Password Kelas"}
              </button>
            )}
            <p className="mt-1 text-[10px] text-slate-400">{klass.has_password ? "Kelas ini sudah berpassword. Mengubah password akan meminta semua anggota memasukkan password baru." : "Anggota kelas cukup memasukkan password ini sekali saat pertama masuk kelas."}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Wali Kelas (opsional)</label>
            <select value={homeroom} onChange={e=>setHomeroom(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
              <option value="">-- Pilih guru --</option>
              {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {!isEdit && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Network className="w-3 h-3"/>Salin Struktur BPH (opsional)</label>
              <select data-testid="copy-bph-select" value={copyBphFrom} onChange={e=>setCopyBphFrom(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none bg-white">
                <option value="">-- Jangan salin (mulai kosong) --</option>
                {classes.filter(c=>c.id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">Bagan BPH dari kelas yang dipilih akan disalin ke kelas baru ini. Anda tetap bisa mengubahnya nanti.</p>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mata Pelajaran di Kelas Ini</label>
            {allSubjects.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-amber-600">Belum ada mapel. Tutup dialog ini lalu buka menu Kelola Mapel untuk menambah daftar mapel dulu.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-2" data-testid="class-subjects-picker">
                {allSubjects.map(s=>(
                  <button type="button" key={s.id} data-testid={`class-subject-${s.name}`} onClick={()=>toggleSubject(s.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${subjects.includes(s.name) ? "bg-sky-600 border-sky-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-sky-400"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-slate-400">Guru yang mengampu mapel ini otomatis dapat mengakses kelas ini.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-class-button" disabled={busy} onClick={save} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Menyimpan..." : "Simpan Kelas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectsModal({ onClose }) {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/subjects").then(r=>setSubjects(r.data)).catch(()=>{});
  useEffect(() => { load(); }, []);
  const add = async () => {
    const v = name.trim();
    if (!v) return;
    setBusy(true);
    try { await api.post("/subjects", { name: v }); setName(""); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menambah mapel"); }
    finally { setBusy(false); }
  };
  const del = async (id) => {
    try { await api.delete(`/subjects/${id}`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-sky-600"/>Kelola Mata Pelajaran</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input data-testid="new-subject-input" value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}} placeholder="mis. Matematika"
              className="flex-1 px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            <button data-testid="add-subject-button" type="button" disabled={busy} onClick={add} className="px-4 bg-sky-600 text-white rounded-xl font-semibold disabled:opacity-60">Tambah</button>
          </div>
          <div className="space-y-2">
            {subjects.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Belum ada mapel. Tambahkan di atas.</p>}
            {subjects.map(s=>(
              <div key={s.id} data-testid={`subject-row-${s.name}`} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl">
                <span className="font-semibold text-sm text-slate-700">{s.name}</span>
                <button data-testid={`delete-subject-${s.name}`} onClick={()=>del(s.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

