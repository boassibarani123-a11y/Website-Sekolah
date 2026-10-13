import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Boxes, MapPin, Pencil, Trash2, QrCode, History, Activity, Info } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import api from "@/lib/apiClient";
import { CondBadge, ROLE_LABEL, loanLabel, qrValue } from "./invUi";
import { ActivityList } from "./ActivityView";

function Detail({ item }) {
  const rows = [["Kode", item.code || "—"], ["Kategori peminjaman", item.unit || "Umum"], ["Kategori", item.category || "—"], ["Ruangan", item.location || "—"], ["Batas menipis", item.min_stock ?? 0],
    ["Unit rusak (riwayat)", item.damaged_units || 0], ["Unit hilang (riwayat)", item.lost_units || 0]];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-50 py-3"><p className="text-[10px] uppercase font-semibold text-emerald-600">Tersedia</p><p className="font-heading text-2xl font-extrabold text-emerald-700">{item.stock}</p></div>
        <div className="rounded-2xl bg-violet-50 py-3"><p className="text-[10px] uppercase font-semibold text-violet-600">Dipinjam</p><p className="font-heading text-2xl font-extrabold text-violet-700">{item.outstanding ?? 0}</p></div>
        <div className="rounded-2xl bg-slate-100 py-3"><p className="text-[10px] uppercase font-semibold text-slate-500">Total</p><p className="font-heading text-2xl font-extrabold">{item.total ?? item.stock}</p></div>
      </div>
      <dl className="divide-y divide-slate-100 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>)}</dl>
      {item.description && <p className="text-sm text-slate-600 bg-slate-50 rounded-2xl p-3">{item.description}</p>}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200" data-testid="inv-drawer-qr">
        <div className="p-2 bg-white rounded-xl ring-1 ring-slate-200"><QRCodeSVG value={qrValue(item)} size={96} level="M" /></div>
        <div className="text-sm"><p className="font-semibold text-slate-900 flex items-center gap-1.5"><QrCode className="w-4 h-4 text-sky-600" />Label QR barang</p>
          <p className="text-slate-500 mt-1">Pindai label ini dengan tombol "Pindai QR" untuk membuka detail barang secara langsung.</p></div>
      </div>
    </div>
  );
}

function Loans({ item }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get(`/inventory/${item.id}/history`).then(r => setRows(r.data)).catch(() => setRows([])); }, [item.id]);
  if (rows === null) return <p className="text-slate-400 italic text-sm">Memuat…</p>;
  if (!rows.length) return <p className="text-slate-400 italic text-sm">Belum ada riwayat peminjaman.</p>;
  return (
    <div className="space-y-2" data-testid="inventory-history-list">
      {rows.map(r => { const l = loanLabel(r); return (
        <div key={r.id} className="border border-slate-200 rounded-2xl p-3 text-sm">
          <div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-900">{r.requester_name} <span className="text-slate-400 font-normal">× {r.quantity}</span></span>
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${l.cls}`}>{l.label}</span></div>
          <p className="text-[11px] text-slate-500 mt-1">{ROLE_LABEL[r.requester_role] || r.requester_role || "—"}{r.requester_kelas ? ` · Kelas ${r.requester_kelas}` : ""}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{r.purpose} · Diajukan {(r.created_at || "").slice(0, 10)} · Kembali {r.return_date}{r.return_condition ? ` · Kondisi kembali: ${r.return_condition}` : ""}</p>
        </div>); })}
    </div>
  );
}

function Logs({ item }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get(`/inventory-activity?item_id=${item.id}`).then(r => setRows(r.data)).catch(() => setRows([])); }, [item.id]);
  return rows === null ? <p className="text-slate-400 italic text-sm">Memuat…</p> : <ActivityList rows={rows} compact />;
}

export function ItemDrawer({ item, isStaff, onClose, onEdit, onDelete, onBorrow }) {
  const [tab, setTab] = useState("detail");
  const tabs = [["detail", "Detail", Info], ...(isStaff ? [["loans", "Peminjaman", History], ["logs", "Aktivitas", Activity]] : [])];
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0" data-testid="inv-drawer">
        {item && (<>
          <div className="relative h-44 bg-gradient-to-br from-sky-100 via-sky-50 to-white flex items-center justify-center overflow-hidden">
            {item.image ? <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Boxes className="w-16 h-16 text-sky-400" />}
          </div>
          <div className="p-6">
            <SheetHeader className="text-left space-y-1">
              <div className="flex gap-1.5"><CondBadge c={item.condition} testid="inv-drawer-condition" /></div>
              <SheetTitle className="font-heading text-2xl font-extrabold" data-testid="inv-drawer-title">{item.name}</SheetTitle>
              <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.location || "Tanpa lokasi"}</p>
            </SheetHeader>
            <div className="mt-4 flex gap-2">
              <button data-testid="inv-drawer-borrow" onClick={() => onBorrow(item)} disabled={item.stock <= 0 || item.condition === "Hilang"} className="flex-1 py-2.5 bg-slate-900 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-30">Ajukan Pinjam</button>
              {isStaff && <>
                <button data-testid={`inventory-edit-${item.id}`} onClick={() => onEdit(item)} className="px-3 border border-slate-200 rounded-xl text-slate-600 hover:border-sky-400 hover:text-sky-600"><Pencil className="w-4 h-4" /></button>
                <button data-testid={`inventory-delete-${item.id}`} onClick={() => onDelete(item)} className="px-3 border border-slate-200 rounded-xl text-rose-500 hover:border-rose-400 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
              </>}
            </div>
            {tabs.length > 1 && (
              <div className="mt-5 flex gap-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map(([k, l, I]) => <button key={k} data-testid={`inv-drawer-tab-${k}`} onClick={() => setTab(k)} className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${tab === k ? "bg-white shadow-sm text-sky-700" : "text-slate-500"}`}><I className="w-3.5 h-3.5" />{l}</button>)}
              </div>
            )}
            <div className="mt-5">
              {tab === "detail" && <Detail item={item} />}
              {tab === "loans" && <Loans item={item} />}
              {tab === "logs" && <Logs item={item} />}
            </div>
          </div>
        </>)}
      </SheetContent>
    </Sheet>
  );
}
