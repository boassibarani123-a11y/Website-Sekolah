import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CalendarRange, Plus, Trash2, Pencil, Clock, MapPin, User, X, LayoutGrid, Table2, Radio } from "lucide-react";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const EDIT_ROLES = ["super_admin", "guru", "kepsek", "staff_tu"];
const STUDENT_ROLES = ["siswa", "ketua_kelas", "ketua_osis"];

const EMPTY = { day: "Senin", start_time: "07:00", end_time: "08:30", subject: "", teacher_id: "", room: "" };

export default function Jadwal() {
  const { user } = useAuth();
  const canEdit = EDIT_ROLES.includes(user.role);
  const isStudent = STUDENT_ROLES.includes(user.role);

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classId, setClassId] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', data}
  const [view, setView] = useState("cards");
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!isStudent) {
      api.get("/classes").then((r) => {
        setClasses(r.data);
        if (r.data.length && !classId) setClassId(r.data[0].id);
      }).catch(() => {});
      api.get("/users?role=guru").then((r) => setTeachers(r.data)).catch(() => {});
    }
  }, [isStudent]); // eslint-disable-line

  const load = () => {
    setLoading(true);
    const url = isStudent ? "/timetable" : (classId ? `/timetable?class_id=${classId}` : null);
    if (!url) { setItems([]); setLoading(false); return; }
    api.get(url).then((r) => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [classId, isStudent]); // eslint-disable-line

  const byDay = useMemo(() => {
    const m = Object.fromEntries(DAYS.map((d) => [d, []]));
    items.forEach((it) => { if (m[it.day]) m[it.day].push(it); });
    Object.values(m).forEach((a) => a.sort((x, y) => x.start_time.localeCompare(y.start_time)));
    return m;
  }, [items]);

  const openAdd = () => {
    if (!classId) { toast.error("Pilih kelas dulu"); return; }
    setModal({ mode: "add", data: { ...EMPTY } });
  };
  const openEdit = (it) => setModal({ mode: "edit", data: { ...it, teacher_id: it.teacher_id || "" } });

  const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const _now = new Date(nowTick);
  const todayName = DAY_NAMES[_now.getDay()];
  const nowHM = `${String(_now.getHours()).padStart(2, "0")}:${String(_now.getMinutes()).padStart(2, "0")}`;
  const isLive = (it) => it.day === todayName && it.start_time <= nowHM && nowHM < it.end_time;
  const slots = useMemo(() => [...new Set(items.map(i => `${i.start_time}-${i.end_time}`))].sort(), [items]);

  const save = async () => {
    const d = modal.data;
    if (!d.subject.trim()) { toast.error("Mata pelajaran wajib diisi"); return; }
    try {
      if (modal.mode === "add") {
        await api.post("/timetable", { class_id: classId, day: d.day, start_time: d.start_time, end_time: d.end_time, subject: d.subject, teacher_id: d.teacher_id || null, room: d.room });
        toast.success("Jadwal ditambahkan");
      } else {
        await api.patch(`/timetable/${d.id}`, { day: d.day, start_time: d.start_time, end_time: d.end_time, subject: d.subject, teacher_id: d.teacher_id || null, room: d.room });
        toast.success("Jadwal diperbarui");
      }
      setModal(null); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan jadwal");
    }
  };

  const remove = async (it) => {
    if (!window.confirm(`Hapus ${it.subject} (${it.day} ${it.start_time})?`)) return;
    try { await api.delete(`/timetable/${it.id}`); toast.success("Jadwal dihapus"); load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  return (
    <div className="space-y-6" data-testid="jadwal-root">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-sky-600" /> Jadwal Pelajaran
          </h1>
          <p className="mt-1 text-slate-500 text-sm">Jadwal mingguan per kelas — deteksi bentrok otomatis (kelas, guru, ruangan).</p>
        </div>
        <div className="flex items-center gap-3">
          {!isStudent && (
            <select data-testid="jadwal-class-select" value={classId} onChange={(e) => setClassId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium">
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <div className="flex rounded-xl border border-slate-300 overflow-hidden">
            <button data-testid="jadwal-view-cards" onClick={() => setView("cards")} title="Kartu per hari" className={`p-2 ${view === "cards" ? "bg-sky-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}><LayoutGrid className="w-4 h-4" /></button>
            <button data-testid="jadwal-view-matrix" onClick={() => setView("matrix")} title="Matrik mingguan" className={`p-2 ${view === "matrix" ? "bg-sky-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}><Table2 className="w-4 h-4" /></button>
          </div>
          {canEdit && (
            <button data-testid="jadwal-add-btn" onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition-colors">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Memuat jadwal...</p>
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DAYS.map((day) => (
            <div key={day} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm" data-testid={`jadwal-day-${day}`}>
              <h2 className="font-heading font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{day}</h2>
              {byDay[day].length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3">Tidak ada jadwal.</p>
              ) : (
                <div className="space-y-2">
                  {byDay[day].map((it) => (
                    <div key={it.id} className={`p-3 rounded-xl group ${isLive(it) ? "bg-emerald-50 border-l-4 border-emerald-500 ring-2 ring-emerald-200" : "bg-slate-50 border-l-4 border-sky-500"}`} data-testid={`jadwal-item-${it.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">{it.subject}{isLive(it) && <span data-testid={`jadwal-live-${it.id}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-bold uppercase"><Radio className="w-2.5 h-2.5" />Berlangsung</span>}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{it.start_time}–{it.end_time}</p>
                          {it.teacher_name && <p className="text-[11px] text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{it.teacher_name}</p>}
                          {it.room && <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{it.room}</p>}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button data-testid={`jadwal-edit-${it.id}`} onClick={() => openEdit(it)} className="p-1.5 rounded-lg hover:bg-sky-100 text-sky-600"><Pencil className="w-3.5 h-3.5" /></button>
                            <button data-testid={`jadwal-delete-${it.id}`} onClick={() => remove(it)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <MatrixView slots={slots} items={items} isLive={isLive} />
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="jadwal-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-slate-900">{modal.mode === "add" ? "Tambah Jadwal" : "Edit Jadwal"}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Mata Pelajaran">
                <input data-testid="jadwal-subject" value={modal.data.subject} onChange={(e) => setModal({ ...modal, data: { ...modal.data, subject: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Matematika" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Hari">
                  <select data-testid="jadwal-day" value={modal.data.day} onChange={(e) => setModal({ ...modal, data: { ...modal.data, day: e.target.value } })} className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm">
                    {DAYS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Mulai">
                  <input type="time" data-testid="jadwal-start" value={modal.data.start_time} onChange={(e) => setModal({ ...modal, data: { ...modal.data, start_time: e.target.value } })} className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm" />
                </Field>
                <Field label="Selesai">
                  <input type="time" data-testid="jadwal-end" value={modal.data.end_time} onChange={(e) => setModal({ ...modal, data: { ...modal.data, end_time: e.target.value } })} className="w-full px-2 py-2 rounded-lg border border-slate-300 text-sm" />
                </Field>
              </div>
              <Field label="Guru (opsional)">
                <select data-testid="jadwal-teacher" value={modal.data.teacher_id} onChange={(e) => setModal({ ...modal, data: { ...modal.data, teacher_id: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                  <option value="">— Tidak ada —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Ruangan (opsional)">
                <input data-testid="jadwal-room" value={modal.data.room} onChange={(e) => setModal({ ...modal, data: { ...modal.data, room: e.target.value } })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Ruang 10A" />
              </Field>
            </div>
            <button data-testid="jadwal-save" onClick={save} className="mt-5 w-full py-2.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors">Simpan</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function MatrixView({ slots, items, isLive }) {
  if (!slots.length) return <p className="text-slate-400 text-sm">Belum ada jadwal untuk ditampilkan.</p>;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto" data-testid="jadwal-matrix">
      <table className="w-full text-sm min-w-[760px]">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <th className="px-3 py-3">Jam</th>{DAYS.map(d => <th key={d} className="px-3 py-3">{d}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slots.map(slot => {
            const [s, e] = slot.split("-");
            return (
              <tr key={slot}>
                <td className="px-3 py-2 font-mono-alt text-slate-500 whitespace-nowrap">{s}–{e}</td>
                {DAYS.map(d => {
                  const it = items.find(x => x.day === d && `${x.start_time}-${x.end_time}` === slot);
                  return (
                    <td key={d} className="px-2 py-2 align-top">
                      {it && (
                        <div className={`rounded-lg p-2 ${isLive(it) ? "bg-emerald-50 ring-1 ring-emerald-300" : "bg-sky-50"}`} data-testid={`matrix-cell-${it.id}`}>
                          <p className="font-semibold text-slate-900 text-xs">{it.subject}</p>
                          {it.teacher_name && <p className="text-[10px] text-slate-500">{it.teacher_name}</p>}
                          {it.room && <p className="text-[10px] text-slate-400">{it.room}</p>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
