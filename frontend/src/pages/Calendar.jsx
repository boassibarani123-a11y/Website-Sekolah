import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CalendarDays, Plus, X, GraduationCap, Palmtree, Users2, Trash2 } from "lucide-react";

const TYPES = {
  event: { label: "Kegiatan", color: "bg-sky-100 text-sky-700 border-sky-200", icon: CalendarDays },
  ujian: { label: "Ujian", color: "bg-rose-100 text-rose-700 border-rose-200", icon: GraduationCap },
  libur: { label: "Libur", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Palmtree },
  rapat: { label: "Rapat", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Users2 },
};

export default function Calendar() {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const canCreate = ["super_admin","kepsek","staff_tu","guru","ketua_osis"].includes(user.role);

  const load = () => api.get(`/events?month=${month}`).then(r => setEvents(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  const del = async (id) => {
    if (!confirm("Hapus event ini?")) return;
    await api.delete(`/events/${id}`); load();
  };

  // Build calendar grid
  const [y, m] = month.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({length: firstDay}, () => null).concat(Array.from({length: daysInMonth}, (_, i) => i + 1));
  const eventsByDay = events.reduce((acc, e) => {
    const d = parseInt(e.date.slice(8, 10), 10);
    (acc[d] = acc[d] || []).push(e); return acc;
  }, {});

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">📅 Kalender Sekolah</h1>
          <p className="mt-1 text-sm text-slate-500">Timeline event, ujian, dan libur. Reminder otomatis ke siswa & orang tua.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
            className="px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
          {canCreate && <button data-testid="new-event-button" onClick={()=>setShowNew(true)}
            className="px-4 py-2.5 bg-sky-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-sky-700 shadow-lg">
            <Plus className="w-4 h-4"/>Event Baru
          </button>}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 uppercase mb-2">
          {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <div key={i} className={`aspect-square rounded-lg p-1.5 border ${d ? "border-slate-200 bg-slate-50" : "border-transparent"} flex flex-col`}>
              {d && (
                <>
                  <div className="text-xs font-bold text-slate-700">{d}</div>
                  <div className="flex-1 overflow-y-auto space-y-0.5 mt-1">
                    {(eventsByDay[d] || []).slice(0, 3).map(e => {
                      const T = TYPES[e.type] || TYPES.event;
                      return <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded ${T.color} truncate font-semibold`} title={e.title}>{e.title}</div>;
                    })}
                    {(eventsByDay[d]||[]).length > 3 && <div className="text-[9px] text-slate-400">+{eventsByDay[d].length - 3} lainnya</div>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <h2 className="font-heading font-bold text-slate-900 p-5 border-b border-slate-100">Daftar Event ({events.length})</h2>
        {events.length === 0 && <p className="p-8 text-center text-slate-400 italic">Belum ada event di bulan ini.</p>}
        <div className="divide-y divide-slate-100">
          {events.map(e => {
            const T = TYPES[e.type] || TYPES.event;
            const Icon = T.icon;
            return (
              <div key={e.id} className="p-4 flex items-start gap-3 hover:bg-slate-50">
                <div className={`w-10 h-10 rounded-xl ${T.color.replace("text-","text-").replace("border-","")} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{e.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${T.color}`}>{T.label}</span>
                    {e.kelas && <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">{e.kelas}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(e.date).toLocaleDateString("id-ID", {weekday:"long", day:"numeric", month:"long", year:"numeric"})}</p>
                  {e.description && <p className="text-sm text-slate-700 mt-1">{e.description}</p>}
                </div>
                {canCreate && <button onClick={()=>del(e.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>}
              </div>
            );
          })}
        </div>
      </div>

      {showNew && <NewEventModal onClose={()=>setShowNew(false)} onDone={()=>{load(); setShowNew(false);}}/>}
    </div>
  );
}

function NewEventModal({onClose, onDone}) {
  const [f, setF] = useState({title:"", description:"", date:new Date().toISOString().slice(0,10), type:"event", kelas:""});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!f.title || !f.date) return toast.error("Lengkapi form");
    setBusy(true);
    try {
      await api.post("/events", {...f, kelas: f.kelas || null});
      toast.success("Event dibuat + reminder terkirim"); onDone();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-heading font-bold text-lg">Event Baru</h3>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 space-y-3">
          <input placeholder="Judul event" value={f.title} onChange={e=>setF({...f,title:e.target.value})}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
          <textarea rows={2} placeholder="Deskripsi" value={f.description} onChange={e=>setF({...f,description:e.target.value})}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg"/>
            <select value={f.type} onChange={e=>setF({...f,type:e.target.value})}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg">
              {Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <input placeholder="Kelas (kosong = semua sekolah)" value={f.kelas} onChange={e=>setF({...f,kelas:e.target.value})}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg"/>
          <button disabled={busy} onClick={submit}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-semibold disabled:opacity-60">
            {busy?"Menyimpan...":"Simpan & Kirim Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
