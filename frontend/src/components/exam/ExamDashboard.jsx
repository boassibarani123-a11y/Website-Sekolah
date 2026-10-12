import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Info, FileText, PenLine, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { VG, VortexMark } from "./brand";
import { VortexInfoModal } from "./VortexInfoModal";
import { ExamTable } from "./ExamTable";
import { ExamBuilder } from "./ExamBuilder";
import { ExamTakeModal } from "./ExamTake";
import { ExamResults, MyExamResult } from "./ExamResults";

export function ClassExam({ klass, subject, teachSubjects, isTeacher, canManage }) {
  const [list, setList] = useState(null);
  const [builder, setBuilder] = useState(null);
  const [taking, setTaking] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);
  const [myResult, setMyResult] = useState(null);
  const [info, setInfo] = useState(false);

  const load = useCallback(() => {
    const q = subject && subject !== "all" ? `&subject=${encodeURIComponent(subject)}` : "";
    api.get(`/exams?class_id=${klass.id}${q}`).then(r => setList(r.data)).catch(() => setList([]));
  }, [klass.id, subject]);
  useEffect(() => { load(); }, [load]);

  const del = async (ex) => {
    if (!window.confirm(`Hapus ujian "${ex.title}" beserta seluruh hasilnya?`)) return;
    try { await api.delete(`/exams/${ex.id}`); toast.success("Ujian dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  const stats = useMemo(() => {
    const l = list || [];
    return isTeacher
      ? [["Total Ujian", l.length, FileText], ["Total Soal", l.reduce((s, e) => s + (e.question_count || 0), 0), ClipboardCheck],
         ["Soal Essay", l.reduce((s, e) => s + (e.essay_count || 0), 0), PenLine], ["Menunggu Koreksi", l.reduce((s, e) => s + (e.pending_count || 0), 0), CheckCircle2]]
      : [["Ujian Tersedia", l.length, FileText], ["Sudah Dikerjakan", l.filter(e => e.my_attempt).length, CheckCircle2],
         ["Belum Dikerjakan", l.filter(e => !e.my_attempt).length, ClipboardCheck], ["Menunggu Koreksi", l.filter(e => e.my_attempt?.status === "pending").length, PenLine]];
  }, [list, isTeacher]);

  return (
    <div className="space-y-5" data-testid="class-exam-tab">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-7">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-indigo-600/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 left-1/3 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <VortexMark dark />
            <h2 className="mt-4 font-heading text-2xl sm:text-3xl font-black tracking-tight" data-testid="exam-dashboard-title">Kumpulan Ujian · {klass.name}</h2>
            <p className="mt-1 text-sm text-indigo-100/70 max-w-xl">Sistem ujian anti-nyontek {VG.full}: password, layar penuh, soal per halaman, essay, dan koreksi terintegrasi.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button data-testid="vortex-info-button" onClick={() => setInfo(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm flex items-center gap-2 transition-colors"><Info className="w-4 h-4" />Tentang Sistem</button>
            {canManage && (
              <button data-testid="new-exam-button" onClick={() => setBuilder({})}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-colors"><Plus className="w-4 h-4" />Buat Ujian</button>
            )}
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(([label, val, Icon], i) => (
            <div key={label} className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur" data-testid={`exam-stat-${i}`}>
              <Icon className="w-4 h-4 text-cyan-300" />
              <p className="mt-2 font-heading text-2xl font-black">{list ? val : "…"}</p>
              <p className="text-[11px] uppercase tracking-wider text-indigo-100/60">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <ExamTable list={list} isTeacher={isTeacher} canManage={canManage}
        onEdit={setBuilder} onDelete={del} onResults={setResultsFor} onTake={setTaking} onMyResult={setMyResult} />

      {builder && <ExamBuilder klass={klass} subjects={teachSubjects} initial={builder} onClose={() => setBuilder(null)} onDone={() => { load(); setBuilder(null); }} />}
      {taking && <ExamTakeModal exam={taking} onClose={() => setTaking(null)} onDone={() => { setTaking(null); load(); }} />}
      {resultsFor && <ExamResults exam={resultsFor} onClose={() => { setResultsFor(null); load(); }} />}
      {myResult && <MyExamResult exam={myResult} onClose={() => setMyResult(null)} />}
      {info && <VortexInfoModal onClose={() => setInfo(false)} />}
    </div>
  );
}
