import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { MonitorSmartphone, Pencil, Check } from "lucide-react";
import { saveStation } from "./scannerUtils";

export function StationPanel({ station, setStation }) {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(station.name);

  useEffect(() => {
    const beat = () => api.post("/attendance/stations/heartbeat", { station_id: station.id, name: station.name }).catch(() => {});
    const load = () => api.get("/attendance/stations").then(r => setList(r.data)).catch(() => {});
    beat(); load();
    const t1 = setInterval(beat, 20000); const t2 = setInterval(load, 10000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [station.id, station.name]);

  const save = () => {
    const n = name.trim().slice(0, 40);
    if (!n) { toast.error("Nama perangkat wajib diisi"); return; }
    const s = { ...station, name: n }; saveStation(s); setStation(s); setEditing(false);
    toast.success("Nama perangkat disimpan");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm" data-testid="station-panel">
      <h2 className="font-heading text-lg font-bold flex items-center gap-2"><MonitorSmartphone className="w-5 h-5 text-sky-600"/>Perangkat Scanner</h2>
      <p className="mt-1 text-xs text-slate-500">Setiap komputer/tablet di gerbang yang membuka halaman ini menjadi satu titik scan. Bisa juga beberapa alat scanner USB sekaligus dicolok ke satu komputer.</p>
      <div className="mt-4 flex items-center gap-2">
        {editing ? (
          <>
            <input data-testid="station-name-input" value={name} maxLength={40} onChange={e => setName(e.target.value)} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
            <button data-testid="station-name-save" onClick={save} className="px-3 py-2 bg-sky-600 text-white rounded-lg"><Check className="w-4 h-4"/></button>
          </>
        ) : (
          <>
            <p className="flex-1 text-sm">Perangkat ini: <b data-testid="station-current-name">{station.name}</b></p>
            <button data-testid="station-name-edit" onClick={() => setEditing(true)} className="px-3 py-1.5 border-2 border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-slate-400"><Pencil className="w-3.5 h-3.5"/>Ubah Nama</button>
          </>
        )}
      </div>
      <ul className="mt-4 divide-y divide-slate-100" data-testid="station-list">
        {list.map(s => (
          <li key={s.station_id} className="py-2 flex items-center gap-3 text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${s.online ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}/>
            <span className="flex-1 font-semibold text-slate-800">{s.name}{s.station_id === station.id && <span className="ml-1 text-[10px] text-sky-600">(ini)</span>}</span>
            <span className="text-xs text-slate-500">{s.online ? "Online" : "Offline"} · {s.scans_today} scan hari ini</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
