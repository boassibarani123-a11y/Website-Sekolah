import { useEffect, useRef } from "react";

// Global keyboard-wedge listener: works with any number of USB scanners on the same device
// (each scan is a burst of keystrokes ending with Enter) without needing a focused input.
export function useScannerInput(onCode, enabled = true) {
  const buf = useRef("");
  const timer = useRef(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      const code = buf.current.trim();
      buf.current = "";
      if (code.length >= 4) cb.current(code);
    };
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter" || e.key === "Tab") {
        if (buf.current) { e.preventDefault(); clearTimeout(timer.current); flush(); }
        return;
      }
      if (e.key.length !== 1) return;
      buf.current += e.key;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 120);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(timer.current); };
  }, [enabled]);
}

let ctx;
export function beep(ok = true) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = ok ? 1046 : 220; o.type = ok ? "sine" : "square";
    g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + (ok ? 0.15 : 0.4));
  } catch { /* audio not available */ }
}

export function getStation() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem("gate_station") || "null"); } catch { s = null; }
  if (!s?.id) {
    s = { id: (crypto.randomUUID?.() || `st-${Date.now()}-${Math.random().toString(36).slice(2)}`), name: "Gerbang 1" };
    localStorage.setItem("gate_station", JSON.stringify(s));
  }
  return s;
}

export function saveStation(s) { localStorage.setItem("gate_station", JSON.stringify(s)); }

export const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
