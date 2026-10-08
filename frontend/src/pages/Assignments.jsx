import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ClipboardList, Plus, X } from "lucide-react";

export default function Assignments() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [openFor, setOpenFor] = useState(null);
  const [subs, setSubs] = useState([]);
  const [content, setContent] = useState("");
  const load = () => api.get("/assignments").then(r=>setList(r.data));
  useEffect(() => { load(); }, []);
  const isTeacher = ["guru","super_admin"].includes(user.role);

  const openDetail = async (a) => {
    setOpenFor(a);
    const r = await api.get(`/submissions?assignment_id=${a.id}`);
    setSubs(r.data);
    setContent("");
  };
  const submit = async () => {
    await api.post("/submissions", { assignment_id: openFor.id, content });
    toast.success("Tugas dikumpulkan!"); setContent(""); openDetail(openFor);
  };
  const grade = async (sid, g) => { await api.patch(`/submissions/${sid}/grade?grade=${g}`); toast.success("Nilai disimpan"); openDetail(openFor); };

  return (
    <div className="space-y-6" data-testid="assignments-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-3xl font-extrabold text-slate-900">Tugas Terstruktur</h1>
          <p className="mt-1 text-sm text-slate-500">{isTeacher?"Buat & nilai tugas siswa":"Kerjakan tugas dari guru"}</p></div>
        {isTeacher && <button onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700"><Plus className="w-4 h-4"/>Tugas Baru</button>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(a=>(
          <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><ClipboardList className="w-5 h-5"/></div>
            <h3 className="font-heading font-bold text-slate-900 mt-3">{a.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Deadline: <b className="text-slate-800">{a.due_date}</b></span>
              <span className="text-slate-400">{a.kelas}</span>
            </div>
            <button onClick={()=>openDetail(a)} className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">
              {isTeacher?"Lihat Submisi":"Kerjakan"}
            </button>
          </div>
        ))}
      </div>

      {showNew && <NewAssignModal onClose={()=>setShowNew(false)} onDone={()=>{load(); setShowNew(false);}}/>}
      {openFor && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">{openFor.title}</h3>
              <button onClick={()=>setOpenFor(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button></div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700">{openFor.description}</p>
              {isTeacher ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Submisi ({subs.length})</p>
                  {subs.map(s=>(
                    <div key={s.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between"><b className="text-sm">{s.student_name}</b>
                        <input type="number" defaultValue={s.grade ?? ""} placeholder="nilai" onBlur={e=>e.target.value && grade(s.id, +e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-sm"/></div>
                      <p className="mt-2 text-sm text-slate-700">{s.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <textarea value={content} onChange={e=>setContent(e.target.value)} rows={5} placeholder="Tulis jawaban tugas..."
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
                  <button onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Kumpulkan</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewAssignModal({onClose,onDone}) {
  const [f,setF] = useState({title:"",description:"",kelas:"",due_date:""});
  return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
      <div className="flex items-center justify-between p-4 border-b"><h3 className="font-heading font-bold text-lg">Tugas Baru</h3>
        <button onClick={onClose} className="p-1.5"><X className="w-5 h-5"/></button></div>
      <div className="p-5 space-y-3">
        <input placeholder="Judul" value={f.title} onChange={e=>setF({...f,title:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <textarea rows={3} placeholder="Deskripsi" value={f.description} onChange={e=>setF({...f,description:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Kelas (XI IPA 1)" value={f.kelas} onChange={e=>setF({...f,kelas:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
          <input type="date" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})} className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
        </div>
        <button onClick={async()=>{await api.post("/assignments",f); toast.success("Tugas dibuat"); onDone();}}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Simpan</button>
      </div>
    </div>
  </div>;
}
