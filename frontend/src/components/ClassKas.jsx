import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PiggyBank, TrendingUp, TrendingDown, Pencil, Trash2, Download, Lock, Wallet } from "lucide-react";
import { TxEditModal } from "@/components/TxEditModal";
import { WeeklyKas } from "@/components/WeeklyKas";
import { MonthlyKas } from "@/components/MonthlyKas";
import { KasChart } from "@/components/KasChart";

const rupiah = (n) => `Rp ${(n || 0).toLocaleString("id-ID")}`;

export function ClassKas({ klass }) {
  const { user } = useAuth();
  const isKetua = user.role === "ketua_kelas" && user.kelas === klass.name;
  const canManage = klass.can_manage_kas ?? isKetua;
  const canSetTreasurer = klass.can_set_treasurer ?? (user.role === "super_admin" || isKetua);
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ amount: 0, note: "", type: "masuk" });
  const [editing, setEditing] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [treasurer, setTreasurer] = useState({ id: klass.treasurer_id || "", name: klass.treasurer_name || "" });
  const [pickId, setPickId] = useState("");
  const canSeeWeekly = canManage || user.role === "super_admin";
  const load = () => {
    api.get(`/classes/${klass.id}/kas`).then(r => setRows(r.data)).catch(() => {});
    setRefreshKey(k => k + 1);
    if (canSeeWeekly) api.get(`/classes/${klass.id}/kas/weekly`).then(r => setWeekly(r.data)).catch(() => {});
  };
  const payWeekly = async (s, amount) => {
    try { await api.post(`/classes/${klass.id}/kas`, { amount, type: "masuk", note: `Kas mingguan - ${s.name}`, student_id: s.id }); toast.success(`${s.name} tercatat sudah bayar`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal mencatat"); }
  };
  const students = weekly ? [...weekly.unpaid, ...weekly.paid].sort((a, b) => a.name.localeCompare(b.name)) : [];
  useEffect(() => { load(); }, [klass.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const masuk = rows.filter(r => r.type === "masuk").reduce((s, r) => s + r.amount, 0);
  const keluar = rows.filter(r => r.type === "keluar").reduce((s, r) => s + r.amount, 0);

  const submit = async () => {
    if (!f.amount || f.amount <= 0) return toast.error("Isi jumlah");
    const body = { ...f, student_id: f.type === "masuk" && f.student_id ? f.student_id : null };
    try { await api.post(`/classes/${klass.id}/kas`, body); toast.success("Transaksi tercatat"); setF({ ...f, amount: 0, note: "", student_id: "" }); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal mencatat"); }
  };
  const remove = async (r) => {
    if (!window.confirm(`Hapus transaksi "${r.note || r.type}" sebesar ${rupiah(r.amount)}?`)) return;
    try { await api.delete(`/kas/${r.id}`); toast.success("Transaksi dihapus"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  const exportXlsx = async () => {
    const r = await api.get(`/classes/${klass.id}/kas/export`, { responseType: "blob" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(r.data); a.download = `Uang_Kas_${klass.name}.xlsx`; a.click();
  };
  const setBendahara = async () => {
    if (!pickId) return toast.error("Pilih siswa dulu");
    try {
      const r = await api.put(`/classes/${klass.id}/treasurer`, { student_id: pickId });
      setTreasurer({ id: r.data.treasurer_id, name: r.data.treasurer_name });
      setPickId("");
      toast.success(`${r.data.treasurer_name} ditunjuk sebagai Bendahara`);
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menunjuk bendahara"); }
  };
  const removeBendahara = async () => {
    if (!window.confirm("Hapus jabatan Bendahara dari siswa ini?")) return;
    try {
      await api.delete(`/classes/${klass.id}/treasurer`);
      setTreasurer({ id: "", name: "" });
      toast.success("Jabatan Bendahara dihapus");
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-5" data-testid="class-kas-tab">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white p-5 rounded-2xl shadow-lg">
          <PiggyBank className="w-7 h-7 opacity-80" />
          <p className="text-xs uppercase tracking-wide mt-2">Saldo Kas</p>
          <p data-testid="kas-balance" className="font-heading text-2xl font-extrabold mt-1">{rupiah(masuk - keluar)}</p>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl"><p className="text-xs uppercase text-slate-500">Total Masuk</p><p className="font-heading text-xl font-bold text-emerald-600 mt-1">{rupiah(masuk)}</p></div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl"><p className="text-xs uppercase text-slate-500">Total Keluar</p><p className="font-heading text-xl font-bold text-rose-600 mt-1">{rupiah(keluar)}</p></div>
      </div>

      {/* Bendahara (treasurer) management */}
      <div data-testid="bendahara-section" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 text-sky-600" />
          <h3 className="font-heading font-bold">Bendahara Kelas</h3>
        </div>
        {treasurer.id ? (
          <div className="flex items-center justify-between gap-3 mt-2">
            <p data-testid="bendahara-current" className="text-sm text-slate-700">
              Bendahara saat ini: <b className="text-sky-700">{treasurer.name}</b>
              <span className="text-xs text-slate-500 block">Bendahara &amp; Ketua Kelas sama-sama dapat menambah, mengedit &amp; menghapus uang kas.</span>
            </p>
            {canSetTreasurer && (
              <button data-testid="bendahara-remove" onClick={removeBendahara}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />Lepas Jabatan
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mt-1">Belum ada Bendahara yang ditunjuk.</p>
        )}
        {canSetTreasurer && (
          <div className="flex flex-wrap gap-2 mt-3">
            <select data-testid="bendahara-select" value={pickId} onChange={e => setPickId(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg bg-white text-sm min-w-[220px]">
              <option value="">— Pilih siswa untuk jadi Bendahara —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button data-testid="bendahara-set" onClick={setBendahara}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-sm">
              {treasurer.id ? "Ganti Bendahara" : "Tunjuk Bendahara"}
            </button>
            {students.length === 0 && <p className="text-xs text-slate-400 self-center">Daftar siswa dimuat dari rekap mingguan.</p>}
          </div>
        )}
      </div>

      {canManage ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-heading font-bold mb-3">Catat Transaksi</h3>
          <div className="grid sm:grid-cols-5 gap-3">
            <input data-testid="kas-amount-input" type="number" placeholder="Jumlah (Rp)" value={f.amount || ""} onChange={e => setF({ ...f, amount: +e.target.value })} className="px-3 py-2 border-2 border-slate-200 rounded-lg" />
            <select data-testid="kas-type-select" value={f.type} onChange={e => setF({ ...f, type: e.target.value })} className="px-3 py-2 border-2 border-slate-200 rounded-lg bg-white">
              <option value="masuk">Masuk</option><option value="keluar">Keluar</option>
            </select>
            <select data-testid="kas-student-select" value={f.student_id || ""} disabled={f.type !== "masuk"} onChange={e => setF({ ...f, student_id: e.target.value })} className="px-3 py-2 border-2 border-slate-200 rounded-lg bg-white disabled:bg-slate-50">
              <option value="">— Dari siswa (opsional) —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input data-testid="kas-note-input" placeholder="Keterangan" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} className="px-3 py-2 border-2 border-slate-200 rounded-lg" />
            <button data-testid="kas-add-button" onClick={submit} className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold">Simpan</button>
          </div>
        </div>
      ) : (
        <p data-testid="kas-readonly-note" className="text-sm text-slate-500 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          <Lock className="w-4 h-4" />Hanya Ketua Kelas atau Bendahara {klass.name} yang dapat menambah, mengedit, atau menghapus uang kas.
        </p>
      )}

      {canSeeWeekly && <WeeklyKas classId={klass.id} data={weekly} canPay={canManage} onPay={payWeekly} />}
      <KasChart classId={klass.id} refreshKey={refreshKey} />
      {canSeeWeekly && <MonthlyKas classId={klass.id} refreshKey={refreshKey} />}

      <div className="flex justify-end">
        <button data-testid="kas-export-button" onClick={exportXlsx} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><Download className="w-4 h-4" />Export Excel</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y">
        {rows.length === 0 && <p className="p-6 text-slate-400 italic text-center">Belum ada transaksi.</p>}
        {rows.map(r => (
          <div key={r.id} data-testid={`kas-row-${r.id}`} className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {r.type === "masuk" ? <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" /> : <TrendingDown className="w-5 h-5 text-rose-600 shrink-0" />}
              <div className="min-w-0"><p className="font-semibold text-sm truncate">{r.note || (r.type === "masuk" ? "Setoran" : "Pengeluaran")}</p>
                <p className="text-xs text-slate-500">{r.student_name ? `${r.student_name} · ` : ""}{r.recorded_by} · {new Date(r.created_at).toLocaleDateString("id-ID")}{r.updated_at ? " · diedit" : ""}</p></div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className={`font-heading font-bold ${r.type === "masuk" ? "text-emerald-600" : "text-rose-600"}`}>{r.type === "masuk" ? "+" : "−"} {rupiah(r.amount)}</p>
              {canManage && <>
                <button data-testid={`kas-edit-${r.id}`} onClick={() => setEditing(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
                <button data-testid={`kas-delete-${r.id}`} onClick={() => remove(r)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
              </>}
            </div>
          </div>
        ))}
      </div>
      {editing && <TxEditModal tx={editing} onClose={() => setEditing(null)}
        onSave={async (body) => { await api.patch(`/kas/${editing.id}`, body); toast.success("Transaksi diperbarui"); setEditing(null); load(); }} />}
    </div>
  );
}
