import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/apiClient";
import StudentIdCard from "@/components/StudentIdCard";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrintCards() {
  const [sp] = useSearchParams();
  const kelas = sp.get("kelas") || "";
  const [students, setStudents] = useState([]);
  useEffect(() => {
    api.get("/users?role=siswa").then(r => {
      const list = kelas ? r.data.filter(s => s.kelas === kelas) : r.data;
      setStudents(list);
    });
  }, [kelas]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between no-print">
        <Link to="/accounts" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
          <ArrowLeft className="w-4 h-4"/>Kembali
        </Link>
        <div className="text-right">
          <h1 className="font-heading text-2xl font-extrabold text-slate-900">Cetak Massal Kartu Pelajar</h1>
          <p className="text-xs text-slate-500">{kelas || "Semua kelas"} · {students.length} kartu · 8 per lembar A4</p>
        </div>
        <button data-testid="bulk-print-button" onClick={()=>window.print()}
          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-lg">
          <Printer className="w-4 h-4"/>Print Sekarang
        </button>
      </div>

      <div className="bulk-print-sheet mx-auto bg-white shadow-xl p-[10mm]" style={{width:"210mm", minHeight:"297mm"}}>
        <div className="grid grid-cols-2 gap-x-[6mm] gap-y-[4mm]">
          {students.map(s => (
            <div key={s.id} className="flex items-center justify-center">
              <StudentIdCard student={s}/>
            </div>
          ))}
        </div>
        {students.length === 0 && <p className="text-center text-slate-400 py-20">Tidak ada siswa untuk dicetak.</p>}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .bulk-print-sheet { box-shadow: none !important; padding: 8mm !important; }
          .bulk-print-sheet .grid { page-break-inside: auto; }
          .bulk-print-sheet > div > div { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
