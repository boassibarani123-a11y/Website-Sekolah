import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { Megaphone, ChevronLeft, ChevronRight } from "lucide-react";

export function LoginAnnouncementBanner() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  useEffect(() => { api.get("/announcements/login").then(r => setItems(r.data)).catch(() => {}); }, []);
  if (!items.length) return null;
  const a = items[i];
  const go = (d) => setI((i + d + items.length) % items.length);
  return (
    <div data-testid="login-announcement-banner" className="mb-8 relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow">
          <Megaphone className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pengumuman Penting · {a.category || "Umum"}</p>
          <p data-testid="login-announcement-title" className="font-heading font-bold text-slate-900 leading-snug">{a.title}</p>
          <p data-testid="login-announcement-content" className="mt-1 text-xs text-slate-600 whitespace-pre-line line-clamp-4">{a.content}</p>
        </div>
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[10px] text-slate-400 mr-auto">{i + 1} / {items.length}</span>
          <button data-testid="login-announcement-prev" type="button" onClick={() => go(-1)} className="p-1 rounded-lg hover:bg-amber-100 text-amber-700"><ChevronLeft className="w-4 h-4" /></button>
          <button data-testid="login-announcement-next" type="button" onClick={() => go(1)} className="p-1 rounded-lg hover:bg-amber-100 text-amber-700"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
