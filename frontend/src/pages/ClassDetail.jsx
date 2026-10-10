import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { School, ArrowLeft, Plus, X, ClipboardList, BrainCircuit, Paperclip,
  FileText, ImageIcon, Upload, Trash2, CheckCircle2, Pencil, CalendarClock, AlertTriangle, Users2, Circle, PiggyBank, Lock, Network, ShieldCheck, Video, Link as LinkIcon, Loader2 } from "lucide-react";
import { QuizUnlockModal, QuizPasswordField, quizPasswordBody } from "@/components/QuizPassword";
import { QuizTakeModal, QuizTimeField } from "@/components/QuizTake";
import { ClassKas } from "@/components/ClassKas";
import { ClassUnlock } from "@/components/ClassUnlock";
import { ClassBPH } from "@/components/ClassBPH";
import { ClassExam } from "@/components/ClassExam";
import { ClassHero, ClassTabs, useClassCounts } from "@/components/class/ClassHero";
import { SafeHtml, stripHtml } from "@/lib/safeHtml";

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

const SUBJECTS_FALLBACK = ["Matematika","Bahasa Indonesia","Bahasa Inggris","Fisika","Kimia","Biologi","Ekonomi","Geografi","Sejarah","Sosiologi","PKN","PAI","Seni Budaya","PJOK","Informatika","Prakarya"];

async function uploadOne(file) {
  const fd = new FormData(); fd.append("file", file);
  const r = await api.post("/upload", fd);
  return `${BACKEND}${r.data.url}`;
}

function RichText({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.innerHTML = value || ""; }, []); // init once; keep uncontrolled
  const exec = (cmd, val = null) => { document.execCommand(cmd, false, val); ref.current?.focus(); onChange(ref.current.innerHTML); };
  const Btn = ({ cmd, val, children, title }) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); exec(cmd, val); }}
      className="px-2 py-1 rounded hover:bg-slate-200 text-slate-600 text-sm min-w-[30px]">{children}</button>
  );
  return (
    <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1">
        <Btn cmd="bold" title="Tebal"><b>B</b></Btn>
        <Btn cmd="italic" title="Miring"><i>I</i></Btn>
        <Btn cmd="underline" title="Garis bawah"><u>U</u></Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn cmd="insertUnorderedList" title="Daftar butir">• List</Btn>
        <Btn cmd="insertOrderedList" title="Daftar nomor">1. List</Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn cmd="formatBlock" val="H3" title="Sub-judul">H</Btn>
        <button type="button" title="Tautan" onMouseDown={(e) => { e.preventDefault(); const u = prompt("URL tautan:"); if (u) exec("createLink", u); }}
          className="px-2 py-1 rounded hover:bg-slate-200 text-slate-600 text-sm"><LinkIcon className="w-3.5 h-3.5" /></button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning data-testid="assignment-desc-editor"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[130px] px-3 py-2 text-sm outline-none" />
    </div>
  );
}

function AField({ label, required, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="text-xs font-semibold text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
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
  const isStudent = ["siswa", "ketua_kelas", "ketua_osis"].includes(user.role);
  const [klass, setKlass] = useState(null);
  const [tab, setTab] = useState("tugas");
  const [subject, setSubject] = useState("all");
  const [reschedules, setReschedules] = useState([]);
  const [showResched, setShowResched] = useState(false);
  const counts = useClassCounts(id);

  const loadReschedules = useCallback(() => {
    api.get(`/reschedules?class_id=${id}`).then(r => setReschedules(r.data)).catch(()=>{});
  }, [id]);
  const loadClass = useCallback(() => {
    api.get(`/classes/${id}`).then(r => { setKlass(r.data); if (!r.data.locked) loadReschedules(); })
      .catch(()=>toast.error("Anda tidak memiliki akses ke kelas ini"));
  }, [id, loadReschedules]);
  useEffect(() => { loadClass(); }, [loadClass]);

  if (!klass) return <div className="text-slate-400 py-20 text-center">Memuat kelas...</div>;
  if (klass.locked) return <ClassUnlock klass={klass} onUnlocked={loadClass}/>;

  // Class only loads if the user may access it, so any teacher here can manage tugas/quiz.
  const canManage = user.role === "super_admin" || user.role === "guru";
  const subjects = klass.subjects || [];
  // Subjects this teacher may create content for (homeroom/super_admin => all)
  const isHomeroom = klass.homeroom_teacher_id === user.id;
  const teachSubjects = (user.role === "super_admin" || isHomeroom)
    ? subjects
    : subjects.filter(s => (user.subjects || []).includes(s));

  const delResched = async (rid) => {
    try { await api.delete(`/reschedules/${rid}`); toast.success("Pemberitahuan dihapus"); loadReschedules(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-6" data-testid="class-detail-page">
      <Link to="/classes" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
        <ArrowLeft className="w-4 h-4"/>Semua Kelas
      </Link>
      <ClassHero klass={klass} counts={counts} isTeacher={isTeacher} onReschedule={()=>setShowResched(true)}/>

      {/* Reschedule / ketidakhadiran guru */}
      {reschedules.length > 0 && (
        <div className="space-y-2" data-testid="reschedule-alerts">
          {reschedules.map(r => (
            <div key={r.id} className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"/>
              <div className="flex-1 text-sm">
                <p className="font-bold text-amber-900">
                  Guru berhalangan{r.subject ? ` — ${r.subject}` : ""} <span className="font-semibold text-amber-700">({r.reason_type})</span>
                </p>
                <p className="text-amber-800 mt-0.5">{r.reason}</p>
                <p className="text-[11px] text-amber-700/80 mt-1">
                  Oleh {r.teacher_name}{r.date ? ` • ${r.date}` : ""}
                  {(r.new_date || r.new_time) && <span className="font-semibold"> • Pengganti: {r.new_date || ""} {r.new_time || ""}</span>}
                </p>
              </div>
              {(user.role === "super_admin" || r.teacher_id === user.id) && (
                <button data-testid={`delete-reschedule-${r.id}`} onClick={()=>delResched(r.id)} className="p-1 text-amber-700 hover:bg-amber-100 rounded-lg"><X className="w-4 h-4"/></button>
              )}
            </div>
          ))}
        </div>
      )}

      <ClassTabs tab={tab} setTab={setTab} counts={counts}/>

      <div className="flex flex-wrap items-center gap-2" data-testid="subject-filters">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">Filter Mapel</span>
        <button onClick={()=>setSubject("all")} data-testid="subject-filter-all"
          className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${subject==="all"?"bg-slate-900 text-white shadow":"bg-white border border-slate-200 text-slate-600 hover:border-sky-400"}`}>
          Semua Mapel
        </button>
        {subjects.map(s=>(
          <button key={s} onClick={()=>setSubject(s)} data-testid={`subject-filter-${s}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${subject===s?"bg-sky-600 text-white shadow":"bg-white border border-slate-200 text-slate-600 hover:border-sky-400"}`}>
            {s}
          </button>
        ))}
        {subjects.length===0 && <span className="text-xs text-slate-400 italic">Belum ada mapel di kelas ini</span>}
      </div>

      <div key={tab} className="animate-in fade-in slide-in-from-bottom-2 duration-300">

      {isTeacher && !canManage && (
        <div data-testid="readonly-badge" className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 font-medium">
          Mode baca-saja — Anda bukan pembuat / wali kelas ini, jadi tidak dapat menambah atau mengubah tugas & quiz.
        </div>
      )}

      {tab === "bph" ? <ClassBPH klass={klass}/> : tab === "kas" ? <ClassKas klass={klass}/>
        : tab === "ujian" ? <ClassExam klass={klass} subject={subject} teachSubjects={teachSubjects} isTeacher={isTeacher} canManage={canManage}/>
        : tab === "tugas"
        ? <TugasTab klass={klass} subject={subject} subjects={subjects} teachSubjects={teachSubjects} isTeacher={isTeacher} isStudent={isStudent} canManage={canManage}/>
        : <QuizTab klass={klass} subject={subject} subjects={subjects} teachSubjects={teachSubjects} isTeacher={isTeacher} isStudent={isStudent} canManage={canManage}/>}
      </div>

      {showResched && <RescheduleModal klass={klass} teachSubjects={teachSubjects} onClose={()=>setShowResched(false)} onDone={()=>{loadReschedules(); setShowResched(false);}}/>}
    </div>
  );
}

function RescheduleModal({ klass, teachSubjects, onClose, onDone }) {
  const [f, setF] = useState({ subject: teachSubjects[0] || "", reason_type: "sakit", reason: "", date: "", new_date: "", new_time: "" });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.reason.trim()) return toast.error("Alasan wajib diisi");
    setBusy(true);
    try {
      await api.post("/reschedules", { class_id: klass.id, ...f, subject: f.subject || null });
      toast.success("Pemberitahuan terkirim ke siswa kelas ini");
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal mengirim"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold flex items-center gap-2"><CalendarClock className="w-5 h-5 text-amber-500"/>Reschedule / Berhalangan</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">Pemberitahuan akan tampil sebagai alert di kelas <b>{klass.name}</b> dan dikirim sebagai notifikasi ke semua siswa kelas tersebut.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mata Pelajaran</label>
              <select data-testid="resched-subject" value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none">
                <option value="">(Umum)</option>
                {teachSubjects.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Alasan</label>
              <select data-testid="resched-reason-type" value={f.reason_type} onChange={e=>setF({...f,reason_type:e.target.value})}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none">
                <option value="sakit">Sakit</option>
                <option value="rapat">Rapat</option>
                <option value="berhalangan">Berhalangan</option>
                <option value="lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Keterangan / Alasan Lengkap *</label>
            <textarea data-testid="resched-reason" rows={3} value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}
              placeholder="Tuliskan alasan ketidakhadiran atau kebutuhan reschedule..."
              className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"/>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tgl Berhalangan</label>
              <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tgl Pengganti</label>
              <input type="date" value={f.new_date} onChange={e=>setF({...f,new_date:e.target.value})}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Jam Pengganti</label>
              <input type="time" value={f.new_time} onChange={e=>setF({...f,new_time:e.target.value})}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none"/>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-reschedule-button" disabled={busy} onClick={save} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-60">
              {busy ? "Mengirim..." : "Kirim Pemberitahuan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- TUGAS TAB ---------------- */
function TugasTab({ klass, subject, subjects, teachSubjects, isTeacher, isStudent, canManage }) {
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [detailFor, setDetailFor] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(() => {
    const q = subject !== "all" ? `&subject=${encodeURIComponent(subject)}` : "";
    api.get(`/assignments?class_id=${klass.id}${q}`).then(r => setList(r.data));
  }, [klass.id, subject]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {canManage && (
        <button data-testid="new-assignment-button" onClick={()=>setShowNew(true)}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4"/>Beri Tugas Baru
        </button>
      )}
      {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">Belum ada tugas{subject!=="all"?` untuk ${subject}`:""}.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(a => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><ClipboardList className="w-5 h-5"/></span>
                {a.subject && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">{a.subject}</span>}
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button data-testid={`edit-assignment-${a.id}`}
                    onClick={()=>setEditItem(a)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                  <button data-testid={`delete-assignment-${a.id}`}
                    onClick={async()=>{if(confirm(`Hapus tugas "${a.title}"?`)){try{await api.delete(`/assignments/${a.id}`);toast.success("Tugas dihapus");load();}catch(e){toast.error(e.response?.data?.detail||"Gagal menghapus");}}}}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              )}
            </div>
            <h3 className="font-heading font-bold text-slate-900 mt-3">{a.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 flex-1" data-testid={`assignment-desc-preview-${a.id}`}>{stripHtml(a.description) || "—"}</p>
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

      {showNew && <NewAssignModal klass={klass} subjects={teachSubjects} onClose={()=>setShowNew(false)} onDone={()=>{load(); setShowNew(false);}}/>}
      {editItem && <NewAssignModal klass={klass} subjects={teachSubjects} initial={editItem} onClose={()=>setEditItem(null)} onDone={()=>{load(); setEditItem(null);}}/>}
      {detailFor && <AssignDetailModal assignment={detailFor} isTeacher={isTeacher} isStudent={isStudent} onClose={()=>setDetailFor(null)}/>}
    </div>
  );
}

function NewAssignModal({ klass, subjects, initial, onClose, onDone }) {
  const isEdit = !!(initial && initial.id);
  const subjOpts = subjects && subjects.length ? subjects : SUBJECTS_FALLBACK;
  const [f, setF] = useState({
    title: initial?.title || "", description: initial?.description || "",
    kelas_kelompok: initial?.kelas_kelompok || "",
    subject: initial?.subject || "", guru_id: initial?.guru_id || "", guru_name: initial?.guru_name || "",
    due_date: initial?.due_date || "", link: initial?.link || "",
    semester: initial?.semester || "genap", active: initial?.active !== false,
    video_url: initial?.video_url || "",
  });
  const [atts, setAtts] = useState(initial?.attachments || []);
  const [teachers, setTeachers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vidBusy, setVidBusy] = useState(false);
  const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none";

  useEffect(() => { api.get("/users?role=guru").then(r => setTeachers(r.data)).catch(() => {}); }, []);

  const onFiles = async (e) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try { setAtts([...atts, ...(await uploadFiles(e.target.files))]); }
    catch { toast.error("Gagal upload file"); }
    finally { setUploading(false); }
  };
  const onVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Video maksimal 20MB"); return; }
    setVidBusy(true);
    try { const url = await uploadOne(file); setF(s => ({ ...s, video_url: url })); toast.success("Video terunggah"); }
    catch { toast.error("Gagal mengunggah video"); }
    finally { setVidBusy(false); }
  };
  const save = async () => {
    if (!f.title.trim()) return toast.error("Judul wajib diisi");
    if (!f.subject) return toast.error("Mata Pelajaran wajib dipilih");
    setBusy(true);
    try {
      const payload = { ...f, kelas: klass.name, class_id: klass.id, attachments: atts };
      if (isEdit) { await api.patch(`/assignments/${initial.id}`, payload); toast.success("Tugas diperbarui"); }
      else { await api.post("/assignments", payload); toast.success("Tugas dibuat"); }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} data-testid="assign-form-modal">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-heading font-bold text-lg">{isEdit ? "Edit Tugas" : "Beri Tugas Baru"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <AField label="Judul" required full>
            <input data-testid="assignment-title-input" placeholder="Judul tugas" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className={inp} />
          </AField>
          <AField label="Keterangan" full>
            <RichText value={f.description} onChange={v => setF({ ...f, description: v })} />
          </AField>
          <div className="grid sm:grid-cols-2 gap-4">
            <AField label="Kelas">
              <input value={klass.name} disabled className={`${inp} bg-slate-100 text-slate-500`} />
            </AField>
            <AField label="Kelas Kelompok">
              <input placeholder="Abaikan jika tidak ada" value={f.kelas_kelompok} onChange={e => setF({ ...f, kelas_kelompok: e.target.value })} className={inp} />
            </AField>
            <AField label="Mata Pelajaran" required>
              <select data-testid="assignment-subject-select" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} className={inp}>
                <option value="">— Pilih Mata Pelajaran —</option>
                {subjOpts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </AField>
            <AField label="Guru">
              <select data-testid="assignment-guru-select" value={f.guru_id} onChange={e => { const t = teachers.find(x => x.id === e.target.value); setF({ ...f, guru_id: e.target.value, guru_name: t?.name || "" }); }} className={inp}>
                <option value="">— Pilih Guru —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </AField>
            <AField label="Batas Pengumpulan">
              <input data-testid="assignment-due-input" type="datetime-local" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} className={inp} />
            </AField>
            <AField label="Link">
              <input placeholder="Link Zoom/Gmeet atau dokumen" value={f.link} onChange={e => setF({ ...f, link: e.target.value })} className={inp} />
            </AField>
            <AField label="Semester">
              <div className="flex items-center gap-4 pt-2">
                {["genap", "ganjil"].map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer capitalize">
                    <input type="radio" name="semester" checked={f.semester === s} onChange={() => setF({ ...f, semester: s })} className="accent-rose-500" />{s}
                  </label>
                ))}
              </div>
            </AField>
            <AField label="Status">
              <button type="button" data-testid="assignment-status-toggle" onClick={() => setF({ ...f, active: !f.active })}
                className={`mt-1 relative w-12 h-6 rounded-full transition-colors ${f.active ? "bg-rose-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${f.active ? "left-6" : "left-0.5"}`} />
              </button>
            </AField>
          </div>

          <AField label="Lampiran File (PDF / gambar, bisa banyak)" full>
            <input data-testid="assignment-file-input" type="file" multiple accept="image/*,application/pdf" onChange={onFiles} className="text-xs" />
            {uploading && <p className="text-xs text-sky-600 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Mengunggah...</p>}
            <p className="text-[10px] text-rose-500 mt-0.5">*Maksimal : 20MB / file</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {atts.map((att, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs">
                  <Paperclip className="w-3 h-3" />{att.name}<button onClick={() => setAtts(atts.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </AField>

          <AField label="Video" full>
            <input data-testid="assignment-video-input" type="file" accept="video/*" onChange={onVideo} className="text-xs" />
            {vidBusy ? <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />mengunggah…</span>
              : f.video_url && <span className="text-xs text-emerald-600 flex items-center gap-1"><Video className="w-3 h-3" />video terunggah</span>}
            <p className="text-[10px] text-rose-500 mt-0.5">*Maksimal : 20MB</p>
          </AField>

          <button data-testid="save-assignment-button" disabled={busy || uploading || vidBusy} onClick={save} className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? "Menyimpan..." : "Simpan Tugas"}</button>
        </div>
      </div>
    </div>
  );
}


function AssignDetailModal({ assignment, isTeacher, isStudent, onClose }) {
  const [subs, setSubs] = useState([]);
  const [roster, setRoster] = useState(null); // submission warehouse (status only)
  const [content, setContent] = useState("");
  const [atts, setAtts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadSubs = useCallback(() => {
    api.get(`/submissions?assignment_id=${assignment.id}`).then(r => {
      setSubs(r.data);
      if (isStudent && r.data[0]) { setContent(r.data[0].content || ""); setAtts(r.data[0].attachments || []); }
    });
    api.get(`/submissions/status?assignment_id=${assignment.id}`).then(r => setRoster(r.data)).catch(()=>{});
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
          <SafeHtml html={assignment.description} className="text-sm text-slate-700" data-testid="assignment-detail-description"/>
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

              {/* Gudang pengumpulan: lihat siapa yang sudah mengumpulkan (tanpa membuka file) */}
              {roster && (
                <div className="pt-2 border-t border-slate-200" data-testid="submission-warehouse">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5"><Users2 className="w-4 h-4"/>Gudang Pengumpulan</p>
                    <span className="text-xs font-bold text-sky-600">{roster.submitted_count}/{roster.total} terkumpul</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Kamu bisa melihat siapa yang sudah mengumpulkan, tetapi tidak dapat membuka tugas siswa lain.</p>
                  <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                    {roster.roster.map(r => (
                      <div key={r.student_id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${r.is_me ? "bg-sky-50 border border-sky-200" : "bg-slate-50"}`}>
                        <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          {r.submitted ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <Circle className="w-4 h-4 text-slate-300"/>}
                          {r.student_name}{r.is_me && <span className="text-[10px] font-bold text-sky-600">(Kamu)</span>}
                        </span>
                        <span className={`text-[11px] font-semibold ${r.submitted ? "text-emerald-600" : "text-slate-400"}`}>
                          {r.submitted ? "Sudah" : "Belum"}
                        </span>
                      </div>
                    ))}
                    {roster.roster.length === 0 && <p className="text-sm text-slate-400 text-center py-3">Belum ada siswa terdaftar di kelas ini.</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- QUIZ TAB ---------------- */
function QuizTab({ klass, subject, subjects, teachSubjects, isTeacher, canManage }) {
  const [list, setList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [taking, setTaking] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [unlocking, setUnlocking] = useState(null);
  const startQuiz = (q) => { if (q.locked) return setUnlocking(q); setTaking(q); };

  const load = useCallback(() => {
    const q = subject !== "all" ? `&subject=${encodeURIComponent(subject)}` : "";
    api.get(`/quizzes?class_id=${klass.id}${q}`).then(r => setList(r.data));
  }, [klass.id, subject]);
  useEffect(() => { load(); }, [load]);


  return (
    <div className="space-y-4">
      {canManage && (
        <button data-testid="new-quiz-button" onClick={()=>setShowNew(true)} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4"/>Buat Mini-Quiz
        </button>
      )}
      {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">Belum ada quiz{subject!=="all"?` untuk ${subject}`:""}.</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(q=>(
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center"><BrainCircuit className="w-5 h-5"/></span>
                {q.subject && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700">{q.subject}</span>}
                {q.has_password && <span data-testid={`quiz-lock-${q.id}`} className={`ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${q.locked?"bg-amber-100 text-amber-700":"bg-slate-100 text-slate-500"}`}><Lock className="w-3 h-3"/>{q.locked?"Terkunci":"Berpassword"}</span>}
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <button data-testid={`edit-quiz-${q.id}`} onClick={()=>setEditItem(q)}
                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg"><Pencil className="w-4 h-4"/></button>
                  <button data-testid={`delete-quiz-${q.id}`}
                    onClick={async()=>{if(confirm(`Hapus quiz "${q.title}"?`)){try{await api.delete(`/quizzes/${q.id}`);toast.success("Quiz dihapus");load();}catch(e){toast.error(e.response?.data?.detail||"Gagal menghapus");}}}}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                </div>
              )}
            </div>
            <h3 className="font-heading font-bold mt-3">{q.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{q.question_count ?? (q.questions||[]).length} soal{q.time_limit ? ` · ⏱ ${q.time_limit} menit` : ""}</p>
            {!isTeacher && <button data-testid={`take-quiz-${q.id}`} onClick={()=>startQuiz(q)}
              className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800">Kerjakan</button>}
          </div>
        ))}
      </div>

      {showNew && <NewQuizModal klass={klass} subjects={teachSubjects} onClose={()=>setShowNew(false)} onDone={()=>{load();setShowNew(false);}}/>}
      {editItem && <NewQuizModal klass={klass} subjects={teachSubjects} initial={editItem} onClose={()=>setEditItem(null)} onDone={()=>{load();setEditItem(null);}}/>}
      {unlocking && <QuizUnlockModal quiz={unlocking} onClose={()=>setUnlocking(null)} onUnlocked={(qz)=>{setUnlocking(null); load(); startQuiz(qz);}}/>}
      {taking && <QuizTakeModal quiz={taking} onClose={()=>setTaking(null)} onDone={()=>setTaking(null)}/>}
    </div>
  );
}

function NewQuizModal({ klass, subjects, initial, onClose, onDone }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial?.title || "");
  const [subject, setSubject] = useState(initial?.subject || subjects[0] || "");
  const [qs, setQs] = useState(initial?.questions?.length ? initial.questions.map(q=>({q:q.q,options:[...(q.options||["","","",""])],answer:q.answer ?? 0})) : [{ q:"", options:["","","",""], answer:0 }]);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [removePw, setRemovePw] = useState(false);
  const [timeLimit, setTimeLimit] = useState(initial?.time_limit || "");
  const add = () => setQs([...qs, { q:"", options:["","","",""], answer:0 }]);
  const submit = async () => {
    if (!title.trim()) return toast.error("Judul quiz wajib diisi");
    setBusy(true);
    try {
      if (isEdit) { await api.patch(`/quizzes/${initial.id}`, { title, subject, questions: qs, time_limit: +timeLimit || 0, ...quizPasswordBody(password, removePw) }); toast.success("Quiz diperbarui"); }
      else { await api.post("/quizzes", { title, kelas: klass.name, class_id: klass.id, subject, questions: qs, time_limit: +timeLimit || 0, ...quizPasswordBody(password, false) }); toast.success("Quiz dibuat"); }
      onDone();
    }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold">{isEdit ? "Edit Mini-Quiz" : "Buat Mini-Quiz"}</h3>
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
          <QuizTimeField value={timeLimit} onChange={setTimeLimit}/>
          <QuizPasswordField hasPassword={!!initial?.has_password} value={password} onChange={setPassword} remove={removePw} onRemove={setRemovePw}/>
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
