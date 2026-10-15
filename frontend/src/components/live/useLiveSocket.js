import { useCallback, useEffect, useRef, useState } from "react";
import { liveWsUrl } from "./liveUtils";

// Realtime channel for schedule timeouts, teacher presence, hands & reactions.
export function useLiveSocket(classId, onEvent) {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [offset, setOffset] = useState(0);
  const wsRef = useRef(null);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let alive = true, retry = 0, timer, pinger;
    const open = () => {
      const ws = new WebSocket(liveWsUrl(classId));
      wsRef.current = ws;
      ws.onopen = () => { retry = 0; setConnected(true); };
      ws.onmessage = (e) => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === "state") {
          setState(m.state);
          setOffset(new Date(m.state.now).getTime() - Date.now());
          return;
        }
        handler.current?.(m);
        if (["session_started", "session_ended", "extended", "locked", "teacher_joined", "teacher_left", "presence", "kicked", "live_switch"].includes(m.type)) {
          setTimeout(() => ws.readyState === 1 && ws.send(JSON.stringify({ type: "ping" })), 150);
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (alive) timer = setTimeout(open, Math.min(10000, 1000 * 2 ** retry++));
      };
    };
    open();
    pinger = setInterval(() => wsRef.current?.readyState === 1 && wsRef.current.send(JSON.stringify({ type: "ping" })), 20000);
    return () => { alive = false; clearTimeout(timer); clearInterval(pinger); wsRef.current?.close(); };
  }, [classId]);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify(msg));
  }, []);
  const refresh = useCallback(() => send({ type: "ping" }), [send]);
  return { state, connected, send, refresh, offset };
}

export function useServerNow(offset) {
  const [now, setNow] = useState(Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 500);
    return () => clearInterval(t);
  }, [offset]);
  return now;
}
