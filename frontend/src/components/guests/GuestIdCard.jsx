import { QRCodeSVG } from "qrcode.react";
import { GraduationCap } from "lucide-react";

const fmtDate = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

export function GuestIdCard({ g, schoolName = "SMA NEGERI 1 LAGUBOTI", logoUrl = "/school-logo.png" }) {
  return (
    <div className="guest-card bg-white text-slate-900 relative flex flex-col shadow-xl ring-1 ring-slate-200" data-testid="guest-id-card">
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white px-3 pt-2.5 pb-7">
        <div className="mx-auto w-9 h-1.5 rounded-full bg-white/80 shadow-inner" />
        <div className="mt-2 flex items-center gap-1.5">
          <img src={logoUrl} alt="" className="w-7 h-7 object-contain bg-white rounded-md p-0.5" />
          <div className="leading-tight min-w-0">
            <p className="text-[7.5px] font-extrabold tracking-wide truncate">{schoolName}</p>
            <p className="text-[6px] text-emerald-200 tracking-[0.2em]">KARTU IDENTITAS TAMU</p>
          </div>
        </div>
      </div>
      <div className="-mt-6 mx-auto w-[25mm] h-[30mm] rounded-lg overflow-hidden ring-[3px] ring-white bg-slate-100 shadow-md flex items-center justify-center z-10">
        {g.photo ? <img src={g.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-slate-300">{g.name?.[0]}</span>}
      </div>
      <div className="px-3 pt-1.5 text-center flex-1 flex flex-col">
        <p className="font-heading text-[11px] font-extrabold leading-tight break-words" data-testid="guest-card-name">{g.name}</p>
        {g.position && <p className="text-[7px] text-slate-500">{g.position}</p>}
        <div className="mt-1 flex items-center justify-center gap-1">
          {g.institution_logo && <img src={g.institution_logo} alt="" className="w-3.5 h-3.5 object-contain" />}
          <p className="text-[8px] font-bold text-emerald-700 leading-tight" data-testid="guest-card-institution">{g.institution}</p>
        </div>
        {g.institution_address && <p className="text-[6px] text-slate-400 leading-tight">{g.institution_address}</p>}
        <div className="mt-1.5 grid grid-cols-2 gap-x-1 text-left text-[6.5px] leading-snug">
          <div><p className="text-slate-400 uppercase tracking-wider">Tujuan</p><p className="font-semibold line-clamp-2">{g.purpose}</p></div>
          <div><p className="text-slate-400 uppercase tracking-wider">Bertemu</p><p className="font-semibold truncate">{g.host || "-"}</p></div>
          <div className="col-span-2 mt-0.5"><p className="text-slate-400 uppercase tracking-wider">Tanggal Kunjungan</p><p className="font-semibold">{fmtDate(g.visit_date)}{g.visit_time ? ` · ${g.visit_time} WIB` : ""}</p></div>
        </div>
        <div className="mt-auto mb-1.5 flex items-end justify-between">
          <div className="text-left"><p className="text-[6px] text-slate-400">No. Kartu</p><p className="text-[7px] font-mono font-bold">{g.card_no}</p></div>
          <QRCodeSVG value={`${g.card_no}|${g.id}`} size={34} level="M" />
        </div>
      </div>
      <div className="bg-emerald-600 text-white text-center py-1 text-[9px] font-black tracking-[0.35em] flex items-center justify-center gap-1"><GraduationCap className="w-2.5 h-2.5" />TAMU · VISITOR</div>
    </div>
  );
}
