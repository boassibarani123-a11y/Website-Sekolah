import { useEffect, useState } from "react";
import { Delete, ScanFace } from "lucide-react";

const LEN = 5;

export function DigitPad({ onSubmit, onCancel, busy }) {
  const [v, setV] = useState("");
  useEffect(() => { if (v.length === LEN) onSubmit(v); }, [v]); // eslint-disable-line
  useEffect(() => {
    const k = (e) => {
      if (/^\d$/.test(e.key)) setV(x => (x + e.key).slice(0, LEN));
      else if (e.key === "Backspace") setV(x => x.slice(0, -1));
      else if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  return (
    <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 rounded-[inherit]" data-testid="faceid-digit-pad">
      <div className="w-full max-w-xs text-center text-white">
        <ScanFace className="w-10 h-10 mx-auto text-[#ffd60a]" />
        <p className="mt-3 text-lg font-semibold">Wajah mirip terdeteksi</p>
        <p className="text-sm text-white/60 mt-1">Masukkan 5 angka NIS Anda untuk verifikasi (guru: 5 angka terakhir NIP).</p>
        <div className="flex justify-center gap-4 my-6">{Array.from({ length: LEN }, (_, i) => i).map(i => <span key={i} className={`w-3.5 h-3.5 rounded-full border border-white/70 transition-colors ${i < v.length ? "bg-white" : ""}`} />)}</div>
        <div className="grid grid-cols-3 gap-4 justify-items-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((d, i) => d === "" ? <span key={i} /> : (
            <button key={i} data-testid={`digit-${d}`} disabled={busy} onClick={() => d === "del" ? setV(x => x.slice(0, -1)) : setV(x => (x + d).slice(0, LEN))}
              className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/40 text-2xl font-light flex items-center justify-center transition-colors">
              {d === "del" ? <Delete className="w-5 h-5" /> : d}
            </button>
          ))}
        </div>
        <button data-testid="digit-cancel" onClick={onCancel} className="mt-6 text-sm text-white/70 hover:text-white">Batal</button>
      </div>
    </div>
  );
}
