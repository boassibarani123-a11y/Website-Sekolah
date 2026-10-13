import { useState, useRef, useEffect } from "react";
import api from "@/lib/apiClient";
import { Bot, X, Send } from "lucide-react";

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Halo! Saya Asisten AI sekolah. Ada yang bisa saya bantu?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = async () => {
    const m = input.trim();
    if (!m || busy) return;
    const next = [...msgs, { role: "user", content: m }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await api.post("/ai/chat", { message: m, history: next });
      setMsgs([...next, { role: "assistant", content: r.data.reply }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: e?.response?.data?.detail || "Maaf, fitur AI sedang tidak tersedia." }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button data-testid="ai-assistant-fab" onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-sky-600 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>
      {open && (
        <div data-testid="ai-assistant-panel" className="fixed bottom-24 right-6 z-40 w-[22rem] max-w-[calc(100vw-3rem)] h-[28rem] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-sky-600 text-white flex items-center gap-2">
            <Bot className="w-5 h-5" /><p className="font-heading font-bold">Asisten AI</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-line ${m.role === "user" ? "bg-sky-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="text-xs text-slate-400 px-1">Asisten mengetik…</div>}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-slate-200 flex gap-2">
            <input data-testid="ai-assistant-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Tulis pertanyaan..." className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-sky-500" />
            <button data-testid="ai-assistant-send" onClick={send} disabled={busy} className="px-3 rounded-xl bg-sky-600 text-white disabled:opacity-60"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </>
  );
}
