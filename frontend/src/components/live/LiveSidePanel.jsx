import { useEffect, useRef, useState } from "react";
import { Send, Megaphone, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";
import { ChatText, fmtClock, ROLE_LABEL } from "./liveUtils";

function ChatTab({ sessionId, messages, isHost }) {
  const [text, setText] = useState("");
  const [announce, setAnnounce] = useState(false);
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try { await api.post(`/live/${sessionId}/chat`, { text, announcement: announce }); setText(""); setAnnounce(false); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mengirim"); }
    setBusy(false);
  };
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" data-testid="live-chat-list">
        {messages.length === 0 && <p className="text-center text-xs text-white/30 py-10">Belum ada pesan. Sapa kelasmu!</p>}
        {messages.map((m) => m.announcement ? (
          <div key={m.id} className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300"><Megaphone className="w-3.5 h-3.5" />Pengumuman · {m.name} · {fmtClock(m.created_at)}</p>
            <p className="text-sm text-amber-50 mt-1 whitespace-pre-wrap break-words"><ChatText text={m.text} /></p>
          </div>
        ) : (
          <div key={m.id} className="animate-in fade-in slide-in-from-bottom-1">
            <p className="text-[11px] text-white/40">
              <span className={`font-semibold ${m.role === "host" ? "text-cyan-300" : "text-white/70"}`}>{m.name}</span>
              {m.role !== "student" && <span className="ml-1">· {ROLE_LABEL[m.role]}</span>} · {fmtClock(m.created_at)}
            </p>
            <p className="text-sm text-white/90 whitespace-pre-wrap break-words"><ChatText text={m.text} /></p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-white/10 space-y-2">
        {isHost && (
          <label className="flex items-center gap-2 text-[11px] text-white/60">
            <input data-testid="live-chat-announce" type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="accent-amber-400" />
            Kirim sebagai pengumuman
          </label>
        )}
        <div className="flex gap-2">
          <input data-testid="live-chat-input" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pesan… (**tebal**, _miring_, link)"
            className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/60" />
          <button data-testid="live-chat-send" disabled={busy} className="px-3 rounded-xl bg-cyan-500 text-slate-900 hover:bg-cyan-400 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button>
        </div>
      </form>
    </div>
  );
}

export function ScheduleList({ schedule, currentId, nowIso, dark = true }) {
  if (!schedule?.length) return <p className={`text-xs py-6 text-center ${dark ? "text-white/30" : "text-slate-400"}`}>Tidak ada jadwal hari ini.</p>;
  return (
    <ol className="space-y-2" data-testid="live-schedule-list">
      {schedule.map((s) => {
        const cur = s.id === currentId;
        const done = s.end_at <= nowIso && !cur;
        return (
          <li key={s.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors
            ${cur ? (dark ? "border-cyan-400/50 bg-cyan-400/10" : "border-sky-300 bg-sky-50") : dark ? "border-white/5 bg-white/[0.03]" : "border-slate-100 bg-slate-50"}
            ${done ? "opacity-45" : ""}`}>
            <span className={`font-mono-alt text-[11px] tabular-nums w-[88px] shrink-0 ${dark ? "text-white/60" : "text-slate-500"}`}>{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold truncate ${dark ? "text-white" : "text-slate-800"}`}>{s.subject}</p>
              <p className={`text-[11px] truncate ${dark ? "text-white/40" : "text-slate-500"}`}>{s.teacher_name || "Guru belum diatur"}</p>
            </div>
            {cur && <span className="text-[10px] font-bold text-rose-400 animate-pulse">LIVE</span>}
            {done && <span className={`text-[10px] ${dark ? "text-white/40" : "text-slate-400"}`}>Selesai</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function LiveSidePanel({ sessionId, messages, isHost, state }) {
  const [tab, setTab] = useState("chat");
  const next = state?.next_slot;
  return (
    <aside data-testid="live-side-panel" className="w-full lg:w-[340px] shrink-0 flex flex-col min-h-0 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-2 p-1.5 gap-1 border-b border-white/10">
        {[["chat", "Live Chat"], ["jadwal", "Jadwal"]].map(([k, l]) => (
          <button key={k} data-testid={`live-panel-tab-${k}`} onClick={() => setTab(k)}
            className={`py-2 rounded-xl text-xs font-bold transition-colors ${tab === k ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>{l}</button>
        ))}
      </div>
      {tab === "chat" ? <ChatTab sessionId={sessionId} messages={messages} isHost={isHost} /> : (
        <div className="p-3 overflow-y-auto space-y-4">
          <div data-testid="live-next-subject" className="rounded-xl p-3 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-white/10">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/50"><CalendarClock className="w-3.5 h-3.5" />Berikutnya</p>
            {next ? (
              <>
                <p className="font-heading font-bold text-white mt-1">{next.subject}</p>
                <p className="text-xs text-white/60">{next.start_time.slice(0, 5)}–{next.end_time.slice(0, 5)} · {next.teacher_name || "-"}</p>
              </>
            ) : <p className="text-sm text-white/60 mt-1">Tidak ada mapel lagi hari ini.</p>}
          </div>
          <ScheduleList schedule={state?.schedule} currentId={state?.session?.timetable_id} nowIso={state?.now} />
        </div>
      )}
    </aside>
  );
}
