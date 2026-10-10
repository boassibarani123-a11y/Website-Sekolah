import { useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Heart, MessageCircle, Send, Bookmark, Pencil, Trash2, Tag } from "lucide-react";
import { Avatar, CommentRow, ADMIN_ROLES, timeAgo } from "./shared";

const QUICK = ["Keren!", "Mantap", "Semangat!", "Bangga"];
const SAVED = "sg_saved_posts";
const getSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED)) || []; } catch { return []; } };

// Kartu post interaktif: double-tap untuk suka, animasi hati, komentar, simpan, bagikan.
export function PostCard({ post, user, manage, onDeleted, full = false, onOpenClass }) {
  const [p, setP] = useState(post);
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(full);
  const [burst, setBurst] = useState(0);
  const [pop, setPop] = useState(false);
  const [more, setMore] = useState(false);
  const [saved, setSaved] = useState(() => getSaved().includes(post.id));
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption || "");
  const inputRef = useRef(null);
  const lastTap = useRef(0);
  useEffect(() => setP(post), [post]);

  const like = async (force) => {
    if (force && p.liked) return;
    setPop(true); setTimeout(() => setPop(false), 350);
    const optimistic = { liked: !p.liked, like_count: p.like_count + (p.liked ? -1 : 1) };
    setP(x => ({ ...x, ...optimistic }));
    try { const r = await api.post(`/posts/${p.id}/like`); if (!r.data.offline) setP(x => ({ ...x, like_count: r.data.like_count, liked: r.data.liked })); }
    catch { setP(x => ({ ...x, liked: !optimistic.liked, like_count: post.like_count })); }
  };
  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { setBurst(b => b + 1); like(true); }
    lastTap.current = now;
  };
  const comment = async (t = text) => {
    if (!t.trim()) return;
    try {
      const r = await api.post(`/posts/${p.id}/comment`, { text: t });
      const c = r.data.offline ? { id: `tmp-${Date.now()}`, user_id: user.id, user_name: user.name, text: t, created_at: new Date().toISOString() } : r.data;
      setP(x => ({ ...x, comments: [...(x.comments || []), c] })); setText(""); setShowAll(true);
    } catch { toast.error("Gagal kirim komentar"); }
  };
  const toggleSave = () => {
    const list = getSaved(); const next = saved ? list.filter(x => x !== p.id) : [...list, p.id];
    localStorage.setItem(SAVED, JSON.stringify(next)); setSaved(!saved);
    toast.success(saved ? "Dihapus dari simpanan" : "Disimpan ke koleksi");
  };
  const share = async () => {
    const url = `${window.location.origin}/schoolgram`;
    try { if (navigator.share) await navigator.share({ title: `Post ${p.kelas}`, text: p.caption, url }); else { await navigator.clipboard.writeText(url); toast.success("Tautan disalin"); } } catch { /* dibatalkan */ }
  };
  const saveEdit = async () => { try { await api.patch(`/schoolgram/post/${p.id}`, { caption }); setP(x => ({ ...x, caption })); setEditing(false); toast.success("Caption diperbarui"); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); } };
  const del = async () => { if (!window.confirm("Hapus postingan ini?")) return; try { await api.delete(`/schoolgram/post/${p.id}`); toast.success("Post dihapus"); onDeleted?.(); } catch { toast.error("Gagal menghapus"); } };

  const comments = p.comments || [];
  const long = (p.caption || "").length > 120;
  return (
    <article className="bg-white sm:border border-slate-200 sm:rounded-3xl overflow-hidden shadow-sm" data-testid={`sg-feed-post-${p.id}`}>
      <header className="flex items-center gap-3 p-3">
        <Avatar name={p.kelas || p.author_name} src={p.class_avatar} size="w-10 h-10" ring="story" onClick={onOpenClass ? () => onOpenClass(p.class_id) : undefined} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-slate-900 truncate">{p.kelas || p.author_name}</p>
          <p className="text-[11px] text-slate-400 truncate">{p.author_name} · {timeAgo(p.created_at)}</p>
        </div>
        {manage && <button data-testid="sg-post-edit" onClick={() => setEditing(e => !e)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>}
        {manage && <button data-testid="sg-post-delete" onClick={del} className="p-2 rounded-full hover:bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>}
      </header>
      <div className="relative select-none bg-slate-100" onClick={onMediaTap} data-testid={`sg-media-${p.id}`}>
        {p.media_type === "video"
          ? <video src={p.image} controls playsInline className="w-full max-h-[70vh] bg-black object-contain" />
          : <img src={p.image} alt="" className="w-full max-h-[75vh] object-cover" draggable={false} />}
        {burst > 0 && <Heart key={burst} className="sg-heart-burst absolute inset-0 m-auto w-28 h-28 text-white fill-white drop-shadow-2xl pointer-events-none" />}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4">
          <button data-testid={`sg-feed-like-${p.id}`} onClick={() => like()} className={pop ? "sg-like-pop" : ""} aria-label="Suka">
            <Heart className={`w-7 h-7 transition-colors ${p.liked ? "fill-rose-500 text-rose-500" : "text-slate-800 hover:text-slate-500"}`} />
          </button>
          <button data-testid={`sg-feed-comment-btn-${p.id}`} onClick={() => inputRef.current?.focus()} aria-label="Komentar"><MessageCircle className="w-7 h-7 text-slate-800 hover:text-slate-500 -scale-x-100" /></button>
          <button data-testid={`sg-feed-share-${p.id}`} onClick={share} aria-label="Bagikan"><Send className="w-6 h-6 text-slate-800 hover:text-slate-500" /></button>
          <button data-testid={`sg-feed-save-${p.id}`} onClick={toggleSave} className="ml-auto" aria-label="Simpan"><Bookmark className={`w-6 h-6 ${saved ? "fill-slate-900 text-slate-900" : "text-slate-800"}`} /></button>
        </div>
        <p className="text-sm font-bold text-slate-900" data-testid={`sg-like-count-${p.id}`}>{p.like_count} suka</p>
        {editing ? (
          <div className="flex gap-2"><input value={caption} onChange={e => setCaption(e.target.value)} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm" /><button data-testid="sg-post-save" onClick={saveEdit} className="px-3 py-2 bg-sky-600 text-white text-sm rounded-xl font-semibold">Simpan</button></div>
        ) : p.caption && (
          <p className="text-sm text-slate-800"><b>{p.kelas || p.author_name}</b> {long && !more ? `${p.caption.slice(0, 120)}… ` : p.caption}
            {long && !more && <button onClick={() => setMore(true)} className="text-slate-400 text-xs">selengkapnya</button>}</p>
        )}
        {(p.tags || []).length > 0 && <div className="flex flex-wrap gap-1">{p.tags.map(t => <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[11px] font-semibold"><Tag className="w-3 h-3" />{t}</span>)}</div>}
        {comments.length > 2 && !showAll && <button onClick={() => setShowAll(true)} data-testid={`sg-show-comments-${p.id}`} className="text-xs text-slate-400">Lihat semua {comments.length} komentar</button>}
        <div className="space-y-2">
          {(showAll ? comments : comments.slice(-2)).map(c => (
            <CommentRow key={c.id} c={c} postId={p.id} meId={user.id} isAdmin={ADMIN_ROLES.includes(user.role)}
              onChange={(u, d) => setP(pr => ({ ...pr, comments: d ? (pr.comments || []).filter(x => x.id !== d) : (pr.comments || []).map(x => x.id === u.id ? u : x) }))} />
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {QUICK.map(q => <button key={q} onClick={() => comment(q)} className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-600 transition-colors">{q}</button>)}
        </div>
        <div className="flex gap-2 items-center border-t border-slate-100 pt-2">
          <Avatar name={user.name} src={user.photo} size="w-7 h-7" text="text-[11px]" />
          <input ref={inputRef} data-testid={`sg-feed-comment-input-${p.id}`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && comment()}
            placeholder="Tambahkan komentar…" className="flex-1 py-2 bg-transparent text-sm outline-none" />
          <button data-testid={`sg-feed-comment-send-${p.id}`} onClick={() => comment()} disabled={!text.trim()} className="text-sky-600 font-bold text-sm px-2 disabled:opacity-30">Kirim</button>
        </div>
      </div>
    </article>
  );
}
