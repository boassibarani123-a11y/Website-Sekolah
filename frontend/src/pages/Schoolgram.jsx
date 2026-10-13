import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Home, Play, Send, UserCircle, Lock, Plus, X, Heart, MessageCircle, Trash2, Pencil,
  Star, ChevronLeft, Image as ImageIcon, Users, Video, Camera, Search,
  Compass, Clapperboard, Bookmark, MoreHorizontal, Grid3x3, ShieldAlert, Flag,
} from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const WS_URL = BACKEND.replace(/^http/, "ws") + "/api/ws/chat";

async function uploadMedia(file) {
  const fd = new FormData();
  fd.append("file", file);
  const up = await api.post("/upload", fd);
  return { url: `${BACKEND}${up.data.url}`, type: (file.type || "").startsWith("video") ? "video" : "image" };
}

const Avatar = ({ name, src, size = "w-9 h-9", photo }) => (
  src || photo
    ? <img src={src || photo} alt="" className={`${size} rounded-full object-cover shrink-0`} />
    : <div className={`${size} rounded-full flex items-center justify-center text-white font-bold shrink-0`} style={{ background: "var(--brand)" }}>{(name || "?")[0]?.toUpperCase()}</div>
);

function CommentRow({ c, postId, meId, isAdmin, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.text);
  const mine = c.user_id === meId;
  const save = async () => {
    if (!val.trim()) return;
    try { await api.patch(`/posts/${postId}/comment/${c.id}`, { text: val }); onChange({ ...c, text: val, edited: true }); setEditing(false); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal mengubah komentar"); }
  };
  const del = async () => {
    if (!window.confirm("Hapus komentar ini?")) return;
    try { await api.delete(`/posts/${postId}/comment/${c.id}`); onChange(null, c.id); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal menghapus komentar"); }
  };
  return (
    <div className="group flex items-start justify-between gap-2 text-sm" data-testid={`sg-comment-${c.id}`}>
      {editing ? (
        <div className="flex-1 flex gap-1 items-center">
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm focus:border-sky-500 outline-none" />
          <button data-testid={`sg-comment-save-${c.id}`} onClick={save} className="text-sky-600 text-xs font-semibold px-1">Simpan</button>
          <button onClick={() => { setEditing(false); setVal(c.text); }} className="text-slate-400 text-xs px-1">Batal</button>
        </div>
      ) : (
        <>
          <p className="flex-1 min-w-0"><b className="text-slate-900">{c.user_name}</b> <span className="text-slate-700">{c.text}</span>{c.edited && <span className="text-[10px] text-slate-400"> (diedit)</span>}</p>
          {(mine || isAdmin) && (
            <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {mine && <button data-testid={`sg-comment-edit-${c.id}`} onClick={() => setEditing(true)} className="text-slate-400 hover:text-sky-600"><Pencil className="w-3.5 h-3.5" /></button>}
              <button data-testid={`sg-comment-delete-${c.id}`} onClick={del} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default function Schoolgram() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem("sg_unlocked") === "1");
  const [view, setView] = useState("beranda");
  const [active, setActive] = useState(null);

  if (!user) return null;
  if (!unlocked) return <Gate onOk={() => { sessionStorage.setItem("sg_unlocked", "1"); setUnlocked(true); }} />;

  const openClass = (cid) => { setActive(cid); setView("profil"); };
  const tabs = [
    { k: "beranda", label: "Beranda", icon: Home },
    { k: "jelajahi", label: "Jelajahi", icon: Compass },
    { k: "reels", label: "Reels", icon: Clapperboard },
    { k: "chat", label: "Pesan", icon: Send },
    { k: "profil", label: "Profil", icon: UserCircle },
  ];
  const go = (k) => { setView(k); if (k === "profil") setActive(user.role === "ketua_kelas" ? null : active); };

  return (
    <div className="pb-24 md:pb-4 -mx-4 sm:mx-0 md:grid md:grid-cols-[210px_1fr] md:gap-8" data-testid="schoolgram-page">
      <aside className="hidden md:flex flex-col gap-1 sticky top-4 self-start border-r border-slate-200 pr-4 min-h-[70vh]">
        <p className="sg-logo text-[34px] leading-none text-slate-900 px-3 pt-2 pb-6">Schoolgram</p>
        {tabs.map(t => (
          <button key={t.k} data-testid={`sg-tab-${t.k}`} onClick={() => go(t.k)}
            className={`group flex items-center gap-4 px-3 py-3 rounded-xl text-[15px] transition-colors hover:bg-slate-100 ${view === t.k ? "font-bold text-slate-900" : "text-slate-700"}`}>
            <t.icon className="w-6 h-6 transition-transform group-hover:scale-110" strokeWidth={view === t.k ? 2.6 : 1.8} />{t.label}
          </button>
        ))}
        {["super_admin", "ketua_osis"].includes(user.role) && <p className="mt-auto mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" />Mode Moderator aktif</p>}
      </aside>
      <div className="min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-2"><p className="sg-logo text-3xl">Schoolgram</p></div>
        {view === "beranda" && <Beranda user={user} onOpenClass={openClass} />}
        {view === "jelajahi" && <Explore user={user} onOpenClass={openClass} />}
        {view === "reels" && <Reels user={user} />}
        {view === "chat" && <Chat user={user} />}
        {view === "profil" && <ProfilHub user={user} active={active} setActive={setActive} />}
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-around py-2.5" data-testid="sg-bottom-nav">
        {tabs.map(t => (
          <button key={t.k} data-testid={`sg-nav-${t.k}`} onClick={() => go(t.k)} className="p-1.5 text-slate-900">
            <t.icon className="w-6 h-6" strokeWidth={view === t.k ? 2.6 : 1.6} />
          </button>
        ))}
      </nav>
    </div>
  );
}

function Gate({ onOk }) {
  const { user } = useAuth();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e?.preventDefault();
    if (!pw) return;
    setBusy(true);
    try { await api.post("/auth/verify-password", { password: pw }); onOk(); }
    catch { toast.error("Password salah"); }
    finally { setBusy(false); }
  };
  return (
    <div className="max-w-sm mx-auto mt-10" data-testid="sg-gate">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-4" style={{ background: "var(--brand)" }}><Lock className="w-8 h-8" /></div>
        <h2 className="font-heading text-xl font-extrabold text-slate-900">Masuk Schoolgram</h2>
        <p className="text-sm text-slate-500 mt-1">Demi keamanan, masukkan ulang password akun <b>{user?.name}</b> untuk membuka Schoolgram.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input data-testid="sg-gate-password" type="password" autoFocus value={pw} onChange={e => setPw(e.target.value)}
            placeholder="Password akun" className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" />
          <button data-testid="sg-gate-submit" disabled={busy} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">{busy ? "Memverifikasi..." : "Buka Schoolgram"}</button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- BERANDA (stories + feed) ---------------- */
const MODS = ["super_admin", "ketua_osis"];
const canManagePost = (user, p) => MODS.includes(user.role) || (user.role === "ketua_kelas" && user.kelas === p.kelas) || p.author_id === user.id;
const ago = (iso) => {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam`;
  if (s < 604800) return `${Math.floor(s / 86400)} hr`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

const Ring = ({ on, children, size = "w-10 h-10" }) => (
  <span className={`${size} rounded-full p-[2px] shrink-0 ${on ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600" : "bg-slate-200"}`}>
    <span className="block w-full h-full rounded-full bg-white p-[2px]">{children}</span>
  </span>
);

function TakedownModal({ post, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const submit = async () => {
    try { await api.post(`/schoolgram/post/${post.id}/takedown`, { reason }); toast.success("Postingan di-takedown"); onDone(); }
    catch (e) { toast.error(e?.response?.data?.detail?.[0]?.msg || e?.response?.data?.detail || "Gagal"); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()} data-testid="sg-takedown-modal">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto"><Flag className="w-6 h-6" /></div>
        <p className="mt-3 text-center font-heading font-bold text-lg">Takedown Postingan</p>
        <p className="text-center text-sm text-slate-500">Postingan disembunyikan dari semua orang. Pembuat akan menerima notifikasi alasan.</p>
        <div className="mt-4 flex flex-wrap gap-1.5">{["Konten tidak pantas", "Melanggar tata tertib", "Informasi palsu", "Privasi siswa"].map(r => <button key={r} onClick={() => setReason(r)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${reason === r ? "bg-rose-600 text-white border-rose-600" : "border-slate-200 text-slate-600"}`}>{r}</button>)}</div>
        <textarea data-testid="sg-takedown-reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan takedown..." className="mt-3 w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500" />
        <button data-testid="sg-takedown-submit" onClick={submit} disabled={reason.trim().length < 3} className="mt-3 w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-40">Takedown</button>
      </div>
    </div>
  );
}

function PostMenu({ post, user, onClose, onChanged, onEdit, onOpenClass }) {
  const [td, setTd] = useState(false);
  const isMod = MODS.includes(user.role);
  const manage = canManagePost(user, post);
  const del = async () => { if (!window.confirm("Hapus postingan ini secara permanen?")) return; try { await api.delete(`/schoolgram/post/${post.id}`); toast.success("Postingan dihapus"); onChanged(); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menghapus"); } };
  const restore = async () => { try { await api.post(`/schoolgram/post/${post.id}/restore`); toast.success("Postingan dipulihkan"); onChanged(); } catch { toast.error("Gagal"); } };
  const copy = () => { navigator.clipboard?.writeText(`${window.location.origin}/schoolgram#${post.id}`); toast.success("Tautan disalin"); onClose(); };
  if (td) return <TakedownModal post={post} onClose={onClose} onDone={onChanged} />;
  const Item = ({ children, onClick, danger, testid }) => <button data-testid={testid} onClick={onClick} className={`w-full py-3.5 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50 ${danger ? "text-rose-600 font-bold" : "text-slate-800"}`}>{children}</button>;
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-xs overflow-hidden text-center animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()} data-testid="sg-post-menu">
        {isMod && !post.taken_down && <Item danger testid="sg-menu-takedown" onClick={() => setTd(true)}>Takedown</Item>}
        {isMod && post.taken_down && <Item testid="sg-menu-restore" onClick={restore}>Pulihkan Postingan</Item>}
        {manage && <Item danger testid="sg-menu-delete" onClick={del}>Hapus</Item>}
        {manage && <Item testid="sg-menu-edit" onClick={onEdit}>Edit Caption</Item>}
        {onOpenClass && <Item testid="sg-menu-profile" onClick={() => { onClose(); onOpenClass(post.class_id); }}>Lihat Profil {post.kelas}</Item>}
        <Item testid="sg-menu-copy" onClick={copy}>Salin Tautan</Item>
        <Item testid="sg-menu-cancel" onClick={onClose}>Batal</Item>
      </div>
    </div>
  );
}

function usePostActions(post, onChanged) {
  const [p, setP] = useState(post);
  const [burst, setBurst] = useState(false);
  useEffect(() => setP(post), [post]);
  const like = async (force) => {
    if (force && p.liked) { setBurst(true); setTimeout(() => setBurst(false), 700); return; }
    const r = await api.post(`/posts/${p.id}/like`);
    setP(x => ({ ...x, like_count: r.data.like_count, liked: r.data.liked }));
    if (force) { setBurst(true); setTimeout(() => setBurst(false), 700); }
  };
  const save = async () => { const r = await api.post(`/posts/${p.id}/save`); setP(x => ({ ...x, saved: r.data.saved })); toast.success(r.data.saved ? "Disimpan ke koleksi" : "Dihapus dari koleksi"); };
  const comment = async (text) => { const r = await api.post(`/posts/${p.id}/comment`, { text }); setP(x => ({ ...x, comments: [...(x.comments || []), r.data] })); };
  const saveCaption = async (caption) => { await api.patch(`/schoolgram/post/${p.id}`, { caption }); setP(x => ({ ...x, caption })); toast.success("Caption diperbarui"); };
  return { p, setP, like, save, comment, saveCaption, burst };
}

function Media({ p, onDouble, burst, className = "" }) {
  return (
    <div className={`relative bg-slate-100 select-none ${className}`} onDoubleClick={onDouble}>
      {p.media_type === "video" ? <video src={p.image} controls className="w-full h-full object-contain bg-black" /> : <img src={p.image} alt="" className="w-full h-full object-cover" draggable={false} />}
      {burst && <Heart className="absolute inset-0 m-auto w-28 h-28 text-white fill-white drop-shadow-2xl animate-in zoom-in-50 fade-in duration-300" />}
      {p.taken_down && <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center text-white text-center p-6" data-testid="sg-takedown-banner"><ShieldAlert className="w-10 h-10 text-rose-400" /><p className="mt-2 font-bold">Di-takedown oleh {p.takedown_by}</p><p className="text-sm text-white/70">{p.takedown_reason}</p></div>}
    </div>
  );
}

function ActionBar({ p, like, save, onComment }) {
  return (
    <div className="flex items-center gap-4 text-slate-900">
      <button data-testid={`sg-like-${p.id}`} onClick={() => like(false)} className="transition-transform active:scale-125"><Heart className={`w-[26px] h-[26px] ${p.liked ? "fill-rose-500 text-rose-500" : ""}`} /></button>
      <button data-testid={`sg-comment-open-${p.id}`} onClick={onComment}><MessageCircle className="w-[26px] h-[26px] -scale-x-100" /></button>
      <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/schoolgram#${p.id}`); toast.success("Tautan disalin"); }}><Send className="w-6 h-6" /></button>
      <button data-testid={`sg-save-${p.id}`} onClick={save} className="ml-auto"><Bookmark className={`w-[26px] h-[26px] ${p.saved ? "fill-slate-900" : ""}`} /></button>
    </div>
  );
}

function PostCard({ post, user, onChanged, onOpenClass }) {
  const { p, setP, like, save, comment, saveCaption, burst } = usePostActions(post, onChanged);
  const [menu, setMenu] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState(null);
  const inputRef = useRef(null);
  const comments = p.comments || [];
  const send = async () => { if (!text.trim()) return; await comment(text.trim()); setText(""); setShowAll(true); };
  return (
    <article className="bg-white sm:border border-slate-200 sm:rounded-xl overflow-hidden" data-testid={`sg-feed-post-${p.id}`} id={p.id}>
      <header className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={() => onOpenClass?.(p.class_id)}><Ring on size="w-9 h-9"><Avatar name={p.kelas} src={p.class_avatar} size="w-full h-full text-xs" /></Ring></button>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-sm"><button onClick={() => onOpenClass?.(p.class_id)} className="font-semibold hover:opacity-60">{(p.kelas || "").toLowerCase().replace(/\s+/g, ".")}</button><span className="text-slate-400"> · {ago(p.created_at)}</span></p>
          <p className="text-xs text-slate-500 truncate">{p.author_name}</p>
        </div>
        <button data-testid={`sg-post-menu-${p.id}`} onClick={() => setMenu(true)} className="p-1.5 rounded-full hover:bg-slate-100"><MoreHorizontal className="w-5 h-5" /></button>
      </header>
      <Media p={p} burst={burst} onDouble={() => like(true)} className={p.media_type === "video" ? "max-h-[600px]" : "aspect-[4/5]"} />
      <div className="px-3 pt-3 pb-3 space-y-1.5">
        <ActionBar p={p} like={like} save={save} onComment={() => inputRef.current?.focus()} />
        <p className="text-sm font-semibold" data-testid={`sg-like-count-${p.id}`}>{p.like_count} suka</p>
        {edit !== null ? (
          <div className="flex gap-2"><input data-testid="sg-caption-edit" value={edit} onChange={e => setEdit(e.target.value)} className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm" /><button data-testid="sg-caption-save" onClick={async () => { await saveCaption(edit); setEdit(null); }} className="text-sm font-bold text-sky-600">Simpan</button></div>
        ) : p.caption && <p className="text-sm"><b className="mr-1.5">{(p.kelas || "").toLowerCase().replace(/\s+/g, ".")}</b>{p.caption}{p.edited_at && <span className="text-slate-400 text-xs"> (diedit)</span>}</p>}
        {comments.length > 2 && !showAll && <button onClick={() => setShowAll(true)} className="text-sm text-slate-500">Lihat semua {comments.length} komentar</button>}
        <div className="space-y-1">
          {(showAll ? comments : comments.slice(-2)).map(c => <CommentRow key={c.id} c={c} postId={p.id} meId={user.id} isAdmin={MODS.includes(user.role) || user.role === "kepsek"}
            onChange={(u, d) => setP(pr => ({ ...pr, comments: d ? (pr.comments || []).filter(x => x.id !== d) : (pr.comments || []).map(x => x.id === u.id ? u : x) }))} />)}
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-2">
          <input ref={inputRef} data-testid={`sg-comment-input-${p.id}`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Tambahkan komentar..." className="flex-1 py-2 text-sm outline-none bg-transparent" />
          {text.trim() && <button data-testid={`sg-comment-send-${p.id}`} onClick={send} className="text-sm font-bold text-sky-600 hover:text-sky-800">Kirim</button>}
        </div>
      </div>
      {menu && <PostMenu post={p} user={user} onOpenClass={onOpenClass} onClose={() => setMenu(false)} onChanged={() => { setMenu(false); onChanged?.(); }} onEdit={() => { setMenu(false); setEdit(p.caption || ""); }} />}
    </article>
  );
}

function StoriesRow({ classes, onOpen }) {
  if (!classes.length) return null;
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar px-3 py-4 sm:border border-slate-200 sm:rounded-xl bg-white" data-testid="sg-stories-row">
      {classes.map(c => (
        <button key={c.id} data-testid={`sg-story-class-${c.id}`} onClick={() => onOpen(c)} className="flex flex-col items-center gap-1 w-[70px] shrink-0 group">
          <Ring on={c.has_story} size="w-[66px] h-[66px]"><Avatar name={c.name} src={c.avatar} size="w-full h-full text-xl" /></Ring>
          <span className="text-[11px] text-slate-700 truncate w-full text-center group-hover:text-slate-900">{c.name}</span>
        </button>
      ))}
    </div>
  );
}

function Beranda({ user, onOpenClass }) {
  const [posts, setPosts] = useState(null);
  const [classes, setClasses] = useState([]);
  const [mode, setMode] = useState("all");
  const [story, setStory] = useState(null);
  const load = useCallback(() => {
    api.get(`/schoolgram/feed${mode === "following" ? "?following=true" : mode === "saved" ? "?saved=true" : ""}`).then(r => setPosts(r.data)).catch(() => setPosts([]));
  }, [mode]);
  const loadClasses = () => api.get("/schoolgram/classes").then(r => setClasses([...r.data].sort((a, b) => (b.has_story ? 1 : 0) - (a.has_story ? 1 : 0)))).catch(() => {});
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadClasses(); }, []);
  const openStory = async (c) => {
    const r = await api.get(`/schoolgram/class/${c.id}`).catch(() => null);
    if (r?.data?.stories?.length) setStory({ list: r.data.stories, idx: 0, canManage: r.data.can_manage });
    else onOpenClass(c.id);
  };
  const follow = async (c) => { const r = await api.post(`/schoolgram/follow/${c.id}`); setClasses(cs => cs.map(x => x.id === c.id ? { ...x, is_following: r.data.following } : x)); toast.success(r.data.following ? `Mengikuti ${c.name}` : `Berhenti mengikuti ${c.name}`); };
  return (
    <div className="grid lg:grid-cols-[minmax(0,470px)_300px] gap-10 justify-center" data-testid="sg-beranda">
      <div className="space-y-4 min-w-0">
        <StoriesRow classes={classes} onOpen={openStory} />
        <div className="flex gap-2 px-3 sm:px-0">
          {[["all", "Untuk Anda"], ["following", "Mengikuti"], ["saved", "Tersimpan"]].map(([k, l]) => (
            <button key={k} data-testid={`sg-feed-${k}`} onClick={() => setMode(k)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${mode === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
          ))}
        </div>
        {posts === null && <p className="text-center text-slate-400 py-10 text-sm">Memuat…</p>}
        {posts?.length === 0 && <div className="text-center py-16" data-testid="sg-feed-empty"><div className="w-20 h-20 rounded-full border-2 border-slate-900 flex items-center justify-center mx-auto"><Camera className="w-9 h-9" /></div><p className="mt-4 font-heading font-extrabold text-2xl">{mode === "saved" ? "Belum ada yang disimpan" : mode === "following" ? "Ikuti kelas dulu" : "Belum ada postingan"}</p></div>}
        {(posts || []).map(p => <PostCard key={p.id} post={p} user={user} onChanged={load} onOpenClass={onOpenClass} />)}
      </div>
      <aside className="hidden lg:block sticky top-4 self-start space-y-4">
        <div className="flex items-center gap-3"><Avatar name={user.name} src={user.photo} size="w-11 h-11" /><div className="min-w-0"><p className="text-sm font-semibold truncate">{user.name}</p><p className="text-xs text-slate-500">{user.kelas || user.role}</p></div></div>
        <p className="text-sm font-semibold text-slate-500">Kelas untuk diikuti</p>
        {classes.slice(0, 8).map(c => (
          <div key={c.id} className="flex items-center gap-3">
            <button onClick={() => onOpenClass(c.id)}><Avatar name={c.name} src={c.avatar} size="w-9 h-9 text-sm" /></button>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{c.name}</p><p className="text-xs text-slate-500">{c.post_count} postingan</p></div>
            <button data-testid={`sg-follow-side-${c.id}`} onClick={() => follow(c)} className={`text-xs font-bold ${c.is_following ? "text-slate-500" : "text-sky-600 hover:text-sky-800"}`}>{c.is_following ? "Mengikuti" : "Ikuti"}</button>
          </div>
        ))}
      </aside>
      {story && <StoryViewer state={story} canManage={story.canManage} onClose={() => setStory(null)} onChanged={() => { setStory(null); loadClasses(); }} />}
    </div>
  );
}

function PostGrid({ posts, onOpen }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1" data-testid="sg-post-grid">
      {posts.map(p => (
        <button key={p.id} data-testid={`sg-post-${p.id}`} onClick={() => onOpen(p)} className="relative aspect-square bg-slate-100 overflow-hidden group">
          {p.media_type === "video" ? <><video src={p.image} className="w-full h-full object-cover" /><Clapperboard className="w-5 h-5 text-white absolute top-2 right-2 drop-shadow" /></> : <img src={p.image} alt="" className="w-full h-full object-cover" />}
          {p.taken_down && <span className="absolute inset-0 bg-slate-900/70 flex items-center justify-center"><ShieldAlert className="w-7 h-7 text-rose-400" /></span>}
          <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5 text-white font-bold text-sm">
            <span className="flex items-center gap-1.5"><Heart className="w-5 h-5 fill-white" />{p.like_count}</span>
            <span className="flex items-center gap-1.5"><MessageCircle className="w-5 h-5 fill-white" />{(p.comments || []).length}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Explore({ user, onOpenClass }) {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState(null);
  const load = () => api.get("/schoolgram/feed").then(r => setPosts(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const list = posts.filter(p => !q || `${p.kelas} ${p.caption} ${p.author_name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="max-w-4xl mx-auto space-y-4" data-testid="sg-explore">
      <div className="relative px-3 sm:px-0"><Search className="w-4 h-4 text-slate-400 absolute left-6 sm:left-3 top-1/2 -translate-y-1/2" /><input data-testid="sg-explore-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari kelas, caption, atau nama" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm outline-none focus:ring-2 focus:ring-slate-300" /></div>
      {list.length === 0 ? <p className="text-center text-slate-400 py-14 text-sm">Tidak ada hasil.</p> : <PostGrid posts={list} onOpen={setView} />}
      {view && <PostModal post={view} onOpenClass={onOpenClass} onClose={() => setView(null)} onChanged={() => { setView(null); load(); }} />}
    </div>
  );
}

function Reels({ user }) {
  const [reels, setReels] = useState([]);
  useEffect(() => { api.get("/schoolgram/reels").then(r => setReels(r.data)).catch(() => {}); }, []);
  if (reels.length === 0) return (
    <div className="max-w-xl mx-auto px-4 bg-white border border-slate-200 rounded-2xl p-10 text-center">
      <Play className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500">Belum ada Reels. Reels diisi dari postingan kelas yang berupa <b>video</b> kreatif.</p>
    </div>
  );
  return (
    <div className="max-w-md mx-auto h-[calc(100vh-11rem)] md:h-[calc(100vh-13rem)] overflow-y-auto snap-y snap-mandatory rounded-2xl no-scrollbar" data-testid="sg-reels">
      {reels.map(r => <ReelItem key={r.id} reel={r} />)}
    </div>
  );
}

function ReelItem({ reel }) {
  const [r, setR] = useState(reel);
  const ref = useRef(null);
  const like = async () => { try { const d = await api.post(`/posts/${r.id}/like`); setR({ ...r, like_count: d.data.like_count, liked: d.data.liked }); } catch {} };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div className="relative h-full snap-start bg-black flex items-center justify-center" data-testid={`sg-reel-${r.id}`}>
      <video ref={ref} src={r.image} loop muted playsInline className="w-full h-full object-contain" onClick={e => e.target.paused ? e.target.play() : e.target.pause()} />
      <div className="absolute bottom-6 left-4 right-16 text-white">
        <p className="font-bold text-sm">{r.kelas}</p>
        {r.caption && <p className="text-sm opacity-90">{r.caption}</p>}
      </div>
      <div className="absolute bottom-6 right-4 flex flex-col items-center gap-4 text-white">
        <button onClick={like} className="flex flex-col items-center"><Heart className={`w-8 h-8 ${r.liked ? "fill-rose-500 text-rose-500" : ""}`} /><span className="text-xs font-bold">{r.like_count}</span></button>
        <div className="flex flex-col items-center"><MessageCircle className="w-8 h-8" /><span className="text-xs font-bold">{(r.comments || []).length}</span></div>
      </div>
    </div>
  );
}

/* ---------------- CHAT (realtime) ---------------- */
function Chat({ user }) {
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState("");
  const [peer, setPeer] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const wsRef = useRef(null);
  const peerRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { api.get("/chat/contacts").then(r => setContacts(r.data)).catch(() => {}); }, []);
  useEffect(() => { peerRef.current = peer?.id || null; }, [peer]);

  // websocket for realtime receive
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d.type === "message") {
            const m = d.message;
            const pid = peerRef.current;
            if (pid && (m.from_id === pid || m.to_id === pid)) {
              setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
            }
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws && ws.close(); } catch {} };
  }, []);

  const openPeer = async (c) => {
    setPeer(c);
    try { const r = await api.get(`/chat/history/${c.id}`); setMsgs(r.data); } catch {}
  };
  // polling fallback
  useEffect(() => {
    if (!peer) return;
    const t = setInterval(async () => {
      try { const r = await api.get(`/chat/history/${peer.id}`); setMsgs(r.data); } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [peer]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !peer) return;
    const t = text; setText("");
    try {
      const r = await api.post("/chat/send", { to: peer.id, text: t });
      setMsgs(prev => prev.some(x => x.id === r.data.id) ? prev : [...prev, r.data]);
    } catch { toast.error("Gagal kirim pesan"); setText(t); }
  };

  const filtered = contacts.filter(c => !q || c.name?.toLowerCase().includes(q.toLowerCase()) || (c.kelas || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0" data-testid="sg-chat">
      <div className="bg-white sm:border border-slate-200 sm:rounded-2xl overflow-hidden flex h-[calc(100vh-12rem)]">
        {/* contacts */}
        <div className={`${peer ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 border-r border-slate-200`}>
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input data-testid="sg-chat-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari teman..." className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg text-sm outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.id} data-testid={`sg-chat-contact-${c.id}`} onClick={() => openPeer(c)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left ${peer?.id === c.id ? "bg-sky-50" : ""}`}>
                <Avatar name={c.name} photo={c.photo} />
                <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p><p className="text-[11px] text-slate-400 truncate">{c.kelas || "—"}</p></div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-slate-400 text-center p-6">Tidak ada kontak.</p>}
          </div>
        </div>
        {/* conversation */}
        <div className={`${peer ? "flex" : "hidden sm:flex"} flex-col flex-1`}>
          {!peer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Send className="w-10 h-10 mb-2" /><p className="text-sm">Pilih teman untuk mulai mengobrol</p></div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 border-b border-slate-100">
                <button className="sm:hidden" onClick={() => setPeer(null)}><ChevronLeft className="w-5 h-5" /></button>
                <Avatar name={peer.name} photo={peer.photo} size="w-8 h-8" />
                <div><p className="text-sm font-semibold text-slate-900">{peer.name}</p><p className="text-[11px] text-slate-400">{peer.kelas || "—"}</p></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                {msgs.map(m => (
                  <div key={m.id} className={`flex ${m.from_id === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.from_id === user.id ? "bg-sky-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                      {m.text}
                      <span className={`block text-[9px] mt-0.5 ${m.from_id === user.id ? "text-sky-100" : "text-slate-400"}`}>{(m.created_at || "").slice(11, 16)}</span>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input data-testid="sg-chat-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Tulis pesan..." className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm outline-none" />
                <button data-testid="sg-chat-send" onClick={send} className="w-11 h-11 rounded-full bg-sky-600 text-white flex items-center justify-center hover:bg-sky-700"><Send className="w-5 h-5" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- PROFIL HUB ---------------- */
function ProfilHub({ user, active, setActive }) {
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState("");
  const load = () => api.get("/schoolgram/classes").then(r => setClasses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!active && user.role === "ketua_kelas" && classes.length) { const mine = classes.find(c => c.name === user.kelas); if (mine) setActive(mine.id); }
  }, [classes]); // eslint-disable-line
  if (active) return <ClassProfile cid={active} onBack={() => { setActive(null); load(); }} />;
  const list = classes.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0 space-y-5" data-testid="sg-profil-hub">
      <div><h2 className="font-heading text-2xl font-extrabold">Akun Kelas</h2><p className="text-sm text-slate-500">Setiap kelas punya profil sendiri. Ketua Kelas mengelola profilnya; Ketua OSIS & Super Admin dapat memoderasi semua.</p></div>
      <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input data-testid="sg-class-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari kelas" className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm outline-none" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {list.map(c => (
          <button key={c.id} data-testid={`sg-class-card-${c.id}`} onClick={() => setActive(c.id)} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-0.5 transition-[box-shadow,transform]">
            <Ring on={c.has_story} size="w-20 h-20"><Avatar name={c.name} src={c.avatar} size="w-full h-full text-2xl" /></Ring>
            <p className="font-semibold text-slate-900 mt-3 truncate w-full">{c.name}</p>
            <p className="text-xs text-slate-500">{c.post_count} postingan · {c.student_count} siswa</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ClassProfile({ cid, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewStory, setViewStory] = useState(null);
  const [viewPost, setViewPost] = useState(null);
  const [tab, setTab] = useState("posts");
  const load = () => api.get(`/schoolgram/class/${cid}`).then(r => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, [cid]); // eslint-disable-line
  if (!data) return <p className="text-slate-400 text-sm px-4">Memuat...</p>;
  const canManage = data.can_manage;
  const follow = async () => { const r = await api.post(`/schoolgram/follow/${cid}`); setData(d => ({ ...d, is_following: r.data.following, followers: d.followers + (r.data.following ? 1 : -1) })); };
  const shown = tab === "reels" ? data.posts.filter(p => p.media_type === "video") : data.posts;
  const handle = data.class.name.toLowerCase().replace(/\s+/g, ".");
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0" data-testid="sg-class-profile">
      <button data-testid="sg-back" onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6"><ChevronLeft className="w-4 h-4" />Semua Kelas</button>
      <header className="flex gap-6 sm:gap-16 items-start sm:px-10">
        <button onClick={() => data.stories.length && setViewStory({ list: data.stories, idx: 0 })} className="shrink-0">
          <Ring on={data.stories.length > 0} size="w-20 h-20 sm:w-36 sm:h-36"><Avatar name={data.class.name} src={data.class.avatar} size="w-full h-full text-4xl" /></Ring>
        </button>
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-normal mr-3" data-testid="sg-profile-handle">{handle}</h1>
            {canManage ? (
              <>
                <button data-testid="sg-edit-profile" onClick={() => setModal("profile")} className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold">Edit profil</button>
                <button data-testid="sg-new-post" onClick={() => setModal("post")} className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" />Post</button>
                <button data-testid="sg-new-story" onClick={() => setModal("story")} className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" />Story</button>
              </>
            ) : null}
            <button data-testid="sg-follow-button" onClick={follow} className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${data.is_following ? "bg-slate-100 hover:bg-slate-200 text-slate-900" : "bg-sky-500 hover:bg-sky-600 text-white"}`}>{data.is_following ? "Mengikuti" : "Ikuti"}</button>
          </div>
          <div className="flex gap-8 text-[15px]">
            <span><b>{data.posts.length}</b> postingan</span>
            <span data-testid="sg-followers"><b>{data.followers}</b> pengikut</span>
            <span><b>{data.student_count}</b> siswa</span>
          </div>
          <div className="text-sm">
            <p className="font-semibold">{data.class.name}</p>
            {data.class.description && <p className="text-slate-700 whitespace-pre-wrap">{data.class.description}</p>}
            {data.can_moderate && <p className="mt-1 text-[11px] font-semibold text-amber-700 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" />Anda moderator — buka post untuk edit/hapus/takedown</p>}
          </div>
        </div>
      </header>
      {data.highlights.length > 0 && (
        <div className="flex gap-6 overflow-x-auto no-scrollbar mt-10 sm:px-10">
          {data.highlights.map((s, i) => (
            <button key={s.id} data-testid={`sg-story-ring-${s.id}`} onClick={() => setViewStory({ list: data.highlights, idx: i })} className="flex flex-col items-center gap-1.5 w-20 shrink-0">
              <span className="w-[72px] h-[72px] rounded-full p-[3px] bg-slate-200"><img src={s.image} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" /></span>
              <span className="text-xs font-semibold truncate w-full text-center">{s.highlight_title || "Sorotan"}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-10 border-t border-slate-200 flex justify-center gap-14">
        {[["posts", "POSTINGAN", Grid3x3], ["reels", "REELS", Clapperboard]].map(([k, l, I]) => (
          <button key={k} data-testid={`sg-profile-tab-${k}`} onClick={() => setTab(k)} className={`-mt-px pt-4 pb-3 text-xs font-semibold tracking-widest flex items-center gap-1.5 border-t ${tab === k ? "border-slate-900 text-slate-900" : "border-transparent text-slate-400"}`}><I className="w-3.5 h-3.5" />{l}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="py-16 text-center"><div className="w-16 h-16 rounded-full border-2 border-slate-900 flex items-center justify-center mx-auto"><Camera className="w-7 h-7" /></div><p className="mt-4 font-heading font-extrabold text-2xl">Belum Ada Postingan</p></div>
      ) : <PostGrid posts={shown} onOpen={setViewPost} />}
      {modal === "post" && <UploadModal title="Postingan Baru" allowVideo onClose={() => setModal(null)} onSubmit={async (m, cap) => { await api.post(`/schoolgram/class/${cid}/post`, { image: m.url, caption: cap, media_type: m.type }); toast.success("Dibagikan"); setModal(null); load(); }} />}
      {modal === "story" && <UploadModal title="Story Baru (24 jam)" onClose={() => setModal(null)} onSubmit={async (m, cap) => { await api.post(`/schoolgram/class/${cid}/story`, { image: m.url, caption: cap }); toast.success("Story ditambahkan"); setModal(null); load(); }} />}
      {modal === "profile" && <EditProfileModal cid={cid} data={data.class} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {viewStory && <StoryViewer state={viewStory} canManage={canManage} onClose={() => setViewStory(null)} onChanged={() => { setViewStory(null); load(); }} />}
      {viewPost && <PostModal post={{ ...viewPost, class_avatar: data.class.avatar }} onClose={() => setViewPost(null)} onChanged={() => { setViewPost(null); load(); }} />}
    </div>
  );
}

function EditProfileModal({ cid, data, onClose, onDone }) {
  const [f, setF] = useState({ description: data.description || "", avatar: data.avatar || "", cover: data.cover || "" });
  const [busy, setBusy] = useState("");
  const pick = async (e, key) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(key);
    try { const m = await uploadMedia(file); setF(s => ({ ...s, [key]: m.url })); } catch { toast.error("Gagal unggah"); } finally { setBusy(""); }
  };
  const save = async () => { try { await api.patch(`/schoolgram/class/${cid}/profile`, f); toast.success("Profil kelas diperbarui"); onDone(); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); } };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()} data-testid="sg-profile-modal">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">Edit Profil Kelas</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-4">
          <div><label className="text-xs font-semibold text-slate-600">Foto Profil Kelas</label>
            <div className="flex items-center gap-3 mt-1"><Avatar name={data.name} src={f.avatar} size="w-14 h-14 text-xl" /><input type="file" accept="image/*" onChange={e => pick(e, "avatar")} className="text-xs" />{busy === "avatar" && <span className="text-xs text-slate-400">...</span>}</div></div>
          <div><label className="text-xs font-semibold text-slate-600">Sampul</label>
            <div className="flex items-center gap-3 mt-1">{f.cover && <img src={f.cover} alt="" className="w-20 h-12 rounded object-cover" />}<input type="file" accept="image/*" onChange={e => pick(e, "cover")} className="text-xs" />{busy === "cover" && <span className="text-xs text-slate-400">...</span>}</div></div>
          <div><label className="text-xs font-semibold text-slate-600">Bio / Deskripsi</label>
            <textarea data-testid="sg-profile-desc" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" /></div>
          <button data-testid="sg-profile-save" onClick={save} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan</button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ title, allowVideo, onClose, onSubmit }) {
  const [preview, setPreview] = useState(null);
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error("Maksimal 20MB"); return; }
    setBusy(true);
    try { const m = await uploadMedia(f); setMedia(m); setPreview(m); }
    catch { toast.error("Gagal mengunggah"); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!media) { toast.error("Pilih file dulu"); return; }
    setBusy(true);
    try { await onSubmit(media, caption); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading text-xl font-bold">{title}</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-4">
          <input type="file" accept={allowVideo ? "image/*,video/*" : "image/*"} data-testid="sg-upload-file" onChange={onFile} className="text-sm" />
          {allowVideo && <p className="text-[11px] text-slate-400">Bisa gambar atau video (video masuk ke Reels). Maks 20MB.</p>}
          {preview && (preview.type === "video" ? <video src={preview.url} controls className="w-full rounded-xl bg-black max-h-80" /> : <img src={preview.url} alt="" className="w-full aspect-square object-cover rounded-xl bg-slate-100" />)}
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} placeholder="Caption (opsional)..." className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none" />
          <button data-testid="sg-upload-submit" disabled={busy} onClick={submit} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">{busy ? "Memproses..." : "Bagikan"}</button>
        </div>
      </div>
    </div>
  );
}

function StoryViewer({ state, canManage, onClose, onChanged }) {
  const [idx, setIdx] = useState(state.idx);
  const s = state.list[idx];
  const next = () => setIdx(i => Math.min(i + 1, state.list.length - 1));
  const prev = () => setIdx(i => Math.max(i - 1, 0));
  const toggleHighlight = async () => {
    try { await api.post(`/schoolgram/story/${s.id}/highlight`, { highlighted: !s.highlighted, title: "Sorotan" }); toast.success(s.highlighted ? "Dihapus dari sorotan" : "Disimpan ke sorotan"); onChanged(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
  };
  const del = async () => { if (!window.confirm("Hapus story ini?")) return; try { await api.delete(`/schoolgram/story/${s.id}`); toast.success("Story dihapus"); onChanged(); } catch { toast.error("Gagal menghapus"); } };
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" data-testid="sg-story-viewer" onClick={onClose}>
      <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white"><X className="w-6 h-6" /></button>
        <p className="text-white/80 text-xs mb-2">{s.class_name} · {idx + 1}/{state.list.length}</p>
        <img src={s.image} alt="" className="w-full rounded-2xl object-contain max-h-[72vh] bg-black" />
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

function PostModal({ post, onClose, onChanged, onOpenClass }) {
  const { user } = useAuth();
  const { p, setP, like, save, comment, saveCaption, burst } = usePostActions(post, onChanged);
  const [menu, setMenu] = useState(false);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState(null);
  const handle = (p.kelas || "").toLowerCase().replace(/\s+/g, ".");
  const send = async () => { if (!text.trim()) return; await comment(text.trim()); setText(""); };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white"><X className="w-7 h-7" /></button>
      <div className="bg-white rounded-md sm:rounded-lg max-w-5xl w-full max-h-[92vh] overflow-hidden grid md:grid-cols-[minmax(0,1fr)_380px] shadow-2xl" data-testid="sg-post-modal" onClick={e => e.stopPropagation()}>
        <Media p={p} burst={burst} onDouble={() => like(true)} className="bg-black flex items-center justify-center aspect-square md:aspect-auto md:min-h-[560px] [&>img]:object-contain" />
        <div className="flex flex-col min-h-0 max-h-[92vh]">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <Ring on size="w-9 h-9"><Avatar name={p.kelas} src={p.class_avatar} size="w-full h-full text-xs" /></Ring>
            <button onClick={() => { if (onOpenClass) { onClose(); onOpenClass(p.class_id); } }} className="flex-1 text-left text-sm font-semibold">{handle}</button>
            <button data-testid="sg-post-modal-menu" onClick={() => setMenu(true)} className="p-1.5 rounded-full hover:bg-slate-100"><MoreHorizontal className="w-5 h-5" /></button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            <div className="flex gap-3">
              <Avatar name={p.kelas} src={p.class_avatar} size="w-8 h-8 text-xs" />
              {edit !== null ? (
                <div className="flex-1 flex gap-2"><input data-testid="sg-post-caption-input" value={edit} onChange={e => setEdit(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm" /><button data-testid="sg-post-save" onClick={async () => { await saveCaption(edit); setEdit(null); }} className="text-sm font-bold text-sky-600">Simpan</button></div>
              ) : <p className="text-sm"><b className="mr-1.5">{handle}</b>{p.caption}<span className="block text-xs text-slate-400 mt-1">{ago(p.created_at)} · oleh {p.author_name}</span></p>}
            </div>
            {(p.comments || []).map(c => <CommentRow key={c.id} c={c} postId={p.id} meId={user.id} isAdmin={MODS.includes(user.role) || user.role === "kepsek"}
              onChange={(u, d) => setP(pr => ({ ...pr, comments: d ? (pr.comments || []).filter(x => x.id !== d) : (pr.comments || []).map(x => x.id === u.id ? u : x) }))} />)}
          </div>
          <div className="border-t border-slate-200 px-4 pt-3 pb-2 space-y-1">
            <ActionBar p={p} like={like} save={save} onComment={() => document.getElementById("sg-modal-comment")?.focus()} />
            <p className="text-sm font-semibold">{p.like_count} suka</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="border-t border-slate-200 px-4 flex items-center gap-2">
            <input id="sg-modal-comment" data-testid="sg-comment-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Tambahkan komentar..." className="flex-1 py-3.5 text-sm outline-none" />
            <button data-testid="sg-comment-send" disabled={!text.trim()} onClick={send} className="text-sm font-bold text-sky-600 disabled:opacity-40">Kirim</button>
          </div>
        </div>
      </div>
      {menu && <PostMenu post={p} user={user} onClose={() => setMenu(false)} onChanged={() => { setMenu(false); onChanged(); }} onEdit={() => { setMenu(false); setEdit(p.caption || ""); }} />}
    </div>
  );
}
