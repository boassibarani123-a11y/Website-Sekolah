import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PiggyBank, TrendingUp, TrendingDown } from "lucide-react";

export default function UangKas() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({kelas: user.kelas||"", amount:0, note:"", type:"masuk"});
  const load = () => api.get("/kas").then(r=>setRows(r.data));
  useEffect(() => { load(); }, []);
  const total = rows.reduce((s,r)=>s+(r.type==="masuk"?r.amount:-r.amount),0);
  const submit = async () => {
    if (!f.kelas || !f.amount) return toast.error("Isi kelas dan jumlah");
    await api.post("/kas", f); toast.success("Tercatat"); load();
    setF({...f, amount:0, note:""});
  };
  return <div className="space-y-6" data-testid="kas-page">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="font-heading text-3xl font-extrabold">Uang Kas Kelas</h1>
        <p className="mt-1 text-sm text-slate-500">Catat setoran & pengeluaran kas kelas</p></div>
      <button data-testid="kas-export-button" onClick={async()=>{const r=await api.get(`/kas/export${user.kelas?`?kelas=${encodeURIComponent(user.kelas)}`:''}`,{responseType:'blob'});const u=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=u;a.download='Uang_Kas.xlsx';a.click();}}
        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2">📊 Export Excel</button>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white p-5 rounded-2xl shadow-lg">
        <PiggyBank className="w-8 h-8 opacity-80"/>
        <p className="text-xs uppercase tracking-wide mt-3">Saldo Kas</p>
        <p className="font-heading text-3xl font-extrabold mt-1">Rp {total.toLocaleString("id-ID")}</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm md:col-span-2">
        <h3 className="font-heading font-bold mb-3">Catat Transaksi</h3>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Kelas" value={f.kelas} onChange={e=>setF({...f,kelas:e.target.value})} className="px-3 py-2 border-2 border-slate-200 rounded-lg"/>
          <input type="number" placeholder="Jumlah (Rp)" value={f.amount||""} onChange={e=>setF({...f,amount:+e.target.value})} className="px-3 py-2 border-2 border-slate-200 rounded-lg"/>
          <select value={f.type} onChange={e=>setF({...f,type:e.target.value})} className="px-3 py-2 border-2 border-slate-200 rounded-lg">
            <option value="masuk">Masuk</option><option value="keluar">Keluar</option>
          </select>
          <input placeholder="Keterangan" value={f.note} onChange={e=>setF({...f,note:e.target.value})} className="px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        </div>
        <button data-testid="uang-kas-add-transaction-button" onClick={submit} className="mt-3 w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan</button>
      </div>
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl divide-y">
      {rows.length===0 && <p className="p-6 text-slate-400 italic text-center">Belum ada transaksi.</p>}
      {rows.map(r=>(
        <div key={r.id} className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {r.type==="masuk"?<TrendingUp className="w-5 h-5 text-emerald-600"/>:<TrendingDown className="w-5 h-5 text-rose-600"/>}
            <div><p className="font-semibold text-sm">{r.note || (r.type==="masuk"?"Setoran":"Pengeluaran")}</p>
              <p className="text-xs text-slate-500">{r.kelas} · {r.recorded_by} · {new Date(r.created_at).toLocaleDateString("id-ID")}</p></div>
          </div>
          <p className={`font-heading font-bold ${r.type==="masuk"?"text-emerald-600":"text-rose-600"}`}>{r.type==="masuk"?"+":"−"} Rp {r.amount.toLocaleString("id-ID")}</p>
        </div>
      ))}
    </div>
  </div>;
}
