import { QRCodeSVG } from "qrcode.react";
import { GraduationCap, Shield } from "lucide-react";

export default function StudentIdCard({ student, school, validYears, logoUrl }) {
  const validUntil = validYears || "2025 - 2028";
  const schoolName = school || "SMA NEGERI 1 SEKOLAHKU";
  return (
    <div className="printable-id-card inline-block">
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
          <div className="w-[70px] h-[90px] rounded-md bg-white/10 border-2 border-white/40 overflow-hidden flex items-center justify-center shrink-0">
            {student.photo ? (
              <img src={student.photo} alt="" className="w-full h-full object-cover"/>
            ) : (
              <span className="text-3xl font-black text-white/60 font-heading">{student.name?.[0]}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-[8px] uppercase tracking-widest text-sky-200/80">Nama Lengkap</p>
            <p className="font-heading text-[13px] font-extrabold leading-tight truncate">{student.name}</p>
            <div className="grid grid-cols-2 gap-x-2 mt-1.5">
              <div>
                <p className="text-[7px] uppercase tracking-widest text-sky-200/80">NISN</p>
                <p className="text-[10px] font-semibold font-mono-alt">{student.nisn || "—"}</p>
              </div>
              <div>
                <p className="text-[7px] uppercase tracking-widest text-sky-200/80">Kelas</p>
                <p className="text-[10px] font-semibold">{student.kelas || "—"}</p>
              </div>
              <div>
                <p className="text-[7px] uppercase tracking-widest text-sky-200/80">Jurusan</p>
                <p className="text-[10px] font-semibold">{student.jurusan || "Umum"}</p>
              </div>
              <div>
                <p className="text-[7px] uppercase tracking-widest text-sky-200/80">Berlaku</p>
                <p className="text-[10px] font-semibold font-mono-alt">{validUntil}</p>
              </div>
            </div>
          </div>
          <div className="w-[62px] h-[62px] rounded-md bg-white p-1 shrink-0 self-end">
            <QRCodeSVG value={student.qr_code || student.id || "SEKOLAHKU"} size={54} level="H"/>
          </div>
        </div>

        <div className="relative mt-2 flex items-center justify-between text-[7px] text-sky-200/80 font-mono-alt border-t border-white/10 pt-1">
          <span className="flex items-center gap-1"><Shield className="w-2.5 h-2.5"/>{schoolName.split(' ').slice(0,2).join(' ')} · VERIFIED</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
