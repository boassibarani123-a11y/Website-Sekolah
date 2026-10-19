import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import api from "@/lib/apiClient";
import { Modal, Field, inp, CONDITIONS, uploadImage, UNITS, unitOf, todayISO } from "./invUi";

export function ItemModal({ item, rooms, categories, onClose, onDone }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    name: item?.name || "", category: item?.category || "", stock: item?.stock ?? 1, condition: item?.condition || "Baik",
    location: item?.location || "", code: item?.code || "", min_stock: item?.min_stock ?? 0, description: item?.description || "", image: item?.image || "",
    unit: unitOf(item),
  });
  const pickUnit = (u) => setF({ ...f, unit: u, location: UNITS[u].room && !f.location ? UNITS[u].room : f.location });
  const cats = [...new Set([...UNITS[f.unit].cats, ...categories])];
  const roomNames = [...new Set([...rooms.map(r => r.name), ...Object.values(UNITS).map(u => u.room).filter(Boolean)])];
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "number" ? +e.target.value : e.target.value });
  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setF({ ...f, image: await uploadImage(file) }); } catch { toast.error("Gagal mengunggah foto"); }
  };
  const save = async () => {
    if (!f.name.trim()) return toast.error("Nama barang wajib diisi");
    if (!f.category.trim()) return toast.error("Kategori wajib diisi");
    setBusy(true);
    try {
      if (isEdit) await api.patch(`/inventory/${item.id}`, f); else await api.post("/inventory", f);
      toast.success(isEdit ? "Barang diperbarui" : "Barang ditambahkan"); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); } finally { setBusy(false); }
  };
  return (
    <Modal title={isEdit ? "Edit Barang" : "Tambah Barang"} onClose={onClose} testid="inv-item-modal">
      <div className="space-y-4">
        <Field label="Kategori peminjaman">
          <div className="mt-1 grid grid-cols-3 gap-2" data-testid="inv-unit-select">
            {Object.entries(UNITS).map(([u, x]) => (
              <button key={u} type="button" data-testid={`inv-unit-${u.replace(/\s/g, "-")}`} onClick={() => pickUnit(u)}
                className={`py-2.5 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition-colors ${f.unit === u ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                <x.Icon className="w-5 h-5" />{u}</button>
            ))}
          </div>
        </Field>
        <div className="flex items-center gap-4">
          <label className="w-20 h-20 rounded-2xl bg-sky-50 border-2 border-dashed border-sky-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-sky-400 shrink-0" data-testid="inv-image-upload">
            {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6 text-sky-400" />}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          <div className="flex-1"><Field label="Nama barang *"><input data-testid="inv-name-input" value={f.name} onChange={set("name")} className={inp} /></Field></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kode inventaris"><input data-testid="inv-code-input" value={f.code} onChange={set("code")} placeholder="INV-001" className={inp} /></Field>
          <Field label="Kategori *"><input data-testid="inv-category-input" list="inv-cats" value={f.category} onChange={set("category")} placeholder={UNITS[f.unit].cats[0] || "Elektronik"} className={inp} />
            <datalist id="inv-cats">{cats.map(c => <option key={c} value={c} />)}</datalist></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ruangan / lokasi">
            <select data-testid="inv-location-select" value={f.location} onChange={set("location")} className={inp}>
              <option value="">— Pilih ruangan —</option>
              {roomNames.map(n => <option key={n} value={n}>{n}</option>)}
              {f.location && !roomNames.includes(f.location) && <option value={f.location}>{f.location}</option>}
            </select>
          </Field>
          <Field label="Kondisi">
            <select data-testid="inv-condition-select" value={f.condition} onChange={set("condition")} className={inp}>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stok tersedia"><input data-testid="inv-stock-input" type="number" min={0} value={f.stock} onChange={set("stock")} className={inp} /></Field>
          <Field label="Batas stok menipis"><input data-testid="inv-minstock-input" type="number" min={0} value={f.min_stock} onChange={set("min_stock")} className={inp} /></Field>
        </div>
        <Field label="Keterangan"><textarea rows={2} value={f.description} onChange={set("description")} className={inp} /></Field>
        <button data-testid="inv-save-button" onClick={save} disabled={busy} className="w-full py-3 bg-slate-900 hover:bg-sky-600 text-white rounded-xl font-semibold disabled:opacity-50 transition-colors">{busy ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </Modal>
  );
}

export function BorrowModal({ item, onClose, onDone }) {
  const lab = unitOf(item) !== "Umum";
  const [f, setF] = useState({ item_id: item.id, quantity: 1, purpose: "", return_date: "", subject: "", use_date: todayISO(), start_time: "07:30", end_time: "09:00" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.purpose.trim()) return toast.error("Lengkapi keperluan");
    if (lab && (!f.subject.trim() || !f.use_date || !f.start_time || !f.end_time)) return toast.error("Lengkapi mata pelajaran, tanggal, dan jam pemakaian lab");
    if (!lab && !f.return_date) return toast.error("Lengkapi tanggal kembali");
    setBusy(true);
    const body = lab ? { ...f, return_date: f.use_date } : { item_id: f.item_id, quantity: f.quantity, purpose: f.purpose, return_date: f.return_date };
    try { await api.post("/borrow", body); toast.success("Permintaan diajukan"); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Pinjam: ${item.name}`} onClose={onClose} testid="inv-borrow-modal">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Tersedia <b className="text-slate-900">{item.stock}</b> unit{item.location ? ` · ${item.location}` : ""}</p>
        <Field label="Jumlah"><input data-testid="borrow-qty-input" type="number" min={1} max={item.stock} value={f.quantity} onChange={e => setF({ ...f, quantity: +e.target.value })} className={inp} /></Field>
        {lab && <p data-testid="borrow-lab-note" className="text-xs rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2">Peminjaman <b>{unitOf(item)}</b>: isi jadwal praktikum. Barang dikembalikan di hari pemakaian.</p>}
        {lab && <Field label="Mata pelajaran / kegiatan praktikum"><input data-testid="borrow-subject-input" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} placeholder={unitOf(item) === "Lab Biologi" ? "Biologi – Pengamatan sel" : "Informatika – Praktik jaringan"} className={inp} /></Field>}
        <Field label="Keperluan"><input data-testid="borrow-purpose-input" value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} className={inp} /></Field>
        {lab ? (
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tanggal"><input data-testid="borrow-use-date-input" type="date" value={f.use_date} onChange={e => setF({ ...f, use_date: e.target.value })} className={inp} /></Field>
            <Field label="Mulai"><input data-testid="borrow-start-input" type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} className={inp} /></Field>
            <Field label="Selesai"><input data-testid="borrow-end-input" type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} className={inp} /></Field>
          </div>
        ) : <Field label="Tanggal kembali"><input data-testid="borrow-date-input" type="date" value={f.return_date} onChange={e => setF({ ...f, return_date: e.target.value })} className={inp} /></Field>}
        <button data-testid="borrow-submit-button" disabled={busy} onClick={submit} className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold disabled:opacity-50">Ajukan</button>
      </div>
    </Modal>
  );
}

export function ReturnModal({ loan, onClose, onDone }) {
  const [cond, setCond] = useState("Baik");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/borrow/${loan.id}?status=Dikembalikan&return_condition=${encodeURIComponent(cond)}&note=${encodeURIComponent(note)}`);
      toast.success("Pengembalian dicatat"); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } finally { setBusy(false); }
  };
  const hint = { Baik: "Stok dikembalikan penuh.", Perbaikan: "Stok dikembalikan, barang perlu dicek.", Rusak: "Stok dikembalikan & dicatat sebagai unit rusak.", Hilang: "Unit hilang tidak dikembalikan ke stok." }[cond];
  return (
    <Modal title={`Pengembalian: ${loan.item_name} × ${loan.quantity}`} onClose={onClose} testid="inv-return-modal">
      <p className="text-sm text-slate-500">Peminjam: <b className="text-slate-900">{loan.requester_name}</b></p>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Kondisi saat dikembalikan</p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {["Baik", "Perbaikan", "Rusak", "Hilang"].map(c => (
          <button key={c} data-testid={`return-cond-${c}`} onClick={() => setCond(c)} className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${cond === c ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{c}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
      <textarea data-testid="return-note-input" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan (opsional)" className={`${inp} mt-3`} />
      <button data-testid="return-submit-button" disabled={busy} onClick={submit} className="mt-4 w-full py-3 bg-slate-900 hover:bg-sky-600 text-white rounded-xl font-semibold disabled:opacity-50">Catat Pengembalian</button>
    </Modal>
  );
}
