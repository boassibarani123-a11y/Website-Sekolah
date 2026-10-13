import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ScanLine, Search } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/apiClient";
import { Modal, inp, qrValue } from "./invUi";

export function QrLabelsModal({ items, onClose }) {
  const ref = useRef(null);
  const print = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast.error("Pop-up diblokir browser");
    w.document.write(`<html><head><title>Label QR Inventaris</title><style>
      body{font-family:'Plus Jakarta Sans',Arial,sans-serif;margin:12mm} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
      .l{border:1px dashed #94a3b8;border-radius:4mm;padding:4mm;display:flex;gap:3mm;align-items:center;break-inside:avoid}
      .n{font-weight:800;font-size:11pt;margin:0} .m{font-size:8pt;color:#475569;margin:1mm 0 0} .s{font-size:7pt;color:#0369a1;font-weight:700;letter-spacing:.08em;margin:0 0 1mm}
    </style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  return (
    <Modal title={`Label QR (${items.length} barang)`} onClose={onClose} wide testid="inv-qr-labels-modal">
      <div ref={ref}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(i => (
            <div key={i.id} className="l border border-dashed border-slate-300 rounded-2xl p-3 flex items-center gap-3" data-testid={`qr-label-${i.id}`}>
              <QRCodeSVG value={qrValue(i)} size={72} level="M" />
              <div className="min-w-0">
                <p className="s text-[10px] font-bold tracking-wider text-sky-700">SMAN 1 LAGUBOTI</p>
                <p className="n font-heading font-extrabold text-sm text-slate-900 leading-tight">{i.name}</p>
                <p className="m text-[11px] text-slate-500">{i.code || "Tanpa kode"}</p>
                <p className="m text-[11px] text-slate-500">{i.location || "-"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button data-testid="inv-qr-print-button" onClick={print} className="mt-5 w-full py-3 bg-slate-900 hover:bg-sky-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Cetak Label</button>
    </Modal>
  );
}

export function QrScanModal({ onClose, onFound }) {
  const [code, setCode] = useState("");
  const [camOk, setCamOk] = useState(true);
  const scanner = useRef(null);
  const done = useRef(false);
  const lookup = async (raw) => {
    try { const r = await api.get(`/inventory-lookup/${encodeURIComponent(raw.trim())}`); onFound(r.data); }
    catch (e) { toast.error(e.response?.data?.detail || "Barang tidak ditemukan"); done.current = false; }
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!alive) return;
      const cam = new Html5Qrcode("inv-qr-reader");
      scanner.current = cam;
      try {
        await cam.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, (txt) => { if (!done.current) { done.current = true; lookup(txt); } }, () => {});
      } catch { if (alive) setCamOk(false); }
    })();
    return () => { alive = false; scanner.current?.stop?.().catch(() => {}); };
  }, []); // eslint-disable-line
  return (
    <Modal title="Pindai QR Barang" onClose={onClose} testid="inv-qr-scan-modal">
      <div id="inv-qr-reader" className="w-full rounded-2xl overflow-hidden bg-slate-900 min-h-[240px]" />
      {!camOk && <p className="mt-3 text-sm text-amber-700 flex items-center gap-1.5" data-testid="inv-qr-no-camera"><ScanLine className="w-4 h-4" />Kamera tidak tersedia. Masukkan kode barang secara manual.</p>}
      <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); if (code.trim()) lookup(code); }}>
        <input data-testid="inv-qr-manual-input" value={code} onChange={e => setCode(e.target.value)} placeholder="Kode inventaris, mis. INV-001" className={`${inp} mt-0`} />
        <button data-testid="inv-qr-manual-submit" className="px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl"><Search className="w-4 h-4" /></button>
      </form>
    </Modal>
  );
}
