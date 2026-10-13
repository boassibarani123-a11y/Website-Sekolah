import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Trash2, Repeat, Clock, DoorOpen } from "lucide-react";
import { PRESETS } from "./piketUtils";

const inp = "mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm bg-white";

export function PiketModal({ shift, teachers, defaultDate, onClose, onDone }) {
  const isEdit = !!shift?.id;
  const [f, setF] = useState({
    teacher_id: shift?.teacher_id || "", date: shift?.date || defaultDate, start_time: shift?.start_time || "06:30",
    end_time: shift?.end_time || "07:45", gate: shift?.gate || "Gerbang 1", notes: shift?.notes || "", repeat_weeks: 1,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.teacher_id) return toast.error("Pilih guru penjaga");
    if (f.end_time <= f.start_time) return toast.error("Jam selesai harus setelah jam mulai");
    setBusy(true);
    try {
      if (isEdit) {
        const { repeat_weeks, ...body } = f;
        await api.patch(`/piket/shifts/${shift.id}`, body);
        toast.success("Shift diperbarui");
      } else {
        const r = await api.post("/piket/shifts", { ...f, repeat_weeks: +f.repeat_weeks || 1 });
        toast.success(`${r.data.created.length} shift dibuat${r.data.skipped.length ? `, ${r.data.skipped.length} dilewati (bentrok)` : ""}`);
      }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan shift"); }
    finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm("Hapus shift ini?")) return;
    try { await api.delete(`/piket/shifts/${shift.id}`); toast.success("Shift dihapus"); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="piket-modal">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-heading text-xl font-bold">{isEdit ? "Edit Shift Piket" : "Jadwalkan Piket Gerbang"}</h3>
          <button data-testid="piket-modal-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Guru / Staf Penjaga *</label>
            <select data-testid="piket-teacher-select" value={f.teacher_id} onChange={set("teacher_id")} className={inp}>
              <option value="">— Pilih —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.role.replace("_", " ")})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tanggal *</label>
              <input data-testid="piket-date-input" type="date" value={f.date} onChange={set("date")} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><DoorOpen className="w-3 h-3" />Gerbang</label>
              <input data-testid="piket-gate-input" value={f.gate} onChange={set("gate")} className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Clock className="w-3 h-3" />Waktu Shift</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {PRESETS.map(p => (
                <button key={p.label} type="button" data-testid={`piket-preset-${p.label}`} onClick={() => setF({ ...f, start_time: p.start, end_time: p.end })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${f.start_time === p.start && f.end_time === p.end ? "bg-sky-600 border-sky-600 text-white" : "border-slate-200 text-slate-600 hover:border-sky-400"}`}>
                  {p.label} · {p.start}–{p.end}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <input data-testid="piket-start-input" type="time" value={f.start_time} onChange={set("start_time")} className={inp} />
              <input data-testid="piket-end-input" type="time" value={f.end_time} onChange={set("end_time")} className={inp} />
            </div>
          </div>
          {!isEdit && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1"><Repeat className="w-3 h-3" />Ulangi Tiap Minggu</label>
              <div className="flex items-center gap-3 mt-1">
                <input data-testid="piket-repeat-input" type="range" min={1} max={26} value={f.repeat_weeks} onChange={set("repeat_weeks")} className="flex-1 accent-sky-600" />
                <span className="w-24 text-sm font-bold text-slate-700 tabular-nums">{f.repeat_weeks} minggu</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Catatan</label>
            <textarea data-testid="piket-notes-input" rows={2} value={f.notes} onChange={set("notes")} placeholder="mis. cek atribut seragam" className={inp} />
          </div>
          <div className="flex gap-2 pt-1">
            {isEdit && <button data-testid="piket-delete-button" onClick={del} className="px-4 py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold"><Trash2 className="w-4 h-4" /></button>}
            <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="piket-save-button" disabled={busy} onClick={save} className="flex-1 py-2.5 bg-slate-900 hover:bg-sky-600 text-white rounded-xl font-semibold disabled:opacity-60 transition-colors">{busy ? "Menyimpan…" : "Simpan"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
