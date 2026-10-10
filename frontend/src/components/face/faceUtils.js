let faceapiPromise = null;

export function loadFaceApi() {
  if (!faceapiPromise) {
    faceapiPromise = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      try { await faceapi.tf.setBackend("webgl"); } catch { /* fallback to default backend */ }
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return faceapi;
    })().catch((e) => { faceapiPromise = null; throw e; });
  }
  return faceapiPromise;
}

export async function openCamera(video, deviceId) {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
  const video_c = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" };
  const stream = await navigator.mediaDevices.getUserMedia({ video: { ...video_c, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  video.srcObject = stream;
  await video.play().catch(() => {});
  return stream;
}

export const stopStream = (s) => s?.getTracks().forEach((t) => t.stop());

export async function listCameras() {
  try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"); } catch { return []; }
}

export function detectFaces(faceapi, video, precise = false) {
  const opts = precise
    ? new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 })
    : new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  return faceapi.detectAllFaces(video, opts).withFaceLandmarks().withFaceDescriptors();
}

export function cameraError(e) {
  const n = e?.name || "";
  if (n === "NotAllowedError" || n === "SecurityError") return "Izin kamera ditolak. Klik ikon gembok di address bar → izinkan Kamera, lalu muat ulang.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "Kamera tidak ditemukan. Colokkan webcam lalu coba lagi.";
  if (n === "NotReadableError") return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
  if (n === "NotSupportedError") return "Browser tidak mendukung kamera. Gunakan Chrome/Edge terbaru via HTTPS.";
  return "Gagal memuat kamera / model wajah. Periksa koneksi lalu coba lagi.";
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Eye aspect ratio — drops sharply when the eye closes (blink liveness check)
export function eyeAspect(landmarks) {
  const ear = (p) => (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));
  return (ear(landmarks.getLeftEye()) + ear(landmarks.getRightEye())) / 2;
}

export function meanDescriptor(list) {
  const out = new Array(128).fill(0);
  list.forEach((d) => { for (let i = 0; i < 128; i++) out[i] += d[i] / list.length; });
  return out;
}

export function drawBoxes(canvas, video, dets, color = "#38bdf8") {
  if (!canvas || !video.videoWidth) return;
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 4; ctx.strokeStyle = color;
  dets.forEach(({ detection: { box } }) => {
    const r = 14, { x, y, width: w, height: h } = box, L = Math.min(w, h) * 0.25;
    ctx.beginPath();
    [[x, y + L, x, y + r, x + r, y, x + L, y], [x + w - L, y, x + w - r, y, x + w, y + r, x + w, y + L],
     [x + w, y + h - L, x + w, y + h - r, x + w - r, y + h, x + w - L, y + h], [x + L, y + h, x + r, y + h, x, y + h - r, x, y + h - L]]
      .forEach(([a, b, c, d, e, f, g, k]) => { ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.quadraticCurveTo(c, f, e, f); ctx.lineTo(g, k); });
    ctx.stroke();
  });
}

export function snapshotFace(video, box) {
  const c = document.createElement("canvas");
  const pad = box.width * 0.35;
  const sx = Math.max(0, box.x - pad), sy = Math.max(0, box.y - pad);
  const sw = Math.min(video.videoWidth - sx, box.width + pad * 2), sh = Math.min(video.videoHeight - sy, box.height + pad * 2);
  c.width = 240; c.height = Math.round(240 * (sh / sw));
  c.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/jpeg", 0.8));
}
