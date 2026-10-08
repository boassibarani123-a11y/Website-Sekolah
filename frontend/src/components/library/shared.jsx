import { Star, BookOpen } from "lucide-react";

export const formatRp = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const CAT_GRADIENTS = {
  Novel: "from-rose-500 via-rose-600 to-pink-700",
  Pelajaran: "from-sky-500 via-sky-600 to-indigo-700",
  Sejarah: "from-amber-500 via-orange-600 to-red-700",
  Sains: "from-emerald-500 via-teal-600 to-cyan-700",
  "Pengembangan Diri": "from-violet-500 via-purple-600 to-fuchsia-700",
  Umum: "from-slate-600 via-slate-700 to-slate-900",
};
export const catGradient = (cat) => CAT_GRADIENTS[cat] || "from-indigo-500 via-violet-600 to-slate-800";

export const CAT_BADGE = {
  Novel: "bg-rose-100 text-rose-700 border-rose-200",
  Pelajaran: "bg-sky-100 text-sky-700 border-sky-200",
  Sejarah: "bg-amber-100 text-amber-800 border-amber-200",
  Sains: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Pengembangan Diri": "bg-violet-100 text-violet-700 border-violet-200",
  Umum: "bg-slate-100 text-slate-700 border-slate-200",
};
export const catBadge = (cat) => CAT_BADGE[cat] || "bg-indigo-100 text-indigo-700 border-indigo-200";

export function BookCover({ book, className = "" }) {
  if (book.cover_url) {
    return <img src={book.cover_url} alt={book.title} className={`object-cover ${className}`} />;
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${catGradient(book.category)} ${className}`}>
      <div className="absolute left-0 top-0 h-full w-[6px] bg-black/25" />
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "repeating-linear-gradient(135deg,#fff 0 2px,transparent 2px 10px)" }} />
      <div className="relative h-full w-full flex flex-col justify-between p-3 text-white">
        <BookOpen className="w-5 h-5 opacity-80" />
        <div>
          <p className="font-heading font-bold leading-tight line-clamp-4 drop-shadow-sm text-[13px]">{book.title}</p>
          <p className="text-[10px] opacity-80 mt-1 line-clamp-1">{book.author || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function Stars({ value = 0, size = 14, onPick }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          onClick={onPick ? () => onPick(n) : undefined}
          style={{ width: size, height: size }}
          className={`${onPick ? "cursor-pointer hover:scale-110 transition-transform" : ""} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </div>
  );
}

export function LoanStatusBadge({ loan }) {
  if (loan.status === "dikembalikan")
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Dikembalikan</span>;
  if (loan.overdue)
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">Terlambat {loan.days_late} hari</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Dipinjam</span>;
}
