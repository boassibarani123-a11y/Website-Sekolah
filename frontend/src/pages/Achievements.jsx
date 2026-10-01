import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { Trophy, ClipboardCheck, BrainCircuit } from "lucide-react";

export default function Achievements() {
  const [data, setData] = useState({most_diligent:[], top_academic:[]});
  useEffect(()=>{api.get("/achievements").then(r=>setData(r.data));},[]);
  return <div className="space-y-6" data-testid="achievements-page">
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
      <Trophy className="w-12 h-12"/>
      <div><h1 className="font-heading text-3xl font-extrabold">Papan Prestasi Semester</h1>
        <p className="text-sm opacity-90 mt-1">Siswa terbaik berdasarkan kerajinan & akademik</p></div>
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <Board title="Siswa Paling Rajin" subtitle="Berdasarkan jumlah tugas terkumpul" icon={ClipboardCheck} items={data.most_diligent} field="count" unit="tugas"/>
      <Board title="Prestasi Akademik Terbaik" subtitle="Berdasarkan rata-rata skor Mini-Quiz" icon={BrainCircuit} items={data.top_academic} field="avg" unit="%"/>
    </div>
  </div>;
}

function Board({title, subtitle, icon:Icon, items, field, unit}) {
  const medal = (i) => i===0?"bg-amber-400 text-slate-900":i===1?"bg-slate-300 text-slate-900":i===2?"bg-amber-700 text-white":"bg-slate-100 text-slate-600";
  return <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Icon className="w-5 h-5"/></div>
      <div><h2 className="font-heading font-bold text-slate-900">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div>
    </div>
    {items.length===0 && <p className="text-slate-400 italic text-sm">Belum ada data.</p>}
    <div className="space-y-2">
      {items.map((it,i)=>(
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <span className={`w-8 h-8 rounded-full font-black text-sm flex items-center justify-center border-2 border-white shadow ${medal(i)}`}>{i+1}</span>
          <p className="flex-1 font-semibold text-sm">{it.name}</p>
          <p className="font-heading font-bold text-slate-900">{field==="avg"?(it[field]||0).toFixed(1):it[field]}<span className="text-xs text-slate-500 ml-1">{unit}</span></p>
        </div>
      ))}
    </div>
  </div>;
}
