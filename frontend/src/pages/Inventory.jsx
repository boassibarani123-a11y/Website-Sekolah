import { PageHeader, StatStrip } from "@/components/zx/ui";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, ScanLine, FileSpreadsheet, LayoutDashboard, Boxes, HandHelping, DoorOpen, Activity } from "lucide-react";
import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";
import { ItemsView } from "@/components/inventory/ItemsView";
import { ItemDrawer } from "@/components/inventory/ItemDrawer";
import { LoansView } from "@/components/inventory/LoansView";
import { RoomsView } from "@/components/inventory/RoomsView";
import { ActivityView } from "@/components/inventory/ActivityView";
import { QrLabelsModal, QrScanModal } from "@/components/inventory/QrTools";
import { ItemModal, BorrowModal } from "@/components/inventory/ItemForms";

export default function Inventory() {
  const { user } = useAuth();
  const isStaff = ["staff_tu", "super_admin"].includes(user.role);
  const [items, setItems] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState(isStaff ? "dashboard" : "items");
  const [roomPick, setRoomPick] = useState("all");
  const [open, setOpen] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [borrowFor, setBorrowFor] = useState(null);
  const [labels, setLabels] = useState(null);
  const [scan, setScan] = useState(false);
  const [dashKey, setDashKey] = useState(0);

  const load = useCallback(() => {
    api.get("/inventory").then(r => { setItems(r.data); setOpen(o => o && (r.data.find(i => i.id === o.id) || null)); });
    api.get(`/borrow${isStaff ? "" : "?mine=true"}`).then(r => setReqs(r.data));
    api.get("/inventory-rooms").then(r => setRooms(r.data)).catch(() => {});
    setDashKey(k => k + 1);
  }, [isStaff]);
  useEffect(() => { load(); }, [load]);

  const removeItem = async (i) => {
    if (!window.confirm(`Hapus barang "${i.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try { await api.delete(`/inventory/${i.id}`); toast.success("Barang dihapus"); setOpen(null); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  const exportXlsx = async () => {
    const r = await api.get("/inventory/export", { responseType: "blob" });
    const u = URL.createObjectURL(r.data); const a = document.createElement("a"); a.href = u; a.download = "Inventaris.xlsx"; a.click();
  };
  const pending = reqs.filter(r => r.status === "Menunggu Approval").length;
  const tabs = [
    ...(isStaff ? [["dashboard", "Dasbor", LayoutDashboard]] : []),
    ["items", "Daftar Barang", Boxes],
    ["requests", isStaff ? "Peminjaman" : "Peminjaman Saya", HandHelping, isStaff ? pending : 0],
    ["rooms", "Ruangan", DoorOpen],
    ...(isStaff ? [["activity", "Riwayat", Activity]] : []),
  ];
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();
  const btn = "px-4 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-colors text-sm";

  return (
    <div className="space-y-6" data-testid="inventory-page">
      <PageHeader title="Inventaris" subtitle="Lacak setiap barang per ruangan, pantau kondisinya, kelola peminjaman, dan cetak label QR."
        actions={<>
          <button data-testid="inv-scan-qr-button" onClick={() => setScan(true)} className="zx-btn-ghost"><ScanLine className="w-4 h-4" />Pindai QR</button>
          {isStaff && <button data-testid="inventory-export" onClick={exportXlsx} className="zx-btn-ghost"><FileSpreadsheet className="w-4 h-4" />Ekspor Excel</button>}
          {isStaff && <button data-testid="inv-add-button" onClick={() => setEditItem({})} className="zx-btn-primary"><Plus className="w-4 h-4" />Tambah barang</button>}
        </>}/>
      <StatStrip items={[
        { label: "Total barang", value: items.length, hint: "Tercatat di seluruh ruangan", testid: "hero-items-count" },
        { label: "Ruangan", value: rooms.length, hint: "Lokasi penyimpanan" },
        ...(isStaff ? [{ label: "Menunggu persetujuan", value: pending, hint: "Permintaan peminjaman" }] : []),
      ]}/>

      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 overflow-x-auto" data-testid="inv-tabs">
        {tabs.map(([k, l, I, n]) => (
          <button key={k} data-testid={`inv-tab-${k}`} onClick={() => { setTab(k); if (k === "items") setRoomPick("all"); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${tab === k ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>
            <I className="w-4 h-4" />{l}{n > 0 && <span className="px-1.5 min-w-[1.25rem] rounded-full bg-rose-500 text-white text-[10px]">{n}</span>}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
        {tab === "dashboard" && <InventoryDashboard key={dashKey} onOpenLoans={() => setTab("requests")} />}
        {tab === "items" && <ItemsView key={roomPick} initialRoom={roomPick} items={items} rooms={rooms} isStaff={isStaff} onOpen={setOpen} onBorrow={setBorrowFor} onPrint={setLabels} />}
        {tab === "requests" && <LoansView reqs={reqs} isStaff={isStaff} onChange={load} />}
        {tab === "rooms" && <RoomsView rooms={rooms} isStaff={isStaff} onChange={load} onPickRoom={(n) => { setRoomPick(n); setTab("items"); }} />}
        {tab === "activity" && <ActivityView />}
      </div>

      <ItemDrawer item={open} isStaff={isStaff} onClose={() => setOpen(null)} onEdit={(i) => { setOpen(null); setEditItem(i); }} onDelete={removeItem} onBorrow={(i) => { setOpen(null); setBorrowFor(i); }} />
      {editItem && <ItemModal item={editItem.id ? editItem : null} rooms={rooms} categories={categories} onClose={() => setEditItem(null)} onDone={() => { setEditItem(null); load(); }} />}
      {borrowFor && <BorrowModal item={borrowFor} onClose={() => setBorrowFor(null)} onDone={() => { setBorrowFor(null); load(); }} />}
      {labels && <QrLabelsModal items={labels} onClose={() => setLabels(null)} />}
      {scan && <QrScanModal onClose={() => setScan(false)} onFound={(it) => { setScan(false); setOpen(it); }} />}
    </div>
  );
}
