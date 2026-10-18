import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Radio, Video, Clock, Crown, Eye, ShieldAlert, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";
import { useLiveSocket, useServerNow } from "./useLiveSocket";
import { TeacherStatus } from "./LiveTopBar";
import { ScheduleList } from "./LiveSidePanel";
import LiveRoom from "./LiveRoom";
import { LiveAdminPanel, LiveClosedCard } from "./LiveAdminPanel";
import { LiveAttendance } from "./LiveAttendance";
import { useAuth } from "@/context/AuthContext";

const STUDENT_ROLES = ["siswa", "ketua_kelas", "ketua_osis"];
import { fmtCountdown, ROLE_LABEL } from "./liveUtils";

function TeacherBanner({ text }) {
  if (!text) return null;
  return (
    <div data-testid="live-teacher-banner" className="fixed top-5 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#0b1220]/90 border border-emerald-400/40 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 fade-in">
      <span className="relative flex w-3 h-3"><span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" /><span className="relative w-3 h-3 rounded-full bg-emerald-400" /></span>
      <Bell className="w-4 h-4 text-emerald-300" /><span className="text-sm font-semibold">{text}</span>
    </div>
  );
}

function LobbyHero({ state, now, onJoin, joining }) {
  const s = state.session;
  if (!s) {
    const n = state.next_slot;
    return (
      <div className="relative rounded-3xl p-6 md:p-8 bg-[#0b1220] text-white overflow-hidden live-grid-bg" data-testid="live-idle">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Kelas Live</p>
        <h3 className="font-heading text-2xl md:text-3xl font-bold mt-2">Tidak ada sesi live saat ini</h3>
        <p className="text-sm text-white/60 mt-2">Ruang otomatis aktif sesuai Jadwal Pelajaran kelas.</p>
        {n && (
          <div className="mt-6 inline-flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Clock className="w-5 h-5 text-cyan-300" />
            <div><p className="text-xs text-white/50">Berikutnya</p><p className="font-semibold">{n.subject} · {n.start_time.slice(0, 5)}</p></div>
            <p data-testid="live-starts-in" className="font-mono-alt text-xl text-cyan-300 tabular-nums">{fmtCountdown(new Date(n.start_at).getTime() - now)}</p>
          </div>
        )}
      </div>
    );
  }
  const remaining = new Date(s.ends_at).getTime() - now;
  const RoleIcon = state.my_role === "host" ? Crown : state.my_role === "monitor" ? Eye : Video;
  return (
    <div className="relative rounded-3xl p-6 md:p-8 bg-[#0b1220] text-white overflow-hidden live-grid-bg" data-testid="live-active">
      <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start gap-6">
        <div className="flex-1 min-w-[240px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 text-[11px] font-bold tracking-wider"><Radio className="w-3.5 h-3.5 animate-pulse" />SEDANG BERLANGSUNG</span>
          <h3 data-testid="live-lobby-subject" className="font-heading text-3xl md:text-4xl font-bold mt-3">{s.subject}</h3>
          <p className="text-sm text-white/60 mt-1">{s.teacher_name || "Guru belum diatur"} · {state.participants} peserta di ruang</p>
          <div className="mt-4"><TeacherStatus online={state.teacher_online} late={state.teacher_late} name={s.teacher_name} joinedBefore={!!s.teacher_joined_at} /></div>
          {state.teacher_late && !state.teacher_online && (
            <p data-testid="live-teacher-late" className="mt-2 text-xs text-amber-300/90">Guru belum bergabung setelah 10 menit jadwal berjalan.</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Berakhir dalam</p>
          <p data-testid="live-lobby-countdown" className="font-mono-alt text-4xl font-bold text-cyan-300 tabular-nums">{fmtCountdown(remaining)}</p>
          {s.extended_minutes > 0 && <p className="text-[11px] text-amber-300">+{s.extended_minutes} menit diperpanjang</p>}
        </div>
      </div>
      <div className="relative mt-6 flex flex-wrap items-center gap-3">
        {state.can_join ? (
          <button data-testid="live-join-btn" onClick={onJoin} disabled={joining}
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-400 text-slate-900 font-bold hover:bg-cyan-300 active:scale-95 transition-[background-color,transform] disabled:opacity-60">
            {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <RoleIcon className="w-5 h-5" />}
            {state.my_role === "host" ? "Masuk sebagai Host" : state.my_role === "monitor" ? "Pantau Kelas" : "Gabung Kelas Live"}
          </button>
        ) : (
          <p data-testid="live-join-blocked" className="inline-flex items-center gap-2 text-sm text-rose-300"><ShieldAlert className="w-4 h-4" />{state.reason}</p>
        )}
        {state.my_role && <span className="text-xs text-white/40">Peran Anda: {ROLE_LABEL[state.my_role]}</span>}
      </div>
    </div>
  );
}

export default function LiveClass({ klass }) {
  const { user } = useAuth();
  const [join, setJoin] = useState(null);
  const [joining, setJoining] = useState(false);
  const [banner, setBanner] = useState(null);
  const roomHandler = useRef(null);
  const timer = useRef(null);

  const onEvent = useCallback((m) => {
    if (m.type === "teacher_joined") {
      setBanner(m.message);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setBanner(null), 7000);
    }
    if (m.type === "session_started") toast.info(`Kelas Live ${m.session.subject} dimulai`);
    roomHandler.current?.(m);
  }, []);
  const socket = useLiveSocket(klass.id, onEvent);
  const now = useServerNow(socket.offset);
  const registerHandler = useCallback((fn) => { roomHandler.current = fn; return () => { roomHandler.current = null; }; }, []);

  const doJoin = async () => {
    setJoining(true);
    try { const r = await api.post(`/classes/${klass.id}/live-token`); setJoin(r.data); }
    catch (e) { toast.error(e.response?.data?.detail || "Tidak bisa bergabung"); socket.refresh(); }
    setJoining(false);
  };
  const exit = useCallback((msg) => { setJoin(null); if (msg) toast.warning(msg, { duration: 6000 }); socket.refresh(); }, [socket]);

  if (!socket.state) return <div className="py-16 text-center text-slate-400 text-sm" data-testid="live-loading">Menghubungkan Kelas Live…</div>;
  return (
    <div className="space-y-4" data-testid="class-live">
      {createPortal(<TeacherBanner text={banner} />, document.body)}
      {socket.state.can_manage && <LiveAdminPanel klass={klass} state={socket.state} onChanged={socket.refresh} />}
      {socket.state.closed ? <LiveClosedCard state={socket.state} /> : <LobbyHero state={socket.state} now={now} onJoin={doJoin} joining={joining} />}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="font-heading font-bold text-slate-800 mb-3">Jadwal Live Hari Ini</p>
        <ScheduleList dark={false} schedule={socket.state.schedule} currentId={socket.state.session?.timetable_id} nowIso={socket.state.now} />
        <p className="text-[11px] text-slate-400 mt-3">Diambil dari menu Jadwal Pelajaran. Hanya guru pengampu jam aktif yang bisa menjadi host.</p>
      </div>
      {!STUDENT_ROLES.includes(user?.role) && <LiveAttendance klass={klass} />}
      {join && createPortal(<LiveRoom klass={klass} join={join} socket={socket} now={now} onExit={exit} registerHandler={registerHandler} />, document.body)}
    </div>
  );
}
