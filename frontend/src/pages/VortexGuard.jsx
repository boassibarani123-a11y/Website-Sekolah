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
      <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full border-[40px] border-teal-700/20" />
        <div className="absolute -right-6 -top-6 w-44 h-44 rounded-full border-[24px] border-teal-500/20" />
        <div className="relative">
          <VortexLogo dark />
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold mt-6 max-w-2xl leading-tight">
            {staff ? "Kelola ujian, pantau, dan nilai di satu tempat." : "Fokus. Tenang. Kerjakan dengan jujur."}
          </h1>
          <p className="mt-3 text-slate-400 max-w-xl text-sm sm:text-base">
            {staff ? "Buat bank soal pilihan ganda & esai, terbitkan dengan jadwal dan token, lalu awasi pelanggaran secara langsung."
              : `Ujian untuk kelas ${user.kelas || "-"}. Siapkan token dari pengawas sebelum masuk.`}
          </p>
        </div>
      </section>
      <ExamList isTeacher={staff} canManage={staff} />
    </div>
  );
}
