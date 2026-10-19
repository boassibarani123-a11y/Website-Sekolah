import { useCallback, useEffect, useMemo, useState } from "react";
import { Track } from "livekit-client";
import { ChevronLeft, ChevronRight, VideoOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useLiveKit } from "./useLiveKit";
import { VideoTile } from "./VideoTile";
import { LiveTopBar } from "./LiveTopBar";
import { LiveControlBar } from "./LiveControlBar";
import { LiveSidePanel } from "./LiveSidePanel";
import { PAGE_SIZE } from "./liveUtils";

function MediaNotice({ status }) {
  if (status === "connected") return null;
  const connecting = status === "connecting" || status === "reconnecting";
  return (
    <div data-testid="live-media-notice" className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-[11px] text-white/70 backdrop-blur">
      {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VideoOff className="w-3.5 h-3.5 text-amber-300" />}
      {status === "reconnecting" ? "Koneksi terputus, menyambung ulang…" : connecting ? "Menyambung ke server video…" : "Server video belum tersambung — chat, notifikasi & kontrol tetap berjalan"}
    </div>
  );
}

function Reactions({ items }) {
  return (
    <div className="pointer-events-none absolute bottom-24 right-6 z-20 w-24 h-72">
      {items.map((r) => (
        <div key={r.id} className="live-float absolute bottom-0 flex flex-col items-center" style={{ left: `${r.x}%` }}>
          <span className="text-4xl">{r.emoji}</span>
          <span className="text-[10px] text-white/70 bg-black/40 rounded px-1">{r.name}</span>
        </div>
      ))}
    </div>
  );
}

function useLiveFeed(sessionId) {
  const [messages, setMessages] = useState([]);
  const [hands, setHands] = useState({});
  const [reactions, setReactions] = useState([]);
  useEffect(() => { api.get(`/live/${sessionId}/chat`).then((r) => setMessages(r.data)).catch(() => {}); }, [sessionId]);
  const push = useCallback((m) => {
    if (m.type === "chat") setMessages((x) => (x.some((y) => y.id === m.message.id) ? x : [...x, m.message]));
    if (m.type === "hand") setHands((h) => ({ ...h, [m.user_id]: m.raised }));
    if (m.type === "presence" && !m.joined) setHands((h) => ({ ...h, [m.user_id]: false }));
    if (m.type === "reaction") {
      const r = { id: `${Date.now()}-${Math.random()}`, emoji: m.emoji, name: m.name, x: Math.random() * 60 };
      setReactions((x) => [...x.slice(-14), r]);
      setTimeout(() => setReactions((x) => x.filter((y) => y.id !== r.id)), 2800);
    }
  }, []);
  return { messages, hands, reactions, push };
}

export default function LiveRoom({ klass, join, socket, now, onExit, registerHandler }) {
  const { user } = useAuth();
  const media = useLiveKit();
  const feed = useLiveFeed(join.session.id);
  const [chatOpen, setChatOpen] = useState(true);
  const [page, setPage] = useState(0);
  const state = socket.state;
  const session = state?.session?.id === join.session.id ? state.session : join.session;
  const isHost = join.role === "host";
  const isMonitor = join.role === "monitor";
  const sid = join.session.id;
  const { connect, disconnect, forceMute } = media;

  useEffect(() => {
    connect(join.url, join.token);
    socket.send({ type: "join", session_id: sid });
    document.body.style.overflow = "hidden";
    return () => { socket.send({ type: "leave" }); disconnect(); document.body.style.overflow = ""; };
  }, []); // eslint-disable-line

  useEffect(() => registerHandler((m) => {
    if (m.session_id && m.session_id !== sid) return;
    if (m.type === "session_ended") { disconnect(); onExit(m.reason === "host" ? `Guru mengakhiri sesi ${m.subject}` : m.reason === "closed" ? "ZOOM DITUTUP — Kelas Live dinonaktifkan oleh sekolah" : `Jam ${m.subject} telah berakhir — Anda otomatis dikeluarkan`); }
    else if (m.type === "kicked") { disconnect(); onExit("Anda dikeluarkan dari sesi oleh guru"); }
    else if (m.type === "mute_all" && !isHost) { forceMute(); toast.info(`${m.by} membisukan semua siswa`); }
    else feed.push(m);
  }), [sid, isHost]); // eslint-disable-line

  const remaining = new Date(session.ends_at).getTime() - now;
  useEffect(() => { if (remaining < -4000) { disconnect(); onExit("Sesi telah berakhir"); } }, [remaining < -4000]); // eslint-disable-line

  const people = useMemo(() => {
    const list = [...(state?.roster || [])];
    if (!list.some((p) => p.user_id === user.id)) list.push({ user_id: user.id, name: user.name, role: join.role });
    const rank = { host: 0, monitor: 2, student: 1 };
    return list.sort((a, b) => (rank[a.role] - rank[b.role]) || a.name.localeCompare(b.name));
  }, [state?.roster, user.id, user.name, join.role]);

  const cam = (id) => media.trackOf(id, Track.Source.Camera);
  const micMuted = (id) => { const p = media.participant(id); return !p || !p.isMicrophoneEnabled; };
  const speakingId = media.speakers[0];
  const stagePerson = people.find((p) => p.user_id === media.screen?.identity)
    || people.find((p) => p.role === "host") || people.find((p) => p.user_id === speakingId) || people[0];
  const stageTrack = media.screen?.track || cam(stagePerson?.user_id);
  const others = people.filter((p) => p.user_id !== stagePerson?.user_id);
  const pages = Math.max(1, Math.ceil(others.length / PAGE_SIZE));
  const visible = others.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const call = async (path, body, ok) => {
    try { const r = await api.post(`/live/${sid}/${path}`, body); if (ok) toast.success(ok(r.data)); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const host = {
    muteAll: () => call("mute-all", {}, () => "Semua siswa dibisukan"),
    lock: (locked) => call("lock", { locked }, () => (locked ? "Ruang dikunci" : "Kunci ruang dibuka")),
    extend: () => call("extend", {}, (d) => `Sesi diperpanjang ${d.minutes} menit`),
    end: () => window.confirm("Akhiri sesi untuk semua peserta?") && call("end", {}),
    kick: (p) => window.confirm(`Keluarkan ${p.name} dari sesi?`) && call("kick", { identity: p.user_id }, () => `${p.name} dikeluarkan`),
  };
  const myHand = !!feed.hands[user.id];

  return (
    <div data-testid="live-room" className="fixed inset-0 z-[60] flex flex-col bg-[#060a13] text-white live-grid-bg">
      <LiveTopBar klass={klass} session={session} remainingMs={remaining} teacherOnline={!!state?.teacher_online}
        teacherLate={!!state?.teacher_late} count={people.length} socketOk={socket.connected} />
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3 pb-24">
        <section className="flex-1 min-w-0 min-h-0 flex flex-col gap-3">
          <div data-testid="live-stage" className="relative flex-1 min-h-[220px] rounded-3xl overflow-hidden ring-1 ring-cyan-400/20 shadow-[0_0_60px_-20px_rgba(34,211,238,0.35)]">
            <MediaNotice status={media.status} />
            {stagePerson && (
              <VideoTile size="lg" person={stagePerson} track={stageTrack} isSelf={stagePerson.user_id === user.id && !media.screen}
                speaking={media.speakers.includes(stagePerson.user_id)} hand={feed.hands[stagePerson.user_id]} micMuted={micMuted(stagePerson.user_id)} />
            )}
            {media.screen && <span className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-cyan-500/90 text-slate-900 text-[11px] font-bold">Layar dibagikan</span>}
          </div>
          <div className="flex items-center gap-2" data-testid="live-participant-strip">
            <button data-testid="live-page-prev" disabled={page === 0} onClick={() => setPage(page - 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-25"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 flex gap-2 overflow-x-auto pb-1 live-scroll">
              {visible.length === 0 && <p className="text-xs text-white/30 py-8 px-2">Belum ada peserta lain.</p>}
              {visible.map((p) => (
                <VideoTile key={p.user_id} person={p} track={cam(p.user_id)} isSelf={p.user_id === user.id}
                  speaking={media.speakers.includes(p.user_id)} hand={feed.hands[p.user_id]} micMuted={micMuted(p.user_id)}
                  canKick={isHost && p.role === "student"} onKick={() => host.kick(p)} />
              ))}
            </div>
            <button data-testid="live-page-next" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-25"><ChevronRight className="w-4 h-4" /></button>
            <span className="text-[10px] text-white/40 tabular-nums w-10 text-center">{page + 1}/{pages}</span>
          </div>
        </section>
        {chatOpen && <LiveSidePanel sessionId={sid} messages={feed.messages} isHost={isHost} state={state} />}
      </div>
      <Reactions items={feed.reactions} />
      <LiveControlBar media={media} isHost={isHost} isMonitor={isMonitor} hand={myHand} locked={!!session.locked} nextSlot={state?.next_slot}
        onHand={() => socket.send({ type: "hand", raised: !myHand })} onReact={(emoji) => socket.send({ type: "reaction", emoji })}
        chatOpen={chatOpen} onChat={() => setChatOpen(!chatOpen)} host={host}
        onLeave={() => { disconnect(); onExit(null); }} />
    </div>
  );
}
