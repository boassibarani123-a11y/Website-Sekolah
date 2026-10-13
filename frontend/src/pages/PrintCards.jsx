import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/apiClient";
import StudentIdCard from "@/components/StudentIdCard";
import { useSettings } from "@/context/SettingsContext";
import { Printer, ArrowLeft, FileDown, Image as ImageIcon, Loader2, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { downloadSheetPdf, downloadNodeJpg } from "@/lib/cardExport";

export default function PrintCards() {
  const [sp] = useSearchParams();
  const kelas = sp.get("kelas") || "";
  const { settings } = useSettings();
  const [students, setStudents] = useState([]);
  const [showBack, setShowBack] = useState(true);
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState("");
  useEffect(() => {
    api.get("/users?role=siswa").then(r => {
      const list = kelas ? r.data.filter(s => s.kelas === kelas) : r.data;
      setStudents(list);
    });
  }, [kelas]);

  const fname = (ext) => `Kartu_Massal_${(kelas || "semua").replace(/[^a-zA-Z0-9]+/g, "_")}.${ext}`;

  const run = async (type, fn) => {
    if (!students.length) return toast.error("Tidak ada siswa untuk diunduh");
    setBusy(type);
    try { await fn(sheetRef.current, fname(type)); toast.success(`${type.toUpperCase()} kartu massal berhasil diunduh`); }
    catch (e) { toast.error(e.message || "Gagal membuat berkas"); }
    finally { setBusy(""); }
  };

  // Build a flat list of card faces (front, optional back) so pairs stay together.
  const faces = [];
  students.forEach(s => {
    faces.push({ key: `${s.id}-f`, student: s, side: "front" });
    if (showBack) faces.push({ key: `${s.id}-b`, student: s, side: "back" });
  });

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 no-print">
        <Link to="/accounts" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800">
          <ArrowLeft className="w-4 h-4"/>Kembali
        </Link>
        <div className="text-center">
          <h1 className="font-heading text-2xl font-extrabold text-slate-900">Cetak Massal Kartu Pelajar</h1>
          <p className="text-xs text-slate-500">{kelas || "Semua kelas"} · {students.length} siswa · {faces.length} kartu · CR80/PVC 86×54 mm · 2 kolom A4</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="toggle-back-button" onClick={()=>setShowBack(v=>!v)}
            className={`px-3 py-2.5 rounded-xl font-semibold flex items-center gap-2 border-2 transition-colors ${showBack ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"}`}>
            <Layers className="w-4 h-4"/>{showBack ? "Depan + Belakang" : "Depan saja"}
          </button>
          <button data-testid="bulk-download-pdf-button" onClick={()=>run("pdf", downloadSheetPdf)} disabled={!!busy}
            className="px-3 py-2.5 bg-rose-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-rose-700 shadow-lg disabled:opacity-60">
            {busy==="pdf" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}PDF
          </button>
          <button data-testid="bulk-download-jpg-button" onClick={()=>run("jpg", downloadNodeJpg)} disabled={!!busy}
            className="px-3 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg disabled:opacity-60">
            {busy==="jpg" ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImageIcon className="w-4 h-4"/>}JPG
          </button>
          <button data-testid="bulk-print-button" onClick={()=>window.print()}
            className="px-3 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-lg">
            <Printer className="w-4 h-4"/>Print
          </button>
        </div>
      </div>

      <p className="max-w-5xl mx-auto mb-3 text-[11px] text-slate-500 no-print text-center">
        💡 Tip PVC: cetak pada kertas/PVC A4, gunakan skala <b>100% (ukuran asli)</b> tanpa "fit to page", lalu potong mengikuti garis bantu putus-putus. Setiap kartu sudah berukuran CR80.
      </p>

      <div ref={sheetRef} className="bulk-print-sheet mx-auto bg-white shadow-xl p-[10mm]" style={{width:"210mm", minHeight:"297mm"}}>
        <div className="grid grid-cols-2 gap-x-[8mm] gap-y-[6mm] justify-items-center">
          {faces.map(f => (
            <div key={f.key} className="card-cut">
              <StudentIdCard student={f.student} school={settings.school_full_name}
                validYears={settings.id_card_valid_years} logoUrl={settings.school_logo_url}
                rules={settings.id_card_rules} side={f.side}/>
            </div>
          ))}
        </div>
        {students.length === 0 && <p className="text-center text-slate-400 py-20">Tidak ada siswa untuk dicetak.</p>}
      </div>

      <style>{`
        .card-cut {
          position: relative;
          padding: 3mm;
          border: 1px dashed #cbd5e1;
          border-radius: 4px;
        }
        .card-cut::before, .card-cut::after {
          content: ""; position: absolute; width: 4mm; height: 4mm; border-color: #94a3b8;
        }
        .card-cut::before { top: 0; left: 0; border-top: 1px solid; border-left: 1px solid; }
        .card-cut::after { bottom: 0; right: 0; border-bottom: 1px solid; border-right: 1px solid; }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
          .bulk-print-sheet { box-shadow: none !important; padding: 10mm !important; }
          .bulk-print-sheet .grid { page-break-inside: auto; }
          .card-cut { page-break-inside: avoid; border-color: #e2e8f0; }
        }
      `}</style>
    </div>
  );
}
