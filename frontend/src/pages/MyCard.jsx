import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import StudentIdCard from "@/components/StudentIdCard";
import { Printer, IdCard as IdCardIcon, QrCode, FileDown, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadCardJpg, downloadCardPdf, cardFilename } from "@/lib/cardExport";

export default function MyCard() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [busy, setBusy] = useState("");

  const sideNodes = () => [
    frontRef.current?.querySelector(".ktp-card"),
    backRef.current?.querySelector(".ktp-card"),
  ].filter(Boolean);

  const handlePdf = async () => {
    setBusy("pdf");
    try {
      await downloadCardPdf(sideNodes(), cardFilename(user, "pdf"));
      toast.success("Kartu PDF berhasil diunduh");
    } catch (e) {
      toast.error(e.message || "Gagal membuat PDF");
    } finally { setBusy(""); }
  };

  const handleJpg = async () => {
    setBusy("jpg");
    try {
      await downloadCardJpg(sideNodes(), cardFilename(user, "jpg"));
      toast.success("Kartu JPG berhasil diunduh");
    } catch (e) {
      toast.error(e.message || "Gagal membuat JPG");
    } finally { setBusy(""); }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="my-card-page">
      <div className="no-print">
        <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <IdCardIcon className="w-7 h-7 text-sky-600"/>Kartu Pelajar Saya
        </h1>
        <p className="mt-1 text-sm text-slate-500">QR code permanen Anda untuk presensi harian & peminjaman inventaris.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <span className="no-print text-[11px] font-bold uppercase tracking-widest text-slate-400">Tampak Depan</span>
            <div ref={frontRef}>
              <StudentIdCard student={user} school={settings.school_full_name}
                validYears={settings.id_card_valid_years} logoUrl={settings.school_logo_url} side="front"/>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="no-print text-[11px] font-bold uppercase tracking-widest text-slate-400">Tampak Belakang</span>
            <div ref={backRef}>
              <StudentIdCard student={user} school={settings.school_full_name}
                logoUrl={settings.school_logo_url} rules={settings.id_card_rules} side="back"/>
            </div>
          </div>
          <div className="no-print w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button data-testid="print-my-card-button" onClick={()=>window.print()}
              className="py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800">
              <Printer className="w-4 h-4"/>Cetak / PDF
            </button>
            <button data-testid="download-card-pdf-button" onClick={handlePdf} disabled={!!busy}
              className="py-2.5 bg-rose-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-60">
              {busy==="pdf" ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}Unduh PDF
            </button>
            <button data-testid="download-card-jpg-button" onClick={handleJpg} disabled={!!busy}
              className="py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-sky-700 disabled:opacity-60">
              {busy==="jpg" ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImageIcon className="w-4 h-4"/>}Unduh JPG
            </button>
          </div>
          <p className="no-print text-[11px] text-slate-500 text-center">Ukuran kartu 88 × 56 mm. PDF berisi 2 halaman (depan &amp; belakang) siap potong; JPG menggabungkan kedua sisi. Nama panjang otomatis dibungkus agar tidak menimpa QR. Gunakan kertas foto atau PVC untuk hasil terbaik.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 no-print">
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
            <div className="flex items-center gap-2 mb-2"><QrCode className="w-5 h-5 text-sky-600"/><h3 className="font-heading font-bold text-slate-900">Kode QR Permanen Anda</h3></div>
            <p className="text-xs font-mono-alt text-slate-700 break-all bg-white p-2 rounded border border-sky-100">{user.qr_code || "-"}</p>
            <p className="text-[10px] text-slate-500 mt-2">Kode ini dibuat otomatis oleh sistem saat Super Admin mendaftarkan akun Anda dan tidak akan pernah berubah.</p>
          </div>

          <div>
            <h3 className="font-heading font-bold text-slate-900 mb-2">Cara menggunakan Kartu Pelajar:</h3>
            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
              <li>Bawa kartu (fisik atau tunjukkan dari HP) ke pos presensi setiap pagi.</li>
              <li>Petugas TU/guru akan menyorot QR dengan kamera. Absensi tercatat otomatis dengan foto bukti.</li>
              <li>Kartu juga dipakai untuk meminjam alat/perpustakaan lewat menu Inventaris.</li>
              <li>Jika kartu hilang, lapor ke Tata Usaha — QR tetap valid, cukup cetak ulang.</li>
            </ol>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            💡 <b>Tip:</b> Simpan screenshot kartu ini di HP sebagai cadangan darurat.
          </div>
        </div>
      </div>
    </div>
  );
}
