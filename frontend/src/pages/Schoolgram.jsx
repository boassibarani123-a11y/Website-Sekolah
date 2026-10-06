import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Camera, Plus, X, Heart, MessageCircle, Trash2, Pencil, Star, ChevronLeft, Image as ImageIcon, Users } from "lucide-react";

async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const up = await api.post("/upload", fd);
  return `${process.env.REACT_APP_BACKEND_URL}${up.data.url}`;
}

export default function Schoolgram() {
  const [classes, setClasses] = useState([]);
  const [active, setActive] = useState(null); // class id
  const loadList = () => api.get("/schoolgram/classes").then((r) => setClasses(r.data)).catch(() => {});
  useEffect(() => { loadList(); }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="schoolgram-page">
      {!active ? (
        <>
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-3"><Camera className="w-8 h-8 text-sky-600" /> Schoolgram</h1>
            <p className="mt-1 text-sm text-slate-500">Profil sosial tiap kelas — story, sorotan, dan postingan. Dikelola oleh Ketua Kelas.</p>
          </div>
          {classes.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl text-center border border-slate-200">
              <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Belum ada kelas. Buat kelas dulu di menu Kelas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {classes.map((c) => (
                <button key={c.id} data-testid={`sg-class-card-${c.id}`} onClick={() => setActive(c.id)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left group">
                  <div className="h-28 bg-gradient-to-br from-sky-500 to-indigo-700 relative">
                    {c.cover && <img src={c.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  </div>
                  <div className="p-3 relative">
                    <div className={`absolute -top-7 left-3 w-12 h-12 rounded-full flex items-center justify-center font-heading font-extrabold text-white shadow-md ${c.has_story ? "ring-4 ring-rose-400" : ""}`} style={{ background: "var(--brand)" }}>
                      {c.name?.[0]}
                    </div>
                    <p className="font-heading font-bold text-slate-900 mt-5 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{c.post_count} post</span>·<span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{c.student_count}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <ClassProfile cid={active} onBack={() => { setActive(null); loadList(); }} />
      )}
    </div>
  );
}

function ClassProfile({ cid, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // 'post' | 'story'
  const [viewStory, setViewStory] = useState(null); // {list, idx}
  const [viewPost, setViewPost] = useState(null);
  const load = () => api.get(`/schoolgram/class/${cid}`).then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, [cid]); // eslint-disable-line

  if (!data) return <p className="text-slate-400 text-sm">Memuat...</p>;
  const canManage = data.can_manage;
  const storyRings = [...data.highlights, ...data.stories];

  return (
    <div className="space-y-6">
      <button data-testid="sg-back" onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="w-4 h-4" /> Semua Kelas</button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center font-heading font-extrabold text-white text-3xl shadow-lg shrink-0" style={{ background: "var(--brand)" }}>{data.class.name?.[0]}</div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-extrabold text-slate-900">{data.class.name}</h1>
            <div className="flex gap-5 mt-2 text-sm">
              <span><b className="text-slate-900">{data.posts.length}</b> <span className="text-slate-500">post</span></span>
              <span><b className="text-slate-900">{data.student_count}</b> <span className="text-slate-500">siswa</span></span>
              <span><b className="text-slate-900">{data.highlights.length}</b> <span className="text-slate-500">sorotan</span></span>
            </div>
            {data.class.description && <p className="text-sm text-slate-600 mt-1">{data.class.description}</p>}
          </div>
          {canManage && (
            <div className="flex flex-col gap-2">
              <button data-testid="sg-new-post" onClick={() => setModal("post")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700"><Plus className="w-4 h-4" /> Post</button>
              <button data-testid="sg-new-story" onClick={() => setModal("story")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600"><Plus className="w-4 h-4" /> Story</button>
            </div>
          )}
        </div>

        {/* Stories + highlights row */}
        {storyRings.length > 0 && (
          <div className="flex gap-4 mt-6 overflow-x-auto no-scrollbar pb-1">
            {storyRings.map((s, i) => (
              <button key={s.id} data-testid={`sg-story-ring-${s.id}`} onClick={() => setViewStory({ list: storyRings, idx: i })} className="flex flex-col items-center gap-1 shrink-0 w-16">
                <div className={`w-16 h-16 rounded-full p-0.5 ${s.highlighted ? "bg-amber-400" : "bg-gradient-to-br from-rose-500 to-amber-500"}`}>
                  <img src={s.image} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" />
                </div>
                <span className="text-[10px] text-slate-500 truncate w-full text-center">{s.highlighted ? (s.highlight_title || "Sorotan") : "Story"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Posts grid */}
      {data.posts.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-slate-200">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Belum ada postingan. {canManage && "Jadi yang pertama!"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {data.posts.map((p) => (
            <button key={p.id} data-testid={`sg-post-${p.id}`} onClick={() => setViewPost(p)} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group">
              <img src={p.image} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-4 text-white opacity-0 group-hover:opacity-100">
                <span className="flex items-center gap-1 text-sm font-bold"><Heart className="w-4 h-4 fill-white" />{p.like_count}</span>
                <span className="flex items-center gap-1 text-sm font-bold"><MessageCircle className="w-4 h-4 fill-white" />{(p.comments || []).length}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {modal === "post" && <UploadModal title="Post Baru" onClose={() => setModal(null)} onSubmit={async (img, cap) => { await api.post(`/schoolgram/class/${cid}/post`, { image: img, caption: cap }); toast.success("Post dibuat"); setModal(null); load(); }} />}
      {modal === "story" && <UploadModal title="Story Baru (24 jam)" onClose={() => setModal(null)} onSubmit={async (img, cap) => { await api.post(`/schoolgram/class/${cid}/story`, { image: img, caption: cap }); toast.success("Story ditambahkan"); setModal(null); load(); }} />}
      {viewStory && <StoryViewer state={viewStory} canManage={canManage} onClose={() => setViewStory(null)} onChanged={() => { setViewStory(null); load(); }} />}
      {viewPost && <PostModal post={viewPost} canManage={canManage} onClose={() => setViewPost(null)} onChanged={() => { setViewPost(null); load(); }} />}
    </div>
  );
}

function UploadModal({ title, onClose, onSubmit }) {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const onFile = (e) => { const f = e.target.files?.[0]; if (!f) return; setFile(f); const r = new FileReader(); r.onload = () => setPreview(r.result); r.readAsDataURL(f); };
  const submit = async () => {
    if (!file) { toast.error("Pilih gambar dulu"); return; }
    setBusy(true);
    try { const url = await uploadImage(file); await onSubmit(url, caption); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal mengunggah"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200"><h3 className="font-heading text-xl font-bold">{title}</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-4">
          <input type="file" accept="image/*" data-testid="sg-upload-file" onChange={onFile} className="text-sm" />
          {preview && <img src={preview} alt="" className="w-full aspect-square object-cover rounded-xl bg-slate-100" />}
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="Caption (opsional)..." className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          <button data-testid="sg-upload-submit" disabled={busy} onClick={submit} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">{busy ? "Mengunggah..." : "Bagikan"}</button>
        </div>
      </div>
    </div>
  );
}

function StoryViewer({ state, canManage, onClose, onChanged }) {
  const [idx, setIdx] = useState(state.idx);
  const s = state.list[idx];
  const next = () => setIdx((i) => Math.min(i + 1, state.list.length - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));
  const toggleHighlight = async () => {
    try { await api.post(`/schoolgram/story/${s.id}/highlight`, { highlighted: !s.highlighted, title: "Sorotan" }); toast.success(s.highlighted ? "Dihapus dari sorotan" : "Disimpan ke sorotan"); onChanged(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
  };
  const del = async () => { if (!window.confirm("Hapus story ini?")) return; try { await api.delete(`/schoolgram/story/${s.id}`); toast.success("Story dihapus"); onChanged(); } catch (e) { toast.error("Gagal menghapus"); } };
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" data-testid="sg-story-viewer" onClick={onClose}>
      <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white"><X className="w-6 h-6" /></button>
        <img src={s.image} alt="" className="w-full rounded-2xl object-contain max-h-[75vh] bg-black" />
        {s.caption && <p className="text-white text-sm mt-3 text-center">{s.caption}</p>}
        <div className="flex items-center justify-between mt-3">
          <button onClick={prev} disabled={idx === 0} className="text-white/70 disabled:opacity-30 text-sm">← Sebelumnya</button>
          {canManage && (
            <div className="flex gap-2">
              <button data-testid="sg-highlight-toggle" onClick={toggleHighlight} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${s.highlighted ? "bg-amber-400 text-slate-900" : "bg-white/20 text-white"}`}><Star className="w-4 h-4" />{s.highlighted ? "Sorotan" : "Simpan"}</button>
              <button data-testid="sg-story-delete" onClick={del} className="p-2 rounded-lg bg-rose-500/80 text-white"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
          <button onClick={next} disabled={idx === state.list.length - 1} className="text-white/70 disabled:opacity-30 text-sm">Berikutnya →</button>
        </div>
      </div>
    </div>
  );
}

function PostModal({ post, canManage, onClose, onChanged }) {
  const { user } = useAuth();
  const [p, setP] = useState(post);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const like = async () => { const r = await api.post(`/posts/${p.id}/like`); setP({ ...p, like_count: r.data.like_count, liked: r.data.liked }); };
  const submitComment = async () => { if (!commentText.trim()) return; const r = await api.post(`/posts/${p.id}/comment`, { text: commentText }); setP({ ...p, comments: [...(p.comments || []), r.data] }); setCommentText(""); };
  const saveEdit = async () => { try { await api.patch(`/schoolgram/post/${p.id}`, { caption }); setP({ ...p, caption }); setEditing(false); toast.success("Caption diperbarui"); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); } };
  const del = async () => { if (!window.confirm("Hapus postingan ini?")) return; try { await api.delete(`/schoolgram/post/${p.id}`); toast.success("Post dihapus"); onChanged(); } catch (e) { toast.error("Gagal menghapus"); } };
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" data-testid="sg-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "var(--brand)" }}>{p.author_name?.[0]}</div><div><p className="font-semibold text-sm">{p.author_name}</p><p className="text-[10px] text-slate-500">{p.kelas}</p></div></div>
          <div className="flex items-center gap-1">
            {canManage && <button data-testid="sg-post-edit" onClick={() => setEditing((e) => !e)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="w-4 h-4" /></button>}
            {canManage && <button data-testid="sg-post-delete" onClick={del} className="p-2 rounded-lg hover:bg-rose-100 text-rose-500"><Trash2 className="w-4 h-4" /></button>}
            <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <img src={p.image} alt="" className="w-full aspect-square object-cover bg-slate-100" />
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <button data-testid="sg-like" onClick={like} className="flex items-center gap-1.5"><Heart className={`w-6 h-6 ${p.liked ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} /><span className="text-sm font-semibold">{p.like_count}</span></button>
            <span className="flex items-center gap-1.5 text-slate-700"><MessageCircle className="w-6 h-6" /><span className="text-sm font-semibold">{(p.comments || []).length}</span></span>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <input value={caption} onChange={(e) => setCaption(e.target.value)} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm" />
              <button data-testid="sg-post-save" onClick={saveEdit} className="px-3 py-2 bg-sky-600 text-white text-sm rounded-lg font-semibold">Simpan</button>
            </div>
          ) : (
            p.caption && <p className="text-sm text-slate-800"><b>{p.author_name}</b> {p.caption}</p>
          )}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            {(p.comments || []).map((c) => (<div key={c.id} className="text-sm"><b className="text-slate-900">{c.user_name}</b> <span className="text-slate-700">{c.text}</span></div>))}
            <div className="flex gap-2">
              <input data-testid="sg-comment-input" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Tulis komentar..." className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none" />
              <button data-testid="sg-comment-send" onClick={submitComment} className="px-3 py-2 bg-sky-600 text-white text-sm rounded-lg font-semibold">Kirim</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
