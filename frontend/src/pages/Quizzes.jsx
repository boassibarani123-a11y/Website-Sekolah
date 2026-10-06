import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BrainCircuit, Plus, X, Trash2, Lock } from "lucide-react";
import { QuizUnlockModal, QuizPasswordField, quizPasswordBody } from "@/components/QuizPassword";
import { QuizTakeModal, QuizTimeField } from "@/components/QuizTake";

export default function Quizzes() {
  const { user } = useAuth();
  const isTeacher = ["guru","super_admin"].includes(user.role);
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [taking, setTaking] = useState(null);
  const [unlocking, setUnlocking] = useState(null);
  const startQuiz = (q) => { if (q.locked) return setUnlocking(q); setTaking(q); };
  const load = () => api.get("/quizzes").then(r=>setList(r.data));
  useEffect(() => { load(); }, []);


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
            <h3 className="font-heading font-bold mt-3">{q.title}{q.has_password && <span data-testid={`quiz-lock-${q.id}`} className={`ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${q.locked?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-500"}`}><Lock className="w-3 h-3"/>{q.locked?"Terkunci":"Berpassword"}</span>}</h3>
            <p className="text-xs text-slate-500 mt-1">{q.question_count ?? (q.questions||[]).length} soal{q.time_limit ? ` · ⏱ ${q.time_limit} menit` : ""} · {q.kelas}</p>
            {!isTeacher && <button data-testid={`take-quiz-${q.id}`} onClick={()=>startQuiz(q)}
              className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">Kerjakan</button>}
          </div>
        ))}
      </div>

      {showNew && <NewQuizModal onClose={()=>setShowNew(false)} onDone={()=>{load();setShowNew(false);}}/>}
      {unlocking && <QuizUnlockModal quiz={unlocking} onClose={()=>setUnlocking(null)} onUnlocked={(qz)=>{setUnlocking(null); load(); startQuiz(qz);}}/>}
      {taking && <QuizTakeModal quiz={taking} onClose={()=>setTaking(null)} onDone={()=>setTaking(null)}/>}
    </div>
  );
}

function NewQuizModal({onClose,onDone}) {
  const [title,setTitle]=useState(""); const [kelas,setKelas]=useState("");
  const [qs, setQs] = useState([{q:"",options:["","","",""],answer:0}]);
  const [password, setPassword] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const add = () => setQs([...qs, {q:"",options:["","","",""],answer:0}]);
  const [aiTopic, setAiTopic] = useState(""); const [aiCount, setAiCount] = useState(5); const [aiBusy, setAiBusy] = useState(false);
  const genAI = async () => {
    if (!aiTopic.trim()) { toast.error("Isi topik dulu"); return; }
    setAiBusy(true);
    try { const r = await api.post("/ai/quiz-generate", { topic: aiTopic, count: +aiCount||5, kelas }); setQs(r.data.questions); toast.success(`${r.data.questions.length} soal dibuat AI`); }
    catch (e) { toast.error(e.response?.data?.detail || "AI gagal membuat soal"); }
    finally { setAiBusy(false); }
  };
  const submit = async () => {
    try { await api.post("/quizzes", { title, kelas, questions: qs, time_limit: +timeLimit || 0, ...quizPasswordBody(password, false) }); toast.success("Quiz dibuat"); onDone(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal membuat quiz"); }
  };
  return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">Buat Quiz</h3>
        <button onClick={onClose} className="p-1.5"><X className="w-5 h-5"/></button></div>
      <div className="p-5 space-y-3">
        <input placeholder="Judul quiz" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <input placeholder="Kelas (XI IPA 1)" value={kelas} onChange={e=>setKelas(e.target.value)} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2" data-testid="ai-quiz-box">
          <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">✨ Buat soal otomatis dengan AI</p>
          <div className="flex gap-2">
            <input data-testid="ai-quiz-topic" placeholder="Topik, mis. Fotosintesis" value={aiTopic} onChange={e=>setAiTopic(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm"/>
            <input data-testid="ai-quiz-count" type="number" min="1" max="15" value={aiCount} onChange={e=>setAiCount(e.target.value)} className="w-16 px-2 py-2 border rounded-lg text-sm"/>
            <button type="button" data-testid="ai-quiz-generate" disabled={aiBusy} onClick={genAI} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">{aiBusy?"...":"Buat"}</button>
          </div>
        </div>
        <QuizTimeField value={timeLimit} onChange={setTimeLimit}/>
        <QuizPasswordField hasPassword={false} value={password} onChange={setPassword} remove={false} onRemove={()=>{}}/>
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
