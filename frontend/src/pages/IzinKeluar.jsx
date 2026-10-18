import { PageHeader, StatStrip } from "@/components/zx/ui";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { DoorOpen, Send, Check, X, Undo2, Clock, ShieldCheck, Ban } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const STATUS = {
  pending: { l: "Menunggu Piket", c: "bg-amber-100 text-amber-700" },
  approved: { l: "Diizinkan Keluar", c: "bg-emerald-100 text-emerald-700" },
  rejected: { l: "Ditolak", c: "bg-rose-100 text-rose-700" },
  returned: { l: "Sudah Kembali", c: "bg-slate-200 text-slate-700" },
  batal: { l: "Dibatalkan", c: "bg-slate-100 text-slate-500" },
};
const CATS = ["Sakit", "Keperluan Keluarga", "Urusan Penting", "Kegiatan Sekolah", "Lainnya"];
const inp = "mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-sm";
const nowHM = () => new Date().toTimeString().slice(0, 5);

function RequestForm({ students, onDone }) {
  const [f, setF] = useState({ student_id: "", category: "Sakit", reason: "", out_time: nowHM(), return_time: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/ik", { ...f, return_time: f.return_time || null }); toast.success("Request IK dikirim ke piket gerbang"); setF({ ...f, student_id: "", reason: "" }); onDone(); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal mengirim"); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4" data-testid="ik-form">
      <p className="font-heading font-bold text-lg flex items-center gap-2"><Send className="w-5 h-5 text-indigo-600" />Buat Request IK</p>
      <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Siswa (kelas perwalian Anda)</label>
        <select data-testid="ik-student" required value={f.student_id} onChange={e => setF({ ...f, student_id: e.target.value })} className={inp}>
          <option value="">— Pilih siswa —</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name} · {s.kelas}</option>)}
        </select></div>
      <div className="flex flex-wrap gap-1.5">{CATS.map(c => <button type="button" key={c} data-testid={`ik-cat-${c}`} onClick={() => setF({ ...f, category: c })} className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors ${f.category === c ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-600"}`}>{c}</button>)}</div>
      <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alasan</label>
        <textarea data-testid="ik-reason" required minLength={3} rows={3} value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="Jelaskan alasan siswa keluar..." className={inp} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Jam Keluar</label><input data-testid="ik-out" type="time" required value={f.out_time} onChange={e => setF({ ...f, out_time: e.target.value })} className={inp} /></div>
        <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Perkiraan Kembali</label><input data-testid="ik-return" type="time" value={f.return_time} onChange={e => setF({ ...f, return_time: e.target.value })} className={inp} /></div>
      </div>
      <button data-testid="ik-submit" disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-60">{busy ? "Mengirim…" : "Kirim ke Piket Gerbang"}</button>
    </form>
  );
}

function IkCard({ r, me, isGate, onAct }) {
  const st = STATUS[r.status];
  return (
    <div data-testid={`ik-${r.id}`} className={`bg-white border rounded-2xl p-4 ${r.status === "pending" && isGate ? "border-amber-300 shadow-md shadow-amber-100" : "border-slate-200"}`}>
      <div className="flex items-start gap-3">
        <span className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 overflow-hidden flex items-center justify-center font-bold shrink-0">{r.student_photo ? <img src={r.student_photo} alt="" className="w-full h-full object-cover" /> : r.student_name[0]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap"><p className="font-heading font-bold text-slate-900">{r.student_name}</p><span className="text-xs text-slate-500">{r.kelas}</span><span data-testid={`ik-status-${r.id}`} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.c}`}>{st.l}</span></div>
          <p className="text-sm text-slate-700 mt-1"><b className="text-indigo-700">{r.category}</b> · {r.reason}</p>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.date} · keluar {r.out_time}{r.return_time ? ` · kembali ±${r.return_time}` : ""} · wali kelas {r.teacher_name}</p>
          {(r.approved_by || r.rejected_by) && <p className="text-xs text-slate-500 mt-0.5">Diproses {r.approved_by || r.rejected_by}{r.gate_note ? ` — "${r.gate_note}"` : ""}{r.returned_by ? ` · kembali dicatat ${r.returned_by}` : ""}</p>}
        </div>
      </div>
      {isGate && r.status === "pending" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button data-testid={`ik-reject-${r.id}`} onClick={() => onAct(r, "reject")} className="py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-rose-50"><X className="w-4 h-4" />Tolak</button>
          <button data-testid={`ik-approve-${r.id}`} onClick={() => onAct(r, "approve")} className="py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-700"><Check className="w-4 h-4" />Izinkan Keluar</button>
        </div>
      )}
      {isGate && r.status === "approved" && <button data-testid={`ik-returned-${r.id}`} onClick={() => onAct(r, "returned")} className="mt-3 w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-1.5"><Undo2 className="w-4 h-4" />Tandai Sudah Kembali</button>}
      {r.teacher_id === me && r.status === "pending" && <button data-testid={`ik-cancel-${r.id}`} onClick={() => onAct(r, "cancel")} className="mt-3 text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1"><Ban className="w-3.5 h-3.5" />Batalkan request</button>}
    </div>
  );
}

export default function IzinKeluar() {
  const { user } = useAuth();
  const [ctx, setCtx] = useState(null);
  const [list, setList] = useState([]);
  const load = useCallback(() => {
    api.get("/ik/context").then(r => setCtx(r.data)).catch(() => setCtx({}));
    api.get("/ik").then(r => setList(r.data)).catch(() => {});
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  const act = async (r, a) => {
    let note = null;
    if (a === "reject") { note = window.prompt("Alasan penolakan (opsional):") ?? undefined; if (note === undefined) return; }
    try { await api.post(`/ik/${r.id}/${a}`, note ? { note } : {}); toast.success("Berhasil"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const isGate = !!ctx?.is_gate;
  const pending = list.filter(r => r.status === "pending");
  const out = list.filter(r => r.status === "approved");
  return (
    <div className="space-y-6" data-testid="ik-page">
      <PageHeader title="Izin Keluar" subtitle="Siswa menemui wali kelas → wali kelas mengirim permintaan → piket gerbang mengizinkan atau menolak."
        actions={<div className="flex flex-wrap gap-2 text-[12px] font-medium">
          {ctx?.is_homeroom && <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">Wali kelas: {ctx.classes.map(c => c.name).join(", ")}</span>}
          {isGate && <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Petugas piket gerbang</span>}
        </div>}/>
      <StatStrip items={[
        { label: "Menunggu persetujuan", value: pending.length, hint: "Perlu ditinjau piket" },
        { label: "Sedang di luar", value: out.length, hint: "Izin disetujui" },
        { label: "Total permintaan", value: list.length, hint: "Pada daftar saat ini" },
      ]}/>
      <div className={`grid gap-6 ${ctx?.is_homeroom ? "lg:grid-cols-[380px_1fr]" : ""}`}>
        {ctx?.is_homeroom && <div><RequestForm students={ctx.students} onDone={load} /></div>}
        <div className="space-y-3" data-testid="ik-list">
          {user?.role === "guru" && !ctx?.is_homeroom && !isGate && <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl p-4">Request IK hanya dapat dibuat oleh wali kelas siswa.</p>}
          {list.length === 0 && <p data-testid="ik-empty" className="text-center text-slate-400 py-14">Belum ada request izin keluar.</p>}
          {list.map(r => <IkCard key={r.id} r={r} me={user?.id} isGate={isGate} onAct={act} />)}
        </div>
      </div>
    </div>
  );
}
