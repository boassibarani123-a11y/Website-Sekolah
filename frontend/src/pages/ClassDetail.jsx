import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { School, ArrowLeft, Plus, X, ClipboardList, BrainCircuit, Paperclip,
  FileText, ImageIcon, Upload, Trash2, CheckCircle2 } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

async function uploadFiles(fileList) {
  const out = [];
  for (const f of Array.from(fileList)) {
    const fd = new FormData();
    fd.append("file", f);
    const r = await api.post("/upload", fd);
    out.push({ url: `${BACKEND}${r.data.url}`, name: f.name, type: f.type });
  }
  return out;
}

function AttachmentChip({ att }) {
  const isImg = (att.type || "").startsWith("image/");
  return (
    <a href={att.url} target="_blank" rel="noreferrer" data-testid="attachment-link"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 max-w-full">
      {isImg ? <ImageIcon className="w-3.5 h-3.5 text-sky-600 shrink-0"/> : <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0"/>}
      <span className="truncate">{att.name || "Lampiran"}</span>
    </a>
  );
}

export default function ClassDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isTeacher = ["guru", "super_admin"].includes(user.role);
  const isStudent = user.role === "siswa";
  const [klass, setKlass] = useState(null);
  const [tab, setTab] = useState("tugas");
  const [subject, setSubject] = useState("all");

  useEffect(() => { api.get(`/classes/${id}`).then(r => setKlass(r.data)).catch(()=>toast.error("Kelas tidak ditemukan")); }, [id]);

  if (!klass) return <div className="text-slate-400 py-20 text-center">Memuat kelas...</div>;

  const subjects = klass.subjects || [];

  return (
    <div className="space-y-6" data-testid="class-detail-page">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
        <ArrowLeft className="w-4 h-4"/>Semua Kelas
      </Link>
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-sky-400/20 blur-3xl"/>
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20"><School className="w-6 h-6"/></div>
          <div>
            <h1 className="font-heading text-2xl font-extrabold">{klass.name}</h1>
            <p className="text-sm text-sky-100/80">{klass.description || `${subjects.length} mata pelajaran`}</p>
          </div>
        </div>
      </div>

      {/* Subject filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setSubject("all")} data-testid="subject-filter-all"
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${subject==="all"?"bg-sky-600 text-white":"bg-white border border-slate-200 text-slate-600 hover:border-sky-400"}`}>
          Semua Mapel
        </button>
        {subjects.map(s=>(
          <button key={s} onClick={()=>setSubject(s)} data-testid={`subject-filter-${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${subject===s?"bg-sky-600 text-white":"bg-white border border-slate-200 text-slate-600 hover:border-sky-400"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button data-testid="tab-tugas" onClick={()=>setTab("tugas")}
          className={`px-4 py-2.5 font-semibold text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${tab==="tugas"?"border-sky-600 text-sky-700":"border-transparent text-slate-500 hover:text-slate-800"}`}>
          <ClipboardList className="w-4 h-4"/>Tugas
        </button>
        <button data-testid="tab-quiz" onClick={()=>setTab("quiz")}
          className={`px-4 py-2.5 font-semibold text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${tab==="quiz"?"border-sky-600 text-sky-700":"border-transparent text-slate-500 hover:text-slate-800"}`}>
          <BrainCircuit className="w-4 h-4"/>Mini-Quiz
        </button>
      </div>

      {tab === "tugas"
        ? <TugasTab klass={klass} subject={subject} subjects={subjects} isTeacher={isTeacher} isStudent={isStudent}/>
        : <QuizTab klass={klass} subject={subject} subjects={subjects} isTeacher={isTeacher} isStudent={isStudent}/>}
    </div>
  );
}

/* ---------------- TUGAS TAB ---------------- */
function TugasTab({ klass, subject, subjects, isTeacher, isStudent }) {
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [detailFor, setDetailFor] = useState(null);

  const load = useCallback(() => {
    const q = subject !== "all" ? `&subject=${encodeURIComponent(subject)}` : "";
    api.get(`/assignments?class_id=${klass.id}${q}`).then(r => setList(r.data));
  }, [klass.id, subject]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {isTeacher && (
        <button data-testid="new-assignment-button" onClick={()=>setShowNew(true)}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4"/>Beri Tugas Baru
        </button>
      )}
      {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">Belum ada tugas{subject!=="all"?` untuk ${subject}`:""}.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(a => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><ClipboardList className="w-5 h-5"/></span>
              {a.subject && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">{a.subject}</span>}
            </div>
            <h3 className="font-heading font-bold text-slate-900 mt-3">{a.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-1">{a.description}</p>
            {(a.attachments||[]).length>0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{a.attachments.map((att,i)=><AttachmentChip key={i} att={att}/>)}</div>
            )}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Deadline: <b className="text-slate-800">{a.due_date || "-"}</b></span>
            </div>
            <button data-testid={`open-assignment-${a.id}`} onClick={()=>setDetailFor(a)} className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">
              {isTeacher ? "Lihat Submisi" : "Kerjakan / Kumpulkan"}
            </button>
          </div>
        ))}
      </div>

      {showNew && <NewAssignModal klass={klass} subjects={subjects} onClose={()=>setShowNew(false)} onDone={()=>{load(); setShowNew(false);}}/>}
      {detailFor && <AssignDetailModal assignment={detailFor} isTeacher={isTeacher} isStudent={isStudent} onClose={()=>setDetailFor(null)}/>}
    </div>
  );
}

function NewAssignModal({ klass, subjects, onClose, onDone }) {
  const [f, setF] = useState({ title:"", description:"", subject: subjects[0] || "", due_date:"" });
  const [atts, setAtts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const onFiles = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try { setAtts([...atts, ...(await uploadFiles(e.target.files))]); }
    catch { toast.error("Gagal upload file"); }
    finally { setUploading(false); }
  };
  const save = async () => {
    if (!f.title.trim()) return toast.error("Judul wajib diisi");
    setBusy(true);
    try {
      await api.post("/assignments", { ...f, kelas: klass.name, class_id: klass.id, attachments: atts });
      toast.success("Tugas dibuat"); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">Beri Tugas Baru</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button></div>
        <div className="p-5 space-y-3">
          <input data-testid="assignment-title-input" placeholder="Judul tugas" value={f.title} onChange={e=>setF({...f,title:e.target.value})} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          <textarea rows={3} placeholder="Deskripsi / instruksi" value={f.description} onChange={e=>setF({...f,description:e.target.value})} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Mata Pelajaran</label>
              {subjects.length>0 ? (
                <select data-testid="assignment-subject-select" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                  {subjects.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input placeholder="Mapel" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase">Deadline</label>
              <input type="date" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Paperclip className="w-3.5 h-3.5"/>Lampiran (PDF / gambar, bisa banyak)</label>
            <input data-testid="assignment-file-input" type="file" multiple accept="image/*,application/pdf" onChange={onFiles} className="mt-1 w-full text-sm"/>
            {uploading && <p className="text-xs text-sky-600 mt-1">Mengunggah...</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {atts.map((att,i)=>(
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs">
                  {att.name}<button onClick={()=>setAtts(atts.filter((_,idx)=>idx!==i))}><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
          </div>
          <button data-testid="save-assignment-button" disabled={busy||uploading} onClick={save} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">{busy?"Menyimpan...":"Simpan Tugas"}</button>
        </div>
      </div>
    </div>
  );
}

function AssignDetailModal({ assignment, isTeacher, isStudent, onClose }) {
  const [subs, setSubs] = useState([]);
  const [content, setContent] = useState("");
  const [atts, setAtts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadSubs = useCallback(() => {
    api.get(`/submissions?assignment_id=${assignment.id}`).then(r => {
      setSubs(r.data);
      if (isStudent && r.data[0]) { setContent(r.data[0].content || ""); setAtts(r.data[0].attachments || []); }
    });
  }, [assignment.id, isStudent]);
  useEffect(() => { loadSubs(); }, [loadSubs]);

  const onFiles = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try { setAtts([...atts, ...(await uploadFiles(e.target.files))]); }
    catch { toast.error("Gagal upload"); }
    finally { setUploading(false); }
  };
  const submit = async () => {
    if (!content.trim() && atts.length === 0) return toast.error("Lampirkan file atau tulis jawaban");
    setBusy(true);
    try { await api.post("/submissions", { assignment_id: assignment.id, content, attachments: atts }); toast.success("Tugas dikumpulkan!"); loadSubs(); }
    catch { toast.error("Gagal mengumpulkan"); }
    finally { setBusy(false); }
  };
  const grade = async (sid, g) => { await api.patch(`/submissions/${sid}/grade?grade=${g}`); toast.success("Nilai disimpan"); loadSubs(); };

  const mySub = isStudent ? subs[0] : null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div><h3 className="font-heading font-bold text-lg">{assignment.title}</h3>
            {assignment.subject && <span className="text-xs text-sky-600 font-semibold">{assignment.subject}</span>}</div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{assignment.description}</p>
          {(assignment.attachments||[]).length>0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Materi Tugas</p>
              <div className="flex flex-wrap gap-1.5">{assignment.attachments.map((att,i)=><AttachmentChip key={i} att={att}/>)}</div>
            </div>
          )}

          {isTeacher ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-500">Submisi Siswa ({subs.length})</p>
              {subs.length===0 && <p className="text-sm text-slate-400">Belum ada yang mengumpulkan.</p>}
              {subs.map(s=>(
                <div key={s.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <b className="text-sm">{s.student_name}</b>
                    <input data-testid={`grade-input-${s.id}`} type="number" defaultValue={s.grade ?? ""} placeholder="nilai" min="0" max="100"
                      onBlur={e=>e.target.value!=="" && grade(s.id, +e.target.value)}
                      className="w-16 px-2 py-1 border rounded text-sm"/>
                  </div>
                  {s.content && <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{s.content}</p>}
                  {(s.attachments||[]).length>0 && <div className="mt-2 flex flex-wrap gap-1.5">{s.attachments.map((att,i)=><AttachmentChip key={i} att={att}/>)}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {mySub && mySub.grade!=null && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4"/>Sudah dinilai: <b>{mySub.grade}</b>
                </div>
              )}
              <textarea data-testid="submission-text" value={content} onChange={e=>setContent(e.target.value)} rows={3} placeholder="Catatan / jawaban (opsional)"
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1"><Upload className="w-3.5 h-3.5"/>Upload jawaban (PDF / foto)</label>
                <input data-testid="submission-file-input" type="file" multiple accept="image/*,application/pdf" onChange={onFiles} className="mt-1 w-full text-sm"/>
                {uploading && <p className="text-xs text-sky-600 mt-1">Mengunggah...</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {atts.map((att,i)=>(
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs">
                      {att.name}<button onClick={()=>setAtts(atts.filter((_,idx)=>idx!==i))}><Trash2 className="w-3 h-3"/></button>
                    </span>
                  ))}
                </div>
              </div>
              <button data-testid="submit-assignment-button" disabled={busy||uploading} onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
                {mySub ? "Perbarui Pengumpulan" : "Kumpulkan Tugas"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- QUIZ TAB ---------------- */
function QuizTab({ klass, subject, subjects, isTeacher }) {
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [taking, setTaking] = useState(null);
  const [answers, setAnswers] = useState([]);

  const load = useCallback(() => {
    const q = subject !== "all" ? `&subject=${encodeURIComponent(subject)}` : "";
    api.get(`/quizzes?class_id=${klass.id}${q}`).then(r => setList(r.data));
  }, [klass.id, subject]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const r = await api.post("/quizzes/attempt", { quiz_id: taking.id, answers });
    toast.success(`Skor: ${r.data.score}/${r.data.total} (${r.data.percent.toFixed(0)}%)`);
    setTaking(null);
  };

  return (
    <div className="space-y-4">
      {isTeacher && (
        <button data-testid="new-quiz-button" onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4"/>Buat Mini-Quiz
        </button>
      )}
      {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">Belum ada quiz{subject!=="all"?` untuk ${subject}`:""}.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(q=>(
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><BrainCircuit className="w-5 h-5"/></span>
              {q.subject && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">{q.subject}</span>}
            </div>
            <h3 className="font-heading font-bold mt-3">{q.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{(q.questions||[]).length} soal</p>
            {!isTeacher && <button data-testid={`take-quiz-${q.id}`} onClick={()=>{setTaking(q); setAnswers(Array(q.questions.length).fill(-1));}}
              className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">Kerjakan</button>}
          </div>
        ))}
      </div>

      {showNew && <NewQuizModal klass={klass} subjects={subjects} onClose={()=>setShowNew(false)} onDone={()=>{load();setShowNew(false);}}/>}
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
              <button data-testid="submit-quiz-button" onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold">Kirim Jawaban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NewQuizModal({ klass, subjects, onClose, onDone }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjects[0] || "");
  const [qs, setQs] = useState([{ q:"", options:["","","",""], answer:0 }]);
  const [busy, setBusy] = useState(false);
  const add = () => setQs([...qs, { q:"", options:["","","",""], answer:0 }]);
  const submit = async () => {
    if (!title.trim()) return toast.error("Judul quiz wajib diisi");
    setBusy(true);
    try { await api.post("/quizzes", { title, kelas: klass.name, class_id: klass.id, subject, questions: qs }); toast.success("Quiz dibuat"); onDone(); }
    catch { toast.error("Gagal"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">Buat Mini-Quiz</h3>
          <button onClick={onClose} className="p-1.5"><X className="w-5 h-5"/></button></div>
        <div className="p-5 space-y-3">
          <input data-testid="quiz-title-input" placeholder="Judul quiz" value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase">Mata Pelajaran</label>
            {subjects.length>0 ? (
              <select data-testid="quiz-subject-select" value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
                {subjects.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input placeholder="Mapel" value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            )}
          </div>
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
          <button data-testid="save-quiz-button" disabled={busy} onClick={submit} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-60">Simpan Quiz</button>
        </div>
      </div>
    </div>
  );
}
