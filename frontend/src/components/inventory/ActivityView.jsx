import { useEffect, useState } from "react";
import { Plus, Pencil, Minus, Trash2, Ban, Undo2, Wrench, ArrowRightLeft, Activity } from "lucide-react";
import api from "@/lib/apiClient";

const META = {
  tambah: { I: Plus, c: "bg-emerald-100 text-emerald-700", t: "Ditambahkan" },
  ubah: { I: Pencil, c: "bg-sky-100 text-sky-700", t: "Diubah" },
  kondisi: { I: Wrench, c: "bg-amber-100 text-amber-700", t: "Kondisi berubah" },
  hapus: { I: Trash2, c: "bg-rose-100 text-rose-700", t: "Dihapus" },
  pinjam: { I: ArrowRightLeft, c: "bg-violet-100 text-violet-700", t: "Dipinjamkan" },
  kembali: { I: Undo2, c: "bg-slate-200 text-slate-700", t: "Dikembalikan" },
  tolak: { I: Ban, c: "bg-rose-100 text-rose-700", t: "Ditolak" },
};
const fmt = (iso) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function ActivityList({ rows, compact = false }) {
  if (!rows.length) return <p className="text-slate-400 italic text-sm" data-testid="inv-activity-empty">Belum ada aktivitas.</p>;
  return (
    <ol className="relative border-l-2 border-slate-100 ml-4 space-y-4" data-testid="inv-activity-list">
      {rows.map(r => {
        const m = META[r.action] || { I: Minus, c: "bg-slate-100 text-slate-600", t: r.action };
        return (
          <li key={r.id} className="ml-6" data-testid={`inv-log-${r.id}`}>
            <span className={`absolute -left-[15px] w-7 h-7 rounded-full ring-4 ring-white flex items-center justify-center ${m.c}`}><m.I className="w-3.5 h-3.5" /></span>
            <p className="text-sm text-slate-900"><b>{m.t}</b>{!compact && <> · <span className="font-semibold">{r.item_name}</span>{r.item_code ? <span className="text-slate-400"> ({r.item_code})</span> : null}</>}</p>
            <p className="text-xs text-slate-600 mt-0.5">{r.detail}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{r.actor} · {fmt(r.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityView() {
  const [rows, setRows] = useState(null);
  const [f, setF] = useState("semua");
  useEffect(() => { api.get("/inventory-activity?limit=300").then(r => setRows(r.data)).catch(() => setRows([])); }, []);
  const list = (rows || []).filter(r => f === "semua" || r.action === f);
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6" data-testid="inv-activity-view">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <p className="font-heading font-bold text-slate-900 flex items-center gap-2"><Activity className="w-4 h-4 text-sky-600" />Riwayat aktivitas inventaris</p>
        <div className="flex gap-1.5 flex-wrap">
          {["semua", "tambah", "ubah", "kondisi", "pinjam", "kembali", "hapus"].map(k => (
            <button key={k} data-testid={`inv-activity-filter-${k}`} onClick={() => setF(k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${f === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{k}</button>
          ))}
        </div>
      </div>
      {rows === null ? <p className="text-slate-400 italic text-sm">Memuat…</p> : <ActivityList rows={list} />}
    </div>
  );
}
