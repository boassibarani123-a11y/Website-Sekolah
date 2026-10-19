import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { X, Check, ZoomIn } from "lucide-react";

async function getCroppedBlob(src, cropPixels, mime) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropPixels.width));
  canvas.height = Math.max(1, Math.round(cropPixels.height));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, canvas.width, canvas.height
  );
  return new Promise((res) => canvas.toBlob((b) => res(b), mime, 0.92));
}

export default function ImageCropDialog({ file, aspect = 1, title = "Sesuaikan Gambar", round = false, onCancel, onCropped }) {
  const [src, setSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setSrc(r.result);
    r.readAsDataURL(file);
  }, [file]);

  const onComplete = useCallback((_, p) => setPixels(p), []);

  const confirm = async () => {
    if (!pixels || !src) return;
    setBusy(true);
    const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
    const blob = await getCroppedBlob(src, pixels, mime);
    const ext = mime === "image/jpeg" ? "jpg" : "png";
    const out = new File([blob], `crop.${ext}`, { type: mime });
    setBusy(false);
    onCropped(out);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" data-testid="image-crop-dialog">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-heading font-bold text-slate-900">{title}</h3>
          <button onClick={onCancel} data-testid="crop-cancel" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="relative h-80 bg-slate-900">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={round ? "round" : "rect"}
              showGrid={!round}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          )}
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0"/>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(+e.target.value)} className="flex-1 accent-sky-600" data-testid="crop-zoom"/>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} className="px-4 py-2 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Batal</button>
            <button onClick={confirm} disabled={busy} data-testid="crop-confirm" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors">
              <Check className="w-4 h-4"/>{busy ? "Memproses..." : "Gunakan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
