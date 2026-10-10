import { useEffect, useRef, useState, useCallback } from "react";
import { loadFaceApi, openCamera, stopStream, cameraError } from "./faceUtils";

// Loads face-api models + opens the webcam; exposes refs and lifecycle state.
export function useFaceCamera(deviceId) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const apiRef = useRef(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    setState("loading"); setError("");
    stopStream(streamRef.current);
    try {
      apiRef.current = await loadFaceApi();
      streamRef.current = await openCamera(videoRef.current, deviceId);
      setState("ready");
    } catch (e) {
      setError(cameraError(e)); setState("error");
    }
  }, [deviceId]);

  useEffect(() => { start(); return () => stopStream(streamRef.current); }, [start]);
  return { videoRef, canvasRef, apiRef, state, error, retry: start };
}
