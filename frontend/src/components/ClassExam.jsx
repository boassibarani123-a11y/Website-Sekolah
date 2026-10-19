import { VortexLogo } from "@/components/vortex/VortexLogo";
import { ExamList } from "@/components/vortex/ExamList";

export function ClassExam({ klass, subject, teachSubjects, isTeacher, canManage }) {
  return (
    <div className="space-y-4" data-testid="class-exam-tab">
      <div className="rounded-2xl bg-slate-950 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <VortexLogo dark />
        <p className="text-sm text-slate-300 max-w-md">Masuk dengan token, layar penuh, jawaban tersimpan otomatis. Pindah tab atau keluar layar penuh tercatat sebagai pelanggaran.</p>
      </div>
      <ExamList klass={klass} subject={subject} teachSubjects={teachSubjects} isTeacher={isTeacher} canManage={canManage} />
    </div>
  );
}
