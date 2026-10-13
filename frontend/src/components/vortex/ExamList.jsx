import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Timer, CalendarClock, ListChecks, CheckCircle2, MonitorPlay, Radar, FileSpreadsheet, FileText, GraduationCap, BarChart3 } from "lucide-react";
import { STATUS_META, fmtDT } from "./VortexLogo";
import { ExamEditor } from "./ExamEditor";
import { ExamTake } from "./ExamTake";
import { ExamResults } from "./ExamResults";
import { TokenProjector } from "./TokenProjector";
import { LiveProctor } from "./LiveProctor";
import { ExamAnalysis } from "./ExamAnalysis";
import { downloadExamExport } from "./examExport";

const toolBtn = "flex-1 min-w-0 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors";

function ExamCard({ ex, canManage: staff, isTeacher, onEdit, onDelete, onTake, onResults, onToken, onLive, onAnalysis }) {
  const st = STATUS_META[ex.status] || STATUS_META.open;
  const canManage = staff && ex.can_manage;
  return (
    <div data-testid={`exam-card-${ex.id}`} className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-600/40 hover:shadow-md transition-[box-shadow,border-color]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span data-testid={`exam-status-${ex.id}`} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${st.cls}`}>{st.label}</span>
          {ex.subject && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{ex.subject}</span>}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">{ex.kelas}</span>
          {isTeacher && !ex.can_manage && ex.can_export && <span data-testid={`exam-homeroom-${ex.id}`} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 flex items-center gap-1"><GraduationCap className="w-3 h-3" />Wali kelas</span>}
        </div>
        {canManage && (
          <div className="flex gap-1">
            <button data-testid={`edit-exam-${ex.id}`} onClick={onEdit} className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
            <button data-testid={`delete-exam-${ex.id}`} onClick={onDelete} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      <h3 className="font-heading font-bold text-lg mt-3 leading-snug">{ex.title}</h3>
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        <p className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" />{ex.question_count} soal{ex.essay_count ? ` (${ex.essay_count} esai)` : ""} · maks {ex.max_violations}× pelanggaran</p>
        {ex.time_limit > 0 && <p className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" />{ex.time_limit} menit</p>}
        {(ex.start_at || ex.end_at) && <p className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />{fmtDT(ex.start_at) || "—"} → {fmtDT(ex.end_at) || "—"}</p>}
      </div>
      {isTeacher ? (
        <>
          <button data-testid={`exam-results-${ex.id}`} onClick={onResults} className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors">Hasil & Penilaian</button>
          <div className="mt-2 flex gap-2">
            {ex.can_export && <button data-testid={`exam-live-${ex.id}`} onClick={onLive} className={`${toolBtn} bg-teal-50 text-teal-800 hover:bg-teal-100`}><Radar className="w-3.5 h-3.5" />Pengawas</button>}
            {ex.can_export && <button data-testid={`exam-analysis-${ex.id}`} onClick={onAnalysis} className={`${toolBtn} bg-amber-50 text-amber-800 hover:bg-amber-100`}><BarChart3 className="w-3.5 h-3.5" />Analisis</button>}
            {canManage && <button data-testid={`exam-token-${ex.id}`} onClick={onToken} className={`${toolBtn} bg-slate-100 text-slate-700 hover:bg-slate-200`}><MonitorPlay className="w-3.5 h-3.5" />Token</button>}
          </div>
          {ex.can_export && (
            <div className="mt-2 flex gap-2">
              <button data-testid={`exam-export-xlsx-${ex.id}`} onClick={() => downloadExamExport(ex, "xlsx")} className={`${toolBtn} border border-emerald-200 text-emerald-700 hover:bg-emerald-50`}><FileSpreadsheet className="w-3.5 h-3.5" />Excel</button>
              <button data-testid={`exam-export-pdf-${ex.id}`} onClick={() => downloadExamExport(ex, "pdf")} className={`${toolBtn} border border-rose-200 text-rose-700 hover:bg-rose-50`}><FileText className="w-3.5 h-3.5" />PDF</button>
            </div>
          )}
        </>
      ) : ex.submitted ? (
        <p data-testid={`exam-submitted-${ex.id}`} className="mt-4 w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Sudah dikumpulkan</p>
      ) : (
        <button data-testid={`take-exam-${ex.id}`} disabled={ex.status !== "open"} onClick={onTake}
          className="mt-4 w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold disabled:bg-slate-200 disabled:text-slate-500 transition-colors">
          {ex.status === "upcoming" ? "Belum dibuka" : ex.status === "ended" ? "Sudah berakhir" : "Masuk Ujian"}
        </button>
      )}
    </div>
  );
}

export function ExamList({ klass, subject, teachSubjects = [], isTeacher, canManage }) {
  const [list, setList] = useState(null);
  const [editor, setEditor] = useState(null);
  const [taking, setTaking] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);
  const [tokenFor, setTokenFor] = useState(null);
  const [liveFor, setLiveFor] = useState(null);
  const [analysisFor, setAnalysisFor] = useState(null);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (klass) p.set("class_id", klass.id);
    if (subject && subject !== "all") p.set("subject", subject);
    api.get(`/exams?${p}`).then(r => setList(r.data)).catch(() => setList([]));
  }, [klass, subject]);
  useEffect(() => { load(); }, [load]);

  const del = async (ex) => {
    if (!window.confirm(`Hapus ujian "${ex.title}" beserta seluruh hasilnya?`)) return;
    try { await api.delete(`/exams/${ex.id}`); toast.success("Ujian dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-4" data-testid="exam-list">
      {canManage && (
        <button data-testid="new-exam-button" onClick={() => setEditor({})}
          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Buat Ujian</button>
      )}
      {list === null && <p className="text-slate-400 text-sm py-8">Memuat ujian...</p>}
      {list?.length === 0 && <p data-testid="exam-list-empty" className="text-slate-400 text-sm py-10 text-center">Belum ada ujian{subject && subject !== "all" ? ` untuk ${subject}` : ""}.</p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {(list || []).map(ex => (
          <ExamCard key={ex.id} ex={ex} canManage={canManage} isTeacher={isTeacher}
            onEdit={() => setEditor(ex)} onDelete={() => del(ex)} onTake={() => setTaking(ex)} onResults={() => setResultsFor(ex)}
            onToken={() => setTokenFor(ex)} onLive={() => setLiveFor(ex)} onAnalysis={() => setAnalysisFor(ex)} />
        ))}
      </div>
      {tokenFor && <TokenProjector exam={tokenFor} onClose={() => setTokenFor(null)} />}
      {analysisFor && <ExamAnalysis exam={analysisFor} onClose={() => setAnalysisFor(null)} />}
      {liveFor && <LiveProctor exam={liveFor} onClose={() => setLiveFor(null)} />}
      {editor && <ExamEditor klass={klass} subjects={teachSubjects} initial={editor.id ? editor : null} onClose={() => setEditor(null)} onDone={() => { setEditor(null); load(); }} />}
      {taking && <ExamTake exam={taking} onClose={() => setTaking(null)} onDone={() => { setTaking(null); load(); }} />}
      {resultsFor && <ExamResults exam={resultsFor} onClose={() => setResultsFor(null)} />}
    </div>
  );
}
