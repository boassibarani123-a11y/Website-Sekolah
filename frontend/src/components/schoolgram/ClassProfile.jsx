import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { ChevronLeft, Pencil, Plus, Grid3x3, Clapperboard, Tag, Heart, MessageCircle, Play, Image as ImageIcon, ImagePlus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, seenStories, uploadMedia } from "./shared";
import { PostCard } from "./PostCard";
import { StoryViewer } from "./StoryViewer";
import { EditProfileModal, UploadModal } from "./Modals";

const TABS = [{ k: "post", label: "Post", icon: Grid3x3 }, { k: "reels", label: "Reels", icon: Clapperboard }, { k: "tag", label: "Ditandai", icon: Tag }];

function Stat({ value, label, testid }) {
  return <div className="text-center" data-testid={testid}><p className="font-heading text-xl font-extrabold text-slate-900 tabular-nums">{value}</p><p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p></div>;
}

function Grid({ posts, onOpen, reels }) {
  if (!posts.length) return <div className="bg-white p-12 rounded-3xl text-center border border-slate-200"><ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Belum ada postingan.</p></div>;
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {posts.map(p => (
        <button key={p.id} data-testid={`sg-post-${p.id}`} onClick={() => onOpen(p)} className={`relative ${reels ? "aspect-[9/16]" : "aspect-square"} bg-slate-100 sm:rounded-xl overflow-hidden group animate-in fade-in zoom-in-95 duration-300`}>
          {p.media_type === "video" ? <><video src={p.image} muted className="w-full h-full object-cover" /><Play className="w-5 h-5 text-white absolute top-2 right-2 fill-white drop-shadow" /></> : <img src={p.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 text-white opacity-0 group-hover:opacity-100">
            <span className="flex items-center gap-1 text-sm font-bold"><Heart className="w-4 h-4 fill-white" />{p.like_count}</span>
            <span className="flex items-center gap-1 text-sm font-bold"><MessageCircle className="w-4 h-4 fill-white" />{p.comment_count ?? (p.comments || []).length}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function ClassProfile({ cid, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("post");
  const [modal, setModal] = useState(null);
  const [viewStory, setViewStory] = useState(null);
  const [viewPost, setViewPost] = useState(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const load = () => api.get(`/schoolgram/class/${cid}`).then(r => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, [cid]); // eslint-disable-line
  if (!data) return <div className="max-w-3xl mx-auto px-4 sm:px-0"><div className="h-48 rounded-3xl bg-slate-200 animate-pulse" /></div>;
  const c = data.class, canManage = data.can_manage;
  const seen = seenStories();
  const unseen = data.stories.some(s => !seen.has(s.id));
  const list = tab === "post" ? data.posts.filter(p => p.media_type !== "video") : tab === "reels" ? data.posts.filter(p => p.media_type === "video") : (data.tagged || []);
  const changeCover = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCoverBusy(true);
    try { const m = await uploadMedia(f); await api.patch(`/schoolgram/class/${cid}/profile`, { cover: m.url }); toast.success("Sampul diganti"); load(); }
    catch { toast.error("Gagal mengganti sampul"); } finally { setCoverBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0 space-y-5" data-testid="sg-class-profile">
      <button data-testid="sg-back" onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="w-4 h-4" /> Semua Kelas</button>
      <section className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="h-36 sm:h-48 relative bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600" data-testid="sg-cover">
          {c.cover && <img src={c.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {canManage && (
            <label className="absolute right-3 top-3 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer backdrop-blur transition-colors">
              <ImagePlus className="w-3.5 h-3.5" />{coverBusy ? "Mengunggah…" : "Ganti Sampul"}
              <input data-testid="sg-cover-input" type="file" accept="image/*" onChange={changeCover} className="hidden" />
            </label>
          )}
        </div>
        <div className="px-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16 relative z-10">
            <Avatar testid="sg-profile-avatar" name={c.name} src={c.avatar} size="w-28 h-28 sm:w-32 sm:h-32" text="text-4xl" ring={data.stories.length ? (unseen ? "story" : "seen") : "highlight"}
              onClick={data.stories.length ? () => setViewStory({ list: data.stories, idx: 0, avatar: c.avatar, title: c.name }) : undefined} />
            <div className="flex-1 flex flex-wrap items-center justify-between gap-3 sm:pb-2">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900" data-testid="sg-profile-name">{c.name}</h1>
                <p className="text-xs text-slate-500">Akun kelas · {data.student_count} siswa</p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <button data-testid="sg-edit-profile" onClick={() => setModal("profile")} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold flex items-center gap-1 transition-colors"><Pencil className="w-4 h-4" />Edit</button>
                  <button data-testid="sg-new-post" onClick={() => setModal("post")} className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-1 transition-colors"><Plus className="w-4 h-4" />Post</button>
                  <button data-testid="sg-new-story" onClick={() => setModal("story")} className="px-3 py-2 rounded-xl sg-ring text-white text-sm font-semibold flex items-center gap-1 hover:brightness-110"><Plus className="w-4 h-4" />Story</button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-5 py-3 border-y border-slate-100">
            <Stat value={data.posts.length} label="Post" testid="sg-stat-posts" />
            <Stat value={data.student_count} label="Siswa" testid="sg-stat-students" />
            <Stat value={data.like_total ?? 0} label="Suka" testid="sg-stat-likes" />
            <Stat value={data.highlights.length} label="Sorotan" testid="sg-stat-highlights" />
          </div>
          <p className="text-sm text-slate-700 mt-3 whitespace-pre-line" data-testid="sg-profile-bio">{c.description || <span className="text-slate-400 italic">{canManage ? "Belum ada bio — klik Edit untuk menambahkan." : "Belum ada bio."}</span>}</p>
          {(data.highlights.length > 0 || data.stories.length > 0) && (
            <div className="flex gap-4 mt-4 overflow-x-auto no-scrollbar pb-1">
              {data.stories.length > 0 && (
                <div className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <Avatar src={data.stories[0].image} size="w-16 h-16" ring={unseen ? "story" : "seen"} onClick={() => setViewStory({ list: data.stories, idx: 0, avatar: c.avatar })} testid="sg-story-ring-active" />
                  <span className="text-[10px] text-slate-600 font-semibold">Story</span>
                </div>
              )}
              {data.highlights.map((s, i) => (
                <div key={s.id} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <Avatar src={s.image} size="w-16 h-16" ring="highlight" onClick={() => setViewStory({ list: data.highlights, idx: i, avatar: c.avatar })} testid={`sg-story-ring-${s.id}`} />
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">{s.highlight_title || "Sorotan"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <nav className="flex border-t border-slate-100">
          {TABS.map(t => (
            <button key={t.k} data-testid={`sg-profile-tab-${t.k}`} onClick={() => setTab(t.k)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider border-t-2 -mt-px transition-colors ${tab === t.k ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </nav>
      </section>

      <Grid posts={list} onOpen={setViewPost} reels={tab === "reels"} />

      {modal === "post" && <UploadModal title="Post Baru" allowVideo allowTags currentClass={c.name} onClose={() => setModal(null)} onSubmit={async (m, cap, tags) => { await api.post(`/schoolgram/class/${cid}/post`, { image: m.url, caption: cap, media_type: m.type, tags }); toast.success("Post dibagikan"); setModal(null); load(); }} />}
      {modal === "story" && <UploadModal title="Story Baru (24 jam)" onClose={() => setModal(null)} onSubmit={async (m, cap) => { await api.post(`/schoolgram/class/${cid}/story`, { image: m.url, caption: cap }); toast.success("Story ditambahkan"); setModal(null); load(); }} />}
      {modal === "profile" && <EditProfileModal cid={cid} data={c} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {viewStory && <StoryViewer state={viewStory} canManage={canManage} onClose={() => { setViewStory(null); setData(d => ({ ...d })); }} onChanged={() => { setViewStory(null); load(); }} />}
      {viewPost && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-150" onClick={() => setViewPost(null)}>
          <div className="max-w-lg w-full max-h-[100vh] sm:max-h-[92vh] overflow-y-auto relative" data-testid="sg-post-modal" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewPost(null)} data-testid="sg-post-modal-close" className="absolute right-2 top-2 z-10 p-2 rounded-full bg-black/40 text-white sm:hidden"><X className="w-4 h-4" /></button>
            <PostCard post={{ ...viewPost, class_avatar: c.avatar }} user={user} manage={canManage && viewPost.class_id === cid} full onDeleted={() => { setViewPost(null); load(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
