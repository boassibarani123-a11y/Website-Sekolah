import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import api from "@/lib/apiClient";
import { fmtClock } from "./liveUtils";

function toCsv(data) {
  const lines = [["Tanggal", "Kelas", "Mapel", "Guru", "Nama", "NIS", "Status", "Masuk", "Durasi (menit)"]];
  data.sessions.forEach((x) => x.students.forEach((st) => lines.push([
    data.date, data.class_name, x.session.subject, x.session.teacher_name || "", st.name, st.nis || "",
    st.status === "hadir" ? "Hadir" : "Tidak hadir", fmtClock(st.first_join_at), st.minutes,
  ])));
  return lines.map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function LiveAttendance({ klass }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = () => api.get(`/classes/${klass.id}/live-attendance`, { params: { date } }).then((r) => setData(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [klass.id, date]);
  const download = () => {
    const blob = new Blob(["\ufeff" + toCsv(data)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `absensi-live-${klass.name}-${date}.csv`;
    a.click();
  };
  return (
    <div data-testid="live-attendance" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <p className="font-heading font-bold text-slate-800">Absensi Kelas Live</p>
        <input data-testid="live-attendance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ml-auto border border-slate-200 rounded-lg px-2 py-1 text-sm" />
        <button data-testid="live-attendance-export" disabled={!data?.sessions?.length} onClick={download}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-40"><Download className="w-3.5 h-3.5" />Unduh CSV</button>
      </div>
      {!data?.sessions?.length && <p className="text-sm text-slate-400 py-4 text-center">Belum ada sesi live pada tanggal ini.</p>}
      <div className="space-y-4">
        {data?.sessions?.map((x) => (
          <div key={x.session.id} data-testid={`live-attendance-session-${x.session.id}`}>
            <div className="flex items-center gap-2 text-sm mb-2">
              <b className="text-slate-800">{x.session.subject}</b>
              <span className="text-slate-500">{fmtClock(x.session.start_at)}–{fmtClock(x.session.end_at)} · {x.session.teacher_name}</span>
              <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">{x.present}/{x.total} hadir</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {x.students.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-xs rounded-lg bg-slate-50 px-2.5 py-1.5">
                  {st.status === "hadir" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className="truncate text-slate-700">{st.name}</span>
                  <span className="ml-auto text-slate-400 tabular-nums">{st.status === "hadir" ? `${fmtClock(st.first_join_at)} · ${st.minutes}m` : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
