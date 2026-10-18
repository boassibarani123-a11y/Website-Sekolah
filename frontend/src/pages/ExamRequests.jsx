import { PageHeader } from "@/components/zx/ui";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Send, Plus, Layers, CalendarClock, Pencil, Trash2, Eye, X, Check } from "lucide-react";
import { ExamComposer } from "@/components/vortex/ExamComposer";
import { vgInput } from "@/components/vortex/VortexLogo";

const ST = {
  draft: ["Draf", "bg-slate-100 text-slate-600"], diajukan: ["Menunggu Super Admin", "bg-amber-100 text-amber-800"],
  dibuat: ["Ujian Dibuat", "bg-emerald-100 text-emerald-700"], ditolak: ["Ditolak", "bg-rose-100 text-rose-700"],
};
const fmt = (v) => (v ? new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");

function Review({ r, onClose, onDone }) {
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (approve) => {
    if (approve && token.trim().length < 3) return toast.error("Isi token ujian (min. 3 karakter)");
    if (!approve && note.trim().length < 2) return toast.error("Tulis alasan penolakan");
    setBusy(true);
    try {
      if (approve) { const x = await api.post(`/exam-requests/${r.id}/approve`, { password: token.trim() }); toast.success(`${x.data.created} ujian dibuat sesuai jadwal guru`); }
      else { await api.post(`/exam-requests/${r.id}/reject`, { note }); toast.success("Pengajuan ditolak"); }
      onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="request-review-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b"><h3 className="font-heading font-bold text-lg">{r.exam_type} · {r.title}</h3><button data-testid="review-close" onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-5 overflow-y-auto space-y-3 text-sm">
          <p><b>Guru:</b> {r.teacher_name} · <b>Mapel:</b> {r.subject}</p>
          <p><b>Kelas:</b> {r.class_names.join(", ")}</p>
          <p><b>Jadwal:</b> {fmt(r.start_at)} → {fmt(r.end_at)} · {r.time_limit || 0} menit · KKM {r.kkm}</p>
          {r.note && <p className="p-3 rounded-xl bg-slate-50"><b>Catatan guru:</b> {r.note}</p>}
          <ol className="space-y-2 list-decimal list-inside" data-testid="review-questions">
            {r.questions.map((q, i) => (
              <li key={i} className="p-3 rounded-xl border border-slate-200"><span className="font-semibold">{q.q}</span>
                {q.type === "mc" ? <span className="block text-xs text-slate-500 mt-1">{q.options.map((o, oi) => `${String.fromCharCode(65 + oi)}. ${o}${oi === q.answer ? " ✓" : ""}`).join("   ")}</span> : <span className="block text-xs italic text-slate-500">Esai</span>}
              </li>
            ))}
          </ol>
        </div>
        {r.status === "diajukan" && (
          <div className="p-5 border-t space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <input data-testid="review-token" value={token} onChange={e => setToken(e.target.value)} placeholder="Token ujian, mis. UAS2026" className={`${vgInput} font-mono uppercase`} />
              <button data-testid="review-approve" disabled={busy} onClick={() => act(true)} className="py-2.5 bg-teal-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60"><Check className="w-4 h-4" />Buat Ujian ({r.class_names.length} kelas)</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input data-testid="review-reject-note" value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan penolakan" className={vgInput} />
              <button data-testid="review-reject" disabled={busy} onClick={() => act(false)} className="py-2.5 bg-rose-600 text-white rounded-xl font-semibold disabled:opacity-60">Tolak</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExamRequests() {
  const { user } = useAuth();
  const isAdmin = user.role === "super_admin";
  const [list, setList] = useState([]);
  const [composer, setComposer] = useState(null);
  const [review, setReview] = useState(null);
  const [filter, setFilter] = useState(isAdmin ? "diajukan" : "");
  const load = useCallback(() => api.get(`/exam-requests${filter ? `?status=${filter}` : ""}`).then(r => setList(r.data)).catch(() => {}), [filter]);
  useEffect(() => { load(); }, [load]);
  const del = async (r) => {
    if (!window.confirm(`Hapus pengajuan "${r.title}"?`)) return;
    try { await api.delete(`/exam-requests/${r.id}`); toast.success("Dihapus"); load(); } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const filters = isAdmin ? [["diajukan", "Menunggu"], ["dibuat", "Sudah Dibuat"], ["ditolak", "Ditolak"]] : [["", "Semua"], ["draft", "Draf"], ["diajukan", "Diajukan"], ["dibuat", "Dibuat"], ["ditolak", "Ditolak"]];
  return (
    <div className="space-y-6" data-testid="exam-requests-page">
      <PageHeader title="Pengajuan Ujian" subtitle={isAdmin ? "Tinjau soal & jadwal dari guru, lalu klik Buat ujian. Ujian otomatis dibuka sesuai tanggal & jam dari guru." : "Siapkan soal, tentukan tanggal & jam ujian, lalu kirim ke Super Admin untuk dibuatkan ujiannya."}
        actions={<>
          {isAdmin && <button data-testid="bulk-exam-new" onClick={() => setComposer({ mode: "bulk" })} className="zx-btn-ghost"><Layers className="w-4 h-4" />Ujian massal</button>}
          <button data-testid="request-new" onClick={() => setComposer({ mode: "request" })} className="zx-btn-primary"><Plus className="w-4 h-4" />{isAdmin ? "Pengajuan baru" : "Siapkan ujian"}</button>
        </>}/>
      <div className="flex gap-1.5 flex-wrap">
        {filters.map(([k, l]) => <button key={k || "all"} data-testid={`request-filter-${k || "all"}`} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-full text-[13px] font-medium ${filter === k ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300"}`}>{l}</button>)}
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p data-testid="request-empty" className="text-center text-slate-400 py-14">Belum ada pengajuan.</p>}
        {list.map(r => {
          const [lbl, cls] = ST[r.status] || ST.draft;
          const mine = r.teacher_id === user.id;
          return (
            <div key={r.id} data-testid={`request-row-${r.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">{r.exam_type}</span>
                  <p className="font-heading font-bold">{r.title}</p>
                  <span data-testid={`request-status-${r.id}`} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cls}`}>{lbl}</span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{r.subject} · {r.class_names.join(", ")} · {r.questions.length} soal{isAdmin ? ` · oleh ${r.teacher_name}` : ""}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><CalendarClock className="w-3.5 h-3.5" />{fmt(r.start_at)} → {fmt(r.end_at)}</p>
                {r.reject_note && <p className="text-xs text-rose-600 mt-1">Alasan ditolak: {r.reject_note}</p>}
              </div>
              <div className="flex gap-1.5">
                <button data-testid={`request-view-${r.id}`} onClick={() => setReview(r)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{isAdmin && r.status === "diajukan" ? "Tinjau" : "Lihat"}</button>
                {mine && r.status !== "dibuat" && <button data-testid={`request-edit-${r.id}`} onClick={() => setComposer({ mode: "request", initial: r })} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>}
                {(mine || isAdmin) && r.status !== "dibuat" && <button data-testid={`request-delete-${r.id}`} onClick={() => del(r)} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>
      {composer && <ExamComposer mode={composer.mode} initial={composer.initial} onClose={() => setComposer(null)} onDone={() => { setComposer(null); load(); }} />}
      {review && <Review r={review} onClose={() => setReview(null)} onDone={() => { setReview(null); load(); }} />}
    </div>
  );
}
