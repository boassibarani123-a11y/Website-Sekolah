import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Boxes, Plus, X, Check, Ban, Undo2, User, History } from "lucide-react";

const STATUS_STYLE = {
  "Menunggu Approval": "bg-sky-100 text-sky-700 border-sky-200",
  "Disetujui": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Ditolak": "bg-rose-100 text-rose-700 border-rose-200",
  "Dikembalikan": "bg-slate-100 text-slate-700 border-slate-200",
};

const ROLE_LABEL = {
  super_admin: "Super Admin", kepsek: "Kepala Sekolah", staff_tu: "Staff TU",
  guru: "Guru", siswa: "Siswa", ketua_osis: "Ketua OSIS", ketua_kelas: "Ketua Kelas", orang_tua: "Orang Tua",
};

export default function Inventory() {
  const { user } = useAuth();
  const isStaff = ["staff_tu","super_admin"].includes(user.role);
  const [items, setItems] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [borrowFor, setBorrowFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [tab, setTab] = useState("items");
  const load = () => {
    api.get("/inventory").then(r=>setItems(r.data));
    api.get(`/borrow${isStaff?"":"?mine=true"}`).then(r=>setReqs(r.data));
  };
  useEffect(() => { load(); }, []);

  const approve = async (bid, status) => {
    await api.patch(`/borrow/${bid}?status=${status}`);
    toast.success(`Request ${status}`); load();
  };

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(i=>(
            <div key={i.id} data-testid={`inventory-item-${i.id}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Boxes className="w-6 h-6"/></div>
              <h3 className="font-heading font-bold text-slate-900 mt-3">{i.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{i.category} · {i.condition}</p>
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
                  <button data-testid={`inventory-history-${i.id}`} onClick={()=>setHistoryFor(i)} title="Riwayat peminjaman"
                    className="px-3 py-2 border-2 border-slate-200 rounded-lg text-slate-600 hover:border-sky-400 hover:text-sky-600"><History className="w-4 h-4"/></button>
                )}
              </div>
            </div>
          ))}
        </div>
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
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
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

      {showAdd && <AddItemModal onClose={()=>setShowAdd(false)} onDone={()=>{load();setShowAdd(false);}}/>}
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
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
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

function AddItemModal({onClose,onDone}) {
  const [f,setF] = useState({name:"",category:"",stock:1,condition:"Baik"});
  return <Modal title="Tambah Barang" onClose={onClose}>
    <div className="space-y-3">
      <Field label="Nama"><input value={f.name} onChange={e=>setF({...f,name:e.target.value})} className={inp}/></Field>
      <Field label="Kategori"><input value={f.category} onChange={e=>setF({...f,category:e.target.value})} className={inp}/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stok"><input type="number" value={f.stock} onChange={e=>setF({...f,stock:+e.target.value})} className={inp}/></Field>
        <Field label="Kondisi"><input value={f.condition} onChange={e=>setF({...f,condition:e.target.value})} className={inp}/></Field>
      </div>
      <button onClick={async()=>{await api.post("/inventory",f); toast.success("Barang ditambahkan"); onDone();}}
        className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan</button>
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
