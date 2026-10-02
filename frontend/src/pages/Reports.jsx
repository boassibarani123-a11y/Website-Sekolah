import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { FileText, Send, Printer, ArrowLeft, Download } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function Reports() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (["guru","super_admin","kepsek"].includes(user.role)) {
      api.get("/users?role=siswa").then(r => {
        const list = user.role === "guru" ? r.data.filter(s => s.kelas === user.kelas) : r.data;
        setStudents(list);
      });
    } else if (user.role === "siswa") {
      loadReport(user.id);
    } else if (user.role === "orang_tua" && user.student_id) {
      loadReport(user.student_id);
    }
  }, [user]);

  const loadReport = async (sid) => {
    setSelected(sid);
    const r = await api.get(`/reports/${sid}`);
    setReport(r.data);
  };
  const emailIt = async () => {
    try {
      const r = await api.post(`/reports/${selected}/email`);
      toast.success(`Rapor dikirim ke ${r.data.sent_to}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal kirim"); }
  };
  const batchExport = async (kelas) => {
    if (!kelas) return toast.error("Kelas tidak diketahui");
    toast.info("Membuat ZIP rapor kelas...");
    try {
      const r = await api.get(`/reports/batch/zip?kelas=${encodeURIComponent(kelas)}`, {responseType:"blob"});
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href=url; a.download=`Rapor_${kelas.replace(/\s/g,'_')}.zip`; a.click();
      toast.success("ZIP siap diunduh");
    } catch (e) { toast.error("Gagal export ZIP"); }
  };

  if (report && ["siswa","orang_tua"].includes(user.role)) return <ReportView report={report}/>;

  return (
    <div className="space-y-6" data-testid="reports-page">
      {!selected ? (
        <>
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-slate-900">📋 Rapor Digital</h1>
            <p className="mt-1 text-sm text-slate-500">Rangkuman nilai tugas, quiz, dan presensi siswa {user.role==="guru"?`kelas ${user.kelas}`:""}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(s => (
              <button key={s.id} onClick={()=>loadReport(s.id)}
                data-testid="open-report-button"
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-sky-400 transition-all text-left">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold overflow-hidden">
                    {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover"/> : s.name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.kelas} · NISN {s.nisn || "—"}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ortu: {s.parent_email || "belum diisi"}</p>
                  </div>
                </div>
              </button>
            ))}
            {students.length===0 && <p className="text-slate-400 italic">Belum ada siswa.</p>}
          </div>
        </>
      ) : report && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3 no-print">
            <button onClick={()=>{setSelected(null); setReport(null);}} className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
              <ArrowLeft className="w-4 h-4"/>Daftar Siswa
            </button>
            <div className="flex gap-2">
              <button onClick={()=>window.print()} className="px-3 py-2 bg-slate-100 rounded-lg font-semibold text-sm flex items-center gap-1.5"><Printer className="w-4 h-4"/>Print</button>
              {["guru","super_admin","kepsek"].includes(user.role) && (
                <>
                  <button data-testid="email-report-button" onClick={emailIt} className="px-3 py-2 bg-sky-600 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5"><Send className="w-4 h-4"/>Kirim ke Ortu</button>
                  <button data-testid="batch-zip-button" onClick={()=>batchExport(report.student.kelas)} className="px-3 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5"><Download className="w-4 h-4"/>Export ZIP Kelas</button>
                </>
              )}
            </div>
          </div>
          <ReportView report={report}/>
        </>
      )}
    </div>
  );
}

function ReportView({report}) {
  const { settings } = useSettings();
  const s = report.student;
  return (
    <div className="printable-report bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-3xl mx-auto">
      <div className="bg-gradient-to-br from-sky-600 to-slate-900 text-white p-8">
        <div className="flex items-center gap-2 text-xs opacity-80 font-mono-alt tracking-widest"><FileText className="w-4 h-4"/>RAPOR DIGITAL · {settings.school_name}</div>
        <h1 className="font-heading text-3xl font-extrabold mt-3">{s.name}</h1>
        <p className="text-sm opacity-80 mt-1">NISN {s.nisn || "—"} · {s.kelas} · Semester {report.semester}</p>
      </div>
      <div className="p-8 space-y-6">
        <Section title="Nilai Tugas Terstruktur">
          <Stat label="Total Submisi" value={report.assignments.count}/>
          <Stat label="Sudah Dinilai" value={report.assignments.graded}/>
          <Stat label="Rata-rata Nilai" value={report.assignments.avg ?? "—"}/>
        </Section>
        <Section title="Prestasi Mini-Quiz">
          <Stat label="Total Attempt" value={report.quizzes.count}/>
          <Stat label="Rata-rata Skor" value={report.quizzes.avg_percent !== null ? `${report.quizzes.avg_percent}%` : "—"}/>
        </Section>
        <Section title="Rekap Presensi">
          <Stat label="Hadir" value={report.attendance.hadir} color="emerald"/>
          <Stat label="Izin" value={report.attendance.izin} color="sky"/>
          <Stat label="Sakit" value={report.attendance.sakit} color="amber"/>
          <Stat label="Alpa" value={report.attendance.alpa} color="rose"/>
        </Section>
        <div className="pt-6 mt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
          <p>Dokumen ini digenerasi otomatis oleh sistem <b>{settings.school_full_name}</b> pada {new Date(report.generated_at).toLocaleString("id-ID")}.
          Silakan hubungi wali kelas untuk klarifikasi lebih lanjut.</p>
        </div>
      </div>
    </div>
  );
}
function Section({title, children}) {
  return <div>
    <h3 className="font-heading font-bold text-slate-900 mb-3">{title}</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{children}</div>
  </div>;
}
function Stat({label, value, color}) {
  const c = {emerald:"bg-emerald-50 text-emerald-800 border-emerald-200", sky:"bg-sky-50 text-sky-800 border-sky-200",
             amber:"bg-amber-50 text-amber-800 border-amber-200", rose:"bg-rose-50 text-rose-800 border-rose-200"}[color] || "bg-slate-50 text-slate-800 border-slate-200";
  return <div className={`${c} border p-3 rounded-xl`}>
    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
    <p className="mt-1 font-heading text-2xl font-extrabold">{value}</p>
  </div>;
}
