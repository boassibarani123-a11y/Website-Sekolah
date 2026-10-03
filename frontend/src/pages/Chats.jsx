import { useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MessageSquare, Send, ArrowLeft, Video, X as XIcon } from "lucide-react";

export default function Chats() {
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const endRef = useRef(null);

  const loadThreads = () => api.get("/chats").then(r => setThreads(r.data));
  const loadMessages = (sid) => api.get(`/chats/${sid}/messages`).then(r => { setMessages(r.data.messages); setActive(r.data.student); });

  useEffect(() => {
    loadThreads();
    const t = setInterval(() => { loadThreads(); if (active) loadMessages(active.id); }, 10000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      await api.post(`/chats/${active.id}/messages`, { body: text });
      setText(""); loadMessages(active.id); loadThreads();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal kirim"); }
  };

  const canSend = ["guru","orang_tua","super_admin"].includes(user.role);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" data-testid="chats-page">
      <aside className={`${active?"hidden md:flex":"flex"} flex-col w-full md:w-80 border-r border-slate-200 bg-slate-50`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <h1 className="font-heading text-xl font-extrabold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-sky-600"/>Chat Wali Kelas ↔ Ortu</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {user.role==="guru"?`Sebagai wali ${user.kelas||"—"}`:user.role==="orang_tua"?"Sebagai Orang Tua":"Sebagai Guru/Admin"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length===0 && <p className="p-6 text-center text-slate-400 text-sm italic">Belum ada thread.</p>}
          {threads.map(t => (
            <button key={t.student_id} onClick={()=>loadMessages(t.student_id)}
              className={`w-full text-left p-4 border-b border-slate-100 hover:bg-white transition-colors ${active?.id===t.student_id?"bg-white":""}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 overflow-hidden">
                  {t.photo ? <img src={t.photo} alt="" className="w-full h-full object-cover"/> : t.student_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-900 truncate">{t.student_name}</p>
                    {t.unread > 0 && <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{t.unread}</span>}
                  </div>
                  <p className="text-[10px] text-slate-500">{t.kelas} · Ortu: {t.parent_name || "—"}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">{t.last_message || <i className="text-slate-400">Belum ada pesan</i>}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`${active?"flex":"hidden md:flex"} flex-1 flex-col`}>
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Pilih siswa untuk memulai chat</div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <button onClick={()=>{setActive(null); setMessages([]);}} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5"/></button>
              <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold overflow-hidden">
                {active.photo ? <img src={active.photo} alt="" className="w-full h-full object-cover"/> : active.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-slate-900 truncate">{active.name}</p>
                <p className="text-[11px] text-slate-500">{active.kelas} · Ortu: {active.parent_name || "—"}</p>
              </div>
              {["guru","orang_tua","super_admin"].includes(user.role) && (
                <button data-testid="video-call-button" onClick={()=>setCallOpen(true)}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5 hover:bg-emerald-700 shadow">
                  <Video className="w-4 h-4"/>Video Call
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length===0 && <p className="text-center text-slate-400 text-sm italic mt-8">Mulai percakapan dengan pesan pertama.</p>}
              {messages.map(m => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine?"justify-end":"justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${mine?"bg-sky-600 text-white rounded-br-sm":"bg-white text-slate-800 border border-slate-200 rounded-bl-sm"}`}>
                      {!mine && <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{m.sender_name} · {m.sender_role}</p>}
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine?"text-sky-100":"text-slate-400"}`}>{new Date(m.created_at).toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef}/>
            </div>
            {canSend ? (
              <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
                  placeholder="Tulis pesan..." data-testid="chat-input"
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
                <button data-testid="chat-send" onClick={send} className="px-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 flex items-center gap-1.5"><Send className="w-4 h-4"/></button>
              </div>
            ) : (
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500 italic">Hanya Wali Kelas dan Orang Tua yang dapat mengirim pesan di ruang ini.</div>
            )}
          </>
        )}
      </section>

      {callOpen && active && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col">
          <div className="p-4 flex items-center justify-between bg-slate-900 text-white">
            <div>
              <p className="font-heading font-bold text-lg flex items-center gap-2"><Video className="w-5 h-5 text-emerald-400"/>Video Call — {active.name}</p>
              <p className="text-xs text-slate-400">Room aman & unik per siswa. Powered by Jitsi Meet.</p>
            </div>
            <button data-testid="video-call-end" onClick={()=>setCallOpen(false)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold flex items-center gap-2">
              <XIcon className="w-4 h-4"/>Tutup
            </button>
          </div>
          <iframe title="video-call" allow="camera; microphone; fullscreen; display-capture; autoplay"
            src={`https://meet.jit.si/SEKOLAHKU-${active.id}#userInfo.displayName="${encodeURIComponent(user.name)}"&config.prejoinPageEnabled=false`}
            className="flex-1 border-0 bg-black"/>
        </div>
      )}
    </div>
  );
}
