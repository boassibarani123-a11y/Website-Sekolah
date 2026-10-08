import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Boxes, Plus, X, Check, Ban, Undo2, User, History, Pencil, Trash2, Search, AlertTriangle, MapPin } from "lucide-react";

const CONDITION_STYLE = {
  "Baik": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Rusak": "bg-rose-100 text-rose-700 border-rose-200",
  "Perbaikan": "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_STYLE = {
  "Menunggu Approval": "bg-sky-100 text-sky-700 border-sky-200",
  "Disetujui": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Ditolak": "bg-rose-100 text-rose-700 border-rose-200",
  "Dikembalikan": "bg-slate-100 text-slate-700 border-slate-200",
};

const ROLE_LABEL = {
  super_admin: "Super Admin", kepsek: "Kepala Sekolah", staff_tu: "Staff TU",
  guru: "Guru", siswa: "Siswa", ketua_osis: "Ketua OSIS", ketua_kelas: "Ketua Kelas", orang_tua: "Orang Tua", admin_perpus: "Admin Perpustakaan",
};

export default function Inventory() {
  const { user } = useAuth();
  const isStaff = ["staff_tu","super_admin"].includes(user.role);
  const [items, setItems] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [borrowFor, setBorrowFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [tab, setTab] = useState("items");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [condFilter, setCondFilter] = useState("all");
  const load = () => {
    api.get("/inventory").then(r=>setItems(r.data));
    api.get(`/borrow${isStaff?"":"?mine=true"}`).then(r=>setReqs(r.data));
  };
  useEffect(() => { load(); }, []);

  const approve = async (bid, status) => {
    await api.patch(`/borrow/${bid}?status=${status}`);
    toast.success(`Request ${status}`); load();
  };
  const removeItem = async (i) => {
    if (!window.confirm(`Hapus barang "${i.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try { await api.delete(`/inventory/${i.id}`); toast.success("Barang dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  const categories = [...new Set(items.map(i=>i.category).filter(Boolean))].sort();
  const lowStockCount = items.filter(i=>i.low_stock).length;
  const filtered = items.filter(i =>
    (catFilter==="all" || i.category===catFilter) &&
    (condFilter==="all" || i.condition===condFilter) &&
    (!search || (i.name||"").toLowerCase().includes(search.toLowerCase()) || (i.code||"").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Inventaris & Peminjaman</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola aset & kelola permintaan pinjaman siswa/guru.</p>
        </div>
        <div className="flex gap-2">
          {isStaff && (
            <button data-testid="inventory-export" onClick={async()=>{const r=await api.get('/inventory/export',{responseType:'blob'});const u=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=u;a.download='Inventaris.xlsx';a.click();}}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">📊 Export Excel</button>
          )}
          {isStaff && (
            <button onClick={()=>setShowAdd(true)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700">
              <Plus className="w-4 h-4"/>Tambah Barang
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {["items","requests"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-semibold transition-colors ${tab===t?"text-sky-600 border-b-2 border-sky-600":"text-slate-500 hover:text-slate-800"}`}>
            {t==="items"?"Daftar Barang":isStaff?"Approval Peminjaman":"Peminjaman Saya"}
          </button>
        ))}
      </div>

      {tab==="items" && (
        <>
          {lowStockCount > 0 && isStaff && (
            <div data-testid="low-stock-alert" className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 font-medium">
              <AlertTriangle className="w-4 h-4"/>{lowStockCount} barang stoknya menipis / habis. Segera lakukan pengadaan.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
              <input data-testid="inventory-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / kode barang..."
                className="w-full pl-9 pr-3 py-2 border-2 border-slate-200 rounded-lg focus:border-sky-500 outline-none text-sm"/>
            </div>
            <select data-testid="inventory-cat-filter" value={catFilter} onChange={e=>setCatFilter(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg bg-white text-sm">
              <option value="all">Semua Kategori</option>
              {categories.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select data-testid="inventory-cond-filter" value={condFilter} onChange={e=>setCondFilter(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg bg-white text-sm">
              <option value="all">Semua Kondisi</option>
              <option value="Baik">Baik</option><option value="Perbaikan">Perbaikan</option><option value="Rusak">Rusak</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length===0 && <p className="text-slate-400 italic col-span-full">Tidak ada barang yang cocok.</p>}
          {filtered.map(i=>(
            <div key={i.id} data-testid={`inventory-item-${i.id}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center overflow-hidden shrink-0">
                  {i.image ? <img src={i.image} alt="" className="w-full h-full object-cover"/> : <Boxes className="w-6 h-6"/>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${CONDITION_STYLE[i.condition] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{i.condition}</span>
                  {i.low_stock && <span data-testid={`low-stock-badge-${i.id}`} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3"/>Menipis</span>}
                </div>
              </div>
              <h3 className="font-heading font-bold text-slate-900 mt-3">{i.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{i.category}{i.code ? ` · ${i.code}` : ""}</p>
              {i.location && <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3"/>{i.location}</p>}
              {i.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{i.description}</p>}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-1.5">
                  <p className="text-[10px] font-semibold uppercase text-emerald-600">Tersedia</p>
                  <p data-testid={`stock-available-${i.id}`} className="font-heading font-extrabold text-emerald-700">{i.stock}</p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 py-1.5">
                  <p className="text-[10px] font-semibold uppercase text-amber-600">Dipinjam</p>
                  <p data-testid={`stock-outstanding-${i.id}`} className="font-heading font-extrabold text-amber-700">{i.outstanding ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-100 border border-slate-200 py-1.5">
                  <p className="text-[10px] font-semibold uppercase text-slate-500">Total</p>
                  <p data-testid={`stock-total-${i.id}`} className="font-heading font-extrabold text-slate-800">{i.total ?? i.stock}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button data-testid="inventory-borrow-request-button" onClick={()=>setBorrowFor(i)}
                  className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-40" disabled={i.stock<=0}>Ajukan Pinjam</button>
                {isStaff && (
                  <>
                    <button data-testid={`inventory-edit-${i.id}`} onClick={()=>setEditItem(i)} title="Edit barang"
                      className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-600 hover:border-sky-400 hover:text-sky-600"><Pencil className="w-4 h-4"/></button>
                    <button data-testid={`inventory-delete-${i.id}`} onClick={()=>removeItem(i)} title="Hapus barang"
                      className="px-3 py-2 border-2 border-slate-200 rounded-lg text-rose-500 hover:border-rose-400 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></button>
                    <button data-testid={`inventory-history-${i.id}`} onClick={()=>setHistoryFor(i)} title="Riwayat peminjaman"
                      className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-600 hover:border-sky-400 hover:text-sky-600"><History className="w-4 h-4"/></button>
                  </>
                )}
              </div>
            </div>
          ))}
          </div>
        </>
      )}

      {tab==="requests" && (
        <div className="space-y-3">
          {reqs.length===0 && <p className="text-slate-400 italic">Belum ada permintaan.</p>}
          {reqs.map(r=>(
            <div key={r.id} data-testid={`borrow-request-${r.id}`} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{r.item_name} <span className="text-slate-400 text-sm">× {r.quantity}</span></p>
                {isStaff && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap" data-testid={`borrower-info-${r.id}`}>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      <User className="w-3 h-3"/>{r.requester_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold">{ROLE_LABEL[r.requester_role] || r.requester_role || "—"}</span>
                    {r.requester_kelas && <span className="text-[11px] text-slate-500">Kelas {r.requester_kelas}</span>}
                    {r.requester_nisn && <span className="text-[11px] text-slate-500">NISN {r.requester_nisn}</span>}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {!isStaff && <span>{r.requester_name} · </span>}
                  {r.purpose} · Kembali: {r.return_date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const todayISO = new Date().toISOString().slice(0, 10);
                  const late = r.status === "Disetujui" && r.return_date && r.return_date < todayISO;
                  const label = r.status === "Disetujui" ? (late ? "Terlambat" : "Dipinjam") : r.status;
                  const cls = late ? "bg-rose-100 text-rose-700 border-rose-200" : STATUS_STYLE[r.status];
                  return <span data-testid={`borrow-status-${r.id}`} className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cls}`}>{label}</span>;
                })()}
                {isStaff && r.status==="Menunggu Approval" && (
                  <>
                    <button onClick={()=>approve(r.id,"Disetujui")} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Check className="w-4 h-4"/></button>
                    <button onClick={()=>approve(r.id,"Ditolak")} className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"><Ban className="w-4 h-4"/></button>
                  </>
                )}
                {isStaff && r.status==="Disetujui" && (
                  <button onClick={()=>approve(r.id,"Dikembalikan")} className="p-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"><Undo2 className="w-4 h-4"/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <ItemModal onClose={()=>setShowAdd(false)} onDone={()=>{load();setShowAdd(false);}}/>}
      {editItem && <ItemModal item={editItem} onClose={()=>setEditItem(null)} onDone={()=>{load();setEditItem(null);}}/>}
      {borrowFor && <BorrowModal item={borrowFor} onClose={()=>setBorrowFor(null)} onDone={()=>{load();setBorrowFor(null);}}/>}
      {historyFor && <HistoryModal item={historyFor} onClose={()=>setHistoryFor(null)}/>}
    </div>
  );
}

function HistoryModal({item, onClose}) {
  const [rows, setRows] = useState(null);
  useEffect(()=>{ api.get(`/inventory/${item.id}/history`).then(r=>setRows(r.data)).catch(()=>setRows([])); }, [item.id]);
  return <Modal title={`Riwayat: ${item.name}`} onClose={onClose}>
    <div className="space-y-2 max-h-[60vh] overflow-y-auto" data-testid="inventory-history-list">
      <div className="grid grid-cols-3 gap-2 text-center pb-2 mb-1 border-b border-slate-100">
        <div><p className="text-[10px] uppercase text-emerald-600 font-semibold">Tersedia</p><p className="font-bold text-emerald-700">{item.stock}</p></div>
        <div><p className="text-[10px] uppercase text-amber-600 font-semibold">Dipinjam</p><p className="font-bold text-amber-700">{item.outstanding ?? 0}</p></div>
        <div><p className="text-[10px] uppercase text-slate-500 font-semibold">Total</p><p className="font-bold text-slate-800">{item.total ?? item.stock}</p></div>
      </div>
      {rows===null && <p className="text-slate-400 italic text-sm">Memuat...</p>}
      {rows && rows.length===0 && <p className="text-slate-400 italic text-sm">Belum ada riwayat peminjaman.</p>}
      {rows && rows.map(r=>(
        <div key={r.id} className="border border-slate-200 rounded-lg p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-900">{r.requester_name} <span className="text-slate-400 font-normal">× {r.quantity}</span></span>
            {(() => {
              const todayISO = new Date().toISOString().slice(0, 10);
              const late = r.status === "Disetujui" && r.return_date && r.return_date < todayISO;
              const label = r.status === "Disetujui" ? (late ? "Terlambat" : "Dipinjam") : r.status;
              const cls = late ? "bg-rose-100 text-rose-700 border-rose-200" : STATUS_STYLE[r.status];
              return <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${cls}`}>{label}</span>;
            })()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {ROLE_LABEL[r.requester_role] || r.requester_role || "—"}
            {r.requester_kelas ? ` · Kelas ${r.requester_kelas}` : ""}
            {r.requester_nisn ? ` · NISN ${r.requester_nisn}` : ""}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">{r.purpose} · Diajukan {(r.created_at||"").slice(0,10)} · Kembali {r.return_date}</p>
        </div>
      ))}
    </div>
  </Modal>;
}

function ItemModal({item, onClose, onDone}) {
  const isEdit = !!item;
  const [f,setF] = useState({
    name: item?.name || "", category: item?.category || "", stock: item?.stock ?? 1,
    condition: item?.condition || "Baik", location: item?.location || "", code: item?.code || "",
    min_stock: item?.min_stock ?? 0, description: item?.description || "",
  });
  const [busy,setBusy] = useState(false);
  const save = async () => {
    if (!f.name.trim()) return toast.error("Nama barang wajib diisi");
    if (!f.category.trim()) return toast.error("Kategori wajib diisi");
    setBusy(true);
    try {
      if (isEdit) { await api.patch(`/inventory/${item.id}`, f); toast.success("Barang diperbarui"); }
      else { await api.post("/inventory", f); toast.success("Barang ditambahkan"); }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  return <Modal title={isEdit ? "Edit Barang" : "Tambah Barang"} onClose={onClose}>
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama *"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} className={inp}/></Field>
        <Field label="Kode / No. Inventaris"><input value={f.code} onChange={e=>setF({...f,code:e.target.value})} placeholder="INV-001" className={inp}/></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori *"><input value={f.category} onChange={e=>setF({...f,category:e.target.value})} placeholder="Elektronik" className={inp}/></Field>
        <Field label="Lokasi"><input value={f.location} onChange={e=>setF({...f,location:e.target.value})} placeholder="Gudang A" className={inp}/></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Stok"><input type="number" value={f.stock} onChange={e=>setF({...f,stock:+e.target.value})} className={inp}/></Field>
        <Field label="Min. Stok"><input type="number" value={f.min_stock} onChange={e=>setF({...f,min_stock:+e.target.value})} className={inp}/></Field>
        <Field label="Kondisi">
          <select value={f.condition} onChange={e=>setF({...f,condition:e.target.value})} className={inp}>
            <option value="Baik">Baik</option><option value="Perbaikan">Perbaikan</option><option value="Rusak">Rusak</option>
          </select>
        </Field>
      </div>
      <Field label="Keterangan"><textarea rows={2} value={f.description} onChange={e=>setF({...f,description:e.target.value})} className={inp}/></Field>
      <p className="text-[10px] text-slate-400">Barang akan ditandai &quot;Menipis&quot; otomatis bila stok tersedia ≤ Min. Stok.</p>
      <button onClick={save} disabled={busy} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan"}</button>
    </div>
  </Modal>;
}
function BorrowModal({item,onClose,onDone}) {
  const [f,setF] = useState({item_id:item.id, quantity:1, purpose:"", return_date:""});
  return <Modal title={`Pinjam: ${item.name}`} onClose={onClose}>
    <div className="space-y-3">
      <Field label="Jumlah"><input type="number" min={1} max={item.stock} value={f.quantity} onChange={e=>setF({...f,quantity:+e.target.value})} className={inp}/></Field>
      <Field label="Keperluan"><input value={f.purpose} onChange={e=>setF({...f,purpose:e.target.value})} className={inp}/></Field>
      <Field label="Tanggal Kembali"><input type="date" value={f.return_date} onChange={e=>setF({...f,return_date:e.target.value})} className={inp}/></Field>
      <button onClick={async()=>{try{await api.post("/borrow",f); toast.success("Permintaan diajukan"); onDone();}catch(e){toast.error(e.response?.data?.detail||"Gagal");}}}
        className="w-full py-2.5 bg-sky-600 text-white rounded-xl font-semibold">Ajukan</button>
    </div>
  </Modal>;
}
const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-sky-500 outline-none";
function Field({label, children}) { return <div><label className="text-xs font-semibold uppercase text-slate-600">{label}</label>{children}</div>; }
function Modal({title, onClose, children}) {
  return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b"><h3 className="font-heading font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
}
