import { useCallback, useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { UserPlus, Printer, X, LogIn, LogOut, Pencil, Trash2, CalendarClock, Building2, Users } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { GuestIdCard } from "@/components/guests/GuestIdCard";
import { GuestForm } from "@/components/guests/GuestForm";

const STATUS = {
  dijadwalkan: { l: "Dijadwalkan", c: "bg-sky-100 text-sky-700" },
  hadir: { l: "Sedang Berkunjung", c: "bg-emerald-100 text-emerald-700" },
  selesai: { l: "Selesai", c: "bg-slate-200 text-slate-600" },
  batal: { l: "Batal", c: "bg-rose-100 text-rose-700" },
};

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

function GuestRow({ g, onAct, onEdit, onCard }) {
  const st = STATUS[g.status] || STATUS.dijadwalkan;
  return (
    <div data-testid={`guest-row-${g.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 flex-wrap hover:shadow-md transition-shadow">
      <span className="w-14 h-16 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-bold text-slate-400 shrink-0">{g.photo ? <img src={g.photo} alt="" className="w-full h-full object-cover" /> : g.name[0]}</span>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap"><p className="font-heading font-bold text-slate-900">{g.name}</p><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${st.c}`}>{st.l}</span></div>
        <p className="text-sm text-emerald-700 font-semibold flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{g.institution}{g.position ? ` · ${g.position}` : ""}</p>
        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{g.visit_date}{g.visit_time ? ` ${g.visit_time}` : ""} · {g.purpose}</p>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <button data-testid={`guest-card-${g.id}`} onClick={() => onCard(g)} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" />ID Card</button>
        {g.status === "dijadwalkan" && <button data-testid={`guest-checkin-${g.id}`} onClick={() => onAct(g, "checkin")} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5" />Datang</button>}
        {g.status === "hadir" && <button data-testid={`guest-checkout-${g.id}`} onClick={() => onAct(g, "checkout")} className="px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" />Pulang</button>}
        <button data-testid={`guest-edit-${g.id}`} onClick={() => onEdit(g)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
        <button data-testid={`guest-delete-${g.id}`} onClick={() => onAct(g, "delete")} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function Guests() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(null);
  const [card, setCard] = useState(null);
  const load = useCallback(() => api.get(`/guests${filter ? `?status=${filter}` : ""}`).then(r => setList(r.data)).catch(() => {}), [filter]);
  useEffect(() => { load(); }, [load]);
  const act = async (g, a) => {
    if (a === "delete" && !window.confirm(`Hapus data tamu ${g.name}?`)) return;
    try { a === "delete" ? await api.delete(`/guests/${g.id}`) : await api.post(`/guests/${g.id}/${a}`); toast.success("Berhasil"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const count = (s) => list.filter(g => g.status === s).length;
  return (
    <div className="space-y-6" data-testid="guests-page">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 text-white p-7 sm:p-10 relative overflow-hidden">
        <div className="absolute right-10 -top-10 w-60 h-80 rounded-3xl border-[10px] border-white/5 rotate-12" />
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Buku Tamu Digital</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold mt-2 flex items-center gap-3"><Users className="w-9 h-9 text-emerald-300" />Kunjungan Tamu</h1>
            <p className="mt-2 text-slate-300 text-sm max-w-lg">Jadwalkan kedatangan tamu dari instansi mana pun. Setiap tamu otomatis mendapat ID card potret siap cetak untuk lanyard.</p>
          </div>
          <button data-testid="guest-new" onClick={() => setForm({})} className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-2 transition-colors"><UserPlus className="w-5 h-5" />Daftarkan Tamu</button>
        </div>
        <div className="relative mt-7 grid grid-cols-3 gap-3 max-w-lg">
          {[["dijadwalkan", "Dijadwalkan"], ["hadir", "Berkunjung"], ["selesai", "Selesai"]].map(([k, l]) => (
            <div key={k} className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="font-heading text-2xl font-extrabold">{count(k)}</p><p className="text-[11px] uppercase tracking-wider text-slate-400">{l}</p></div>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[["", "Semua"], ["dijadwalkan", "Dijadwalkan"], ["hadir", "Sedang Berkunjung"], ["selesai", "Selesai"]].map(([k, l]) => (
          <button key={k || "all"} data-testid={`guest-filter-${k || "all"}`} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p data-testid="guest-empty" className="text-center text-slate-400 py-14">Belum ada data tamu.</p>}
        {list.map(g => <GuestRow key={g.id} g={g} onAct={act} onEdit={(x) => setForm(x)} onCard={setCard} />)}
      </div>
      {form && <GuestForm initial={form.id ? form : null} onClose={() => setForm(null)} onSaved={(g) => { setForm(null); load(); setCard(g); }} />}
      {card && <CardPreview g={card} onClose={() => setCard(null)} />}
    </div>
  );
}
