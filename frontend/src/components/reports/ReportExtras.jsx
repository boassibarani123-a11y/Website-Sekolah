import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { MessageSquareQuote, Save } from "lucide-react";

export function semesterOptions() {
  const d = new Date(); const y = d.getFullYear();
  let cur = d.getMonth() >= 6 ? { t: "Ganjil", y } : { t: "Genap", y: y - 1 };
  const out = [];
  for (let i = 0; i < 4; i++) {
    out.push(`${cur.t} ${cur.y}/${cur.y + 1}`);
    cur = cur.t === "Genap" ? { t: "Ganjil", y: cur.y } : { t: "Genap", y: cur.y - 1 };
  }
  return out;
}

const ATT_COLORS = { hadir: "#10b981", izin: "#0ea5e9", sakit: "#f59e0b", alpa: "#f43f5e" };

export function ReportCharts({ report }) {
  const att = Object.entries(report.attendance).map(([k, v]) => ({ name: k[0].toUpperCase() + k.slice(1), key: k, v }));
  const grades = [
    ...report.assignments.list.filter(a => a.grade != null).map(a => ({ name: a.title, v: a.grade, type: "Tugas" })),
    ...report.quizzes.list.map(q => ({ name: q.title, v: Math.round(q.percent), type: "Quiz" })),
  ].slice(0, 12);
  return (
    <div className="grid md:grid-cols-2 gap-4" data-testid="report-charts">
      <div className="border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Grafik Presensi</p>
        <div className="h-48"><ResponsiveContainer><BarChart data={att}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" fontSize={11}/><YAxis allowDecimals={false} fontSize={11}/><Tooltip/>
          <Bar dataKey="v" name="Hari" radius={[6, 6, 0, 0]}>{att.map(a => <Cell key={a.key} fill={ATT_COLORS[a.key]}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </div>
      <div className="border border-slate-200 rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Grafik Nilai Tugas & Quiz</p>
        {grades.length === 0 ? <p className="h-48 flex items-center justify-center text-sm text-slate-400 italic">Belum ada nilai di semester ini.</p> :
          <div className="h-48"><ResponsiveContainer><BarChart data={grades}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" fontSize={10} tickFormatter={t => (t || "").slice(0, 8)}/><YAxis domain={[0, 100]} fontSize={11}/><Tooltip/>
            <Bar dataKey="v" name="Nilai" radius={[6, 6, 0, 0]}>{grades.map((g, i) => <Cell key={i} fill={g.type === "Quiz" ? "#6366f1" : "#0ea5e9"}/>)}</Bar></BarChart></ResponsiveContainer></div>}
      </div>
    </div>
  );
}

export function ReportNote({ report, canEdit, onSaved }) {
  const [note, setNote] = useState(report.note?.note || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.put(`/reports/${report.student.id}/note`, { semester: report.semester, note }); toast.success("Catatan wali kelas disimpan"); onSaved?.(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan catatan"); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4" data-testid="report-note-section">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5"><MessageSquareQuote className="w-4 h-4"/>Catatan Wali Kelas</p>
      {canEdit ? (
        <div className="no-print">
          <textarea data-testid="report-note-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Tulis catatan perkembangan, sikap, dan saran untuk siswa..."
            className="mt-2 w-full px-3 py-2 border-2 border-amber-200 rounded-xl text-sm bg-white focus:border-amber-400 outline-none"/>
          <button data-testid="report-note-save" disabled={busy} onClick={save} className="mt-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"><Save className="w-3.5 h-3.5"/>{busy ? "Menyimpan..." : "Simpan Catatan"}</button>
        </div>
      ) : null}
      <p data-testid="report-note-text" className={`mt-2 text-sm text-slate-700 whitespace-pre-line ${canEdit ? "hidden print:block" : ""}`}>{report.note?.note || "Belum ada catatan dari wali kelas."}</p>
      {report.note?.author && <p className="mt-1 text-[11px] text-slate-500">— {report.note.author}</p>}
    </div>
  );
}

export function Completeness({ value }) {
  const c = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="mt-3" data-testid="report-completeness">
      <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1"><span>Kelengkapan Rapor</span><span>{value}%</span></div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${c} transition-all`} style={{ width: `${value}%` }}/></div>
    </div>
  );
}
