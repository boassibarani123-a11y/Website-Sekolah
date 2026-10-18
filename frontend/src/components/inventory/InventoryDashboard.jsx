import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { Boxes, PackageCheck, HandHelping, AlertTriangle, Clock, MapPin, Wrench, PackageX, TrendingUp } from "lucide-react";
import api from "@/lib/apiClient";
import { CONDITION_COLOR } from "./invUi";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function Kpi({ icon: I, label, value, sub, tone, testid, delay }) {
  return (
    <div className="relative overflow-hidden bg-white border border-slate-200 rounded-3xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${delay}ms` }}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${tone}`} />
      <span className={`w-10 h-10 rounded-2xl ${tone} text-white flex items-center justify-center`}><I className="w-5 h-5" /></span>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p data-testid={testid} className="font-heading text-3xl font-extrabold text-slate-900 tabular-nums">{value ?? 0}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Panel({ title, icon: I, children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-5 ${className}`}>
      <p className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-4"><I className="w-4 h-4 text-sky-600" />{title}</p>
      {children}
    </div>
  );
}

export function InventoryDashboard({ onOpenLoans }) {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/inventory-stats").then(r => setS(r.data)).catch(() => setS(null)); }, []);
  if (!s) return <p className="text-slate-400 italic py-10" data-testid="inv-dashboard-loading">Memuat statistik…</p>;
  const t = s.totals;
  const monthly = s.monthly.map(m => ({ ...m, label: MONTHS[+m.month.slice(5) - 1] }));
  const cond = s.by_condition.filter(c => c.value > 0);
  return (
    <div className="space-y-5" data-testid="inv-dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Boxes} label="Jenis barang" value={t.items} sub={`${t.units} unit · ${t.rooms} ruangan`} tone="bg-sky-500" testid="kpi-items" delay={0} />
        <Kpi icon={PackageCheck} label="Unit tersedia" value={t.available} sub={`${t.low_stock} barang stok menipis`} tone="bg-emerald-500" testid="kpi-available" delay={60} />
        <Kpi icon={HandHelping} label="Sedang dipinjam" value={t.borrowed} sub={`${t.active_loans} transaksi · ${t.pending} menunggu`} tone="bg-violet-500" testid="kpi-borrowed" delay={120} />
        <Kpi icon={AlertTriangle} label="Terlambat kembali" value={t.overdue} sub={`${t.damaged_units} unit rusak · ${t.lost_units} hilang`} tone="bg-rose-500" testid="kpi-overdue" delay={180} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Tren peminjaman 6 bulan" icon={TrendingUp} className="lg:col-span-2">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="pinjam" name="Dipinjam" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gP)" />
                <Area type="monotone" dataKey="kembali" name="Dikembalikan" stroke="#10b981" strokeWidth={2.5} fill="url(#gK)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Kondisi barang" icon={Wrench}>
          {cond.length === 0 ? <p className="text-sm text-slate-400 italic">Belum ada barang.</p> : (
            <div className="h-60 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={cond} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {cond.map(c => <Cell key={c.name} fill={CONDITION_COLOR[c.name]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 -mt-4">{s.by_condition.map(c => <span key={c.name} className="text-xs text-slate-600 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: CONDITION_COLOR[c.name] }} />{c.name} <b>{c.value}</b></span>)}</div>
            </div>
          )}
        </Panel>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Unit per kategori" icon={Boxes} className="lg:col-span-2">
          {s.by_category.length === 0 ? <p className="text-sm text-slate-400 italic">Belum ada data.</p> : (
            <div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.by_category.slice(0, 8)} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f0f9ff" }} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="units" name="Unit" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart></ResponsiveContainer></div>
          )}
        </Panel>
        <Panel title="Sebaran ruangan" icon={MapPin}>
          <ul className="space-y-2.5">
            {s.by_room.slice(0, 6).map(r => {
              const max = s.by_room[0]?.units || 1;
              return <li key={r.name}><div className="flex justify-between text-sm"><span className="text-slate-700 truncate">{r.name}</span><b className="tabular-nums">{r.units}</b></div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(r.units / max) * 100}%` }} /></div></li>;
            })}
            {s.by_room.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada data.</p>}
          </ul>
        </Panel>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Peminjaman terlambat" icon={Clock}>
          {s.overdue_list.length === 0 ? <p className="text-sm text-emerald-600 font-medium" data-testid="inv-no-overdue">Tidak ada peminjaman terlambat.</p> : (
            <ul className="divide-y divide-slate-100" data-testid="inv-overdue-list">
              {s.overdue_list.map(o => <li key={o.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0"><b className="text-slate-900">{o.item_name}</b> × {o.quantity}<span className="block text-xs text-slate-500">{o.requester_name}</span></span>
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold shrink-0">Jatuh tempo {o.return_date}</span></li>)}
            </ul>
          )}
          {s.overdue_list.length > 0 && <button onClick={onOpenLoans} className="mt-3 text-sm font-semibold text-sky-600 hover:underline">Kelola peminjaman</button>}
        </Panel>
        <Panel title="Barang paling sering dipinjam" icon={PackageX}>
          {s.top_items.length === 0 ? <p className="text-sm text-slate-400 italic">Belum ada peminjaman.</p> : (
            <ol className="space-y-2">{s.top_items.map((it, i) => (
              <li key={it.name} className="flex items-center gap-3 text-sm"><span className="w-7 h-7 rounded-xl bg-sky-50 text-sky-700 font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 truncate text-slate-800">{it.name}</span><b className="tabular-nums">{it.count} unit</b></li>))}</ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
