import { useState } from "react";
import { toast } from "sonner";
import { Plus, DoorOpen, Pencil, Trash2, UserRound, Building2, AlertTriangle } from "lucide-react";
import api from "@/lib/apiClient";
import { Modal, Field, inp } from "./invUi";

function RoomModal({ room, onClose, onDone }) {
  const [f, setF] = useState({ name: room?.name || "", building: room?.building || "", pic: room?.pic || "", description: room?.description || "" });
  const save = async () => {
    if (!f.name.trim()) return toast.error("Nama ruangan wajib diisi");
    try {
      if (room) await api.patch(`/inventory-rooms/${room.id}`, f); else await api.post("/inventory-rooms", f);
      toast.success("Ruangan disimpan"); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
  };
  return (
    <Modal title={room ? "Edit Ruangan" : "Tambah Ruangan"} onClose={onClose} testid="inv-room-modal">
      <div className="space-y-3">
        <Field label="Nama ruangan *"><input data-testid="room-name-input" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Lab Komputer 1" className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gedung / lantai"><input data-testid="room-building-input" value={f.building} onChange={e => setF({ ...f, building: e.target.value })} placeholder="Gedung B · Lt 2" className={inp} /></Field>
          <Field label="Penanggung jawab"><input data-testid="room-pic-input" value={f.pic} onChange={e => setF({ ...f, pic: e.target.value })} className={inp} /></Field>
        </div>
        <Field label="Keterangan"><textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className={inp} /></Field>
        <button data-testid="room-save-button" onClick={save} className="w-full py-3 bg-slate-900 hover:bg-sky-600 text-white rounded-xl font-semibold">Simpan</button>
      </div>
    </Modal>
  );
}

export function RoomsView({ rooms, isStaff, onChange, onPickRoom }) {
  const [edit, setEdit] = useState(null);
  const del = async (r) => {
    if (!window.confirm(`Hapus ruangan "${r.name}"?`)) return;
    try { await api.delete(`/inventory-rooms/${r.id}`); toast.success("Ruangan dihapus"); onChange(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  return (
    <div className="space-y-4" data-testid="inv-rooms-view">
      {isStaff && <button data-testid="room-add-button" onClick={() => setEdit({})} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Tambah Ruangan</button>}
      {rooms.length === 0 && <p className="text-slate-400 italic py-8 text-center">Belum ada ruangan. Tambahkan ruangan agar barang mudah dilacak.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(r => (
          <div key={r.id} data-testid={`room-card-${r.id}`} className="group bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white flex items-center justify-center"><DoorOpen className="w-6 h-6" /></span>
              {isStaff && <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button data-testid={`room-edit-${r.id}`} onClick={() => setEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                <button data-testid={`room-delete-${r.id}`} onClick={() => del(r)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>}
            </div>
            <h3 className="mt-3 font-heading font-bold text-lg text-slate-900">{r.name}</h3>
            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
              {r.building && <p className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{r.building}</p>}
              {r.pic && <p className="flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" />PJ: {r.pic}</p>}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-700"><b data-testid={`room-items-${r.id}`}>{r.item_count}</b> barang</span>
              <span className="px-3 py-1 rounded-full bg-sky-50 font-semibold text-sky-700">{r.units} unit</span>
              {r.issues > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{r.issues}</span>}
            </div>
            <button data-testid={`room-view-items-${r.id}`} onClick={() => onPickRoom(r.name)} className="mt-4 text-sm font-semibold text-sky-600 hover:underline">Lihat barang di ruangan ini</button>
          </div>
        ))}
      </div>
      {edit && <RoomModal room={edit.id ? edit : null} onClose={() => setEdit(null)} onDone={() => { setEdit(null); onChange(); }} />}
    </div>
  );
}
