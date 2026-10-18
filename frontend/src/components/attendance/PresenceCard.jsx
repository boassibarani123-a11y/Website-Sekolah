import { CheckCircle2, AlertTriangle, XCircle, GraduationCap, ScanFace, ScanBarcode, BadgeCheck, LogOut, ShieldAlert } from "lucide-react";

const fmt = (iso) => (iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "");

const TONE = {
  ok: { wrap: "bg-emerald-50 border-emerald-200", ring: "ring-emerald-400", pill: "bg-emerald-500 text-white", bar: "bg-emerald-400", Icon: CheckCircle2, title: "Selamat datang!" },
  dup: { wrap: "bg-amber-50 border-amber-200", ring: "ring-amber-400", pill: "bg-amber-400 text-amber-950", bar: "bg-amber-400", Icon: AlertTriangle, title: "Sudah absen hari ini" },
  out: { wrap: "bg-sky-50 border-sky-200", ring: "ring-sky-400", pill: "bg-sky-600 text-white", bar: "bg-sky-400", Icon: LogOut, title: "Sampai jumpa!" },
  alert: { wrap: "bg-rose-100 border-rose-500 animate-pulse", ring: "ring-rose-600", pill: "bg-rose-600 text-white", bar: "bg-rose-600", Icon: ShieldAlert, title: "Keluar tanpa izin!" },
  err: { wrap: "bg-rose-50 border-rose-200", ring: "ring-rose-400", pill: "bg-rose-500 text-white", bar: "bg-rose-400", Icon: XCircle, title: "Belum berhasil" },
};

function Avatar({ student, tone }) {
  return (
    <div className={`relative w-40 h-40 sm:w-44 sm:h-44 rounded-[2.25rem] overflow-hidden bg-white ring-[6px] ${tone.ring} shadow-xl flex items-center justify-center`}>
      {student?.photo
        ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
        : student ? <span className="font-heading text-6xl font-extrabold text-slate-700">{(student.name || "?")[0].toUpperCase()}</span>
          : <tone.Icon className="w-20 h-20 text-rose-400" />}
    </div>
  );
}

export function PresenceIdle({ mode = "face" }) {
  const Icon = mode === "face" ? ScanFace : ScanBarcode;
  return (
    <div data-testid="gate-idle" className="h-full min-h-[360px] rounded-[2rem] border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-[1.75rem] bg-sky-50 text-sky-500 flex items-center justify-center animate-[presenceFloat_3s_ease-in-out_infinite]"><Icon className="w-12 h-12" /></div>
      <p className="mt-6 font-heading text-3xl font-extrabold text-slate-900">{mode === "face" ? "Halo! Lihat ke kamera" : "Silakan scan kartu pelajar"}</p>
      <p className="mt-2 text-slate-500 max-w-xs">{mode === "face" ? "Wajah siswa & guru dikenali otomatis dalam sekejap." : "Arahkan barcode NISN ke alat scanner. Hasilnya muncul di sini."}</p>
    </div>
  );
}

export function PresenceCard({ r, mode = "face" }) {
  if (!r) return <PresenceIdle mode={mode} />;
  const g = r.gate;
  const tk = r.kind === "ok" && g?.direction === "keluar" ? "out" : r.kind;
  const t = TONE[tk] || TONE.ok;
  const dirLabel = g ? (g.direction === "keluar" ? "Keluar" : "Masuk") : "Hadir";
  const s = r.student;
  const isGuru = r.guru || s?.kelas === "Guru";
  return (
    <div key={r.key || r.at} data-testid="gate-result" data-kind={r.kind}
      className={`relative h-full min-h-[360px] rounded-[2rem] border-2 ${t.wrap} p-8 flex flex-col items-center justify-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300`}>
      <Avatar student={s} tone={t} />
      <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5"><t.Icon className="w-4 h-4" />{t.title}</p>
      {s ? (
        <>
          <p data-testid="gate-result-name" className="mt-1 font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{s.name}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-slate-600 font-medium">
            {isGuru ? <><GraduationCap className="w-4 h-4" />Guru{s.nip ? ` · NIP ${s.nip}` : ""}</> : <>Kelas {s.kelas || "-"}{s.nisn ? ` · NISN ${s.nisn}` : ""}</>}
          </p>
          <p data-testid="gate-result-label" data-direction={g?.direction || "hadir"} className={`mt-5 px-6 py-2.5 rounded-full text-lg font-bold shadow-sm ${t.pill}`}>
            {r.kind === "dup" ? `Sudah tercatat ${g ? dirLabel.toLowerCase() + " " : ""}pukul ${fmt(r.at)}` : `${dirLabel} · ${g?.time || fmt(r.at)}`}
          </p>
          {g && !g.repeat && (g.late || g.note) && (
            <p data-testid="gate-result-note" className={`mt-2 text-sm font-semibold ${g.unauthorized ? "text-rose-700" : g.late ? "text-orange-600" : "text-slate-600"}`}>
              {g.late ? "Terlambat masuk. " : ""}{g.note || ""}{g.izin_reason ? ` · ${g.izin_reason}` : ""}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            {mode === "face" ? <ScanFace className="w-3.5 h-3.5" /> : <ScanBarcode className="w-3.5 h-3.5" />}
            {mode === "face" ? `Face ID · kecocokan ${r.code}` : "Barcode kartu pelajar"}
            {r.confirmed && <span className="inline-flex items-center gap-1 text-sky-600 font-semibold"><BadgeCheck className="w-3.5 h-3.5" />terverifikasi digit</span>}
          </p>
        </>
      ) : (
        <p data-testid="gate-result-error" className="mt-2 font-heading text-2xl font-bold text-slate-900 max-w-sm">{r.message}{r.code && mode !== "face" ? <span className="block mt-1 text-sm font-mono text-slate-500">{r.code}</span> : null}</p>
      )}
      <span className={`absolute bottom-0 left-0 h-1.5 ${t.bar} animate-[presenceTimer_3.8s_linear_forwards]`} />
    </div>
  );
}
