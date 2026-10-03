import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { GraduationCap, Shield } from "lucide-react";

const DEFAULT_RULES = [
  "Kartu ini wajib dibawa selama berada di lingkungan sekolah.",
  "Digunakan untuk presensi QR & peminjaman inventaris.",
  "Apabila hilang/rusak, segera lapor ke Tata Usaha.",
];

function NisnBarcode({ value, height = 26, barWidth = 1.3, lineColor = "#0f172a", background = "#ffffff" }) {
  if (!value) return null;
  return (
    <Barcode value={String(value)} format="CODE128" displayValue={false}
      width={barWidth} height={height} margin={2} background={background} lineColor={lineColor} />
  );
}

export function IdCardFront({ student, schoolName, validUntil, logoUrl }) {
  return (
    <div className="ktp-card bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 text-white p-4 relative">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_100%_0%,white,transparent_50%)]"/>
      <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-sky-400/20 blur-2xl"/>
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-md bg-white/20 backdrop-blur flex items-center justify-center border border-white/30 overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain"/> : <GraduationCap className="w-4 h-4"/>}
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-wider leading-tight">{schoolName}</p>
            <p className="text-[7px] tracking-widest text-sky-200 font-mono-alt">KARTU TANDA PELAJAR</p>
          </div>
        </div>
        <p className="text-[7px] font-mono-alt text-sky-200/80">ID: {(student.id||"").slice(0,8).toUpperCase()}</p>
      </div>

      <div className="relative mt-2 flex gap-3">
        <div className="w-[64px] h-[82px] rounded-md bg-white/10 border-2 border-white/40 overflow-hidden flex items-center justify-center shrink-0">
          {student.photo ? (
            <img src={student.photo} alt="" className="w-full h-full object-cover"/>
          ) : (
            <span className="text-3xl font-black text-white/60 font-heading">{student.name?.[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-[8px] uppercase tracking-widest text-sky-200/80">Nama Lengkap</p>
          <p className="font-heading text-[11px] font-extrabold leading-[1.3] break-words pb-[1px]">{student.name}</p>
          <div className="grid grid-cols-2 gap-x-2 mt-1">
            <div>
              <p className="text-[7px] uppercase tracking-widest text-sky-200/80">NISN</p>
              <p className="text-[9px] font-semibold font-mono-alt">{student.nisn || "—"}</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-widest text-sky-200/80">Kelas</p>
              <p className="text-[9px] font-semibold">{student.kelas || "—"}</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-widest text-sky-200/80">Jurusan</p>
              <p className="text-[9px] font-semibold">{student.jurusan || "Umum"}</p>
            </div>
            <div>
              <p className="text-[7px] uppercase tracking-widest text-sky-200/80">Berlaku</p>
              <p className="text-[9px] font-semibold font-mono-alt">{validUntil}</p>
            </div>
          </div>
        </div>
        <div className="w-[72px] h-[72px] rounded-md bg-white p-1 shrink-0 self-start shadow-md">
          <QRCodeSVG value={student.qr_code || student.id || "KARTU"} size={64} level="H" className="w-full h-full"/>
        </div>
      </div>

      {/* Footer: wide NISN barcode spanning the bottom, VERIFIED tag on the left */}
      <div className="relative mt-2 flex items-center gap-2 border-t border-white/10 pt-1.5">
        <span className="flex items-center gap-1 text-[7px] text-sky-200/80 font-mono-alt shrink-0 leading-tight">
          <Shield className="w-2.5 h-2.5"/>VERIFIED
        </span>
        <div className="flex-1 bg-white rounded px-1.5 py-1 flex items-center justify-center overflow-hidden" data-testid="id-card-barcode">
          {student.nisn
            ? <NisnBarcode value={student.nisn} height={34} barWidth={2.1}/>
            : <span className="text-[7px] text-slate-400 px-2">NISN belum diisi</span>}
        </div>
      </div>
    </div>
  );
}

export function IdCardBack({ student, schoolName, logoUrl, rules }) {
  const list = (rules && rules.length ? rules : DEFAULT_RULES).filter(Boolean);
  return (
    <div className="ktp-card bg-white text-slate-800 p-4 relative border border-slate-200" data-testid="id-card-back">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 via-sky-600 to-slate-900"/>
      <div className="flex items-center gap-1.5 mt-1">
        <div className="w-6 h-6 rounded-md bg-sky-100 flex items-center justify-center overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain"/> : <GraduationCap className="w-3.5 h-3.5 text-sky-600"/>}
        </div>
        <div>
          <p className="text-[8px] font-bold tracking-wide text-slate-900 leading-tight">{schoolName}</p>
          <p className="text-[7px] tracking-widest text-sky-600 font-mono-alt">TATA TERTIB PEMEGANG KARTU</p>
        </div>
      </div>

      <ol className="mt-2 space-y-1 list-decimal list-inside">
        {list.slice(0, 4).map((r, i) => (
          <li key={i} className="text-[7.5px] leading-snug text-slate-600">{r}</li>
        ))}
      </ol>

      <div className="absolute left-4 right-4 bottom-3">
        <div className="bg-white flex items-center justify-center rounded border border-slate-200 py-0.5">
          {student.nisn
            ? <NisnBarcode value={student.nisn} height={24} lineColor="#0f172a"/>
            : <span className="text-[7px] text-slate-400 py-1">NISN belum diisi</span>}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[6.5px] text-slate-400 font-mono-alt">NISN: {student.nisn || "—"}</p>
          <p className="text-[6.5px] text-slate-400 font-mono-alt">© {new Date().getFullYear()} {schoolName.split(' ').slice(0,3).join(' ')}</p>
        </div>
      </div>
    </div>
  );
}

export default function StudentIdCard({ student, school, validYears, logoUrl, rules, side = "front" }) {
  const validUntil = validYears || "2025 - 2028";
  const schoolName = school || "SMA NEGERI 1 LAGUBOTI";
  return (
    <div className="printable-id-card inline-block">
      {side === "back"
        ? <IdCardBack student={student} schoolName={schoolName} logoUrl={logoUrl} rules={rules}/>
        : <IdCardFront student={student} schoolName={schoolName} validUntil={validUntil} logoUrl={logoUrl}/>}
    </div>
  );
}
