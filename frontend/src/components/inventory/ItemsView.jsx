import { useMemo, useState } from "react";
import { Boxes, Search, LayoutGrid, List, AlertTriangle, MapPin, QrCode, CheckSquare, Square } from "lucide-react";
import { CondBadge, CONDITIONS } from "./invUi";

function ItemCard({ i, selected, onSelect, onOpen, onBorrow, selectable }) {
  return (
    <div data-testid={`inventory-item-${i.id}`} className={`group relative bg-white border rounded-3xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-[box-shadow,transform,border-color] duration-200 ${selected ? "border-sky-500 ring-2 ring-sky-500/20" : "border-slate-200"}`}>
      {selectable && (
        <button data-testid={`inv-select-${i.id}`} onClick={() => onSelect(i.id)} className="absolute top-4 left-4 z-10 text-sky-600">{selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />}</button>
      )}
      <button onClick={() => onOpen(i)} className="w-full text-left" data-testid={`inv-open-${i.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600 flex items-center justify-center overflow-hidden shrink-0 ${selectable ? "ml-7" : ""}`}>
            {i.image ? <img src={i.image} alt="" className="w-full h-full object-cover" /> : <Boxes className="w-7 h-7" />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <CondBadge c={i.condition} />
            {i.low_stock && <span data-testid={`low-stock-badge-${i.id}`} className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />Menipis</span>}
          </div>
        </div>
        <h3 className="font-heading font-bold text-slate-900 mt-3 leading-snug">{i.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{i.category}{i.code ? ` · ${i.code}` : ""}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{i.location || "Tanpa lokasi"}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 py-2"><p className="text-[10px] font-semibold uppercase text-emerald-600">Tersedia</p><p data-testid={`stock-available-${i.id}`} className="font-heading font-extrabold text-emerald-700">{i.stock}</p></div>
          <div className="rounded-xl bg-violet-50 py-2"><p className="text-[10px] font-semibold uppercase text-violet-600">Dipinjam</p><p data-testid={`stock-outstanding-${i.id}`} className="font-heading font-extrabold text-violet-700">{i.outstanding ?? 0}</p></div>
          <div className="rounded-xl bg-slate-100 py-2"><p className="text-[10px] font-semibold uppercase text-slate-500">Total</p><p data-testid={`stock-total-${i.id}`} className="font-heading font-extrabold text-slate-800">{i.total ?? i.stock}</p></div>
        </div>
      </button>
      <button data-testid="inventory-borrow-request-button" onClick={() => onBorrow(i)} disabled={i.stock <= 0 || i.condition === "Hilang"}
        className="mt-3 w-full py-2.5 bg-slate-900 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-30 transition-colors">Ajukan Pinjam</button>
    </div>
  );
}

function ItemTable({ list, selected, onSelect, onOpen, selectable }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-x-auto" data-testid="inv-table">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>
          {selectable && <th className="w-10" />}
          <th className="text-left px-4 py-3">Barang</th><th className="text-left px-3 py-3">Kode</th><th className="text-left px-3 py-3">Ruangan</th>
          <th className="text-left px-3 py-3">Kondisi</th><th className="text-right px-3 py-3">Tersedia</th><th className="text-right px-3 py-3">Dipinjam</th><th className="text-right px-4 py-3">Total</th></tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} data-testid={`inv-row-${i.id}`} className={`border-t border-slate-100 hover:bg-sky-50/40 cursor-pointer ${selected.has(i.id) ? "bg-sky-50" : ""}`} onClick={() => onOpen(i)}>
              {selectable && <td className="pl-4" onClick={e => { e.stopPropagation(); onSelect(i.id); }}>{selected.has(i.id) ? <CheckSquare className="w-4 h-4 text-sky-600" /> : <Square className="w-4 h-4 text-slate-300" />}</td>}
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{i.name}</p><p className="text-xs text-slate-500">{i.category}</p></td>
              <td className="px-3 py-3 font-mono text-xs text-slate-600">{i.code || "—"}</td>
              <td className="px-3 py-3 text-slate-600">{i.location || "—"}</td>
              <td className="px-3 py-3"><CondBadge c={i.condition} />{i.low_stock && <AlertTriangle className="inline w-3.5 h-3.5 ml-1.5 text-rose-500" />}</td>
              <td className="px-3 py-3 text-right font-semibold text-emerald-700 tabular-nums">{i.stock}</td>
              <td className="px-3 py-3 text-right text-violet-700 tabular-nums">{i.outstanding ?? 0}</td>
              <td className="px-4 py-3 text-right font-bold tabular-nums">{i.total ?? i.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ItemsView({ items, rooms, isStaff, onOpen, onBorrow, onPrint, initialRoom = "all" }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [cond, setCond] = useState("all");
  const [room, setRoom] = useState(initialRoom);
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(new Set());
  const categories = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))].sort(), [items]);
  const list = items.filter(i => (cat === "all" || i.category === cat) && (cond === "all" || (i.condition || "Baik") === cond) &&
    (room === "all" || (i.location || "") === room) &&
    (!search || `${i.name} ${i.code || ""}`.toLowerCase().includes(search.toLowerCase())));
  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const low = items.filter(i => i.low_stock).length;
  const sel = "px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:border-sky-500 outline-none";

  return (
    <div className="space-y-4">
      {low > 0 && isStaff && (
        <div data-testid="low-stock-alert" className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
          <AlertTriangle className="w-4 h-4" />{low} barang stoknya menipis / habis. Segera lakukan pengadaan.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input data-testid="inventory-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / kode barang…" className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm bg-white" />
        </div>
        <select data-testid="inventory-cat-filter" value={cat} onChange={e => setCat(e.target.value)} className={sel}><option value="all">Semua kategori</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
        <select data-testid="inventory-room-filter" value={room} onChange={e => setRoom(e.target.value)} className={sel}><option value="all">Semua ruangan</option>{rooms.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select>
        <select data-testid="inventory-cond-filter" value={cond} onChange={e => setCond(e.target.value)} className={sel}><option value="all">Semua kondisi</option>{CONDITIONS.map(c => <option key={c}>{c}</option>)}</select>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {[["grid", LayoutGrid], ["table", List]].map(([k, I]) => <button key={k} data-testid={`inv-view-${k}`} onClick={() => setView(k)} className={`p-2 rounded-lg ${view === k ? "bg-white shadow-sm text-sky-600" : "text-slate-500"}`}><I className="w-4 h-4" /></button>)}
        </div>
      </div>
      {isStaff && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <button data-testid="inv-select-all" onClick={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map(i => i.id)))} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 font-semibold text-slate-600 hover:border-sky-400">{selected.size === list.length && list.length ? "Batal pilih" : "Pilih semua"}</button>
          <button data-testid="inv-print-labels" disabled={!selected.size} onClick={() => onPrint(items.filter(i => selected.has(i.id)))} className="px-3 py-1.5 rounded-full bg-sky-600 text-white font-semibold flex items-center gap-1.5 disabled:opacity-40 hover:bg-sky-700"><QrCode className="w-4 h-4" />Cetak label QR ({selected.size})</button>
          <span className="text-slate-400">{list.length} dari {items.length} barang</span>
        </div>
      )}
      {list.length === 0 && <p className="text-slate-400 italic py-10 text-center" data-testid="inv-empty">Tidak ada barang yang cocok.</p>}
      {view === "grid"
        ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">{list.map(i => <ItemCard key={i.id} i={i} selectable={isStaff} selected={selected.has(i.id)} onSelect={toggle} onOpen={onOpen} onBorrow={onBorrow} />)}</div>
        : list.length > 0 && <ItemTable list={list} selected={selected} onSelect={toggle} onOpen={onOpen} selectable={isStaff} />}
    </div>
  );
}
