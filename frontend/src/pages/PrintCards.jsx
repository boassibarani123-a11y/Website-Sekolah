import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "@/lib/apiClient";
import StudentIdCard from "@/components/StudentIdCard";
import { useSettings } from "@/context/SettingsContext";
import { Printer, ArrowLeft, FileDown, Image as ImageIcon, Loader2, Layers } from "lucide-react";
import { toast } from "sonner";
import { exportPagesPdf, exportPagesJpg } from "@/lib/bulkCardExport";

const PER_PAGE = 8;

export default function PrintCards() {
  const [sp] = useSearchParams();
  const kelas = sp.get("kelas") || "";
  const { settings } = useSettings();
  const [students, setStudents] = useState(null);
  const [showBack, setShowBack] = useState(true);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState("");
  const rootRef = useRef(null);
  useEffect(() => {
    api.get("/users?role=siswa").then(r => {
      const list = kelas ? r.data.filter(s => s.kelas === kelas) : r.data;
      list.sort((a, b) => (a.kelas || "").localeCompare(b.kelas || "", "id", { numeric: true }) || a.name.localeCompare(b.name));
      setStudents(list);
    }).catch(() => setStudents([]));
  }, [kelas]);

  const pages = useMemo(() => {
    const faces = [];
    (students || []).forEach(s => {
      faces.push({ key: `${s.id}-f`, student: s, side: "front" });
      if (showBack) faces.push({ key: `${s.id}-b`, student: s, side: "back" });
    });
    const out = [];
    for (let i = 0; i < faces.length; i += PER_PAGE) out.push(faces.slice(i, i + PER_PAGE));
    return out;
  }, [students, showBack]);

  const fname = (ext) => `Kartu_Massal_${(kelas || "semua").replace(/[^a-zA-Z0-9]+/g, "_")}.${ext}`;
  const run = async (type) => {
    if (!pages.length) return toast.error("Tidak ada siswa untuk diunduh");
    setBusy(type);
    try {
      const nodes = Array.from(rootRef.current.querySelectorAll(".bulk-page"));
      const onProgress = (i, n) => setProgress(`Memproses halaman ${i}/${n}…`);
      if (type === "pdf") await exportPagesPdf(nodes, fname("pdf"), onProgress);
      else await exportPagesJpg(nodes, fname(nodes.length > 1 ? "zip" : "jpg"), onProgress);
      toast.success(`${type.toUpperCase()} kartu massal berhasil diunduh`);
    } catch (e) { toast.error(e.message || "Gagal membuat berkas"); }
    finally { setBusy(""); setProgress(""); }
  };
  const count = students?.length || 0;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 bulk-print-wrap">
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-3 no-print">
        <Link to="/accounts" className="inline-flex items-center gap-1.5 text-sm text-sky-600 font-semibold hover:text-sky-800"><ArrowLeft className="w-4 h-4" />Kembali</Link>
        <div className="text-center">
          <h1 className="font-heading text-2xl font-extrabold text-slate-900">Cetak Massal Kartu Pelajar</h1>
          <p className="text-xs text-slate-500" data-testid="bulk-summary">{kelas || "Semua kelas"} · {count} siswa · {pages.length} halaman A4 · {PER_PAGE} kartu/halaman</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="toggle-back-button" onClick={() => setShowBack(v => !v)}
            className={`px-3 py-2.5 rounded-xl font-semibold flex items-center gap-2 border-2 transition-colors ${showBack ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-400"}`}>
            <Layers className="w-4 h-4" />{showBack ? "Depan + Belakang" : "Depan saja"}
          </button>
          <button data-testid="bulk-download-pdf-button" onClick={() => run("pdf")} disabled={!!busy}
            className="px-3 py-2.5 bg-rose-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-rose-700 shadow-lg disabled:opacity-60">
            {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}PDF
          </button>
          <button data-testid="bulk-download-jpg-button" onClick={() => run("jpg")} disabled={!!busy}
            className="px-3 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg disabled:opacity-60">
            {busy === "jpg" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}JPG
          </button>
          <button data-testid="bulk-print-button" onClick={() => window.print()} disabled={!!busy}
            className="px-3 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 shadow-lg disabled:opacity-60">
            <Printer className="w-4 h-4" />Print
          </button>
        </div>
      </div>
      {progress && <p data-testid="bulk-progress" className="no-print max-w-5xl mx-auto mb-3 text-center text-sm font-semibold text-rose-600">{progress}</p>}
      <p className="max-w-5xl mx-auto mb-3 text-[11px] text-slate-500 no-print text-center">
        Tip PVC: cetak pada A4 dengan skala <b>100% (ukuran asli)</b> tanpa "fit to page", lalu potong mengikuti garis bantu. JPG untuk banyak halaman diunduh sebagai file ZIP.
      </p>

      <div ref={rootRef} className="bulk-root" data-testid="bulk-root">
        {students === null && <p className="text-center text-slate-400 py-20 no-print">Memuat data siswa…</p>}
        {students && count === 0 && <p className="text-center text-slate-400 py-20">Tidak ada siswa untuk dicetak.</p>}
        {pages.map((pg, pi) => (
          <div key={pi} className="bulk-page" data-testid={`bulk-page-${pi}`}>
            <div className="bulk-grid">
              {pg.map(f => (
                <div key={f.key} className="card-cut">
                  <StudentIdCard student={f.student} school={settings.school_full_name}
                    validYears={settings.id_card_valid_years} logoUrl={settings.school_logo_url}
                    rules={settings.id_card_rules} side={f.side} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .bulk-page { width: 210mm; height: 297mm; padding: 10mm; margin: 0 auto 8mm; background: #fff; box-shadow: 0 10px 30px rgba(15,23,42,.12); overflow: hidden; box-sizing: border-box; }
        .bulk-grid { display: grid; grid-template-columns: repeat(2, 92mm); grid-auto-rows: 61mm; gap: 6mm 6mm; justify-content: center; }
        .bulk-page .card-cut { position: relative; padding: 2mm; border: 1px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        .bulk-page .card-cut::before, .bulk-page .card-cut::after { content: ""; position: absolute; width: 4mm; height: 4mm; border-color: #94a3b8; }
        .bulk-page .card-cut::before { top: 0; left: 0; border-top: 1px solid; border-left: 1px solid; }
        .bulk-page .card-cut::after { bottom: 0; right: 0; border-bottom: 1px solid; border-right: 1px solid; }
        .bulk-page, .bulk-page * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; }
          body * { visibility: hidden !important; }
          .bulk-root, .bulk-root * { visibility: visible !important; }
          .bulk-print-wrap { padding: 0 !important; background: #fff !important; }
          .bulk-root { position: absolute; left: 0; top: 0; width: 210mm; }
          .bulk-page { margin: 0 !important; box-shadow: none !important; break-after: page; page-break-after: always; }
          .bulk-page:last-child { break-after: auto; page-break-after: auto; }
          .card-cut { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
