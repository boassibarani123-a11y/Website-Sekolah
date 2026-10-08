import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Home, Play, Send, UserCircle, Lock, Plus, X, Heart, MessageCircle, Trash2, Pencil,
  Star, ChevronLeft, Image as ImageIcon, Users, Video, Camera, Search,
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

  if (!user) return null;
  if (!unlocked) return <Gate onOk={() => { sessionStorage.setItem("sg_unlocked", "1"); setUnlocked(true); }} />;

  const tabs = [
    { k: "beranda", label: "Beranda", icon: Home },
    { k: "reels", label: "Reels", icon: Play },
    { k: "chat", label: "Pesan", icon: Send },
    { k: "profil", label: "Profil", icon: UserCircle },
  ];

  return (
    <div className="pb-24 md:pb-4 -mx-4 sm:mx-0" data-testid="schoolgram-page">
      {/* Desktop top tabs */}
      <div className="hidden md:flex items-center justify-between mb-5 px-4 sm:px-0">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Camera className="w-6 h-6 text-sky-600" /> Schoolgram</h1>
        <div className="flex gap-1 bg-slate-100 rounded-full p-1">
          {tabs.map(t => (
            <button key={t.k} data-testid={`sg-tab-${t.k}`} onClick={() => setView(t.k)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${view === t.k ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-0 sm:px-0">
        {view === "beranda" && <Beranda user={user} />}
        {view === "reels" && <Reels user={user} />}
        {view === "chat" && <Chat user={user} />}
        {view === "profil" && <ProfilHub user={user} />}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 flex items-center justify-around py-2" data-testid="sg-bottom-nav">
        {tabs.map(t => (
          <button key={t.k} data-testid={`sg-nav-${t.k}`} onClick={() => setView(t.k)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === t.k ? "text-sky-600" : "text-slate-400"}`}>
            <t.icon className={`w-6 h-6 ${t.k === "reels" ? "rotate-0" : ""}`} fill={view === t.k && t.k === "beranda" ? "currentColor" : "none"} />
            <span className="text-[10px] font-semibold">{t.label}</span>
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
function Beranda({ user }) {
  const [groups, setGroups] = useState([]);
  const [feed, setFeed] = useState([]);
  const [viewStory, setViewStory] = useState(null);
  const load = useCallback(() => {
    api.get("/schoolgram/stories").then(r => setGroups(r.data)).catch(() => {});
    api.get("/schoolgram/feed").then(r => setFeed(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-0">
      {/* Stories row */}
      <div className="bg-white sm:border border-slate-200 sm:rounded-2xl p-3 flex gap-4 overflow-x-auto no-scrollbar mb-4" data-testid="sg-stories-row">
        {groups.length === 0 && <p className="text-sm text-slate-400 py-3 px-1">Belum ada story aktif dari kelas manapun.</p>}
        {groups.map(g => (
          <button key={g.class_id} data-testid={`sg-story-group-${g.class_id}`} onClick={() => setViewStory({ list: g.items, idx: 0, title: g.class_name })}
            className="flex flex-col items-center gap-1 shrink-0 w-16">
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 via-amber-500 to-sky-500">
              <img src={g.items[0]?.image} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" />
            </div>
            <span className="text-[10px] text-slate-600 truncate w-full text-center font-medium">{g.class_name}</span>
          </button>
        ))}
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Belum ada postingan. Postingan semua kelas akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {feed.map(p => <PostCard key={p.id} post={p} user={user} onChanged={load} />)}
        </div>
      )}

      {viewStory && <StoryViewer state={viewStory} canManage={false} onClose={() => setViewStory(null)} onChanged={() => { setViewStory(null); load(); }} />}
    </div>
  );
}

function PostCard({ post, user, onChanged }) {
  const [p, setP] = useState(post);
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setP(post), [post]);
  const like = async () => { try { const r = await api.post(`/posts/${p.id}/like`); setP({ ...p, like_count: r.data.like_count, liked: r.data.liked }); } catch {} };
  const comment = async () => {
    if (!text.trim()) return;
    try { const r = await api.post(`/posts/${p.id}/comment`, { text }); setP({ ...p, comments: [...(p.comments || []), r.data] }); setText(""); }
    catch { toast.error("Gagal kirim komentar"); }
  };
  const comments = p.comments || [];
  return (
    <div className="bg-white sm:border border-slate-200 sm:rounded-2xl overflow-hidden shadow-sm" data-testid={`sg-feed-post-${p.id}`}>
      <div className="flex items-center gap-2.5 p-3">
        <Avatar name={p.author_name} />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{p.kelas || p.author_name}</p>
          <p className="text-[11px] text-slate-400 truncate">{p.author_name}</p>
        </div>
      </div>
      {p.media_type === "video"
        ? <video src={p.image} controls playsInline className="w-full max-h-[70vh] bg-black object-contain" />
        : <img src={p.image} alt="" className="w-full object-cover bg-slate-100" />}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-4">
          <button data-testid={`sg-feed-like-${p.id}`} onClick={like} className="flex items-center gap-1.5">
            <Heart className={`w-6 h-6 ${p.liked ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} /><span className="text-sm font-semibold">{p.like_count}</span>
          </button>
          <span className="flex items-center gap-1.5 text-slate-700"><MessageCircle className="w-6 h-6" /><span className="text-sm font-semibold">{comments.length}</span></span>
        </div>
        {p.caption && <p className="text-sm text-slate-800"><b>{p.kelas || p.author_name}</b> {p.caption}</p>}
        {comments.length > 2 && !showAll && <button onClick={() => setShowAll(true)} className="text-xs text-slate-400">Lihat semua {comments.length} komentar</button>}
        {(showAll ? comments : comments.slice(-2)).map(c => (
          <CommentRow key={c.id} c={c} postId={p.id} meId={user.id} isAdmin={["super_admin", "kepsek"].includes(user.role)}
            onChange={(u, d) => setP(pr => ({ ...pr, comments: d ? (pr.comments || []).filter(x => x.id !== d) : (pr.comments || []).map(x => x.id === u.id ? u : x) }))} />
        ))}
        <div className="flex gap-2 pt-1">
          <input data-testid={`sg-feed-comment-input-${p.id}`} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && comment()}
            placeholder="Tambah komentar..." className="flex-1 px-3 py-2 border border-slate-200 rounded-full text-sm focus:border-sky-500 outline-none" />
          <button data-testid={`sg-feed-comment-send-${p.id}`} onClick={comment} className="text-sky-600 font-semibold text-sm px-2">Kirim</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- REELS ---------------- */
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
function ProfilHub({ user }) {
  const [classes, setClasses] = useState([]);
  const [active, setActive] = useState(null);
  const load = () => api.get("/schoolgram/classes").then(r => setClasses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  if (active) return <ClassProfile cid={active} onBack={() => { setActive(null); load(); }} />;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <p className="text-sm text-slate-500 mb-4">Profil akun setiap kelas. Kamu bisa melihat semua kelas; hanya Ketua Kelas yang bisa mengubah profil kelasnya.</p>
      {classes.length === 0 ? <p className="text-slate-400 text-sm">Belum ada kelas.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {classes.map(c => (
            <button key={c.id} data-testid={`sg-class-card-${c.id}`} onClick={() => setActive(c.id)}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left">
              <div className="h-24 bg-gradient-to-br from-sky-500 to-indigo-700 relative">{c.cover && <img src={c.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}</div>
              <div className="p-3 relative">
                <div className={`absolute -top-7 left-3 w-12 h-12 rounded-full flex items-center justify-center font-heading font-extrabold text-white shadow-md ring-2 ring-white ${c.has_story ? "ring-4 ring-rose-400" : ""}`} style={{ background: "var(--brand)" }}>{c.name?.[0]}</div>
                <p className="font-heading font-bold text-slate-900 mt-5 truncate">{c.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5"><span>{c.post_count} post</span>·<span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{c.student_count}</span></p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassProfile({ cid, onBack }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewStory, setViewStory] = useState(null);
  const [viewPost, setViewPost] = useState(null);
  const load = () => api.get(`/schoolgram/class/${cid}`).then(r => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, [cid]); // eslint-disable-line
  if (!data) return <p className="text-slate-400 text-sm px-4">Memuat...</p>;
  const canManage = data.can_manage;
  const rings = [...data.highlights, ...data.stories];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0 space-y-5">
      <button data-testid="sg-back" onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="w-4 h-4" /> Semua Kelas</button>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="h-28 bg-gradient-to-br from-sky-500 to-indigo-700 relative">{data.class.cover && <img src={data.class.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}</div>
        <div className="p-5 pt-0">
          <div className="flex items-end justify-between -mt-10">
            <Avatar name={data.class.name} src={data.class.avatar} size="w-20 h-20 text-3xl ring-4 ring-white" />
            {canManage && (
              <div className="flex gap-2">
                <button data-testid="sg-edit-profile" onClick={() => setModal("profile")} className="px-3 py-1.5 rounded-xl border-2 border-slate-200 text-sm font-semibold flex items-center gap-1"><Pencil className="w-4 h-4" />Edit Profil</button>
                <button data-testid="sg-new-post" onClick={() => setModal("post")} className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" />Post</button>
                <button data-testid="sg-new-story" onClick={() => setModal("story")} className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-sm font-semibold flex items-center gap-1"><Plus className="w-4 h-4" />Story</button>
              </div>
            )}
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 mt-3">{data.class.name}</h1>
          <div className="flex gap-5 mt-1 text-sm">
            <span><b className="text-slate-900">{data.posts.length}</b> <span className="text-slate-500">post</span></span>
            <span><b className="text-slate-900">{data.student_count}</b> <span className="text-slate-500">siswa</span></span>
            <span><b className="text-slate-900">{data.highlights.length}</b> <span className="text-slate-500">sorotan</span></span>
          </div>
          {data.class.description && <p className="text-sm text-slate-600 mt-2">{data.class.description}</p>}
          {rings.length > 0 && (
            <div className="flex gap-4 mt-4 overflow-x-auto no-scrollbar pb-1">
              {rings.map((s, i) => (
                <button key={s.id} data-testid={`sg-story-ring-${s.id}`} onClick={() => setViewStory({ list: rings, idx: i })} className="flex flex-col items-center gap-1 shrink-0 w-16">
                  <div className={`w-16 h-16 rounded-full p-0.5 ${s.highlighted ? "bg-amber-400" : "bg-gradient-to-br from-rose-500 to-amber-500"}`}><img src={s.image} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" /></div>
                  <span className="text-[10px] text-slate-500 truncate w-full text-center">{s.highlighted ? (s.highlight_title || "Sorotan") : "Story"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.posts.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center border border-slate-200"><ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Belum ada postingan.</p></div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          {data.posts.map(p => (
            <button key={p.id} data-testid={`sg-post-${p.id}`} onClick={() => setViewPost(p)} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group">
              {p.media_type === "video" ? <><video src={p.image} className="w-full h-full object-cover" /><Play className="w-6 h-6 text-white absolute top-2 right-2 fill-white" /></> : <img src={p.image} alt="" className="w-full h-full object-cover" />}
              <div className="absolute inset-0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-4 text-white opacity-0 group-hover:opacity-100">
                <span className="flex items-center gap-1 text-sm font-bold"><Heart className="w-4 h-4 fill-white" />{p.like_count}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {modal === "post" && <UploadModal title="Post Baru" allowVideo onClose={() => setModal(null)} onSubmit={async (m, cap) => { await api.post(`/schoolgram/class/${cid}/post`, { image: m.url, caption: cap, media_type: m.type }); toast.success("Post dibuat"); setModal(null); load(); }} />}
      {modal === "story" && <UploadModal title="Story Baru (24 jam)" onClose={() => setModal(null)} onSubmit={async (m, cap) => { await api.post(`/schoolgram/class/${cid}/story`, { image: m.url, caption: cap }); toast.success("Story ditambahkan"); setModal(null); load(); }} />}
      {modal === "profile" && <EditProfileModal cid={cid} data={data.class} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {viewStory && <StoryViewer state={viewStory} canManage={canManage} onClose={() => setViewStory(null)} onChanged={() => { setViewStory(null); load(); }} />}
      {viewPost && <PostModal post={viewPost} canManage={canManage} onClose={() => setViewPost(null)} onChanged={() => { setViewPost(null); load(); }} />}
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

function PostModal({ post, canManage, onClose, onChanged }) {
  const { user } = useAuth();
  const isAdmin = ["super_admin", "kepsek"].includes(user.role);
  const [p, setP] = useState(post);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const like = async () => { const r = await api.post(`/posts/${p.id}/like`); setP({ ...p, like_count: r.data.like_count, liked: r.data.liked }); };
  const submitComment = async () => { if (!commentText.trim()) return; const r = await api.post(`/posts/${p.id}/comment`, { text: commentText }); setP({ ...p, comments: [...(p.comments || []), r.data] }); setCommentText(""); };
  const saveEdit = async () => { try { await api.patch(`/schoolgram/post/${p.id}`, { caption }); setP({ ...p, caption }); setEditing(false); toast.success("Caption diperbarui"); } catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); } };
  const del = async () => { if (!window.confirm("Hapus postingan ini?")) return; try { await api.delete(`/schoolgram/post/${p.id}`); toast.success("Post dihapus"); onChanged(); } catch { toast.error("Gagal menghapus"); } };
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" data-testid="sg-post-modal" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><Avatar name={p.author_name} /><div><p className="font-semibold text-sm">{p.kelas}</p><p className="text-[10px] text-slate-500">{p.author_name}</p></div></div>
          <div className="flex items-center gap-1">
            {canManage && <button data-testid="sg-post-edit" onClick={() => setEditing(e => !e)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Pencil className="w-4 h-4" /></button>}
            {canManage && <button data-testid="sg-post-delete" onClick={del} className="p-2 rounded-lg hover:bg-rose-100 text-rose-500"><Trash2 className="w-4 h-4" /></button>}
            <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {p.media_type === "video" ? <video src={p.image} controls className="w-full max-h-[60vh] bg-black object-contain" /> : <img src={p.image} alt="" className="w-full aspect-square object-cover bg-slate-100" />}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <button data-testid="sg-like" onClick={like} className="flex items-center gap-1.5"><Heart className={`w-6 h-6 ${p.liked ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} /><span className="text-sm font-semibold">{p.like_count}</span></button>
            <span className="flex items-center gap-1.5 text-slate-700"><MessageCircle className="w-6 h-6" /><span className="text-sm font-semibold">{(p.comments || []).length}</span></span>
          </div>
          {editing ? (
            <div className="flex gap-2"><input value={caption} onChange={e => setCaption(e.target.value)} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm" /><button data-testid="sg-post-save" onClick={saveEdit} className="px-3 py-2 bg-sky-600 text-white text-sm rounded-lg font-semibold">Simpan</button></div>
          ) : (p.caption && <p className="text-sm text-slate-800"><b>{p.kelas}</b> {p.caption}</p>)}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            {(p.comments || []).map(c => <CommentRow key={c.id} c={c} postId={p.id} meId={user.id} isAdmin={isAdmin}
              onChange={(u, d) => setP(pr => ({ ...pr, comments: d ? (pr.comments || []).filter(x => x.id !== d) : (pr.comments || []).map(x => x.id === u.id ? u : x) }))} />)}
            <div className="flex gap-2"><input data-testid="sg-comment-input" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Tulis komentar..." className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none" /><button data-testid="sg-comment-send" onClick={submitComment} className="px-3 py-2 bg-sky-600 text-white text-sm rounded-lg font-semibold">Kirim</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}
