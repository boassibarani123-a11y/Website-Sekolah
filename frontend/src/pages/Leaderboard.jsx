import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Award, Trophy, Medal, Star, Plus, Users, GraduationCap, X, Pencil, Trash2, Search } from "lucide-react";

const AWARD_ROLES = ["super_admin", "guru", "kepsek", "ketua_osis", "staff_tu"];
const STUDENT_ROLES = ["siswa", "ketua_kelas", "ketua_osis"];
const CATS = [
  { v: "prestasi", l: "Prestasi" },
  { v: "kedisiplinan", l: "Kedisiplinan" },
  { v: "akademik", l: "Akademik" },
  { v: "lainnya", l: "Lainnya" },
];
const RANK_COLORS = ["from-amber-400 to-amber-500", "from-slate-300 to-slate-400", "from-orange-400 to-orange-500"];

export default function Leaderboard() {
  const { user } = useAuth();
  const canAward = AWARD_ROLES.includes(user.role);
  const isStudent = STUDENT_ROLES.includes(user.role);

  const [tab, setTab] = useState("siswa");
  const [board, setBoard] = useState({ students: [], classes: [] });
  const [mine, setMine] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ user_id: "", points: 10, category: "prestasi", reason: "" });
  const [manageRows, setManageRows] = useState([]);
  const [mq, setMq] = useState("");
  const [editItem, setEditItem] = useState(null);

  const loadManage = () => api.get("/points/manage", { params: mq ? { q: mq } : {} }).then((r) => setManageRows(r.data)).catch(() => {});
  const saveEdit = async () => {
    if (!String(editItem.reason || "").trim()) { toast.error("Alasan wajib diisi"); return; }
    try {
      await api.patch(`/points/${editItem.id}`, { points: Number(editItem.points), category: editItem.category, reason: editItem.reason });
      toast.success("Poin diperbarui"); setEditItem(null); loadManage(); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal memperbarui"); }
  };
  const delPoint = async (id) => {
    if (!window.confirm("Hapus entri poin ini? Tindakan tidak bisa dibatalkan.")) return;
    try { await api.delete(`/points/${id}`); toast.success("Poin dihapus"); loadManage(); load(); }
    catch (e) { toast.error("Gagal menghapus"); }
  };

  const load = () => api.get("/points/leaderboard").then((r) => setBoard(r.data)).catch(() => {});
  useEffect(() => {
    load();
    if (isStudent) api.get("/points/me").then((r) => setMine(r.data)).catch(() => {});
    if (canAward) api.get("/users?role=siswa").then((r) => setStudents(r.data)).catch(() => {});
  }, []); // eslint-disable-line

  const submit = async () => {
    if (!form.user_id) { toast.error("Pilih siswa"); return; }
    if (!form.reason.trim()) { toast.error("Alasan wajib diisi"); return; }
    try {
      await api.post("/points", { ...form, points: Number(form.points) });
      toast.success("Poin diberikan");
      setModal(false); setForm({ user_id: "", points: 10, category: "prestasi", reason: "" });
      load();
      if (isStudent) api.get("/points/me").then((r) => setMine(r.data));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal memberi poin");
    }
  };

  return (
    <div className="space-y-6" data-testid="leaderboard-root">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500" /> Papan Peringkat
          </h1>
          <p className="mt-1 text-slate-500 text-sm">Poin prestasi & kedisiplinan siswa — semangat berprestasi!</p>
        </div>
        {canAward && (
          <button data-testid="award-open-btn" onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">
            <Plus className="w-4 h-4" /> Beri Poin
          </button>
        )}
      </div>

      {isStudent && mine && (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-lg shadow-amber-500/20 flex items-center gap-4" data-testid="my-points">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center"><Star className="w-7 h-7" /></div>
          <div>
            <p className="text-sm text-amber-100">Total Poin Saya</p>
            <p className="font-heading text-4xl font-extrabold">{mine.total}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <TabBtn active={tab === "siswa"} onClick={() => setTab("siswa")} icon={Users} label="Per Siswa" testid="tab-siswa" />
        <TabBtn active={tab === "kelas"} onClick={() => setTab("kelas")} icon={GraduationCap} label="Per Kelas" testid="tab-kelas" />
        {canAward && <TabBtn active={tab === "kelola"} onClick={() => { setTab("kelola"); loadManage(); }} icon={Pencil} label="Kelola Poin" testid="tab-kelola" />}
      </div>

      {tab === "kelola" && canAward && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm" data-testid="board-kelola">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input data-testid="manage-search" value={mq} onChange={(e) => setMq(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadManage()}
                placeholder="Cari nama siswa / kelas / alasan..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <button data-testid="manage-search-btn" onClick={loadManage} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Cari</button>
          </div>
          {manageRows.length === 0 ? <p className="text-sm text-slate-400 italic py-6 text-center">Belum ada entri poin.</p> : (
            <div className="space-y-2">
              {manageRows.map((p) => (
                <div key={p.id} data-testid={`manage-row-${p.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{p.user_name} <span className="text-xs text-slate-400 font-normal">· {p.kelas || "—"}</span></p>
                    <p className="text-xs text-slate-500 truncate">{p.reason} <span className="text-slate-300">·</span> <span className="capitalize">{p.category}</span> <span className="text-slate-300">·</span> {(p.created_at || "").slice(0, 10)}</p>
                  </div>
                  <span className={`font-heading font-extrabold text-lg ${p.points < 0 ? "text-rose-600" : "text-amber-600"}`}>{p.points > 0 ? `+${p.points}` : p.points}</span>
                  <button data-testid={`manage-edit-${p.id}`} onClick={() => setEditItem({ ...p })} className="p-2 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"><Pencil className="w-4 h-4" /></button>
                  <button data-testid={`manage-del-${p.id}`} onClick={() => delPoint(p.id)} className="p-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "siswa" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm" data-testid="board-siswa">
          {board.students.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {board.students.map((s, i) => (
                <div key={s.user_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <RankBadge rank={i} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.kelas || "—"}</p>
                  </div>
                  <span className="font-heading font-extrabold text-lg text-amber-600">{s.total}<span className="text-xs text-slate-400 ml-1">poin</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "kelas" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm" data-testid="board-kelas">
          {board.classes.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {board.classes.map((c, i) => (
                <div key={c.kelas + i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <RankBadge rank={i} />
                  <p className="flex-1 font-semibold text-slate-900">{c.kelas}</p>
                  <span className="font-heading font-extrabold text-lg text-sky-600">{c.total}<span className="text-xs text-slate-400 ml-1">poin</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="edit-point-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-slate-900">Ubah Poin — {editItem.user_name}</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <L label="Poin (boleh minus)">
                  <input type="number" data-testid="edit-points" value={editItem.points} onChange={(e) => setEditItem({ ...editItem, points: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </L>
                <L label="Kategori">
                  <select data-testid="edit-category" value={editItem.category} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                    {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </L>
              </div>
              <L label="Alasan">
                <input data-testid="edit-reason" value={editItem.reason} onChange={(e) => setEditItem({ ...editItem, reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              </L>
            </div>
            <button data-testid="edit-save" onClick={saveEdit} className="mt-5 w-full py-2.5 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors">Simpan Perubahan</button>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="award-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-slate-900">Beri Poin Siswa</h3>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <L label="Siswa">
                <select data-testid="award-student" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                  <option value="">— Pilih siswa —</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.kelas ? `(${s.kelas})` : ""}</option>)}
                </select>
              </L>
              <div className="grid grid-cols-2 gap-3">
                <L label="Poin (boleh minus)">
                  <input type="number" data-testid="award-points" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
                </L>
                <L label="Kategori">
                  <select data-testid="award-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
                    {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </L>
              </div>
              <L label="Alasan">
                <input data-testid="award-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" placeholder="Juara 1 lomba cerdas cermat" />
              </L>
            </div>
            <button data-testid="award-submit" onClick={submit} className="mt-5 w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Berikan Poin</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, testid }) {
  return (
    <button data-testid={testid} onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${active ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function RankBadge({ rank }) {
  if (rank < 3) {
    return (
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${RANK_COLORS[rank]} shadow flex items-center justify-center text-white shrink-0`}>
        {rank === 0 ? <Trophy className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
      </div>
    );
  }
  return <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-heading font-bold text-slate-500 shrink-0">{rank + 1}</div>;
}

function Empty() {
  return <p className="text-sm text-slate-400 italic py-6 text-center">Belum ada poin. Guru/Admin bisa mulai memberi poin.</p>;
}

function L({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
