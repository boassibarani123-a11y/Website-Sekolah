import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { ShieldCheck, LogIn, LogOut, AlarmClock, AlertTriangle, Users, Maximize, ArrowLeft, WifiOff, Wifi, DoorOpen } from "lucide-react";

const ST = {
  bertugas: ["BERTUGAS", "bg-emerald-500 text-emerald-950"], menunggu: ["MENUNGGU", "bg-sky-400 text-sky-950"],
  terlambat: ["TERLAMBAT", "bg-orange-500 text-orange-950"], terjadwal: ["TERJADWAL", "bg-slate-600 text-slate-100"],
  selesai: ["SELESAI", "bg-slate-700 text-slate-300"], tidak_hadir: ["TIDAK HADIR", "bg-rose-600 text-rose-50"],
};
const PHASE = { masuk: "from-emerald-500/25 border-emerald-400 text-emerald-300", pelajaran: "from-amber-500/25 border-amber-400 text-amber-300", pulang: "from-sky-500/25 border-sky-400 text-sky-300" };
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });

function Clock({ offset }) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i); }, []);
  const d = new Date(t + offset);
  return (
    <div className="text-right" data-testid="tv-clock">
      <p className="font-mono text-6xl xl:text-7xl font-bold tabular-nums tracking-tight">{d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" })} <span className="text-2xl text-slate-500">WIB</span></p>
      <p className="text-xl text-slate-400 capitalize">{d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}</p>
    </div>
  );
}

function GateStatus({ gate }) {
  return (
    <div data-testid="tv-gate-status" className={`rounded-3xl border-2 bg-gradient-to-br to-transparent p-8 ${PHASE[gate.code]}`}>
      <p className="text-lg uppercase tracking-[0.3em] text-slate-300">Status Gerbang</p>
      <p className="mt-2 font-heading text-6xl xl:text-7xl font-extrabold" data-testid="tv-gate-label">{gate.label}</p>
      <p className="mt-3 text-2xl text-slate-200">{gate.detail}</p>
    </div>
  );
}

function Counter({ icon: I, label, value, tone, testid }) {
  return (
    <div data-testid={testid} className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <I className={`w-8 h-8 ${tone}`} />
      <p className="mt-2 font-heading text-5xl font-extrabold tabular-nums">{value}</p>
      <p className="text-base text-slate-400">{label}</p>
    </div>
  );
}

function ShiftRow({ s, big }) {
  const [l, c] = ST[s.status] || ST.terjadwal;
  return (
    <div data-testid={`tv-shift-${s.id}`} className={`flex items-center gap-5 rounded-2xl bg-white/5 border border-white/10 ${big ? "p-5" : "p-3"}`}>
      <p className={`font-mono font-bold tabular-nums ${big ? "text-3xl w-64" : "text-xl w-44"} whitespace-nowrap shrink-0`}>{s.start_time}–{s.end_time}</p>
      <div className="min-w-0 flex-1"><p className={`font-heading font-bold truncate ${big ? "text-3xl" : "text-xl"}`}>{s.teacher_name}</p><p className="text-slate-400 text-base truncate">{s.gate}{s.notes ? ` · ${s.notes}` : ""}</p></div>
      <span className={`px-4 py-1.5 rounded-full font-extrabold tracking-wider ${big ? "text-lg" : "text-sm"} ${c}`}>{l}</span>
    </div>
  );
}

function Timeline({ today }) {
  return (
    <section className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 flex flex-col min-h-0" data-testid="tv-today">
      <h2 className="text-2xl font-heading font-bold mb-4">Piket Hari Ini</h2>
      <div className="space-y-3 overflow-hidden">{today.length ? today.map(s => <ShiftRow key={s.id} s={s} big />) : <p className="text-2xl text-slate-500 py-10 text-center" data-testid="tv-today-empty">Tidak ada jadwal piket hari ini.</p>}</div>
    </section>
  );
}

function Upcoming({ items }) {
  return (
    <section className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 min-h-0" data-testid="tv-upcoming">
      <h2 className="text-2xl font-heading font-bold mb-4">Jadwal Berikutnya</h2>
      <div className="space-y-2 overflow-hidden">{items.length ? items.slice(0, 6).map(s => (
        <div key={s.id} className="flex items-center justify-between gap-3 text-lg border-b border-white/5 pb-2"><span className="text-slate-400 capitalize w-48 shrink-0">{dayLabel(s.date)}</span><span className="font-semibold truncate flex-1">{s.teacher_name}</span><span className="font-mono text-slate-300">{s.start_time}</span></div>
      )) : <p className="text-lg text-slate-500">Belum ada jadwal 7 hari ke depan.</p>}</div>
    </section>
  );
}

function Recent({ items }) {
  return (
    <section className="rounded-3xl bg-white/[0.03] border border-white/10 p-6 min-h-0" data-testid="tv-recent">
      <h2 className="text-2xl font-heading font-bold mb-4">Aktivitas Gerbang Terakhir</h2>
      <div className="space-y-2">{items.length ? items.map(l => (
        <div key={l.id} className="flex items-center gap-3 text-lg">
          {l.direction === "masuk" ? <LogIn className="w-5 h-5 text-emerald-400" /> : <LogOut className="w-5 h-5 text-sky-400" />}
          <span className="font-mono text-slate-400">{l.time}</span><span className="font-semibold truncate flex-1">{l.user_name}</span><span className="text-slate-500">{l.kelas}</span>
          {l.unauthorized && <span className="px-2 rounded bg-rose-600 text-sm font-bold">TANPA IZIN</span>}{l.late && <span className="px-2 rounded bg-orange-500 text-sm font-bold text-orange-950">TELAT</span>}
        </div>)) : <p className="text-lg text-slate-500">Belum ada aktivitas.</p>}</div>
    </section>
  );
}

const toMin = (t) => { const [h, m] = (t || "").split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
const nowWibMin = (offset) => { const [h, m] = new Date(Date.now() + offset).toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).split(":").map(Number); return h * 60 + m; };

function IkOut({ items, offset }) {
  const now = nowWibMin(offset);
  return (
    <section className="rounded-3xl bg-rose-500/[0.06] border border-rose-500/30 p-6 min-h-0 flex-1 animate-in fade-in duration-700" data-testid="tv-ik-out">
      <h2 className="text-2xl font-heading font-bold mb-1 flex items-center gap-3"><DoorOpen className="w-7 h-7 text-rose-400" />Belum Kembali dari Izin Keluar <span className="ml-auto px-3 py-0.5 rounded-full bg-rose-600 text-lg tabular-nums" data-testid="tv-ik-count">{items.length}</span></h2>
      <p className="text-slate-400 mb-4">Siswa yang sudah keluar gerbang dengan IK dan belum tercatat kembali</p>
      <div className="space-y-2 overflow-hidden">{items.slice(0, 9).map(k => {
        const due = toMin(k.return_time), late = due !== null && now > due;
        return (
          <div key={k.id} data-testid={`tv-ik-${k.id}`} className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${late ? "bg-rose-600/20 border-rose-500" : "bg-white/5 border-white/10"}`}>
            <div className="min-w-0 flex-1"><p className="text-xl font-bold truncate">{k.student_name} <span className="text-slate-400 font-medium">· {k.kelas}</span></p><p className="text-slate-400 truncate">{k.reason}</p></div>
            <div className="text-right shrink-0"><p className="font-mono text-lg">{k.out_time || "-"} → {k.return_time || "?"}</p>{late && <p className="text-sm font-extrabold text-rose-300 tracking-wider">LEWAT BATAS</p>}</div>
          </div>);
      })}{items.length > 9 && <p className="text-slate-400 text-lg">+{items.length - 9} siswa lainnya</p>}</div>
    </section>
  );
}

function SidePanels({ data, offset }) {
  const [slide, setSlide] = useState(0);
  const hasIk = (data.ik_out || []).length > 0;
  useEffect(() => { if (!hasIk) { setSlide(0); return; } const t = setInterval(() => setSlide(s => (s + 1) % 2), 10000); return () => clearInterval(t); }, [hasIk]);
  return (
    <div className="flex flex-col gap-6" data-testid="tv-side" data-slide={slide}>
      {hasIk && <div className="flex gap-2 justify-end">{[0, 1].map(i => <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${slide === i ? "w-10 bg-white" : "w-4 bg-white/25"}`} />)}</div>}
      {slide === 1 && hasIk ? <IkOut items={data.ik_out} offset={offset} /> : <><Upcoming items={data.upcoming} /><Recent items={data.recent} /></>}
    </div>
  );
}

export default function PiketTV() {
  const [data, setData] = useState(null);
  const [online, setOnline] = useState(true);
  const [lastOk, setLastOk] = useState(null);
  const offset = useRef(0);
  const load = useCallback(() => {
    api.get("/piket/tv", { timeout: 8000 }).then(r => { offset.current = new Date(r.data.server_now).getTime() - Date.now(); setData(r.data); setOnline(true); setLastOk(new Date()); })
      .catch(() => setOnline(false));
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);
  const full = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {});

  if (!data) return <div className="min-h-screen bg-[#07090D] text-slate-400 flex items-center justify-center text-2xl" data-testid="tv-loading">{online ? "Memuat layar piket..." : "Tidak dapat terhubung ke server. Mencoba lagi..."}</div>;
  const c = data.counts;
  return (
    <div className="min-h-screen bg-[#07090D] text-white p-6 xl:p-10 flex flex-col gap-6 font-sans" data-testid="piket-tv-page">
      <header className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-5">
          <img src={data.school_logo_url || "/school-logo.png"} alt="" className="w-20 h-20 object-contain" />
          <div><p className="text-lg uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" />Pos Piket Gerbang</p>
            <h1 className="font-heading text-4xl xl:text-5xl font-extrabold">{data.school_name}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <span data-testid="tv-connection" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${online ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
                {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}{online ? "Tersambung · diperbarui tiap 4 detik" : `Terputus · menampilkan data terakhir ${lastOk ? lastOk.toLocaleTimeString("id-ID") : ""}`}</span>
              <button data-testid="tv-fullscreen" onClick={full} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 font-semibold"><Maximize className="w-4 h-4" />Layar penuh</button>
              <Link data-testid="tv-back" to="/piket" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 font-semibold"><ArrowLeft className="w-4 h-4" />Kembali</Link>
            </div></div>
        </div>
        <Clock offset={offset.current} />
      </header>
      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><GateStatus gate={data.gate} /></div>
        <div className="grid grid-cols-2 gap-4">
          <Counter testid="tv-count-inside" icon={Users} label="Di dalam sekolah" value={c.inside} tone="text-emerald-400" />
          <Counter testid="tv-count-keluar" icon={LogOut} label="Keluar hari ini" value={c.keluar} tone="text-sky-400" />
          <Counter testid="tv-count-late" icon={AlarmClock} label="Terlambat" value={c.late} tone="text-orange-400" />
          <Counter testid="tv-count-unauth" icon={AlertTriangle} label="Keluar tanpa izin" value={c.unauthorized} tone="text-rose-400" />
        </div>
      </div>
      <div className="grid xl:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="xl:col-span-2 flex flex-col"><Timeline today={data.today} /></div>
        <SidePanels data={data} offset={offset.current} />
      </div>
      <footer className="flex items-center justify-between text-sm text-slate-500" data-testid="tv-footer">
        <span>{data.school_name} • Layar informasi pos piket</span>
        <span className="flex items-center gap-2">Ditenagai oleh <span className="inline-flex items-center rounded-lg bg-white px-2 py-1"><img src="/zynex-wordmark.png" alt="Zynex LMS" className="h-5 w-auto" /></span></span>
      </footer>
    </div>
  );
}
