import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Heart, MessageCircle, Plus, X, ImageIcon } from "lucide-react";

export default function Schoolgram() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [commentFor, setCommentFor] = useState(null);
  const [commentText, setCommentText] = useState("");
  const load = () => api.get("/posts").then(r=>setPosts(r.data));
  useEffect(() => { load(); }, []);

  const canPost = ["ketua_kelas","ketua_osis","super_admin","guru"].includes(user.role);

  const like = async (pid) => { await api.post(`/posts/${pid}/like`); load(); };
  const submitComment = async () => {
    if (!commentText.trim()) return;
    await api.post(`/posts/${commentFor}/comment`, { text: commentText });
    setCommentText(""); load();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="schoolgram-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">📸 Schoolgram</h1>
          <p className="mt-1 text-sm text-slate-500">Jejaring sosial internal sekolah</p>
        </div>
        {canPost && (
          <button data-testid="schoolgram-create-post-button" onClick={()=>setShowNew(true)}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 flex items-center gap-2 shadow-lg">
            <Plus className="w-4 h-4"/>Post Baru
          </button>
        )}
      </div>

      {posts.length===0 && <div className="bg-white p-8 rounded-2xl text-center border border-slate-200">
        <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
        <p className="text-slate-500">Belum ada postingan. {canPost && "Jadi yang pertama!"}</p>
      </div>}

      {posts.map(p => (
        <div key={p.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center font-bold">{p.author_name?.[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{p.author_name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{p.kelas || p.author_role}</p>
            </div>
            <p className="text-[11px] text-slate-400">{new Date(p.created_at).toLocaleDateString("id-ID")}</p>
          </div>
          <img src={p.image} alt="" className="w-full aspect-square object-cover bg-slate-100"/>
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-4">
              <button data-testid="schoolgram-like-button" onClick={()=>like(p.id)} className="flex items-center gap-1.5 group">
                <Heart className={`w-6 h-6 transition-all ${p.liked?"fill-rose-500 text-rose-500 scale-110":"text-slate-700 group-hover:text-rose-500"}`}/>
                <span className="text-sm font-semibold">{p.like_count}</span>
              </button>
              <button onClick={()=>setCommentFor(p.id===commentFor?null:p.id)} className="flex items-center gap-1.5 text-slate-700 hover:text-sky-600">
                <MessageCircle className="w-6 h-6"/><span className="text-sm font-semibold">{(p.comments||[]).length}</span>
              </button>
            </div>
            <p className="text-sm text-slate-800"><b>{p.author_name}</b> {p.caption}</p>
            {commentFor===p.id && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                {(p.comments||[]).map(c=>(
                  <div key={c.id} className="text-sm"><b className="text-slate-900">{c.user_name}</b> <span className="text-slate-700">{c.text}</span></div>
                ))}
                <div className="flex gap-2">
                  <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Tulis komentar..."
                    className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
                  <button onClick={submitComment} className="px-3 py-2 bg-sky-600 text-white text-sm rounded-lg font-semibold">Kirim</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {showNew && <NewPostModal onClose={()=>setShowNew(false)} onDone={()=>{load(); setShowNew(false);}}/>}
    </div>
  );
}

function NewPostModal({onClose, onDone}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const onFile = e => {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f);
    const r = new FileReader(); r.onload = () => setPreview(r.result); r.readAsDataURL(f);
  };
  const submit = async () => {
    if (!file) { toast.error("Pilih gambar dulu"); return; }
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await api.post("/upload", fd);
      const url = `${process.env.REACT_APP_BACKEND_URL}${up.data.url}`;
      await api.post("/posts", { image: url, caption });
      toast.success("Post berhasil!"); onDone();
    } catch(e) { toast.error(e.response?.data?.detail || "Gagal posting"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">Post Baru</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <input type="file" accept="image/*" onChange={onFile} className="text-sm"/>
          {preview && <img src={preview} alt="" className="w-full aspect-square object-cover rounded-xl bg-slate-100"/>}
          <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={3} placeholder="Tulis caption..."
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          <button disabled={busy} onClick={submit} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
            {busy?"Uploading...":"Posting"}
          </button>
        </div>
      </div>
    </div>
  );
}
