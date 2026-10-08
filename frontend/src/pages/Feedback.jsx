import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MessageSquareWarning, Send, Trash2 } from "lucide-react";

export default function Feedback() {
  const { user } = useAuth();
  const isReviewer = ["super_admin","kepsek"].includes(user.role);
  const [list, setList] = useState([]);
  const [f, setF] = useState({category:"saran", content:"", anonymous:false});
  const load = () => { if(isReviewer) api.get("/feedback").then(r=>setList(r.data)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [isReviewer]);
  const submit = async () => {
    if (!f.content.trim()) return toast.error("Isi kritik/saran");
    await api.post("/feedback", f); toast.success("Terkirim! Terima kasih."); setF({category:"saran",content:"",anonymous:false});
    if (isReviewer) load();
  };
  const remove = async (l) => {
    if (!window.confirm("Hapus masukan ini?")) return;
    try { await api.delete(`/feedback/${l.id}`); toast.success("Masukan dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  return <div className="space-y-6 max-w-3xl mx-auto" data-testid="feedback-page">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><MessageSquareWarning className="w-6 h-6"/></div>
      <div><h1 className="font-heading text-3xl font-extrabold">Kritik & Saran</h1>
        <p className="mt-1 text-sm text-slate-500">Sampaikan aspirasi Anda untuk sekolah yang lebih baik</p></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-xs font-semibold uppercase text-slate-600">Kategori</label>
          <select value={f.category} onChange={e=>setF({...f,category:e.target.value})} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl">
            <option value="saran">💡 Saran</option><option value="kritik">⚠️ Kritik</option><option value="laporan">📢 Laporan</option>
          </select></div>
        <label className="flex items-end gap-2 pb-2 cursor-pointer">
          <input type="checkbox" checked={f.anonymous} onChange={e=>setF({...f,anonymous:e.target.checked})}/>
          <span className="text-sm text-slate-700">Kirim sebagai anonim</span>
        </label>
      </div>
      <textarea rows={5} placeholder="Tulis pesan Anda..." value={f.content} onChange={e=>setF({...f,content:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
      <button data-testid="feedback-submit-button" onClick={submit} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Send className="w-4 h-4"/>Kirim</button>
    </div>
    {isReviewer && (
      <div>
        <h2 className="font-heading text-xl font-bold mb-3">Laporan Masuk ({list.length})</h2>
        <div className="space-y-3">
          {list.map(l=>(
            <div key={l.id} data-testid={`feedback-row-${l.id}`} className="bg-white border-l-4 border-amber-500 border-y border-r border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">{l.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleDateString("id-ID")}</span>
                  <button data-testid={`feedback-delete-${l.id}`} onClick={()=>remove(l)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700">{l.content}</p>
              <p className="mt-2 text-xs text-slate-500">— {l.user_name}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>;
}
