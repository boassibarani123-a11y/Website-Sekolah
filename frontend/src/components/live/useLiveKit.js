import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, VideoPresets } from "livekit-client";
import { toast } from "sonner";

const REFRESH_EVENTS = [
  RoomEvent.ParticipantConnected, RoomEvent.ParticipantDisconnected, RoomEvent.TrackSubscribed,
  RoomEvent.TrackUnsubscribed, RoomEvent.TrackMuted, RoomEvent.TrackUnmuted,
  RoomEvent.LocalTrackPublished, RoomEvent.LocalTrackUnpublished, RoomEvent.TrackPublished, RoomEvent.TrackUnpublished,
];

// Media layer on our self-hosted LiveKit SFU (simulcast + adaptive stream for low bandwidth).
export function useLiveKit() {
  const roomRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [, setVer] = useState(0);
  const [speakers, setSpeakers] = useState([]);
  const bump = useCallback(() => setVer((v) => v + 1), []);

  const connect = useCallback(async (url, token) => {
    if (!url || !token) { setStatus("unavailable"); return; }
    const room = new Room({
      adaptiveStream: true, dynacast: true,
      videoCaptureDefaults: { resolution: VideoPresets.h360.resolution },
      publishDefaults: { simulcast: true, videoSimulcastLayers: [VideoPresets.h180] },
    });
    roomRef.current = room;
    REFRESH_EVENTS.forEach((e) => room.on(e, bump));
    room.on(RoomEvent.ActiveSpeakersChanged, (s) => setSpeakers(s.map((p) => p.identity)));
    room.on(RoomEvent.Reconnecting, () => setStatus("reconnecting"));
    room.on(RoomEvent.Reconnected, () => { setStatus("connected"); bump(); });
    room.on(RoomEvent.Disconnected, () => { setStatus((s) => (s === "connected" || s === "reconnecting" ? "disconnected" : s)); bump(); });
    setStatus("connecting");
    try {
      await room.connect(url, token);
      setStatus("connected");
      bump();
    } catch {
      setStatus("failed");
    }
  }, [bump]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => () => roomRef.current?.disconnect(), []);

  const room = roomRef.current;
  const lp = room?.localParticipant;
  const live = status === "connected";

  const run = async (fn, label) => {
    if (!live) return toast.error("Server video belum tersambung");
    try { await fn(); } catch (e) { toast.error(`${label}: ${e?.message || "izin ditolak"}`); }
    bump();
  };

  const participant = (id) => (!room ? null : lp?.identity === id ? lp : room.remoteParticipants.get(id));
  const trackOf = (id, source) => participant(id)?.getTrackPublication(source)?.track || null;
  const screen = (() => {
    if (!room) return null;
    for (const p of [lp, ...room.remoteParticipants.values()]) {
      const t = p?.getTrackPublication(Track.Source.ScreenShare)?.track;
      if (t) return { identity: p.identity, track: t };
    }
    return null;
  })();

  return {
    status, live, speakers, screen, participant, trackOf, connect, disconnect,
    micOn: !!lp?.isMicrophoneEnabled, camOn: !!lp?.isCameraEnabled, shareOn: !!lp?.isScreenShareEnabled,
    setMic: (on) => run(() => lp.setMicrophoneEnabled(on), "Mikrofon"),
    setCam: (on) => run(() => lp.setCameraEnabled(on), "Kamera"),
    setShare: (on) => run(() => lp.setScreenShareEnabled(on, { audio: true }), "Bagikan layar"),
    forceMute: () => live && lp?.setMicrophoneEnabled(false).then(bump).catch(() => {}),
  };
}
