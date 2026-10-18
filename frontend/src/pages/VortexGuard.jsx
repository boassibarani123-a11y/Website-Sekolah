import { PageHeader } from "@/components/zx/ui";
import { isTeacher as isTeacherUser, isTeacherOrAdmin } from "@/lib/roles";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { VortexLogo, VG_NAME } from "@/components/vortex/VortexLogo";
import { ExamList } from "@/components/vortex/ExamList";

export default function VortexGuard() {
  const { user } = useAuth();
  const staff = isTeacherOrAdmin(user);
  useEffect(() => { const prev = document.title; document.title = `${VG_NAME} · Ujian Online`; return () => { document.title = prev; }; }, []);
  return (
    <div className="space-y-6" data-testid="vortex-guard-page">
      <PageHeader title="Vortex Guard" subtitle={staff ? "Kelola ujian, pantau, dan nilai di satu tempat. Buat soal pilihan ganda & esai, terbitkan dengan jadwal dan token, lalu awasi pelanggaran secara langsung." : `Fokus. Tenang. Kerjakan dengan jujur. Ujian untuk kelas ${user.kelas || "-"} — siapkan token dari pengawas sebelum masuk.`}
        actions={<VortexLogo />}/>
      <ExamList isTeacher={staff} canManage={staff} />
    </div>
  );
}
