import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

export function TxEditModal({ tx, showSource = false, onClose, onSave }) {
  const [f, setF] = useState({ kelas: tx.kelas || "", amount: tx.amount, note: tx.note || "", type: tx.type });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.amount || f.amount <= 0) return toast.error("Jumlah harus lebih dari 0");
    setBusy(true);
    try { await onSave(showSource ? f : { amount: f.amount, note: f.note, type: f.type }); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  const input = "mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none";
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="tx-edit-modal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">Edit Transaksi</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          {showSource && (
            <div><label className="text-xs font-semibold text-slate-600 uppercase">Kelas / Sumber</label>
              <input data-testid="tx-edit-source" value={f.kelas} onChange={e => setF({ ...f, kelas: e.target.value })} className={input} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-slate-600 uppercase">Jumlah (Rp)</label>
              <input data-testid="tx-edit-amount" type="number" value={f.amount || ""} onChange={e => setF({ ...f, amount: +e.target.value })} className={input} /></div>
            <div><label className="text-xs font-semibold text-slate-600 uppercase">Tipe</label>
              <select data-testid="tx-edit-type" value={f.type} onChange={e => setF({ ...f, type: e.target.value })} className={input + " bg-white"}>
                <option value="masuk">Masuk</option><option value="keluar">Keluar</option>
              </select></div>
          </div>
          <div><label className="text-xs font-semibold text-slate-600 uppercase">Keterangan</label>
            <input data-testid="tx-edit-note" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className={input} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="tx-edit-save" disabled={busy} onClick={save} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
