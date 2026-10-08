import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Vote, Plus, X, Trash2, Award } from "lucide-react";

const POS = [{v:"ketua",l:"Ketua"},{v:"wakil",l:"Wakil"}];

export default function Elections() {
  const { user } = useAuth();
  const canManage = ["super_admin","ketua_osis"].includes(user.role);
  const isVoter = user.role === "siswa";
  const [cands, setCands] = useState([]);
  const [my, setMy] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const load = () => {
    api.get("/candidates").then(r=>setCands(r.data));
    if (isVoter) api.get("/my-votes").then(r=>setMy(r.data));
  };
  useEffect(() => { load(); }, []);
  const votedPositions = my.map(v=>v.position);

  const vote = async (c) => {
    try { await api.post(`/vote/${c.id}`); toast.success(`Vote untuk ${c.name} terkirim`); load(); }
    catch(e) { toast.error(e.response?.data?.detail||"Gagal vote"); }
  };
  const del = async (id) => { await api.delete(`/candidates/${id}`); load(); };

  return <div className="space-y-6" data-testid="elections-page">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="font-heading text-3xl font-extrabold">Pemilu OSIS 2026</h1>
        <p className="mt-1 text-sm text-slate-500">Suara demokratis untuk pemimpin masa depan sekolah</p></div>
      {canManage && <button onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>Kandidat Baru</button>}
    </div>

    {POS.map(pos => {
      const list = cands.filter(c=>c.position===pos.v);
      if (!list.length) return null;
      return <div key={pos.v}>
        <h2 className="font-heading text-xl font-bold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500"/>Kandidat {pos.l}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c,i)=>{
            const voted = votedPositions.includes(pos.v);
            return <div key={c.id} className="bg-white border-2 border-slate-200 hover:border-sky-500 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all relative">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-slate-900 text-white font-black flex items-center justify-center border-2 border-white shadow-lg">{i+1}</div>
              <div className="w-20 h-20 rounded-full bg-slate-100 mx-auto overflow-hidden mb-3 border-2 border-sky-100">
                {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-slate-400">{c.name?.[0]}</div>}
              </div>
              <h3 className="font-heading font-bold text-center">{c.name}</h3>
              <p className="text-xs text-center text-sky-600 font-semibold uppercase mt-0.5">{pos.l}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <p><b>Visi:</b> {c.vision}</p>
                <p className="line-clamp-2"><b>Misi:</b> {c.mission}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">📊 {c.vote_count} suara</span>
                {canManage && <button onClick={()=>del(c.id)} className="text-rose-500"><Trash2 className="w-4 h-4"/></button>}
              </div>
              {isVoter && (
                <button data-testid="osis-vote-candidate-button" disabled={voted} onClick={()=>vote(c)}
                  className={`mt-3 w-full py-2 rounded-xl font-semibold text-sm ${voted?"bg-slate-200 text-slate-500 cursor-not-allowed":"bg-sky-600 text-white hover:bg-sky-700"}`}>
                  {voted?"Sudah Vote":"Vote Kandidat Ini"}
                </button>
              )}
            </div>;
          })}
        </div>
      </div>;
    })}

    {cands.length===0 && <div className="bg-white p-12 rounded-2xl text-center border">
      <Vote className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
      <p className="text-slate-500">Belum ada kandidat. {canManage && "Tambahkan kandidat baru untuk memulai pemilu."}</p>
    </div>}

    {showNew && <NewCandModal onClose={()=>setShowNew(false)} onDone={()=>{load();setShowNew(false);}}/>}
  </div>;
}

function NewCandModal({onClose,onDone}) {
  const [f,setF]=useState({name:"",position:"ketua",vision:"",mission:"",photo:""});
  const onFile = e => {
    const fi = e.target.files?.[0]; if (!fi) return;
    const fd = new FormData(); fd.append("file", fi);
    api.post("/upload", fd).then(r => {
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      setF({...f, photo: url});
    }).catch(() => toast.error("Gagal upload"));
  };
  return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b"><h3 className="font-heading font-bold">Kandidat Baru</h3><button onClick={onClose}><X className="w-5 h-5"/></button></div>
      <div className="p-5 space-y-3">
        <input placeholder="Nama Lengkap" value={f.name} onChange={e=>setF({...f,name:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg"/>
        <select value={f.position} onChange={e=>setF({...f,position:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg">
          {POS.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
        <textarea rows={2} placeholder="Visi" value={f.vision} onChange={e=>setF({...f,vision:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg"/>
        <textarea rows={3} placeholder="Misi" value={f.mission} onChange={e=>setF({...f,mission:e.target.value})} className="w-full px-3 py-2 border-2 rounded-lg"/>
        <input type="file" accept="image/*" onChange={onFile}/>
        {f.photo && <img src={f.photo} className="w-20 h-20 object-cover rounded-full mx-auto"/>}
        <button onClick={async()=>{await api.post("/candidates",f); toast.success("Kandidat ditambahkan"); onDone();}}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan</button>
      </div>
    </div>
  </div>;
}
