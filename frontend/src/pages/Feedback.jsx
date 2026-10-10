import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MessageSquareWarning, Send, Search, Inbox } from "lucide-react";
import { FeedbackCard, FB_CATS, FB_STATUS } from "@/components/feedback/FeedbackCard";

export default function Feedback() {
  const { user } = useAuth();
  const isReviewer = ["super_admin","kepsek"].includes(user.role);
  const [list, setList] = useState([]);
  const [f, setF] = useState({category:"saran", content:"", anonymous:false});
  const [fc, setFc] = useState("all");
  const [fs, setFs] = useState("all");
  const [q, setQ] = useState("");
  const load = () => api.get(isReviewer ? "/feedback" : "/feedback/mine").then(r=>setList(r.data)).catch(()=>{});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isReviewer]);
  const submit = async () => {
    if (!f.content.trim()) return toast.error("Isi kritik/saran");
    await api.post("/feedback", f); toast.success("Terkirim! Terima kasih."); setF({category:"saran",content:"",anonymous:false});
    load();
  };
  const shown = list.filter(l => (fc==="all"||l.category===fc) && (fs==="all"||(l.status||"baru")===fs) &&
    (!q || `${l.content} ${l.user_name}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s) => list.filter(l => (l.status||"baru")===s).length;
  return <div className="space-y-6 max-w-3xl mx-auto" data-testid="feedback-page">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><MessageSquareWarning className="w-6 h-6"/></div>
      <div><h1 className="font-heading text-3xl font-extrabold">Kritik & Saran</h1>
        <p className="mt-1 text-sm text-slate-500">Sampaikan aspirasi Anda untuk sekolah yang lebih baik</p></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold uppercase text-slate-600">Kategori</label>
          <select data-testid="feedback-category-select" value={f.category} onChange={e=>setF({...f,category:e.target.value})} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl">
            <option value="saran">💡 Saran</option><option value="kritik">⚠️ Kritik</option><option value="laporan">📢 Laporan</option>
          </select></div>
        <label className="flex items-end gap-2 pb-2 cursor-pointer">
          <input type="checkbox" checked={f.anonymous} onChange={e=>setF({...f,anonymous:e.target.checked})}/>
          <span className="text-sm text-slate-700">Kirim sebagai anonim</span>
        </label>
      </div>
      <textarea data-testid="feedback-content-input" rows={5} placeholder="Tulis pesan Anda..." value={f.content} onChange={e=>setF({...f,content:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
      <button data-testid="feedback-submit-button" onClick={submit} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Send className="w-4 h-4"/>Kirim</button>
    </div>
    {isReviewer && (
      <div className="grid grid-cols-3 gap-3" data-testid="feedback-stats">
        {Object.entries(FB_STATUS).map(([k,v])=>(
          <button key={k} data-testid={`feedback-stat-${k}`} onClick={()=>setFs(fs===k?"all":k)}
            className={`p-4 rounded-2xl border text-left transition-colors ${fs===k?"border-slate-900 bg-slate-900 text-white":"border-slate-200 bg-white hover:border-slate-400"}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{v.l}</p>
            <p className="font-heading text-2xl font-extrabold mt-1">{count(k)}</p>
          </button>
        ))}
      </div>
    )}
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="font-heading text-xl font-bold">{isReviewer ? "Laporan Masuk" : "Masukan Saya"} ({shown.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"/>
            <input data-testid="feedback-search-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari..." className="pl-8 pr-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm w-40 focus:border-sky-500 outline-none"/>
          </div>
          <select data-testid="feedback-filter-category" value={fc} onChange={e=>setFc(e.target.value)} className="px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm">
            <option value="all">Semua Kategori</option>{Object.entries(FB_CATS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
          </select>
          <select data-testid="feedback-filter-status" value={fs} onChange={e=>setFs(e.target.value)} className="px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm">
            <option value="all">Semua Status</option>{Object.entries(FB_STATUS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {shown.map(l => <FeedbackCard key={l.id} item={l} reviewer={isReviewer} onChanged={load}/>)}
        {shown.length===0 && <div data-testid="feedback-empty" className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400"><Inbox className="w-8 h-8 mx-auto mb-2"/>Belum ada masukan.</div>}
      </div>
    </div>
  </div>;
}
