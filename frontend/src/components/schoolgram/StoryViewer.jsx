import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Star, Trash2, Pause } from "lucide-react";
import { Avatar, markSeen, timeAgo } from "./shared";

const DURATION = 5000;

// Story layar penuh: progress bar otomatis, ketuk kiri/kanan, tahan untuk jeda.
export function StoryViewer({ state, canManage, onClose, onChanged }) {
  const [idx, setIdx] = useState(state.idx);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const holdRef = useRef(null);
  const s = state.list[idx];
  const next = useCallback(() => { if (idx >= state.list.length - 1) onClose(); else { setIdx(i => i + 1); setElapsed(0); } }, [idx, state.list.length, onClose]);
  const prev = () => { setIdx(i => Math.max(i - 1, 0)); setElapsed(0); };

  useEffect(() => { if (s) markSeen(s.id); }, [s]);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed(e => e + 50), 50);
    return () => clearInterval(t);
  }, [paused, idx]);
  useEffect(() => { if (elapsed >= DURATION) next(); }, [elapsed, next]);
  useEffect(() => {
    const k = (e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [next, onClose]);
  if (!s) return null;

  const toggleHighlight = async () => {
    try { await api.post(`/schoolgram/story/${s.id}/highlight`, { highlighted: !s.highlighted, title: "Sorotan" }); toast.success(s.highlighted ? "Dihapus dari sorotan" : "Disimpan ke sorotan"); onChanged(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal"); }
  };
  const del = async () => { if (!window.confirm("Hapus story ini?")) return; try { await api.delete(`/schoolgram/story/${s.id}`); toast.success("Story dihapus"); onChanged(); } catch { toast.error("Gagal menghapus"); } };
  const down = () => { holdRef.current = setTimeout(() => setPaused(true), 180); };
  const up = (dir) => { clearTimeout(holdRef.current); if (paused) { setPaused(false); return; } dir < 0 ? prev() : next(); };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 animate-in fade-in duration-200" data-testid="sg-story-viewer">
      <div className="relative w-full max-w-sm h-full sm:h-[88vh] sm:rounded-3xl overflow-hidden bg-black">
        <img src={s.image} alt="" className="absolute inset-0 w-full h-full object-contain animate-in zoom-in-95 duration-300" key={s.id} />
        <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/70 to-transparent z-10">
          <div className="flex gap-1">
            {state.list.map((x, i) => (
              <div key={x.id} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white" style={{ width: i < idx ? "100%" : i === idx ? `${Math.min(100, elapsed / DURATION * 100)}%` : "0%" }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-white">
            <Avatar name={s.class_name} src={state.avatar} size="w-8 h-8" />
            <p className="text-sm font-semibold">{s.class_name || state.title}</p>
            <p className="text-xs text-white/60">{s.highlighted ? (s.highlight_title || "Sorotan") : timeAgo(s.created_at)}</p>
            {paused && <Pause className="w-4 h-4 ml-1 text-white/80" />}
            <button data-testid="sg-story-close" onClick={onClose} className="ml-auto p-1"><X className="w-6 h-6" /></button>
          </div>
        </div>
        <button aria-label="Sebelumnya" data-testid="sg-story-prev" className="absolute left-0 top-0 h-full w-1/3 z-[5]" onPointerDown={down} onPointerUp={() => up(-1)} />
        <button aria-label="Berikutnya" data-testid="sg-story-next" className="absolute right-0 top-0 h-full w-2/3 z-[5]" onPointerDown={down} onPointerUp={() => up(1)} />
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
          {s.caption && <p className="text-white text-sm text-center mb-3">{s.caption}</p>}
          {canManage && (
            <div className="flex justify-center gap-2">
              <button data-testid="sg-highlight-toggle" onClick={toggleHighlight} className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold ${s.highlighted ? "bg-amber-400 text-slate-900" : "bg-white/20 text-white backdrop-blur"}`}><Star className="w-4 h-4" />{s.highlighted ? "Sorotan" : "Jadikan Sorotan"}</button>
              <button data-testid="sg-story-delete" onClick={del} className="p-2.5 rounded-full bg-rose-500/80 text-white"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
