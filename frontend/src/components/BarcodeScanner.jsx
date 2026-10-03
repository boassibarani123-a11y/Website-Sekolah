import { useEffect, useRef, useState } from "react";
import { ScanBarcode, Usb, Power } from "lucide-react";

export function BarcodeScanner({ onScan }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");
  const [last, setLast] = useState(null);
  const ref = useRef(null);

  useEffect(() => { if (active) ref.current?.focus(); }, [active]);

  const submit = (e) => {
    e.preventDefault();
    const code = value.trim();
    setValue("");
    if (!code) return;
    setLast(code);
    onScan(code);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="barcode-scanner-card">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-heading text-lg font-bold flex items-center gap-2"><ScanBarcode className="w-5 h-5 text-violet-600" />Scanner Barcode USB</h2>
        <span data-testid="barcode-status" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />{active ? "Siap scan" : "Nonaktif"}
        </span>
      </div>
      <p className="text-xs text-slate-500 flex items-start gap-1.5"><Usb className="w-3.5 h-3.5 mt-0.5 shrink-0" />Colokkan alat scan barcode lewat kabel USB kapan saja (tanpa instalasi). Aktifkan mode scanner, lalu scan barcode NISN di kartu siswa. Status yang dipakai sama dengan pilihan di Scanner QR.</p>
      <form onSubmit={submit} className="mt-4">
        <input ref={ref} data-testid="barcode-input" value={value} onChange={e => setValue(e.target.value)} disabled={!active}
          onBlur={() => active && setTimeout(() => ref.current?.focus(), 150)}
          placeholder={active ? "Menunggu scan barcode..." : "Aktifkan mode scanner terlebih dahulu"}
          className={`w-full px-4 py-3 rounded-xl border-2 font-mono text-center outline-none transition-colors ${active ? "border-violet-400 bg-violet-50/40 focus:border-violet-600" : "border-slate-200 bg-slate-50"}`} />
      </form>
      <button data-testid="barcode-toggle-button" onClick={() => setActive(a => !a)}
        className={`mt-3 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${active ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}`}>
        <Power className="w-4 h-4" />{active ? "Matikan Mode Scanner" : "Aktifkan Mode Scanner"}
      </button>
      {last && <p data-testid="barcode-last" className="mt-3 text-[11px] text-slate-500 text-center">Scan terakhir: <span className="font-mono font-semibold text-slate-700">{last}</span></p>}
    </div>
  );
}
