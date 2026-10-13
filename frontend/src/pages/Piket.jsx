import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { ShieldCheck, Plus, CheckCircle2, AlarmClock, XCircle, ListChecks } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { todayWib } from "@/components/attendance/scannerUtils";
import { PiketHero } from "@/components/piket/PiketHero";
import { PiketWeek } from "@/components/piket/PiketWeek";
import { PiketModal } from "@/components/piket/PiketModal";
import { PiketReport } from "@/components/piket/PiketReport";
import { addDays, mondayOf } from "@/components/piket/piketUtils";

const ADMIN = ["super_admin", "kepsek", "staff_tu"];

function Stat({ icon: Icon, label, value, tone, testid }) {
  return (
    <div data-testid={testid} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></span>
      <div><p className="font-heading text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
    </div>
  );
}

export default function Piket() {
  const { user } = useAuth();
  const canManage = ADMIN.includes(user.role);
  const today = todayWib();
  const [weekStartRaw, setWeekStart] = useState(null);
  const weekStart = weekStartRaw || mondayOf(today);
  const [shifts, setShifts] = useState([]);
  const [nowData, setNowData] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState("jadwal");
  const offset = useRef(0);

  const load = useCallback(() => {
    api.get(`/piket/shifts?start=${weekStart}&end=${addDays(weekStart, 6)}`).then(r => setShifts(r.data)).catch(() => {});
    api.get("/piket/now").then(r => { offset.current = new Date(r.data.server_now).getTime() - Date.now(); setNowData(r.data); }).catch(() => {});
  }, [weekStart]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + offset.current), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (canManage) api.get("/piket/teachers").then(r => setTeachers(r.data)).catch(() => {}); }, [canManage]);

  const stats = useMemo(() => ({
    total: shifts.length,
    hadir: shifts.filter(s => s.checked_in_at).length,
    telat: shifts.filter(s => (s.late_minutes || 0) > 10 || s.status === "terlambat").length,
    absen: shifts.filter(s => s.status === "tidak_hadir").length,
  }), [shifts]);

  const presence = async (s, action) => {
    setBusy(true);
    try { await api.post(`/piket/shifts/${s.id}/${action}`); toast.success(action === "checkin" ? "Check-in piket berhasil. Selamat bertugas!" : "Check-out berhasil. Terima kasih!"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
    finally { setBusy(false); }
  };

  const nowHHMM = new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6" data-testid="piket-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-8 h-8 text-sky-600" />Piket Gerbang</h1>
          <p className="mt-1 text-sm text-slate-500">Jadwal shift guru penjaga gerbang, check-in/out berbasis waktu, dan pemantauan real-time.</p>
        </div>
        {canManage && (
          <button data-testid="piket-create-button" onClick={() => setModal({ date: today < weekStart ? weekStart : today })}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" />Jadwalkan Piket</button>
        )}
      </div>

      <PiketHero data={nowData} now={now} onPresence={presence} busy={busy} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat testid="piket-stat-total" icon={ListChecks} label="Shift minggu ini" value={stats.total} tone="bg-sky-100 text-sky-600" />
        <Stat testid="piket-stat-hadir" icon={CheckCircle2} label="Sudah check-in" value={stats.hadir} tone="bg-emerald-100 text-emerald-600" />
        <Stat testid="piket-stat-telat" icon={AlarmClock} label="Terlambat" value={stats.telat} tone="bg-orange-100 text-orange-600" />
        <Stat testid="piket-stat-absen" icon={XCircle} label="Tidak hadir" value={stats.absen} tone="bg-rose-100 text-rose-600" />
      </div>

      {canManage && (
        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm" data-testid="piket-view-tabs">
          {[["jadwal", "Jadwal Mingguan"], ["laporan", "Laporan Bulanan"]].map(([k, l]) => (
            <button key={k} data-testid={`piket-view-${k}`} onClick={() => setView(k)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${view === k ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>{l}</button>
          ))}
        </div>
      )}

      {view === "laporan" && canManage ? <PiketReport today={today} /> : (
      <PiketWeek weekStart={weekStart} setWeekStart={setWeekStart} today={today} shifts={shifts} canManage={canManage} nowHHMM={nowHHMM}
        onAdd={(d) => setModal({ date: d })} onEdit={(s) => setModal({ shift: s })} />
      )}

      {modal && <PiketModal shift={modal.shift} teachers={teachers} defaultDate={modal.date || modal.shift?.date} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}
