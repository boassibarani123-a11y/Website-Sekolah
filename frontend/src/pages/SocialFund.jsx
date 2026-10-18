import { PageHeader, StatStrip } from "@/components/zx/ui";
import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { HandCoins, Download, Pencil, Trash2 } from "lucide-react";
import { TxEditModal } from "@/components/TxEditModal";

export default function SocialFund() {
  const { user } = useAuth();
  const isOfficial = ["ketua_osis","super_admin"].includes(user.role);
  const [rows,setRows]=useState([]);
  const [editing,setEditing]=useState(null);
  const remove = async (r) => {
    if (!window.confirm(`Hapus transaksi "${r.note||r.type}" sebesar Rp ${r.amount.toLocaleString("id-ID")}?`)) return;
    try { await api.delete(`/social-fund/${r.id}`); toast.success("Transaksi dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  const [f,setF]=useState({kelas:"", amount:0, note:"", type:"masuk"});
  const load = () => api.get("/social-fund").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const total = rows.reduce((s,r)=>s+(r.type==="masuk"?r.amount:-r.amount),0);
  const exp = async () => {
    const r = await api.get("/social-fund/export", {responseType:"blob"});
    const u = URL.createObjectURL(r.data); const a=document.createElement("a"); a.href=u; a.download="dana_sosial.xlsx"; a.click();
  };
  return <div className="space-y-6" data-testid="social-fund-page">
    <PageHeader title="Dana Sosial" subtitle="Kelola dan laporkan dana kegiatan sosial sekolah secara transparan."
      actions={<button data-testid="social-fund-export" onClick={exp} className="zx-btn-primary"><Download className="w-4 h-4"/>Ekspor Excel</button>}/>
    <StatStrip items={[
      { label: "Saldo dana sosial", value: `Rp ${total.toLocaleString("id-ID")}`, hint: "Pemasukan dikurangi pengeluaran", testid: "social-fund-total" },
      { label: "Pemasukan", value: `Rp ${rows.filter(r => r.type === "masuk").reduce((a, r) => a + r.amount, 0).toLocaleString("id-ID")}`, hint: `${rows.filter(r => r.type === "masuk").length} transaksi` },
      { label: "Pengeluaran", value: `Rp ${rows.filter(r => r.type !== "masuk").reduce((a, r) => a + r.amount, 0).toLocaleString("id-ID")}`, hint: `${rows.filter(r => r.type !== "masuk").length} transaksi` },
    ]}/>
    {isOfficial && <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="font-heading font-bold mb-3">Catat Transaksi</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input placeholder="Kelas/Sumber" value={f.kelas} onChange={e=>setF({...f,kelas:e.target.value})} className="px-3 py-2 border-2 rounded-lg"/>
        <input inputMode="numeric" data-testid="sf-amount-input" placeholder="Jumlah (Rp)"
          value={f.amount ? f.amount.toLocaleString("id-ID") : ""}
          onChange={e=>{const n=parseInt(e.target.value.replace(/\D/g,""),10);setF({...f,amount:Number.isNaN(n)?0:n});}}
          className="px-3 py-2 border-2 rounded-lg"/>
        <select value={f.type} onChange={e=>setF({...f,type:e.target.value})} className="px-3 py-2 border-2 rounded-lg">
          <option value="masuk">Masuk</option><option value="keluar">Keluar</option></select>
        <input placeholder="Keterangan" value={f.note} onChange={e=>setF({...f,note:e.target.value})} className="px-3 py-2 border-2 rounded-lg lg:col-span-1"/>
        <button data-testid="sf-add-button" onClick={async()=>{if(!f.amount||f.amount<=0)return toast.error("Isi jumlah");try{await api.post("/social-fund",f); toast.success("Tercatat"); load(); setF({...f,amount:0,note:""});}catch(e){toast.error(e.response?.data?.detail||"Gagal mencatat");}}}
          className="bg-slate-900 text-white rounded-lg font-semibold px-4">Simpan</button>
      </div>
    </div>}
    <div className="bg-white border rounded-2xl divide-y">
      {rows.map(r=>(
        <div key={r.id} data-testid={`sf-row-${r.id}`} className="p-4 flex justify-between items-center gap-3">
          <div><p className="font-semibold text-sm">{r.note||"—"}</p>
            <p className="text-xs text-slate-500">{r.kelas} · {new Date(r.created_at).toLocaleDateString("id-ID")}</p></div>
          <div className="flex items-center gap-2 shrink-0">
            <p className={`font-bold ${r.type==="masuk"?"text-emerald-600":"text-rose-600"}`}>{r.type==="masuk"?"+":"−"} Rp {r.amount.toLocaleString("id-ID")}</p>
            {isOfficial && <>
              <button data-testid={`sf-edit-${r.id}`} onClick={()=>setEditing(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4"/></button>
              <button data-testid={`sf-delete-${r.id}`} onClick={()=>remove(r)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4"/></button>
            </>}
          </div>
        </div>
      ))}
    </div>
    {editing && <TxEditModal tx={editing} showSource onClose={()=>setEditing(null)}
      onSave={async(body)=>{await api.patch(`/social-fund/${editing.id}`, body); toast.success("Transaksi diperbarui"); setEditing(null); load();}}/>}
  </div>;
}
