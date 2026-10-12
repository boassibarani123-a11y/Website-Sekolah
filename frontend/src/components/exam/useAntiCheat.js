import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";

export const exitFullscreen = () => {
  try { navigator.keyboard?.unlock?.(); } catch (e) { /* noop */ }
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* noop */ }
};
export const enterFullscreen = () => {
  const p = document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
  return Promise.resolve(p).then(() => navigator.keyboard?.lock?.().catch(() => {})).catch(() => {});
};

export function useAntiCheat({ active, examId, maxV, finishedRef, onExceeded }) {
  const [violations, setViolations] = useState(0);
  const [locked, setLocked] = useState(false);
  const violationsRef = useRef(0);
  const lastRef = useRef(0);

  const register = useCallback(async (reason) => {
    if (finishedRef.current) return;
    if (Date.now() - lastRef.current < 1500) return;
    lastRef.current = Date.now();
    try {
      const r = await api.post(`/exams/${examId}/violation`);
      violationsRef.current = r.data.violations; setViolations(r.data.violations);
      if (r.data.exceeded) { toast.error(`Batas pelanggaran tercapai (${r.data.violations}/${r.data.max_violations}). Ujian dikirim otomatis.`); onExceeded(); }
      else toast.warning(`Peringatan ${r.data.violations}/${r.data.max_violations}: ${reason}.`);
    } catch (e) {
      violationsRef.current += 1; setViolations(violationsRef.current);
      if (violationsRef.current >= maxV) onExceeded();
    }
  }, [examId, maxV, finishedRef, onExceeded]);

  useEffect(() => {
    if (!active) return;
    const onVis = () => { if (document.hidden) { setLocked(true); register("berpindah tab / meminimalkan jendela"); } };
    const onBlur = () => { if (!document.hasFocus()) { setLocked(true); register("jendela ujian kehilangan fokus"); } };
    const onFs = () => {
      if (finishedRef.current) return;
      if (!document.fullscreenElement) { setLocked(true); register("keluar dari mode layar penuh"); }
      else if (document.hasFocus()) setLocked(false);
    };
    const block = (e) => {
      if (e.type === "selectstart" && e.target instanceof Element && e.target.closest("textarea")) return;
      e.preventDefault();
    };
    const onKey = (e) => {
      const k = e.key || "";
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(k) || k === "Escape" || k === "PrintScreen" || k === "ContextMenu") { e.preventDefault(); e.stopPropagation(); }
    };
    const onPop = () => { window.history.pushState(null, "", window.location.href); register("mencoba kembali ke halaman sebelumnya"); };
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    const evs = ["contextmenu", "copy", "cut", "paste", "dragstart", "selectstart"];
    window.history.pushState(null, "", window.location.href);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    evs.forEach(ev => document.addEventListener(ev, block));
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      evs.forEach(ev => document.removeEventListener(ev, block));
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [active, register, finishedRef]);

  return { violations, setViolations, violationsRef, locked, setLocked };
}
