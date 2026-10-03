import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/apiClient";
import StudentIdCard from "@/components/StudentIdCard";
import { useSettings } from "@/context/SettingsContext";
import { Printer, ArrowLeft, FileDown, Image as ImageIcon, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { downloadSheetPdf, downloadNodeJpg } from "@/lib/cardExport";

export default function PrintCards() {
  const [sp] = useSearchParams();
  const kelas = sp.get("kelas") || "";
  const { settings } = useSettings();
  const [students, setStudents] = useState([]);
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    api.get("/users?role=siswa").then(r => {
      const list = kelas ? r.data.filter(s => s.kelas === kelas) : r.data;
      setStudents(list);
    });
  }, [kelas]);

  const fname = (ext) => `Kartu_Massal_${(kelas || "semua").replace(/[^a-zA-Z0-9]+/g, "_")}.${ext}`;

  const handlePdf = async () => {
    if (!students.length) return toast.error("Tidak ada siswa untuk diunduh");
    setBusy("pdf");
    try {
      await downloadSheetPdf(sheetRef.current, fname("pdf"));
      toast.success("PDF kartu massal berhasil diunduh");
    } catch (e) { toast.error(e.message || "Gagal membuat PDF"); }
    finally { setBusy(""); }
  };

  const handleJpg = async () => {
    if (!students.length) return toast.error("Tidak ada siswa untuk diunduh");
    setBusy("jpg");
    try {
      await downloadNodeJpg(sheetRef.current, fname("jpg"));
      toast.success("JPG kartu massal berhasil diunduh");
    } catch (e) { toast.error(e.message || "Gagal membuat JPG"); }
    finally { setBusy(""); }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 no-print">
        <Link to="/accounts" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
          <ArrowLeft className="w-4 h-4"/>Kembali
        </Link>
        <div className="text-center">
          <h1 className="font-heading text-2xl font-extrabold text-slate-900">Cetak Massal Kartu Pelajar</h1>
          <p className="text-xs text-slate-500">{kelas || "Semua kelas"} · {students.length} kartu · 88×56 mm · 2 kolom per lembar A4</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="bulk-download-pdf-button" onClick={handlePdf} disabled={!!busy}
            className="px-3 py-2.5 bg-rose-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-rose-700 shadow-lg disabled:opacity-60">
            {busy==="pdf" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}PDF
          </button>
          <button data-testid="bulk-download-jpg-button" onClick={handleJpg} disabled={!!busy}
            className="px-3 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg disabled:opacity-60">
            {busy==="jpg" ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImageIcon className="w-4 h-4"/>}JPG
          </button>
          <button data-testid="bulk-print-button" onClick={()=>window.print()}
            className="px-3 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-lg">
            <Printer className="w-4 h-4"/>Print
          </button>
        </div>
      </div>

      <div ref={sheetRef} className="bulk-print-sheet mx-auto bg-white shadow-xl p-[10mm]" style={{width:"210mm", minHeight:"297mm"}}>
        <div className="grid grid-cols-2 gap-x-[6mm] gap-y-[4mm]">
          {students.map(s => (
            <div key={s.id} className="flex items-center justify-center">
              <StudentIdCard student={s} school={settings.school_full_name}
                validYears={settings.id_card_valid_years} logoUrl={settings.school_logo_url}/>
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
