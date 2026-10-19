import { Fragment } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
export const liveWsUrl = (cid) => `${BACKEND.replace(/^http/, "ws")}/api/ws/live/${cid}`;
export const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🎉", "🙏", "🤔"];
export const PAGE_SIZE = 40;

export function fmtCountdown(ms) {
  if (ms == null || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export const fmtClock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) : "";

export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export const ROLE_LABEL = { host: "Guru", student: "Siswa", monitor: "Pemantau" };

const TOKEN_RE = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|https?:\/\/[^\s<]+)/g;

// Safe markdown-lite: **bold**, _italic_, `code`, links. Never uses innerHTML.
export function ChatText({ text }) {
  const parts = String(text || "").split(TOKEN_RE);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="px-1 rounded bg-white/10 font-mono-alt text-[12px]">{p.slice(1, -1)}</code>;
    if (p.startsWith("_") && p.endsWith("_") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline break-all">{p}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
