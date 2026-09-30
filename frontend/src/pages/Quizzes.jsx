import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BrainCircuit, Plus, X, Trash2 } from "lucide-react";

export default function Quizzes() {
  const { user } = useAuth();
  const isTeacher = ["guru","super_admin"].includes(user.role);
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [taking, setTaking] = useState(null);
  const [answers, setAnswers] = useState([]);
  const load = () => api.get("/quizzes").then(r=>setList(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const r = await api.post("/quizzes/attempt", { quiz_id: taking.id, answers });
    toast.success(`Skor: ${r.data.score}/${r.data.total} (${r.data.percent.toFixed(0)}%)`);
    setTaking(null);
  };

  return (
    <div className="space-y-6" data-testid="quizzes-page">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-3xl font-extrabold">Mini-Quiz Harian</h1>
          <p className="mt-1 text-sm text-slate-500">Kuis singkat berdasarkan materi hari ini</p></div>
        {isTeacher && <button onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2"><Plus className="w-4 h-4"/>Quiz Baru</button>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(q=>(
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><BrainCircuit className="w-5 h-5"/></div>
            <h3 className="font-heading font-bold mt-3">{q.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{(q.questions||[]).length} soal · {q.kelas}</p>
            {!isTeacher && <button onClick={()=>{setTaking(q); setAnswers(Array(q.questions.length).fill(-1));}}
              className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Kerjakan</button>}
          </div>
        ))}
      </div>

      {showNew && <NewQuizModal onClose={()=>setShowNew(false)} onDone={()=>{load();setShowNew(false);}}/>}
      {taking && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">{taking.title}</h3>
              <button onClick={()=>setTaking(null)} className="p-1.5"><X className="w-5 h-5"/></button></div>
            <div className="p-5 space-y-4">
              {taking.questions.map((q,i)=>(
                <div key={i} className="p-4 bg-slate-50 rounded-xl">
                  <p className="font-semibold text-sm mb-2">{i+1}. {q.q}</p>
                  <div className="space-y-1.5">
                    {q.options.map((o,oi)=>(
                      <label key={oi} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-white cursor-pointer">
                        <input type="radio" checked={answers[i]===oi} onChange={()=>{const a=[...answers];a[i]=oi;setAnswers(a);}}/>{o}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Kirim Jawaban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewQuizModal({onClose,onDone}) {
  const [title,setTitle]=useState(""); const [kelas,setKelas]=useState("");
  const [qs, setQs] = useState([{q:"",options:["","","",""],answer:0}]);
  const add = () => setQs([...qs, {q:"",options:["","","",""],answer:0}]);
  const submit = async () => {
    await api.post("/quizzes", { title, kelas, questions: qs });
    toast.success("Quiz dibuat"); onDone();
  };
  return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">Buat Quiz</h3>
        <button onClick={onClose} className="p-1.5"><X className="w-5 h-5"/></button></div>
      <div className="p-5 space-y-3">
        <input placeholder="Judul quiz" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <input placeholder="Kelas (XI IPA 1)" value={kelas} onChange={e=>setKelas(e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        {qs.map((q,qi)=>(
          <div key={qi} className="p-3 bg-slate-50 rounded-xl space-y-2 relative">
            <button onClick={()=>setQs(qs.filter((_,i)=>i!==qi))} className="absolute top-2 right-2 text-rose-500"><Trash2 className="w-4 h-4"/></button>
            <input placeholder={`Soal #${qi+1}`} value={q.q} onChange={e=>{const c=[...qs];c[qi].q=e.target.value;setQs(c);}} className="w-full px-3 py-2 border rounded-lg text-sm"/>
            {q.options.map((o,oi)=>(
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" checked={q.answer===oi} onChange={()=>{const c=[...qs];c[qi].answer=oi;setQs(c);}}/>
                <input placeholder={`Opsi ${oi+1}`} value={o} onChange={e=>{const c=[...qs];c[qi].options[oi]=e.target.value;setQs(c);}} className="flex-1 px-2 py-1 border rounded text-sm"/>
              </div>
            ))}
          </div>
        ))}
        <button onClick={add} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:border-sky-500">+ Tambah Soal</button>
        <button onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan Quiz</button>
      </div>
    </div>
  </div>;
}
