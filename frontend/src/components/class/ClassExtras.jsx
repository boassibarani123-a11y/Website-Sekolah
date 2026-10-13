import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  BookOpen, CalendarDays, ClipboardCheck, Trophy, FileSpreadsheet, Megaphone,
  LayoutGrid, MessagesSquare, Plus, Trash2, Upload, FileText, ImageIcon, Link as LinkIcon,
  Download, Pin, Loader2, X, Send, CornerDownRight, Users2, Crown, Medal, Clock,
} from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const AGENDA_KINDS = { ujian: "bg-indigo-100 text-indigo-700", tugas: "bg-sky-100 text-sky-700", acara: "bg-emerald-100 text-emerald-700", libur: "bg-rose-100 text-rose-700" };

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

const Empty = ({ icon: Icon, text }) => (
  <div className="text-center py-16 text-slate-400">
    <Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
    <p className="text-sm font-medium">{text}</p>
  </div>
);

const Avatar = ({ name, photo, size = "w-9 h-9" }) =>
  photo ? <img src={photo} alt={name} className={`${size} rounded-full object-cover`} />
    : <span className={`${size} rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0`}>{(name || "?")[0].toUpperCase()}</span>;

const scoreColor = (v) => v == null ? "text-slate-300" : v >= 80 ? "text-emerald-600" : v >= 60 ? "text-amber-600" : "text-rose-600";
const fmt = (v) => v == null ? "–" : v;

/* ============ 1. MATERI & BAHAN AJAR ============ */
export function ClassMateri({ klass, subject, canManage, teachSubjects }) {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", subject: "", link: "", attachments: [] });
  const [busy, setBusy] = useState(false);
  const load = () => api.get(`/classes/${klass.id}/materials?subject=${subject || "all"}`).then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, [klass.id, subject]); // eslint-disable-line

  const addFiles = async (e) => {
    if (!e.target.files?.length) return;
    try { setBusy(true); const atts = await uploadFiles(e.target.files); setF(s => ({ ...s, attachments: [...s.attachments, ...atts] })); }
    catch { toast.error("Gagal mengunggah berkas"); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!f.title.trim()) return toast.error("Judul wajib diisi");
    try {
      await api.post(`/classes/${klass.id}/materials`, { ...f, subject: f.subject || null });
      toast.success("Materi ditambahkan"); setOpen(false); setF({ title: "", description: "", subject: "", link: "", attachments: [] }); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
  };
  const del = async (m) => { if (!window.confirm(`Hapus materi "${m.title}"?`)) return; try { await api.delete(`/materials/${m.id}`); toast.success("Materi dihapus"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };

  return (
    <div className="space-y-4" data-testid="class-materi">
      {canManage && (
        <button data-testid="add-materi-btn" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors">
          <Plus className="w-4 h-4" />Tambah Materi
        </button>
      )}
      {rows.length === 0 ? <Empty icon={BookOpen} text="Belum ada materi / bahan ajar" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map(m => (
            <div key={m.id} data-testid={`materi-${m.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {m.subject && <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full mb-1.5">{m.subject}</span>}
                  <h3 className="font-bold text-slate-900 leading-snug">{m.title}</h3>
                </div>
                {canManage && <button data-testid={`del-materi-${m.id}`} onClick={() => del(m)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
              </div>
              {m.description && <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{m.description}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {m.link && <a href={m.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100"><LinkIcon className="w-3.5 h-3.5" />Tautan</a>}
                {(m.attachments || []).map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 max-w-[200px]">
                    {(a.type || "").startsWith("image") ? <ImageIcon className="w-3.5 h-3.5 text-sky-600" /> : <FileText className="w-3.5 h-3.5 text-rose-600" />}
                    <span className="truncate">{a.name || "Lampiran"}</span>
                  </a>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Oleh {m.teacher_name}</p>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()} data-testid="materi-modal">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Tambah Materi</h3><button onClick={() => setOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="space-y-3">
              <input data-testid="materi-title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Judul materi" className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none" />
              <select data-testid="materi-subject" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none">
                <option value="">Umum (tanpa mapel)</option>
                {(teachSubjects || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea data-testid="materi-desc" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Deskripsi (opsional)" rows={3} className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none resize-none" />
              <input data-testid="materi-link" value={f.link} onChange={e => setF({ ...f, link: e.target.value })} placeholder="Tautan (YouTube / Drive, opsional)" className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none" />
              <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-sky-400 text-sm text-slate-600">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Unggah berkas (PDF / gambar / slide)
                <input type="file" multiple className="hidden" onChange={addFiles} data-testid="materi-file" />
              </label>
              {f.attachments.length > 0 && <div className="flex flex-wrap gap-2">{f.attachments.map((a, i) => <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[160px]">{a.name}</span>)}</div>}
            </div>
            <button data-testid="materi-save" onClick={save} className="w-full mt-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold">Simpan</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ 2. JADWAL PELAJARAN ============ */
export function ClassJadwal({ klass, canManage }) {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ day: 0, start: "07:00", end: "08:30", subject: "", teacher_name: "", room: "" });
  const load = () => api.get(`/classes/${klass.id}/schedule`).then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, [klass.id]); // eslint-disable-line
  const add = async () => {
    if (!f.subject.trim()) return toast.error("Isi mata pelajaran");
    try { await api.post(`/classes/${klass.id}/schedule`, { ...f, day: Number(f.day) }); toast.success("Jadwal ditambahkan"); setF({ ...f, subject: "", teacher_name: "", room: "" }); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const del = async (id) => { try { await api.delete(`/schedule/${id}`); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const byDay = (d) => rows.filter(r => r.day === d);

  return (
    <div className="space-y-4" data-testid="class-jadwal">
      {canManage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <label className="text-xs font-semibold text-slate-500 col-span-1">Hari
            <select data-testid="jadwal-day" value={f.day} onChange={e => setF({ ...f, day: e.target.value })} className="w-full mt-1 px-2 py-2 rounded-lg border border-slate-200 text-sm text-slate-900">{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Mulai<input data-testid="jadwal-start" type="time" value={f.start} onChange={e => setF({ ...f, start: e.target.value })} className="w-full mt-1 px-2 py-2 rounded-lg border border-slate-200 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-500">Selesai<input data-testid="jadwal-end" type="time" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} className="w-full mt-1 px-2 py-2 rounded-lg border border-slate-200 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-500">Mapel<input data-testid="jadwal-subject" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} placeholder="Matematika" className="w-full mt-1 px-2 py-2 rounded-lg border border-slate-200 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-500">Guru<input data-testid="jadwal-teacher" value={f.teacher_name} onChange={e => setF({ ...f, teacher_name: e.target.value })} placeholder="Opsional" className="w-full mt-1 px-2 py-2 rounded-lg border border-slate-200 text-sm" /></label>
          <button data-testid="jadwal-add" onClick={add} className="py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />Tambah</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((d, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden" data-testid={`jadwal-day-${i}`}>
            <div className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 text-white font-bold text-sm">{d}</div>
            <div className="p-3 space-y-2 min-h-[60px]">
              {byDay(i).length === 0 ? <p className="text-xs text-slate-300 text-center py-3">Tidak ada</p> :
                byDay(i).map(r => (
                  <div key={r.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] font-bold text-sky-700 tabular-nums w-20 shrink-0">{r.start}–{r.end}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{r.subject}</p>{(r.teacher_name || r.room) && <p className="text-[11px] text-slate-500 truncate">{[r.teacher_name, r.room].filter(Boolean).join(" • ")}</p>}</div>
                    {canManage && <button data-testid={`jadwal-del-${r.id}`} onClick={() => del(r.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 3. REKAP ABSENSI KELAS ============ */
export function ClassRekapAbsensi({ klass }) {
  const [data, setData] = useState(null);
  const [range, setRange] = useState({ start: "", end: "" });
  const load = () => api.get(`/classes/${klass.id}/attendance-recap?start=${range.start}&end=${range.end}`).then(r => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, [klass.id, range.start, range.end]); // eslint-disable-line
  if (!data) return <div className="text-slate-400 py-10 text-center">Memuat…</div>;
  const Chip = ({ n, c }) => <span className={`tabular-nums font-semibold ${c}`}>{n}</span>;
  return (
    <div className="space-y-4" data-testid="class-rekap-absensi">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-semibold text-slate-500">Dari<input data-testid="rekap-start" type="date" value={range.start} onChange={e => setRange({ ...range, start: e.target.value })} className="ml-2 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-500">Sampai<input data-testid="rekap-end" type="date" value={range.end} onChange={e => setRange({ ...range, end: e.target.value })} className="ml-2 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" /></label>
        <span className="text-xs text-slate-400">{data.days.length} hari tercatat</span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="px-4 py-3">Siswa</th><th className="px-3 py-3 text-center text-emerald-600">Hadir</th><th className="px-3 py-3 text-center text-amber-600">Izin</th><th className="px-3 py-3 text-center text-sky-600">Sakit</th><th className="px-3 py-3 text-center text-rose-600">Alpa</th><th className="px-3 py-3 text-center">Total</th><th className="px-4 py-3 text-right">Kehadiran</th>
          </tr></thead>
          <tbody>
            {data.rows.map(r => (
              <tr key={r.student_id} data-testid={`rekap-row-${r.student_id}`} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={r.name} photo={r.photo} size="w-8 h-8" /><span className="font-medium text-slate-800">{r.name}</span></div></td>
                <td className="px-3 py-2.5 text-center"><Chip n={r.hadir} c="text-emerald-600" /></td>
                <td className="px-3 py-2.5 text-center"><Chip n={r.izin} c="text-amber-600" /></td>
                <td className="px-3 py-2.5 text-center"><Chip n={r.sakit} c="text-sky-600" /></td>
                <td className="px-3 py-2.5 text-center"><Chip n={r.alpa} c="text-rose-600" /></td>
                <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">{r.total}</td>
                <td className="px-4 py-2.5 text-right"><span className={`font-bold tabular-nums ${r.percent >= 80 ? "text-emerald-600" : r.percent >= 50 ? "text-amber-600" : "text-rose-600"}`}>{r.percent}%</span></td>
              </tr>
            ))}
            {data.rows.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-slate-400">Belum ada siswa di kelas ini</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ 4. PAPAN PERINGKAT ============ */
export function ClassLeaderboard({ klass }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get(`/classes/${klass.id}/leaderboard`).then(r => setRows(r.data.rows)).catch(() => setRows([])); }, [klass.id]);
  if (!rows) return <div className="text-slate-400 py-10 text-center">Memuat…</div>;
  if (rows.length === 0) return <Empty icon={Trophy} text="Belum ada data peringkat" />;
  const medal = (rank) => rank === 1 ? "from-amber-400 to-yellow-500" : rank === 2 ? "from-slate-300 to-slate-400" : rank === 3 ? "from-orange-400 to-amber-600" : "";
  return (
    <div className="space-y-2" data-testid="class-leaderboard">
      {rows.map(r => (
        <div key={r.student_id} data-testid={`rank-row-${r.student_id}`} className={`flex items-center gap-4 rounded-2xl border bg-white px-4 py-3 ${r.rank <= 3 ? "border-amber-200 shadow-sm" : "border-slate-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${r.rank <= 3 ? `bg-gradient-to-br ${medal(r.rank)} text-white` : "bg-slate-100 text-slate-500"}`}>
            {r.rank === 1 ? <Crown className="w-5 h-5" /> : r.rank <= 3 ? <Medal className="w-5 h-5" /> : r.rank}
          </div>
          <Avatar name={r.name} photo={r.photo} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{r.name}</p>
            <p className="text-[11px] text-slate-400">Tugas {fmt(r.tugas)} • Quiz {fmt(r.quiz)} • Ujian {fmt(r.ujian)} • Hadir {fmt(r.kehadiran)}%</p>
          </div>
          <div className="text-right"><p className="font-heading text-2xl font-black text-sky-600 tabular-nums">{r.poin}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">Poin</p></div>
        </div>
      ))}
    </div>
  );
}

/* ============ 5. RAPOR RINGKAS ============ */
export function ClassRapor({ klass, subject }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/classes/${klass.id}/report-card?subject=${subject || "all"}`).then(r => setData(r.data)).catch(() => setData(null)); }, [klass.id, subject]);
  const exportCsv = () => {
    if (!data) return;
    const head = ["Nama", "Tugas", "Quiz", "Ujian", "Kehadiran(%)", "Nilai Akhir"];
    const lines = [head.join(",")].concat(data.rows.map(r => [r.name, fmt(r.tugas), fmt(r.quiz), fmt(r.ujian), fmt(r.kehadiran), fmt(r.nilai)].join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Rapor_${klass.name}${subject && subject !== "all" ? "_" + subject : ""}.csv`; a.click();
  };
  if (!data) return <div className="text-slate-400 py-10 text-center">Memuat…</div>;
  return (
    <div className="space-y-4" data-testid="class-rapor">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-slate-500">Rekap nilai {subject && subject !== "all" ? <b>{subject}</b> : "semua mapel"} — gabungan Tugas, Quiz, Ujian & Kehadiran.</p>
        <button data-testid="rapor-export" onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"><Download className="w-4 h-4" />Ekspor CSV</button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="px-4 py-3">Siswa</th><th className="px-3 py-3 text-center">Tugas</th><th className="px-3 py-3 text-center">Quiz</th><th className="px-3 py-3 text-center">Ujian</th><th className="px-3 py-3 text-center">Hadir</th><th className="px-4 py-3 text-right">Nilai Akhir</th>
          </tr></thead>
          <tbody>
            {data.rows.map(r => (
              <tr key={r.student_id} data-testid={`rapor-row-${r.student_id}`} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={r.name} photo={r.photo} size="w-8 h-8" /><span className="font-medium text-slate-800">{r.name}</span></div></td>
                <td className={`px-3 py-2.5 text-center font-semibold tabular-nums ${scoreColor(r.tugas)}`}>{fmt(r.tugas)}</td>
                <td className={`px-3 py-2.5 text-center font-semibold tabular-nums ${scoreColor(r.quiz)}`}>{fmt(r.quiz)}</td>
                <td className={`px-3 py-2.5 text-center font-semibold tabular-nums ${scoreColor(r.ujian)}`}>{fmt(r.ujian)}</td>
                <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">{r.kehadiran == null ? "–" : r.kehadiran + "%"}</td>
                <td className={`px-4 py-2.5 text-right font-black tabular-nums text-lg ${scoreColor(r.nilai)}`}>{fmt(r.nilai)}</td>
              </tr>
            ))}
            {data.rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-400">Belum ada siswa di kelas ini</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ 6. AGENDA & PENGUMUMAN ============ */
export function ClassAgenda({ klass }) {
  const { user } = useAuth();
  const canPost = ["super_admin", "guru"].includes(user.role) || (user.role === "ketua_kelas" && user.kelas === klass.name);
  const [ann, setAnn] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [fa, setFa] = useState({ title: "", body: "", pinned: false });
  const [fe, setFe] = useState({ title: "", date: "", time: "", kind: "acara" });
  const load = () => {
    api.get(`/classes/${klass.id}/announcements`).then(r => setAnn(r.data)).catch(() => {});
    api.get(`/classes/${klass.id}/agenda`).then(r => setAgenda(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [klass.id]); // eslint-disable-line
  const addAnn = async () => { if (!fa.title.trim()) return toast.error("Isi judul pengumuman"); try { await api.post(`/classes/${klass.id}/announcements`, fa); setFa({ title: "", body: "", pinned: false }); load(); toast.success("Pengumuman dipasang"); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const delAnn = async (id) => { try { await api.delete(`/class-announcements/${id}`); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const addEvt = async () => { if (!fe.title.trim() || !fe.date) return toast.error("Isi judul & tanggal"); try { await api.post(`/classes/${klass.id}/agenda`, fe); setFe({ title: "", date: "", time: "", kind: "acara" }); load(); toast.success("Agenda ditambahkan"); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const delEvt = async (id) => { try { await api.delete(`/class-agenda/${id}`); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };

  return (
    <div className="grid lg:grid-cols-2 gap-5" data-testid="class-agenda">
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Megaphone className="w-4 h-4 text-amber-500" />Pengumuman</h3>
        {canPost && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <input data-testid="ann-title" value={fa.title} onChange={e => setFa({ ...fa, title: e.target.value })} placeholder="Judul pengumuman" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <textarea data-testid="ann-body" value={fa.body} onChange={e => setFa({ ...fa, body: e.target.value })} placeholder="Isi (opsional)" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none" />
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-600 flex items-center gap-1.5"><input type="checkbox" checked={fa.pinned} onChange={e => setFa({ ...fa, pinned: e.target.checked })} />Sematkan</label>
              <button data-testid="ann-add" onClick={addAnn} className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">Pasang</button>
            </div>
          </div>
        )}
        {ann.length === 0 ? <Empty icon={Megaphone} text="Belum ada pengumuman" /> : ann.map(a => (
          <div key={a.id} data-testid={`ann-${a.id}`} className={`rounded-2xl border bg-white p-4 ${a.pinned ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">{a.pinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}{a.title}</h4>
              {(canPost || a.author_id === user.id) && <button data-testid={`ann-del-${a.id}`} onClick={() => delAnn(a.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
            </div>
            {a.body && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.body}</p>}
            <p className="text-[11px] text-slate-400 mt-2">{a.author_name}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-indigo-500" />Agenda Kelas</h3>
        {canPost && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <input data-testid="agenda-title" value={fe.title} onChange={e => setFe({ ...fe, title: e.target.value })} placeholder="Judul agenda (mis. Ulangan Fisika)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input data-testid="agenda-date" type="date" value={fe.date} onChange={e => setFe({ ...fe, date: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-sm" />
              <input data-testid="agenda-time" type="time" value={fe.time} onChange={e => setFe({ ...fe, time: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-sm" />
              <select data-testid="agenda-kind" value={fe.kind} onChange={e => setFe({ ...fe, kind: e.target.value })} className="px-2 py-2 rounded-lg border border-slate-200 text-sm">{Object.keys(AGENDA_KINDS).map(k => <option key={k} value={k}>{k}</option>)}</select>
            </div>
            <button data-testid="agenda-add" onClick={addEvt} className="w-full py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm">Tambah Agenda</button>
          </div>
        )}
        {agenda.length === 0 ? <Empty icon={CalendarDays} text="Belum ada agenda" /> : agenda.map(e => (
          <div key={e.id} data-testid={`agenda-${e.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
            <div className="text-center w-14 shrink-0"><p className="text-xs font-bold text-slate-400 uppercase">{(e.date || "").slice(5, 7)}/{(e.date || "").slice(8, 10)}</p></div>
            <div className="flex-1 min-w-0"><p className="font-semibold text-slate-800 truncate">{e.title}</p><p className="text-[11px] text-slate-500 flex items-center gap-1.5"><Clock className="w-3 h-3" />{e.date}{e.time ? ` • ${e.time}` : ""}</p></div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${AGENDA_KINDS[e.kind] || AGENDA_KINDS.acara}`}>{e.kind}</span>
            {canPost && <button data-testid={`agenda-del-${e.id}`} onClick={() => delEvt(e.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 7. DENAH TEMPAT DUDUK ============ */
export function ClassDenah({ klass, canManage }) {
  const [layout, setLayout] = useState(null);
  const [students, setStudents] = useState([]);
  const [sel, setSel] = useState(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    api.get(`/classes/${klass.id}/seating`).then(r => {
      setLayout({ rows: r.data.layout.rows || 5, cols: r.data.layout.cols || 6, seats: r.data.layout.seats || {} });
      setStudents(r.data.students);
    }).catch(() => {});
  }, [klass.id]);
  if (!layout) return <div className="text-slate-400 py-10 text-center">Memuat…</div>;
  const nameOf = (id) => students.find(s => s.id === id)?.name || "";
  const seated = new Set(Object.values(layout.seats));
  const unseated = students.filter(s => !seated.has(s.id));
  const placeAt = (key) => {
    if (!canManage) return;
    const seats = { ...layout.seats };
    if (seats[key]) { const removed = seats[key]; delete seats[key]; setLayout({ ...layout, seats }); setDirty(true); if (!sel) setSel(removed); return; }
    if (sel) { for (const k of Object.keys(seats)) if (seats[k] === sel) delete seats[k]; seats[key] = sel; setLayout({ ...layout, seats }); setSel(null); setDirty(true); }
  };
  const save = async () => { try { await api.put(`/classes/${klass.id}/seating`, layout); setDirty(false); toast.success("Denah disimpan"); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const setDim = (k, v) => { setLayout({ ...layout, [k]: Math.max(1, Math.min(12, Number(v) || 1)) }); setDirty(true); };

  return (
    <div className="space-y-4" data-testid="class-denah">
      {canManage && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="text-xs font-semibold text-slate-500">Baris<input data-testid="denah-rows" type="number" min={1} max={12} value={layout.rows} onChange={e => setDim("rows", e.target.value)} className="ml-2 w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-500">Kolom<input data-testid="denah-cols" type="number" min={1} max={12} value={layout.cols} onChange={e => setDim("cols", e.target.value)} className="ml-2 w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm" /></label>
          <span className="text-xs text-slate-400 flex-1">{sel ? <>Dipilih: <b className="text-sky-600">{nameOf(sel)}</b> — klik kursi untuk menempatkan</> : "Pilih siswa dari daftar, lalu klik kursi"}</span>
          <button data-testid="denah-save" onClick={save} disabled={!dirty} className={`px-4 py-2 rounded-xl font-semibold text-sm ${dirty ? "bg-sky-600 hover:bg-sky-700 text-white" : "bg-slate-100 text-slate-400"}`}>Simpan Denah</button>
        </div>
      )}
      <div className="grid lg:grid-cols-[1fr,240px] gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4 py-1.5 bg-slate-100 rounded-lg">▲ Papan Tulis / Depan Kelas ▲</div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: layout.rows * layout.cols }).map((_, idx) => {
              const r = Math.floor(idx / layout.cols), c = idx % layout.cols, key = `${r}-${c}`;
              const sid = layout.seats[key];
              return (
                <button key={key} data-testid={`seat-${key}`} onClick={() => placeAt(key)} disabled={!canManage}
                  className={`aspect-[4/3] rounded-xl border-2 flex items-center justify-center text-center p-1 text-[11px] font-semibold transition-colors ${sid ? "border-sky-300 bg-sky-50 text-sky-800" : "border-dashed border-slate-200 text-slate-300"} ${canManage ? "hover:border-sky-400 cursor-pointer" : ""}`}>
                  {sid ? <span className="line-clamp-2 leading-tight">{nameOf(sid)}</span> : <Users2 className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
        {canManage && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Belum duduk ({unseated.length})</p>
            <div className="space-y-1.5 max-h-[360px] overflow-auto">
              {unseated.map(s => (
                <button key={s.id} data-testid={`unseated-${s.id}`} onClick={() => setSel(s.id)} className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm ${sel === s.id ? "bg-sky-600 text-white" : "hover:bg-slate-100 text-slate-700"}`}>
                  <Avatar name={s.name} photo={s.photo} size="w-6 h-6" /><span className="truncate">{s.name}</span>
                </button>
              ))}
              {unseated.length === 0 && <p className="text-xs text-slate-300 text-center py-4">Semua siswa sudah duduk</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ 8. DISKUSI / TANYA-JAWAB ============ */
export function ClassDiskusi({ klass, subject, teachSubjects }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", body: "", subject: "" });
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const load = () => api.get(`/classes/${klass.id}/discussions?subject=${subject || "all"}`).then(r => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, [klass.id, subject]); // eslint-disable-line
  const create = async () => { if (!f.title.trim()) return toast.error("Isi judul pertanyaan"); try { await api.post(`/classes/${klass.id}/discussions`, { ...f, subject: f.subject || null }); setOpen(false); setF({ title: "", body: "", subject: "" }); load(); toast.success("Diskusi dibuat"); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const sendReply = async () => { if (!reply.trim()) return; try { const r = await api.post(`/discussions/${active.id}/reply`, { body: reply }); const upd = { ...active, replies: [...(active.replies || []), r.data] }; setActive(upd); setRows(rows.map(x => x.id === upd.id ? { ...upd, reply_count: upd.replies.length } : x)); setReply(""); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const del = async (id) => { if (!window.confirm("Hapus diskusi ini?")) return; try { await api.delete(`/discussions/${id}`); setActive(null); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } };
  const roleBadge = (r) => ["guru", "super_admin"].includes(r) ? <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Guru</span> : null;

  return (
    <div className="space-y-4" data-testid="class-diskusi">
      <button data-testid="add-diskusi-btn" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm"><Plus className="w-4 h-4" />Buat Pertanyaan</button>
      {rows.length === 0 ? <Empty icon={MessagesSquare} text="Belum ada diskusi. Mulai bertanya!" /> : (
        <div className="space-y-2.5">
          {rows.map(d => (
            <button key={d.id} data-testid={`diskusi-${d.id}`} onClick={() => setActive(d)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 mb-1">{d.subject && <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">{d.subject}</span>}{roleBadge(d.author_role)}</div>
              <h4 className="font-bold text-slate-800">{d.title}</h4>
              {d.body && <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{d.body}</p>}
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">{d.author_name}<span>•</span><MessagesSquare className="w-3 h-3" />{d.reply_count || 0} balasan</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()} data-testid="diskusi-modal">
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Buat Pertanyaan</h3><button onClick={() => setOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <div className="space-y-3">
              <input data-testid="diskusi-title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Judul / pertanyaan" className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none" />
              <select data-testid="diskusi-subject" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 outline-none">
                <option value="">Umum</option>{(teachSubjects || klass.subjects || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea data-testid="diskusi-body" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} placeholder="Jelaskan pertanyaanmu (opsional)" rows={4} className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none resize-none" />
            </div>
            <button data-testid="diskusi-save" onClick={create} className="w-full mt-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold">Kirim</button>
          </div>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} data-testid="diskusi-detail">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div><div className="flex items-center gap-2 mb-1">{active.subject && <span className="text-[10px] font-bold uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">{active.subject}</span>}{roleBadge(active.author_role)}</div><h3 className="font-bold text-lg leading-tight">{active.title}</h3></div>
              <button onClick={() => setActive(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {active.body && <p className="text-sm text-slate-600 whitespace-pre-wrap">{active.body}</p>}
            <p className="text-[11px] text-slate-400 mt-1 mb-3">oleh {active.author_name}</p>
            <div className="flex-1 overflow-auto space-y-2.5 border-t border-slate-100 pt-3">
              {(active.replies || []).length === 0 && <p className="text-sm text-slate-400 text-center py-4">Belum ada balasan</p>}
              {(active.replies || []).map(rp => (
                <div key={rp.id} className="flex gap-2">
                  <CornerDownRight className="w-4 h-4 text-slate-300 mt-1 shrink-0" />
                  <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">{rp.author_name}{roleBadge(rp.author_role)}</p><p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{rp.body}</p></div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 border-t border-slate-100 pt-3">
              <input data-testid="reply-input" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()} placeholder="Tulis balasan…" className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-400 outline-none text-sm" />
              <button data-testid="reply-send" onClick={sendReply} className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white"><Send className="w-4 h-4" /></button>
              {(["guru", "super_admin"].includes(user.role) || active.author_id === user.id) && <button data-testid="diskusi-del" onClick={() => del(active.id)} className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
