import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Megaphone, Plus } from "lucide-react";

export default function Announcements() {
  const { user } = useAuth();
  const canPost = user.role !== "siswa";
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({title:"",content:"",scope:"sekolah"});
  const load = () => api.get("/announcements").then(r=>setList(r.data));
  useEffect(() => { load(); }, []);
  const submit = async () => {
    if (!f.title || !f.content) return toast.error("Lengkapi form");
    await api.post("/announcements", f); toast.success("Pengumuman dipublikasi"); setF({title:"",content:"",scope:"sekolah"}); setShowNew(false); load();
  };
  return <div className="space-y-6" data-testid="announcements-page">
    <div className="flex items-center justify-between">
      <div><h1 className="font-heading text-3xl font-extrabold">Papan Pengumuman</h1>
        <p className="mt-1 text-sm text-slate-500">Informasi terbaru dari sekolah, OSIS, dan kelas</p></div>
      {canPost && <button onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>Buat</button>}
    </div>
    {showNew && (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <input placeholder="Judul" value={f.title} onChange={e=>setF({...f,title:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <textarea rows={4} placeholder="Isi pengumuman..." value={f.content} onChange={e=>setF({...f,content:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <div className="flex gap-2">
          <button onClick={()=>setShowNew(false)} className="flex-1 py-2 border-2 rounded-lg">Batal</button>
          <button onClick={submit} className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-semibold">Publikasi</button>
        </div>
      </div>
    )}
    <div className="space-y-3">
      {list.length===0 && <div className="bg-white p-12 rounded-2xl text-center border"><Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3"/><p className="text-slate-500">Belum ada pengumuman.</p></div>}
      {list.map(a=>(
        <div key={a.id} className="bg-white border-l-4 border-sky-500 border-y border-r border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-heading font-bold text-slate-900">{a.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Oleh {a.author} ({a.role}) · {new Date(a.created_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}</p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-sky-100 text-sky-700">{a.scope}</span>
          </div>
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-line">{a.content}</p>
        </div>
      ))}
    </div>
  </div>;
}
