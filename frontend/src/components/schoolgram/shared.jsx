import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

export const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
export const ADMIN_ROLES = ["super_admin", "kepsek"];

export async function uploadMedia(file) {
  const fd = new FormData();
  fd.append("file", file);
  const up = await api.post("/upload", fd);
  return { url: `${BACKEND}${up.data.url}`, type: (file.type || "").startsWith("video") ? "video" : "image" };
}

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam`;
  if (s < 604800) return `${Math.floor(s / 86400)} hr`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const SEEN = "sg_seen_stories";
export const seenStories = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN)) || []); } catch { return new Set(); } };
export const markSeen = (id) => { const s = seenStories(); s.add(id); localStorage.setItem(SEEN, JSON.stringify([...s].slice(-500))); };

// Foto profil lingkaran; ring="story" (gradien ala Instagram), "seen" (abu), "highlight" (emas)
export function Avatar({ name, src, size = "w-9 h-9", text = "text-sm", ring, onClick, testid }) {
  const inner = src
    ? <img src={src} alt="" className="w-full h-full rounded-full object-cover" />
    : <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-heading font-extrabold ${text}`} style={{ background: "var(--brand)" }}>{(name || "?")[0]?.toUpperCase()}</div>;
  const ringCls = ring === "story" ? "sg-ring" : ring === "seen" ? "sg-ring-seen" : ring === "highlight" ? "bg-gradient-to-tr from-amber-300 to-amber-500" : "";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} data-testid={testid} className={`${size} shrink-0 rounded-full relative ${ring ? "p-[3px]" : ""} ${ringCls} ${onClick ? "transition-transform hover:scale-105 active:scale-95" : ""}`}>
      <div className={`w-full h-full rounded-full ${ring ? "p-[2px] bg-white" : ""}`}>{inner}</div>
    </Tag>
  );
}

export function CommentRow({ c, postId, meId, isAdmin, onChange }) {
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
    <div className="group flex items-start gap-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300" data-testid={`sg-comment-${c.id}`}>
      <Avatar name={c.user_name} size="w-7 h-7" text="text-[11px]" />
      {editing ? (
        <div className="flex-1 flex gap-1 items-center">
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && save()} className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none" />
          <button data-testid={`sg-comment-save-${c.id}`} onClick={save} className="text-sky-600 text-xs font-semibold px-1">Simpan</button>
          <button onClick={() => { setEditing(false); setVal(c.text); }} className="text-slate-400 text-xs px-1">Batal</button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p><b className="text-slate-900">{c.user_name}</b> <span className="text-slate-700 break-words">{c.text}</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(c.created_at)}{c.edited && " · diedit"}</p>
          </div>
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
