import { useEffect, useState, useRef } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ClipboardList, Plus, X, Paperclip, Video, LinkIcon, Loader2 } from "lucide-react";

const SUBJECTS = ["Matematika","Bahasa Indonesia","Bahasa Inggris","Fisika","Kimia","Biologi","Ekonomi","Geografi","Sejarah","Sosiologi","PKN","PAI","Seni Budaya","PJOK","Informatika","Prakarya"];

async function uploadFile(file) {
  const fd = new FormData(); fd.append("file", file);
  const up = await api.post("/upload", fd);
  return `${process.env.REACT_APP_BACKEND_URL}${up.data.url}`;
}

function RichText({ value, onChange }) {
  const ref = useRef(null);
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
      <div ref={ref} contentEditable suppressContentEditableWarning data-testid="assign-desc-editor"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[140px] px-3 py-2 text-sm outline-none" dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  );
}

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
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{(a.description||"").replace(/<[^>]+>/g," ").trim() || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
              {a.subject && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">{a.subject}</span>}
              {a.guru_name && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.guru_name}</span>}
              {a.active === false && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">Nonaktif</span>}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Deadline: <b className="text-slate-800">{(a.due_date||"").replace("T"," ")}</b></span>
              <span className="text-slate-400">{a.kelas}</span>
            </div>
            <button onClick={()=>openDetail(a)} className="mt-3 w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">
              {isTeacher?"Lihat Submisi":"Kerjakan"}
            </button>
          </div>
        ))}
      </div>

      {showNew && <NewAssignModal user={user} onClose={()=>setShowNew(false)} onDone={()=>{load(); setShowNew(false);}}/>}
      {openFor && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">{openFor.title}</h3>
              <button onClick={()=>setOpenFor(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5"/></button></div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: openFor.description || "<i>Tidak ada keterangan.</i>" }} />
              <div className="flex flex-wrap gap-2 text-xs">
                {openFor.subject && <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">{openFor.subject}</span>}
                {openFor.guru_name && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">Guru: {openFor.guru_name}</span>}
                {openFor.semester && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">Semester {openFor.semester}</span>}
              </div>
              {(openFor.link || openFor.file_url || openFor.video_url) && (
                <div className="flex flex-wrap gap-2">
                  {openFor.link && <a href={openFor.link} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"><LinkIcon className="w-3.5 h-3.5"/>Link</a>}
                  {openFor.file_url && <a href={openFor.file_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5"/>Lampiran</a>}
                  {openFor.video_url && <a href={openFor.video_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1"><Video className="w-3.5 h-3.5"/>Video</a>}
                </div>
              )}
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

function Field({ label, required, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="text-xs font-semibold text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NewAssignModal({ onClose, onDone, user }) {
  const [f, setF] = useState({ title: "", description: "", kelas: "", class_id: "", kelas_kelompok: "", subject: "", guru_id: "", guru_name: "", due_date: "", link: "", semester: "genap", active: true, file_url: "", video_url: "" });
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none";

  useEffect(() => {
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
    api.get("/users?role=guru").then(r => setTeachers(r.data)).catch(() => {});
    if (user.role === "guru") setF(s => ({ ...s, guru_id: user.id, guru_name: user.name }));
  }, [user]);

  const doUpload = async (file, key, maxMB = 20) => {
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) { toast.error(`Ukuran maksimal ${maxMB}MB`); return; }
    setBusy(key);
    try { const url = await uploadFile(file); setF(s => ({ ...s, [key]: url })); toast.success("Berhasil diunggah"); }
    catch { toast.error("Gagal mengunggah"); } finally { setBusy(""); }
  };
  const save = async () => {
    if (!f.title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!f.subject) { toast.error("Mata Pelajaran wajib dipilih"); return; }
    if (!f.guru_id) { toast.error("Guru wajib dipilih"); return; }
    setSaving(true);
    try { await api.post("/assignments", f); toast.success("Tugas dibuat"); onDone(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} data-testid="assign-form-modal">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-heading font-bold text-lg">Form Tugas</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Judul" required full>
            <input data-testid="assign-title" placeholder="Judul tugas" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className={inp} />
          </Field>
          <Field label="Keterangan" full>
            <RichText value={f.description} onChange={v => setF({ ...f, description: v })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kelas">
              <select data-testid="assign-kelas" value={f.class_id} onChange={e => { const c = classes.find(x => x.id === e.target.value); setF({ ...f, class_id: e.target.value, kelas: c?.name || "" }); }} className={inp}>
                <option value="">— Pilih Kelas —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Kelas Kelompok">
              <input placeholder="Abaikan jika tidak ada kelas kelompok" value={f.kelas_kelompok} onChange={e => setF({ ...f, kelas_kelompok: e.target.value })} className={inp} />
            </Field>
            <Field label="Mata Pelajaran" required>
              <select data-testid="assign-subject" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} className={inp}>
                <option value="">— Pilih Mata Pelajaran —</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Guru" required>
              <select data-testid="assign-guru" value={f.guru_id} disabled={user.role === "guru"} onChange={e => { const t = teachers.find(x => x.id === e.target.value); setF({ ...f, guru_id: e.target.value, guru_name: t?.name || "" }); }} className={`${inp} disabled:bg-slate-100`}>
                <option value="">— Pilih Guru —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Batas Pengumpulan">
              <input data-testid="assign-due" type="datetime-local" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} className={inp} />
            </Field>
            <Field label="Link">
              <input placeholder="Link Zoom/Gmeet atau dokumen" value={f.link} onChange={e => setF({ ...f, link: e.target.value })} className={inp} />
            </Field>
            <Field label="Semester">
              <div className="flex items-center gap-4 pt-2">
                {["genap", "ganjil"].map(s => (
                  <label key={s} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="semester" checked={f.semester === s} onChange={() => setF({ ...f, semester: s })} className="accent-rose-500" />{s}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Status">
              <button type="button" data-testid="assign-status" onClick={() => setF({ ...f, active: !f.active })}
                className={`mt-1 relative w-12 h-6 rounded-full transition-colors ${f.active ? "bg-rose-500" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${f.active ? "left-6" : "left-0.5"}`} />
              </button>
            </Field>
            <Field label="Lampiran File">
              <input data-testid="assign-file" type="file" onChange={e => doUpload(e.target.files?.[0], "file_url")} className="text-xs" />
              {busy === "file_url" ? <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />mengunggah…</span>
                : f.file_url && <span className="text-xs text-emerald-600 flex items-center gap-1"><Paperclip className="w-3 h-3" />terunggah</span>}
              <p className="text-[10px] text-rose-500 mt-0.5">*Maksimal : 20MB</p>
            </Field>
            <Field label="Video">
              <input data-testid="assign-video" type="file" accept="video/*" onChange={e => doUpload(e.target.files?.[0], "video_url")} className="text-xs" />
              {busy === "video_url" ? <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />mengunggah…</span>
                : f.video_url && <span className="text-xs text-emerald-600 flex items-center gap-1"><Video className="w-3 h-3" />terunggah</span>}
              <p className="text-[10px] text-rose-500 mt-0.5">*Maksimal : 20MB</p>
            </Field>
          </div>
          <button data-testid="assign-save" disabled={saving} onClick={save} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Simpan Tugas
          </button>
        </div>
      </div>
    </div>
  );
}
