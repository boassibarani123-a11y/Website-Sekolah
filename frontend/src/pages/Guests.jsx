import { PageHeader, StatStrip } from "@/components/zx/ui";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { UserPlus, Printer, X, LogIn, LogOut, Pencil, Trash2, CalendarClock, Building2, Users, Search, Clock, ExternalLink } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { GuestIdCard } from "@/components/guests/GuestIdCard";
import { GuestForm } from "@/components/guests/GuestForm";
import { ApprovalPanel } from "@/components/guests/ApprovalPanel";
import { GuestHoursPanel } from "@/components/guests/GuestHoursPanel";
import { statusOf, hoursLabel } from "@/components/guests/guestMeta";

const APPROVERS = ["kepsek", "super_admin"];
const CAN_DELETE = ["super_admin", "staff_tu", "kepsek"];

function CardPreview({ g, onClose }) {
  const { settings } = useSettings();
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="guest-card-modal">
      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl p-8 shadow-2xl relative">
        <button data-testid="guest-card-close" onClick={onClose} className="no-print absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white"><X className="w-5 h-5" /></button>
        <div className="printable-id-card"><GuestIdCard g={g} schoolName={settings?.school_full_name || "SMA NEGERI 1 LAGUBOTI"} logoUrl={settings?.school_logo_url || "/school-logo.png"} /></div>
        <button data-testid="guest-card-print" onClick={() => window.print()} className="no-print mt-6 w-full py-3 rounded-xl bg-slate-900 text-white font-semibold flex items-center justify-center gap-2"><Printer className="w-4 h-4" />Cetak ID Card</button>
        <p className="no-print mt-2 text-[11px] text-slate-500 text-center">Potret 54 × 86 mm · siap dimasukkan ke holder lanyard</p>
      </div>
    </div>
  );
}

function GuestRow({ g, onAct, onEdit, onCard, canDelete }) {
  const st = statusOf(g);
  return (
    <div data-testid={`guest-row-${g.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 flex-wrap hover:shadow-md transition-shadow">
      <span className="w-14 h-16 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-400 shrink-0">{g.photo ? <img src={g.photo} alt="" className="w-full h-full object-cover" /> : g.name[0]}</span>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap"><p className="font-heading font-bold text-slate-900">{g.name}</p><span data-testid={`guest-status-${g.id}`} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.c}`}>{st.l}</span></div>
        <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{g.institution}{g.position ? ` · ${g.position}` : ""}</p>
        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{g.visit_date}{g.arrival_time ? ` · datang ${g.arrival_time}` : g.visit_time ? ` ${g.visit_time}` : ""}{g.departure_time ? ` · keluar ${g.departure_time}` : ""} · {g.host ? `${g.host} — ` : ""}{g.purpose}</p>
        {g.decided_by && <p className="text-xs text-slate-500 mt-0.5">Diputuskan oleh {g.decided_by}{g.decision_note ? `: "${g.decision_note}"` : ""}</p>}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {g.status !== "menunggu" && g.status !== "ditolak" && <button data-testid={`guest-card-${g.id}`} onClick={() => onCard(g)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" />ID Card</button>}
        {g.status === "dijadwalkan" && <button data-testid={`guest-checkin-${g.id}`} onClick={() => onAct(g, "checkin")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5" />Datang</button>}
        {g.status === "hadir" && <button data-testid={`guest-checkout-${g.id}`} onClick={() => onAct(g, "checkout")} className="px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" />Catat Keluar</button>}
        <button data-testid={`guest-edit-${g.id}`} onClick={() => onEdit(g)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
        {canDelete && <button data-testid={`guest-delete-${g.id}`} onClick={() => onAct(g, "delete")} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
      </div>
    </div>
  );
}

const FILTERS = [["", "Semua"], ["menunggu", "Menunggu"], ["hadir", "Di Dalam"], ["ditolak", "Ditolak"], ["selesai", "Selesai"], ["dijadwalkan", "Dijadwalkan"]];

export default function Guests() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [pending, setPending] = useState([]);
  const [summary, setSummary] = useState(null);
  const [hours, setHours] = useState(null);
  const [filter, setFilter] = useState("");
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [card, setCard] = useState(null);
  const isApprover = APPROVERS.includes(user.role);
  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (filter) p.set("status", filter);
    if (date) p.set("date", date);
    if (q.trim()) p.set("q", q.trim());
    api.get(`/guests?${p}`).then(r => setList(r.data)).catch(() => {});
    api.get("/guests/summary").then(r => setSummary(r.data)).catch(() => {});
    if (isApprover) api.get("/guests?status=menunggu").then(r => setPending(r.data)).catch(() => {});
  }, [filter, date, q, isApprover]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => { api.get("/public/guest-hours").then(r => setHours(r.data)).catch(() => {}); }, []);
  const act = async (g, a) => {
    if (a === "delete" && !window.confirm(`Hapus data tamu ${g.name}?`)) return;
    try {
      const r = a === "delete" ? await api.delete(`/guests/${g.id}`) : await api.post(`/guests/${g.id}/${a}`);
      toast.success(r.data?.status === "menunggu" ? "Di luar jam kunjungan — permintaan izin dikirim ke Kepala Sekolah" : "Berhasil"); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const onSaved = (g) => { setForm(null); load(); if (g.status !== "menunggu") setCard(g); };
  return (
    <div className="space-y-6" data-testid="guests-page">
      <PageHeader title="Kunjungan Tamu" subtitle={<span className="inline-flex flex-wrap items-center gap-1.5" data-testid="guest-hours-label"><Clock className="w-3.5 h-3.5" />Buku tamu digital • Jam kunjungan: {hoursLabel(hours)}
          {hours && <span className={`ml-1 text-[12px] font-semibold ${hours.open_now ? "text-emerald-600" : "text-rose-600"}`}>{hours.open_now ? "Buka" : "Di luar jam"}</span>}
          <a href="/info-tamu" target="_blank" rel="noreferrer" data-testid="guest-info-link" className="ml-2 inline-flex items-center gap-1 text-sky-600 hover:underline"><ExternalLink className="w-3.5 h-3.5" />Halaman informasi tamu</a></span>}
        actions={<button data-testid="guest-new" onClick={() => setForm({})} className="zx-btn-primary"><UserPlus className="w-4 h-4" />Catat tamu</button>}/>
      <StatStrip items={[["today", "Tamu hari ini", "Tercatat di buku tamu"], ["inside", "Sedang di dalam", "Belum check-out"], ["pending", "Menunggu izin", "Di luar jam kunjungan"]].map(([k, l, h]) => ({ label: l, value: summary?.[k] ?? "—", hint: h, testid: `guest-summary-${k}` }))}/>
      {isApprover && <ApprovalPanel pending={pending} onDone={load} />}
      {user.role === "super_admin" && <GuestHoursPanel hours={hours} onSaved={setHours} />}
      <div className="flex gap-2 flex-wrap items-center">
        {FILTERS.map(([k, l]) => (
          <button key={k || "all"} data-testid={`guest-filter-${k || "all"}`} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${filter === k ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300"}`}>{l}</button>
        ))}
        <input data-testid="guest-filter-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 rounded-full border border-slate-200 text-sm" />
        <label className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input data-testid="guest-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama / instansi" className="pl-9 pr-3 py-2 rounded-full border border-slate-200 text-sm" /></label>
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p data-testid="guest-empty" className="text-center text-slate-400 py-14">Belum ada data tamu.</p>}
        {list.map(g => <GuestRow key={g.id} g={g} onAct={act} onEdit={(x) => setForm(x)} onCard={setCard} canDelete={CAN_DELETE.includes(user.role)} />)}
      </div>
      {form && <GuestForm initial={form.id ? form : null} hours={hours} onClose={() => setForm(null)} onSaved={onSaved} />}
      {card && <CardPreview g={card} onClose={() => setCard(null)} />}
    </div>
  );
}
