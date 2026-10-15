import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Trash2, Reply, Lightbulb, AlertTriangle, Megaphone, CheckCircle2 } from "lucide-react";

export const FB_CATS = {
  saran: { l: "Saran", icon: Lightbulb, c: "bg-sky-100 text-sky-700", bar: "border-sky-500" },
  kritik: { l: "Kritik", icon: AlertTriangle, c: "bg-amber-100 text-amber-700", bar: "border-amber-500" },
  laporan: { l: "Laporan", icon: Megaphone, c: "bg-rose-100 text-rose-700", bar: "border-rose-500" },
};
export const FB_STATUS = {
  baru: { l: "Baru", c: "bg-slate-900 text-white" },
  diproses: { l: "Diproses", c: "bg-amber-500 text-white" },
  selesai: { l: "Selesai", c: "bg-emerald-600 text-white" },
};

export function StatusPill({ status }) {
  const s = FB_STATUS[status] || FB_STATUS.baru;
  return <span data-testid="feedback-status-pill" className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${s.c}`}>{s.l}</span>;
}

export function FeedbackCard({ item, reviewer, onChanged }) {
  const cat = FB_CATS[item.category] || FB_CATS.saran;
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(item.reply || "");
  const patch = async (body, msg) => {
    try { await api.patch(`/feedback/${item.id}`, body); toast.success(msg); setReplying(false); onChanged(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal memperbarui"); }
  };
  const remove = async () => {
    if (!window.confirm("Hapus masukan ini?")) return;
    try { await api.delete(`/feedback/${item.id}`); toast.success("Masukan dihapus"); onChanged(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  return (
    <div data-testid={`feedback-row-${item.id}`} className={`bg-white border-l-4 ${cat.bar} border-y border-r border-slate-200 rounded-xl p-4 transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cat.c}`}><cat.icon className="w-3 h-3"/>{cat.l}</span>
          <StatusPill status={item.status}/>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
          {reviewer && <>
            <select data-testid={`feedback-status-select-${item.id}`} value={item.status || "baru"} onChange={e => patch({ status: e.target.value }, "Status diperbarui")}
              className="text-xs px-2 py-1 border border-slate-200 rounded-lg bg-white">
              {Object.entries(FB_STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
            <button data-testid={`feedback-reply-toggle-${item.id}`} onClick={() => setReplying(!replying)} className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg"><Reply className="w-4 h-4"/></button>
            <button data-testid={`feedback-delete-${item.id}`} onClick={remove} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
          </>}
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{item.content}</p>
      {reviewer && <p className="mt-1 text-xs text-slate-500">— {item.user_name}</p>}
      {item.reply && !replying && (
        <div data-testid={`feedback-reply-${item.id}`} className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <p className="text-[11px] font-bold uppercase text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Tanggapan {item.replied_by ? `· ${item.replied_by}` : "Sekolah"}</p>
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.reply}</p>
        </div>
      )}
      {replying && (
        <div className="mt-3 space-y-2">
          <textarea data-testid={`feedback-reply-input-${item.id}`} rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Tulis tanggapan untuk pengirim..."
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none"/>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setReplying(false)} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg">Batal</button>
            <button data-testid={`feedback-reply-save-${item.id}`} onClick={() => reply.trim() ? patch({ reply, status: item.status === "baru" ? "diproses" : undefined }, "Tanggapan terkirim") : toast.error("Tanggapan kosong")}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg">Kirim Tanggapan</button>
          </div>
        </div>
      )}
    </div>
  );
}
