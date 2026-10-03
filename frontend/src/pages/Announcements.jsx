import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Megaphone, Plus, X, Pencil, Trash2, Pin, ImagePlus, Calendar } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { v: "Umum",     l: "Umum",     cls: "bg-slate-100 text-slate-700" },
  { v: "Penting",  l: "Penting",  cls: "bg-rose-100 text-rose-700" },
  { v: "Acara",    l: "Acara",    cls: "bg-amber-100 text-amber-700" },
  { v: "Prestasi", l: "Prestasi", cls: "bg-emerald-100 text-emerald-700" },
  { v: "Akademik", l: "Akademik", cls: "bg-sky-100 text-sky-700" },
];
const catCls = (c) => CATEGORIES.find(x => x.v === c)?.cls || "bg-slate-100 text-slate-700";
const SCOPES = [{ v: "sekolah", l: "Sekolah" }, { v: "osis", l: "OSIS" }, { v: "kelas", l: "Kelas" }];

const EMPTY = { title: "", content: "", scope: "sekolah", category: "Umum", image: "", pinned: false, show_on_login: false };

export default function Announcements() {
  const { user } = useAuth();
  const canPost = user.role !== "siswa" && user.role !== "orang_tua";
  const isAdmin = user.role === "super_admin";
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null); // null | EMPTY(new) | announcement(edit)

  const load = () => api.get("/announcements").then(r => setList(r.data));
  useEffect(() => { load(); }, []);

  const canManage = (a) => isAdmin || a.author_id === user.id;

  const remove = async (a) => {
    if (!confirm(`Hapus pengumuman "${a.title}"?`)) return;
    try { await api.delete(`/announcements/${a.id}`); toast.success("Pengumuman dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-6" data-testid="announcements-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-sky-600"/>Papan Pengumuman
          </h1>
          <p className="mt-1 text-sm text-slate-500">Informasi terbaru dari sekolah, OSIS, dan kelas</p>
        </div>
        {canPost && (
          <button data-testid="create-announcement-button" onClick={()=>setEditing({...EMPTY})}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4"/>Buat Pengumuman
          </button>
        )}
      </div>

      {list.length === 0 && (
        <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500">Belum ada pengumuman.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {list.map(a => (
          <article key={a.id} data-testid={`announcement-${a.id}`}
            className={`bg-white rounded-2xl shadow-sm overflow-hidden border transition-all hover:shadow-md ${a.pinned ? "border-sky-300 ring-1 ring-sky-200" : "border-slate-200"}`}>
            {a.image && (
              <div className="h-44 w-full overflow-hidden bg-slate-100">
                <img src={a.image} alt={a.title} className="w-full h-full object-cover"/>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full ${catCls(a.category)}`}>{a.category || "Umum"}</span>
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-500">{a.scope}</span>
                {a.pinned && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-sky-600 text-white"><Pin className="w-3 h-3"/>Disematkan</span>}
                {a.show_on_login && <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-500 text-white"><Megaphone className="w-3 h-3"/>Banner Login</span>}
              </div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-bold text-lg text-slate-900 leading-snug">{a.title}</h3>
                {canManage(a) && (
                  <div className="flex gap-1 shrink-0">
                    <button data-testid={`edit-announcement-${a.id}`} onClick={()=>setEditing(a)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                    <button data-testid={`delete-announcement-${a.id}`} onClick={()=>remove(a)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3"/>{new Date(a.created_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})} · Oleh {a.author} ({a.role})
              </p>
              <p className="mt-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed">{a.content}</p>
            </div>
          </article>
        ))}
      </div>

      {editing && <AnnouncementModal isAdmin={isAdmin} canLoginBanner={["super_admin","kepsek","staff_tu"].includes(user.role)} initial={editing} onClose={()=>setEditing(null)} onDone={()=>{load(); setEditing(null);}}/>}
    </div>
  );
}

function AnnouncementModal({ isAdmin, canLoginBanner, initial, onClose, onDone }) {
  const isEdit = !!initial.id;
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const upd = (k, v) => setF({ ...f, [k]: v });

  const uploadImg = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await api.post("/upload", fd);
      upd("image", `${BACKEND}${r.data.url}`);
      toast.success("Gambar terunggah");
    } catch { toast.error("Gagal upload gambar"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!f.title.trim() || !f.content.trim()) return toast.error("Judul & isi wajib diisi");
    setBusy(true);
    try {
      const body = { title: f.title, content: f.content, scope: f.scope, category: f.category, image: f.image || "", pinned: !!f.pinned, show_on_login: !!f.show_on_login };
      if (isEdit) await api.patch(`/announcements/${initial.id}`, body);
      else await api.post("/announcements", body);
      toast.success(isEdit ? "Pengumuman diperbarui" : "Pengumuman dipublikasi");
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">{isEdit ? "Edit Pengumuman" : "Buat Pengumuman"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Judul *</label>
            <input data-testid="announcement-title-input" value={f.title} onChange={e=>upd("title", e.target.value)} placeholder="Judul pengumuman"
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Isi / Deskripsi *</label>
            <textarea data-testid="announcement-content-input" rows={5} value={f.content} onChange={e=>upd("content", e.target.value)} placeholder="Tulis isi pengumuman yang menarik..."
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategori</label>
              <select data-testid="announcement-category-select" value={f.category} onChange={e=>upd("category", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                {CATEGORIES.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lingkup</label>
              <select value={f.scope} onChange={e=>upd("scope", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                {SCOPES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5"/>Gambar (opsional)</label>
            <input data-testid="announcement-image-input" type="file" accept="image/*" onChange={uploadImg} className="mt-1 w-full text-sm"/>
            {uploading && <p className="text-xs text-sky-600 mt-1">Mengunggah...</p>}
            {f.image && (
              <div className="mt-2 relative">
                <img src={f.image} alt="" className="w-full h-40 object-cover rounded-xl border border-slate-200"/>
                <button onClick={()=>upd("image","")} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-rose-600 shadow"><Trash2 className="w-4 h-4"/></button>
              </div>
            )}
          </div>
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input data-testid="announcement-pinned-checkbox" type="checkbox" checked={!!f.pinned} onChange={e=>upd("pinned", e.target.checked)} className="w-4 h-4 accent-sky-600"/>
              <Pin className="w-4 h-4 text-sky-600"/>Sematkan di paling atas
            </label>
          )}
          {canLoginBanner && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input data-testid="announcement-login-banner-checkbox" type="checkbox" checked={!!f.show_on_login} onChange={e=>upd("show_on_login", e.target.checked)} className="w-4 h-4 accent-amber-500"/>
              <Megaphone className="w-4 h-4 text-amber-500"/>Tampilkan sebagai banner di halaman login
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-announcement-button" disabled={busy||uploading} onClick={save}
              className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Menyimpan..." : (isEdit ? "Simpan Perubahan" : "Publikasi")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
