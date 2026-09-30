import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { School, Plus, X, Users, BookOpen, Pencil, Trash2, ArrowRight, UserCog } from "lucide-react";

export default function Classes() {
  const { user } = useAuth();
  const isAdmin = ["super_admin", "guru"].includes(user.role);
  const isSuperAdmin = user.role === "super_admin";
  const canManageClass = (c) => user.role === "super_admin" ||
    (user.role === "guru" && (c.created_by === user.id || c.homeroom_teacher_id === user.id));
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
  const load = () => api.get("/classes").then(r => setClasses(r.data));
  useEffect(() => {
    load();
    if (isAdmin) api.get("/users?role=guru").then(r => setTeachers(r.data)).catch(()=>{});
  }, [isAdmin]);

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
        {isAdmin && (
          <button data-testid="create-class-button" onClick={()=>setEditing({})}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4"/>Buat Kelas Baru
          </button>
        )}
      </div>

      {classes.length === 0 && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <School className="w-10 h-10 text-slate-300 mx-auto"/>
          <p className="mt-3 text-slate-500 font-medium">Belum ada kelas.</p>
          {isAdmin && <p className="text-sm text-slate-400">Klik "Buat Kelas Baru" untuk memulai.</p>}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map(c => (
          <div key={c.id} data-testid={`class-card-${c.id}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                <School className="w-5 h-5"/>
              </div>
              {canManageClass(c) && (
                <div className="flex gap-1">
                  <button data-testid={`edit-class-${c.id}`} onClick={()=>setEditing(c)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                  <button data-testid={`delete-class-${c.id}`} onClick={async()=>{if(confirm(`Hapus kelas ${c.name}?`)){try{await api.delete(`/classes/${c.id}`); toast.success("Kelas dihapus"); load();}catch(e){toast.error(e.response?.data?.detail||"Gagal menghapus");}}}} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              )}
            </div>
            <h3 className="font-heading font-extrabold text-lg text-slate-900 mt-3">{c.name}</h3>
            {c.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(c.subjects||[]).slice(0,4).map((s,i)=>(
                <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{s}</span>
              ))}
              {(c.subjects||[]).length>4 && <span className="px-2 py-0.5 text-[11px] text-slate-400">+{c.subjects.length-4}</span>}
              {(c.subjects||[]).length===0 && <span className="text-[11px] text-slate-400">Belum ada mapel</span>}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/>{c.student_count ?? 0} siswa</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5"/>{(c.subjects||[]).length} mapel</span>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1"><UserCog className="w-3 h-3"/>Wali Kelas</p>
              {isSuperAdmin ? (
                <select data-testid={`homeroom-select-${c.id}`} value={c.homeroom_teacher_id || ""}
                  onChange={e=>assignHomeroom(c.id, e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 text-sm border-2 border-slate-200 rounded-lg bg-white focus:border-sky-500 outline-none">
                  <option value="">— Belum ada wali —</option>
                  {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <p data-testid={`homeroom-name-${c.id}`} className="mt-0.5 text-sm font-semibold text-slate-800">{c.homeroom_teacher_name || "—"}</p>
              )}
            </div>
            <Link to={`/classes/${c.id}`} data-testid={`open-class-${c.id}`}
              className="mt-4 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 group-hover:bg-sky-600 transition-colors">
              Buka Kelas <ArrowRight className="w-4 h-4"/>
            </Link>
          </div>
        ))}
      </div>

      {editing && <ClassModal klass={editing} teachers={teachers} onClose={()=>setEditing(null)} onDone={()=>{load(); setEditing(null);}}/>}
    </div>
  );
}

function ClassModal({ klass, teachers, onClose, onDone }) {
  const isEdit = !!klass.id;
  const [name, setName] = useState(klass.name || "");
  const [description, setDescription] = useState(klass.description || "");
  const [subjects, setSubjects] = useState(klass.subjects || []);
  const [homeroom, setHomeroom] = useState(klass.homeroom_teacher_id || "");
  const [subjInput, setSubjInput] = useState("");
  const [busy, setBusy] = useState(false);

  const addSubject = () => {
    const v = subjInput.trim();
    if (v && !subjects.includes(v)) setSubjects([...subjects, v]);
    setSubjInput("");
  };
  const save = async () => {
    if (!name.trim()) return toast.error("Nama kelas wajib diisi");
    setBusy(true);
    try {
      const body = { name: name.trim(), description, subjects, homeroom_teacher_id: homeroom || null };
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
            <input data-testid="class-name-input" value={name} onChange={e=>setName(e.target.value)} placeholder="XI IPA 1"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            <p className="mt-1 text-[10px] text-slate-400">Harus sama persis dengan isian "Kelas" di akun siswa agar tugas & quiz terhubung.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Deskripsi (opsional)</label>
            <textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Wali Kelas (opsional)</label>
            <select value={homeroom} onChange={e=>setHomeroom(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
              <option value="">-- Pilih guru --</option>
              {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mata Pelajaran</label>
            <div className="mt-1 flex gap-2">
              <input data-testid="subject-input" value={subjInput} onChange={e=>setSubjInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSubject();}}} placeholder="mis. Matematika"
                className="flex-1 px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
              <button data-testid="add-subject-button" type="button" onClick={addSubject} className="px-4 bg-sky-600 text-white rounded-xl font-semibold">Tambah</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {subjects.map((s,i)=>(
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700 flex items-center gap-1">
                  {s}<button onClick={()=>setSubjects(subjects.filter((_,idx)=>idx!==i))}><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
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
