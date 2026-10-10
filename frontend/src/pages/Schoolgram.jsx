import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Home, Play, Send, UserCircle, Lock, Heart, MessageCircle, ChevronLeft, Image as ImageIcon, Users, Camera, Search, Volume2, VolumeX } from "lucide-react";
import { Avatar, BACKEND, seenStories } from "@/components/schoolgram/shared";
import { PostCard } from "@/components/schoolgram/PostCard";
import { StoryViewer } from "@/components/schoolgram/StoryViewer";
import { ClassProfile } from "@/components/schoolgram/ClassProfile";

const WS_URL = BACKEND.replace(/^http/, "ws") + "/api/ws/chat";

export default function Schoolgram() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem("sg_unlocked") === "1");
  const [view, setView] = useState("beranda");
  const [openClass, setOpenClass] = useState(null);

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
        {view === "beranda" && <Beranda user={user} onOpenClass={(id) => { setOpenClass(id); setView("profil"); }} />}
        {view === "reels" && <Reels user={user} />}
        {view === "chat" && <Chat user={user} />}
        {view === "profil" && <ProfilHub openId={openClass} onOpened={() => setOpenClass(null)} />}
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
                <Avatar name={c.name} src={c.photo} />
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
                <Avatar name={peer.name} src={peer.photo} size="w-8 h-8" />
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


/* ---------------- BERANDA (stories + feed) ---------------- */
function Beranda({ user, onOpenClass }) {
  const [groups, setGroups] = useState([]);
  const [feed, setFeed] = useState(null);
  const [viewStory, setViewStory] = useState(null);
  const [, force] = useState(0);
  const load = useCallback(() => {
    api.get("/schoolgram/stories").then(r => setGroups(r.data)).catch(() => {});
    api.get("/schoolgram/feed").then(r => setFeed(r.data)).catch(() => setFeed([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  const seen = seenStories();
  const sorted = [...groups].sort((a, b) => a.items.every(s => seen.has(s.id)) - b.items.every(s => seen.has(s.id)));

  return (
    <div className="max-w-xl mx-auto px-0 sm:px-0">
      <div className="bg-white sm:border border-slate-200 sm:rounded-3xl p-4 flex gap-4 overflow-x-auto no-scrollbar mb-4" data-testid="sg-stories-row">
        {sorted.length === 0 && <p className="text-sm text-slate-400 py-3 px-1">Belum ada story aktif dari kelas manapun.</p>}
        {sorted.map(g => {
          const done = g.items.every(s => seen.has(s.id));
          return (
            <div key={g.class_id} className="flex flex-col items-center gap-1.5 shrink-0 w-[70px]">
              <Avatar testid={`sg-story-group-${g.class_id}`} name={g.class_name} src={g.avatar || g.items[0]?.image} size="w-[66px] h-[66px]" text="text-xl" ring={done ? "seen" : "story"}
                onClick={() => setViewStory({ list: g.items, idx: Math.max(0, g.items.findIndex(s => !seen.has(s.id))), title: g.class_name, avatar: g.avatar })} />
              <span className={`text-[11px] truncate w-full text-center ${done ? "text-slate-400" : "text-slate-700 font-semibold"}`}>{g.class_name}</span>
            </div>
          );
        })}
      </div>
      {feed === null ? <div className="space-y-4">{[0, 1].map(i => <div key={i} className="h-96 bg-slate-200 sm:rounded-3xl animate-pulse" />)}</div>
        : feed.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Belum ada postingan. Postingan semua kelas akan muncul di sini.</p>
          </div>
        ) : <div className="space-y-5">{feed.map(p => <PostCard key={p.id} post={p} user={user} onOpenClass={onOpenClass} />)}</div>}
      {viewStory && <StoryViewer state={viewStory} canManage={false} onClose={() => { setViewStory(null); force(x => x + 1); }} onChanged={() => { setViewStory(null); load(); }} />}
    </div>
  );
}

/* ---------------- REELS ---------------- */
function Reels() {
  const [reels, setReels] = useState(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => { api.get("/schoolgram/reels").then(r => setReels(r.data)).catch(() => setReels([])); }, []);
  if (reels === null) return <div className="max-w-md mx-auto h-[70vh] rounded-3xl bg-slate-200 animate-pulse" />;
  if (reels.length === 0) return (
    <div className="max-w-xl mx-auto px-4 bg-white border border-slate-200 rounded-3xl p-10 text-center">
      <Play className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500">Belum ada Reels. Reels diisi dari postingan kelas yang berupa <b>video</b> kreatif.</p>
    </div>
  );
  return (
    <div className="max-w-md mx-auto h-[calc(100vh-11rem)] md:h-[calc(100vh-13rem)] overflow-y-auto snap-y snap-mandatory sm:rounded-3xl no-scrollbar" data-testid="sg-reels">
      {reels.map(r => <ReelItem key={r.id} reel={r} muted={muted} setMuted={setMuted} />)}
    </div>
  );
}

function ReelItem({ reel, muted, setMuted }) {
  const [r, setR] = useState(reel);
  const [burst, setBurst] = useState(0);
  const ref = useRef(null);
  const lastTap = useRef(0);
  const like = async (force) => {
    if (force && r.liked) return;
    setR(x => ({ ...x, liked: !x.liked, like_count: x.like_count + (x.liked ? -1 : 1) }));
    try { const d = await api.post(`/posts/${r.id}/like`); if (!d.data.offline) setR(x => ({ ...x, like_count: d.data.like_count, liked: d.data.liked })); } catch { /* ignore */ }
  };
  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) { setBurst(b => b + 1); like(true); }
    else setTimeout(() => { if (Date.now() - lastTap.current >= 300 && ref.current) ref.current.paused ? ref.current.play() : ref.current.pause(); }, 310);
    lastTap.current = now;
  };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return (
    <div className="relative h-full snap-start bg-black flex items-center justify-center" data-testid={`sg-reel-${r.id}`}>
      <video ref={ref} src={r.image} loop muted={muted} playsInline className="w-full h-full object-contain" onClick={tap} />
      {burst > 0 && <Heart key={burst} className="sg-heart-burst absolute inset-0 m-auto w-32 h-32 text-white fill-white pointer-events-none" />}
      <button data-testid={`sg-reel-mute-${r.id}`} onClick={() => setMuted(m => !m)} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white backdrop-blur">{muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</button>
      <div className="absolute bottom-0 inset-x-0 p-4 pr-20 bg-gradient-to-t from-black/80 to-transparent text-white">
        <div className="flex items-center gap-2"><Avatar name={r.kelas} size="w-8 h-8" ring="story" /><p className="font-bold text-sm">{r.kelas}</p></div>
        {r.caption && <p className="text-sm opacity-90 mt-2 line-clamp-2">{r.caption}</p>}
      </div>
      <div className="absolute bottom-6 right-3 flex flex-col items-center gap-5 text-white">
        <button data-testid={`sg-reel-like-${r.id}`} onClick={() => like()} className="flex flex-col items-center active:scale-90 transition-transform"><Heart className={`w-8 h-8 ${r.liked ? "fill-rose-500 text-rose-500" : ""}`} /><span className="text-xs font-bold">{r.like_count}</span></button>
        <div className="flex flex-col items-center"><MessageCircle className="w-8 h-8" /><span className="text-xs font-bold">{(r.comments || []).length}</span></div>
      </div>
    </div>
  );
}

/* ---------------- PROFIL HUB ---------------- */
function ProfilHub({ openId, onOpened }) {
  const [classes, setClasses] = useState(null);
  const [active, setActive] = useState(openId);
  const [q, setQ] = useState("");
  const load = () => api.get("/schoolgram/classes").then(r => setClasses(r.data)).catch(() => setClasses([]));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (openId) { setActive(openId); onOpened(); } }, [openId, onOpened]);
  if (active) return <ClassProfile cid={active} onBack={() => { setActive(null); load(); }} />;
  const list = (classes || []).filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm text-slate-500">Profil akun setiap kelas. Hanya Ketua Kelas yang bisa mengubah profil kelasnya.</p>
        <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5"><Search className="w-4 h-4 text-slate-400" /><input data-testid="sg-class-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari kelas" className="outline-none text-sm w-32 bg-transparent" /></label>
      </div>
      {classes === null ? <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{[0, 1, 2].map(i => <div key={i} className="h-44 rounded-3xl bg-slate-200 animate-pulse" />)}</div>
        : list.length === 0 ? <p className="text-slate-400 text-sm">Belum ada kelas.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {list.map((c, i) => (
            <button key={c.id} data-testid={`sg-class-card-${c.id}`} onClick={() => setActive(c.id)} style={{ animationDelay: `${i * 40}ms` }}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-[transform,box-shadow] duration-300 text-left animate-in fade-in slide-in-from-bottom-2 fill-mode-both">
              <div className="h-20 bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600 relative">{c.cover && <img src={c.cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}</div>
              <div className="px-3 pb-4 flex flex-col items-center text-center -mt-9 relative z-10">
                <Avatar name={c.name} src={c.avatar} size="w-[72px] h-[72px]" text="text-2xl" ring={c.has_story ? "story" : "highlight"} />
                <p className="font-heading font-bold text-slate-900 mt-2 truncate w-full">{c.name}</p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5"><span>{c.post_count} post</span>·<span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{c.student_count}</span></p>
                {c.can_manage && <span className="mt-2 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold uppercase">Kelola</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
