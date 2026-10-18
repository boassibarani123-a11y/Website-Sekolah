import { PageHeader, StatStrip } from "@/components/zx/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Radar, LogIn, LogOut, ShieldAlert, Hourglass, Users, AlarmClock, Settings2, Search, X } from "lucide-react";
import { alarm, todayWib } from "@/components/attendance/scannerUtils";

const VIEW_ROLES = ["super_admin", "kepsek", "staff_tu", "piket_gerbang", "guru"];
const SET_ROLES = ["super_admin", "kepsek", "piket_gerbang"];

function Kpi({ icon: Icon, label, value, hint, tone, testid }) {
  return (
    <div data-testid={testid} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></span>
        <p className="font-heading text-2xl font-extrabold text-slate-900 tabular-nums">{value ?? 0}</p>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-700">{label}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

const Ava = ({ l }) => (
  <span className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
    {l.photo ? <img src={l.photo} alt="" className="w-full h-full object-cover" /> : (l.user_name || "?")[0]}
  </span>
);

function AlertList({ title, items, empty, tone, testid, render }) {
  return (
    <div data-testid={testid} className={`rounded-3xl border p-5 ${tone}`}>
      <p className="font-heading font-extrabold text-slate-900">{title} <span className="text-slate-400 font-normal">({items.length})</span></p>
      {items.length === 0 ? <p className="mt-2 text-sm text-slate-400 italic">{empty}</p> : <ul className="mt-3 space-y-2">{items.map(render)}</ul>}
    </div>
  );
}

function SettingsModal({ cfg, onClose, onSaved }) {
  const [f, setF] = useState({ jam_masuk: cfg.jam_masuk, jam_pulang: cfg.jam_pulang, jam_pulang_guru: cfg.jam_pulang_guru });
  const save = async () => {
    try { await api.put("/gate/settings", f); toast.success("Jam gerbang disimpan"); onSaved(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
  };
  const row = (k, l, h) => (
    <label className="block"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{l}</span>
      <input data-testid={`gate-setting-${k}`} type="time" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} className="mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm" />
      <span className="text-[11px] text-slate-400">{h}</span></label>
  );
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="gate-settings-modal">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="font-heading font-bold text-lg">Pengaturan Jam Gerbang</h3>
          <button data-testid="gate-settings-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
        {row("jam_masuk", "Batas jam masuk", "Scan masuk setelah jam ini ditandai terlambat.")}
        {row("jam_pulang", "Jam pulang siswa", "Siswa keluar sebelum jam ini tanpa izin keluar (IK) yang disetujui = pelanggaran.")}
        {row("jam_pulang_guru", "Jam pulang guru", "Guru keluar sebelum jam ini ditandai pulang lebih awal.")}
        <button data-testid="gate-settings-save" onClick={save} className="w-full py-3 bg-slate-900 hover:bg-sky-600 text-white rounded-xl font-semibold">Simpan</button>
      </div>
    </div>
  );
}

const FILTERS = [["all", "Semua"], ["masuk", "Masuk"], ["keluar", "Keluar"], ["unauth", "Tanpa Izin"], ["late", "Terlambat"]];

function LogTable({ logs }) {
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const list = logs.filter(l => (f === "all" || (f === "unauth" ? l.unauthorized : f === "late" ? l.late : l.direction === f))
    && (!q || `${l.user_name} ${l.kelas || ""}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden" data-testid="gate-log-table">
      <div className="p-4 flex items-center gap-2 flex-wrap border-b border-slate-100">
        {FILTERS.map(([k, l]) => <button key={k} data-testid={`gate-filter-${k}`} onClick={() => setF(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${f === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>)}
        <label className="ml-auto flex items-center gap-2 border border-slate-200 rounded-full px-3 py-1.5"><Search className="w-4 h-4 text-slate-400" />
          <input data-testid="gate-log-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / kelas" className="outline-none text-sm w-40" /></label>
      </div>
      <div className="overflow-x-auto max-h-[480px]">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0"><tr>
            <th className="text-left px-4 py-2.5">Jam</th><th className="text-left px-3 py-2.5">Nama</th><th className="text-left px-3 py-2.5">Kelas</th>
            <th className="text-left px-3 py-2.5">Arah</th><th className="text-left px-3 py-2.5">Metode</th><th className="text-left px-4 py-2.5">Keterangan</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 italic py-8">Belum ada catatan.</td></tr>}
            {list.map(l => (
              <tr key={l.id} data-testid={`gate-log-${l.id}`} className={`border-t border-slate-100 ${l.unauthorized ? "bg-rose-50" : ""}`}>
                <td className="px-4 py-2.5 font-mono tabular-nums">{l.time}</td>
                <td className="px-3 py-2.5 font-semibold text-slate-900">{l.user_name}</td>
                <td className="px-3 py-2.5 text-slate-600">{l.kelas || "-"}</td>
                <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${l.direction === "masuk" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{l.direction}</span></td>
                <td className="px-3 py-2.5 text-slate-500 capitalize">{l.method}</td>
                <td className={`px-4 py-2.5 text-xs ${l.unauthorized ? "text-rose-700 font-bold" : l.late ? "text-orange-600 font-semibold" : "text-slate-500"}`}>{[l.late && "Terlambat", l.note, l.izin_reason].filter(Boolean).join(" · ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MyHistory() {
  const [logs, setLogs] = useState(null);
  useEffect(() => { api.get("/gate/me").then(r => setLogs(r.data)).catch(() => setLogs([])); }, []);
  return (
    <div className="space-y-5" data-testid="gate-my-history">
      <PageHeader title="Riwayat Gerbang Saya" subtitle="Catatan jam masuk dan keluar sekolah Anda dari scan barcode / Face ID. Pemberitahuan juga dikirim ke lonceng notifikasi."/>
      {logs === null ? <p className="text-slate-400 italic">Memuat…</p> : <LogTable logs={logs.map(l => ({ ...l, time: `${l.date.slice(5)} ${l.time}` }))} />}
    </div>
  );
}

export default function GateMonitor() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayWib());
  const [d, setD] = useState(null);
  const [showSet, setShowSet] = useState(false);
  const prevUnauth = useRef(null);
  const canView = VIEW_ROLES.includes(user.role);
  const load = useCallback(() => api.get(`/gate/monitor?date=${date}`).then(r => {
    const n = r.data.counts.unauthorized;
    if (prevUnauth.current !== null && n > prevUnauth.current) { alarm(); toast.error("Ada siswa keluar tanpa izin!"); }
    prevUnauth.current = n; setD(r.data);
  }).catch(() => {}), [date]);
  useEffect(() => { if (!canView) return; prevUnauth.current = null; load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load, canView]);
  if (!canView) return <MyHistory />;
  const c = d?.counts || {};
  const cfg = d?.settings;
  return (
    <div className="space-y-6" data-testid="gate-monitor-page">
      <PageHeader title="Pantau Gerbang" subtitle={`Setiap scan di gerbang tercatat sebagai masuk atau keluar. Siswa yang keluar sebelum jam pulang (${cfg?.jam_pulang || "--:--"}) tanpa Izin Keluar langsung ditandai dan dilaporkan.`}
        actions={<>
          <input data-testid="gate-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="zx-input !w-auto" />
          {SET_ROLES.includes(user.role) && cfg && <button data-testid="gate-settings-button" onClick={() => setShowSet(true)} className="zx-btn-primary"><Settings2 className="w-4 h-4" />Jam gerbang</button>}
        </>}/>
      <StatStrip items={[
        { testid: "gate-kpi-inside", label: "Di dalam sekolah", value: c.inside ?? 0, hint: `${c.inside_siswa || 0} siswa · ${c.inside_guru || 0} guru` },
        { testid: "gate-kpi-masuk", label: "Scan masuk", value: c.masuk ?? 0, hint: "Total hari ini" },
        { testid: "gate-kpi-keluar", label: "Scan keluar", value: c.keluar ?? 0, hint: "Total hari ini" },
        { testid: "gate-kpi-unauthorized", label: "Keluar tanpa izin", value: c.unauthorized ?? 0, hint: "Sebelum jam pulang" },
        { testid: "gate-kpi-overdue", label: "Izin belum kembali", value: c.overdue ?? 0, hint: "Melewati jam kembali" },
        { testid: "gate-kpi-late", label: "Terlambat masuk", value: c.late ?? 0, hint: `Setelah ${cfg?.jam_masuk || "--:--"}` },
      ]}/>

      <div className="grid lg:grid-cols-3 gap-5">
        <AlertList testid="gate-unauthorized-list" title="Keluar Tanpa Izin" tone="bg-rose-50/60 border-rose-200" empty="Tidak ada pelanggaran. Aman."
          items={d?.unauthorized || []} render={l => (
            <li key={l.id} className="flex items-center gap-3 bg-white rounded-2xl p-2.5 ring-1 ring-rose-100"><Ava l={l} />
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{l.user_name}</p><p className="text-[11px] text-slate-500">{l.kelas} · keluar {l.time} · {l.station_name || l.method}</p></div></li>)} />
        <AlertList testid="gate-overdue-list" title="Izin Belum Kembali" tone="bg-amber-50/60 border-amber-200" empty="Semua siswa berizin sudah kembali."
          items={d?.overdue || []} render={o => (
            <li key={o.izin_id} className="flex items-center gap-3 bg-white rounded-2xl p-2.5 ring-1 ring-amber-100"><Ava l={o} />
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{o.user_name}</p><p className="text-[11px] text-slate-500">keluar {o.out_at} · wajib kembali {o.return_time} · {o.reason}</p></div></li>)} />
        <AlertList testid="gate-outside-list" title="Sedang di Luar (jam sekolah)" tone="bg-white border-slate-200" empty="Tidak ada yang di luar."
          items={d?.outside_now || []} render={l => (
            <li key={l.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-2.5"><Ava l={l} />
              <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 truncate">{l.user_name}</p><p className="text-[11px] text-slate-500">{l.kelas} · sejak {l.time}{l.izin_id ? " · berizin" : l.unauthorized ? " · TANPA IZIN" : ""}</p></div></li>)} />
      </div>

      <LogTable logs={d?.logs || []} />
      {showSet && cfg && <SettingsModal cfg={cfg} onClose={() => setShowSet(false)} onSaved={() => { setShowSet(false); load(); }} />}
    </div>
  );
}
