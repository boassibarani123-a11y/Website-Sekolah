import { useEffect, useState, useCallback } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Library, BookCopy, BookUp, AlertTriangle, Clock, LayoutGrid, Plus, Pencil, Trash2,
  Download, RotateCcw, HandCoins, Settings2, TrendingUp, Loader2, Flame,
} from "lucide-react";
import { BookCover, formatRp, LoanStatusBadge, catBadge } from "@/components/library/shared";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const EMPTY_BOOK = { title: "", author: "", isbn: "", category: "Umum", publisher: "", year: "", total_copies: 1, location: "", description: "" };
const CATS = ["Umum", "Novel", "Pelajaran", "Sejarah", "Sains", "Pengembangan Diri"];

function StatCard({ icon: Icon, label, value, tone, delay }) {
  const tones = {
    sky: "from-sky-500 to-sky-600", emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-orange-600", rose: "from-rose-500 to-rose-600",
    violet: "from-violet-500 to-violet-600", indigo: "from-indigo-500 to-indigo-600",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tones[tone]} flex items-center justify-center text-white shadow`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-extrabold text-slate-900 mt-3 font-heading">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </motion.div>
  );
}

export default function LibraryAdmin({ config, setConfig, reload }) {
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [returned, setReturned] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lend, setLend] = useState({ student_id: "", book_id: "" });
  const [cfgForm, setCfgForm] = useState(config);

  const loadAll = useCallback(() => {
    api.get("/library/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/books").then((r) => setBooks(r.data)).catch(() => {});
    api.get("/loans?status=active").then((r) => setLoans(r.data)).catch(() => {});
    api.get("/loans?status=returned").then((r) => setReturned(r.data)).catch(() => {});
    api.get("/reservations").then((r) => setReservations(r.data)).catch(() => {});
    api.get("/users?role=siswa").then((r) => setStudents(r.data)).catch(() => {});
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setCfgForm(config); }, [config]);

  const saveBook = async () => {
    if (!form.title?.trim()) return toast.error("Judul wajib diisi");
    setSaving(true);
    const payload = { ...form, year: form.year ? Number(form.year) : null, total_copies: Number(form.total_copies) || 1 };
    try {
      if (form.id) await api.patch(`/books/${form.id}`, payload);
      else await api.post("/books", payload);
      toast.success(form.id ? "Buku diperbarui" : "Buku ditambahkan");
      setForm(null); loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); } finally { setSaving(false); }
  };
  const delBook = async (b) => {
    if (!window.confirm(`Hapus "${b.title}"?`)) return;
    try { await api.delete(`/books/${b.id}`); toast.success("Buku dihapus"); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };
  const doLend = async () => {
    if (!lend.student_id || !lend.book_id) return toast.error("Pilih siswa & buku");
    try {
      await api.post("/loans", lend);
      toast.success("Peminjaman dicatat");
      setLend({ student_id: "", book_id: "" }); loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal meminjamkan"); }
  };
  const doReturn = async (l) => {
    try {
      const r = await api.post(`/loans/${l.id}/return`);
      toast.success("Buku dikembalikan", { description: r.data.fine > 0 ? `Denda: ${formatRp(r.data.fine)} (${r.data.days_late} hari telat)` : "Tepat waktu, tanpa denda." });
      loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const cancelResv = async (id) => {
    try { await api.delete(`/reservations/${id}`); toast.success("Reservasi dibatalkan"); loadAll(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };
  const exportExcel = async () => {
    try {
      const r = await api.get("/library/loans/export", { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a"); a.href = url; a.download = "Perpustakaan_Sirkulasi.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Gagal mengekspor"); }
  };
  const saveCfg = async () => {
    try {
      const r = await api.patch("/library/config", {
        loan_days: Number(cfgForm.loan_days), max_books: Number(cfgForm.max_books), fine_per_day: Number(cfgForm.fine_per_day),
      });
      setConfig(r.data); toast.success("Pengaturan disimpan"); reload?.();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };

  const availBooks = books.filter((b) => b.available_copies > 0);
  const overdueLoans = loans.filter((l) => l.overdue);
  const _bmap = {};
  loans.forEach((l) => {
    const k = l.borrower_id || l.borrower_name;
    if (!_bmap[k]) _bmap[k] = { name: l.borrower_name, kelas: l.kelas, count: 0, overdue: 0 };
    _bmap[k].count += 1;
    if (l.overdue) _bmap[k].overdue += 1;
  });
  const activeBorrowers = Object.values(_bmap).sort((a, b) => b.overdue - a.overdue || b.count - a.count);
  const daysLate = (due) => { try { return Math.max(0, Math.floor((new Date() - new Date(due)) / 86400000)); } catch { return 0; } };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl">
        <TabsTrigger value="overview" data-testid="tab-overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><TrendingUp className="w-4 h-4 mr-1.5" />Ringkasan</TabsTrigger>
        <TabsTrigger value="catalog" data-testid="tab-manage-books" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><LayoutGrid className="w-4 h-4 mr-1.5" />Kelola Buku</TabsTrigger>
        <TabsTrigger value="circulation" data-testid="tab-circulation" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><HandCoins className="w-4 h-4 mr-1.5" />Sirkulasi</TabsTrigger>
        <TabsTrigger value="reservations" data-testid="tab-reservations" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><Clock className="w-4 h-4 mr-1.5" />Reservasi</TabsTrigger>
        <TabsTrigger value="settings" data-testid="tab-settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><Settings2 className="w-4 h-4 mr-1.5" />Pengaturan</TabsTrigger>
      </TabsList>

      {/* ---- OVERVIEW ---- */}
      <TabsContent value="overview" className="mt-5 space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm" data-testid="overdue-panel">
            <h3 className="font-heading font-bold text-slate-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500" />Buku Terlambat
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{overdueLoans.length}</span>
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {overdueLoans.length === 0 && <p className="text-sm text-emerald-600">🎉 Tidak ada buku yang terlambat. Kerja bagus!</p>}
              {overdueLoans.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-rose-50/60 border border-rose-100" data-testid={`overdue-row-${l.id}`}>
                  <div className="w-8 h-11 rounded overflow-hidden shrink-0"><BookCover book={{ title: l.book_title, cover_url: l.book_cover }} className="w-full h-full" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{l.book_title}</p>
                    <p className="text-xs text-slate-500 truncate">{l.borrower_name}{l.kelas ? ` · ${l.kelas}` : ""}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">{daysLate(l.due_date)} hari</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">tempo {l.due_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" data-testid="active-borrowers-panel">
            <h3 className="font-heading font-bold text-slate-800 flex items-center gap-2 mb-3">
              <BookUp className="w-5 h-5 text-sky-600" />Peminjam Aktif
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{activeBorrowers.length}</span>
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeBorrowers.length === 0 && <p className="text-sm text-slate-400">Belum ada peminjaman aktif.</p>}
              {activeBorrowers.map((b, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50" data-testid={`active-borrower-${i}`}>
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm shrink-0">{(b.name || "?")[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{b.name}</p>
                    <p className="text-xs text-slate-500 truncate">{b.kelas || "—"}</p>
                  </div>
                  {b.overdue > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{b.overdue} telat</span>}
                  <span className="text-xs font-bold text-sky-600 shrink-0">{b.count} buku</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={Library} label="Judul Buku" value={stats.total_titles} tone="indigo" delay={0} />
              <StatCard icon={BookCopy} label="Total Eksemplar" value={stats.total_copies} tone="sky" delay={0.05} />
              <StatCard icon={BookUp} label="Sedang Dipinjam" value={stats.borrowed} tone="amber" delay={0.1} />
              <StatCard icon={AlertTriangle} label="Terlambat" value={stats.overdue} tone="rose" delay={0.15} />
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-heading font-bold text-slate-800 flex items-center gap-2 mb-4"><Flame className="w-5 h-5 text-orange-500" />Buku Terpopuler</h3>
                <div className="space-y-2">
                  {stats.popular.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                      <div className="w-8 h-11 rounded overflow-hidden shrink-0"><BookCover book={b} className="w-full h-full" /></div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{b.title}</p><p className="text-xs text-slate-400 truncate">{b.author}</p></div>
                      <span className="text-xs font-bold text-sky-600">{b.borrow_count}x</span>
                    </div>
                  ))}
                  {stats.popular.length === 0 && <p className="text-sm text-slate-400">Belum ada data peminjaman.</p>}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-heading font-bold text-slate-800 mb-4">Koleksi per Kategori</h3>
                <div className="space-y-3">
                  {stats.by_category.map((c) => {
                    const pct = Math.round((c.value / Math.max(1, stats.total_titles)) * 100);
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{c.name}</span><span className="font-semibold text-slate-800">{c.value}</span></div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                  <div><p className="text-xl font-extrabold text-emerald-600">{stats.available}</p><p className="text-[11px] text-slate-400">Tersedia</p></div>
                  <div><p className="text-xl font-extrabold text-violet-600">{stats.reservations}</p><p className="text-[11px] text-slate-400">Antre Reservasi</p></div>
                </div>
              </div>
            </div>
          </>
        )}
      </TabsContent>

      {/* ---- MANAGE BOOKS ---- */}
      <TabsContent value="catalog" className="mt-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{books.length} judul dalam koleksi</p>
          <Button data-testid="add-book-button" onClick={() => setForm({ ...EMPTY_BOOK })} className="bg-sky-600 hover:bg-sky-700 rounded-xl"><Plus className="w-4 h-4 mr-1" />Tambah Buku</Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {books.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm flex gap-3" data-testid={`manage-book-${b.id}`}>
              <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0"><BookCover book={b} className="w-full h-full" /></div>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold border ${catBadge(b.category)}`}>{b.category}</span>
                <p className="text-sm font-bold text-slate-800 truncate mt-1">{b.title}</p>
                <p className="text-xs text-slate-400 truncate">{b.author}</p>
                <p className="text-[11px] text-slate-500 mt-1">{b.available_copies}/{b.total_copies} tersedia · {b.location || "—"}</p>
                <div className="flex gap-1 mt-auto pt-2">
                  <button data-testid={`edit-book-${b.id}`} onClick={() => setForm({ ...EMPTY_BOOK, ...b })} className="flex-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg py-1.5 flex items-center justify-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                  <button data-testid={`delete-book-${b.id}`} onClick={() => delBook(b)} className="text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg py-1.5 px-2.5 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      {/* ---- CIRCULATION ---- */}
      <TabsContent value="circulation" className="mt-5 space-y-6">
        <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl border border-sky-200 p-5">
          <h3 className="font-heading font-bold text-slate-800 mb-3 flex items-center gap-2"><BookUp className="w-5 h-5 text-sky-600" />Meja Peminjaman</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Select value={lend.student_id} onValueChange={(v) => setLend((s) => ({ ...s, student_id: v }))}>
              <SelectTrigger data-testid="lend-student-select" className="bg-white"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} {s.kelas ? `· ${s.kelas}` : ""}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={lend.book_id} onValueChange={(v) => setLend((s) => ({ ...s, book_id: v }))}>
              <SelectTrigger data-testid="lend-book-select" className="bg-white"><SelectValue placeholder="Pilih buku tersedia" /></SelectTrigger>
              <SelectContent>{availBooks.map((b) => <SelectItem key={b.id} value={b.id}>{b.title} ({b.available_copies})</SelectItem>)}</SelectContent>
            </Select>
            <Button data-testid="lend-submit-button" onClick={doLend} className="bg-sky-600 hover:bg-sky-700 rounded-xl">Pinjamkan</Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-heading font-bold text-slate-800">Sedang Dipinjam ({loans.length})</h3>
            <Button data-testid="export-loans-button" onClick={exportExcel} variant="outline" size="sm" className="rounded-lg"><Download className="w-4 h-4 mr-1" />Export Excel</Button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
            {loans.map((l) => (
              <div key={l.id} className={`flex items-center gap-3 p-3 ${l.overdue ? "bg-rose-50/50" : ""}`} data-testid={`loan-row-${l.id}`}>
                <div className="w-9 h-12 rounded overflow-hidden shrink-0"><BookCover book={{ title: l.book_title, cover_url: l.book_cover }} className="w-full h-full" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{l.book_title}</p>
                  <p className="text-xs text-slate-500 truncate">{l.borrower_name} {l.kelas ? `· ${l.kelas}` : ""} · tempo {l.due_date}</p>
                </div>
                <LoanStatusBadge loan={l} />
                <Button data-testid={`return-loan-${l.id}`} onClick={() => doReturn(l)} size="sm" variant="outline" className="rounded-lg text-emerald-700 border-emerald-300 hover:bg-emerald-50"><RotateCcw className="w-3.5 h-3.5 mr-1" />Kembalikan</Button>
              </div>
            ))}
            {loans.length === 0 && <p className="text-sm text-slate-400 p-6 text-center">Tidak ada buku yang sedang dipinjam.</p>}
          </div>
        </div>

        {returned.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="font-heading font-bold text-slate-800 p-4 border-b border-slate-100">Riwayat Pengembalian</h3>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {returned.slice(0, 50).map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 text-sm">
                  <div className="flex-1 min-w-0"><p className="font-medium text-slate-700 truncate">{l.book_title}</p><p className="text-xs text-slate-400">{l.borrower_name} · kembali {(l.returned_at || "").slice(0, 10)}</p></div>
                  {l.fine > 0 ? <span className="text-xs font-semibold text-rose-600">{formatRp(l.fine)}</span> : <span className="text-xs text-emerald-600">Tanpa denda</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ---- RESERVATIONS ---- */}
      <TabsContent value="reservations" className="mt-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <h3 className="font-heading font-bold text-slate-800 p-4 border-b border-slate-100">Antrean Reservasi ({reservations.length})</h3>
          <div className="divide-y divide-slate-100">
            {reservations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3" data-testid={`reservation-row-${r.id}`}>
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{r.book_title}</p><p className="text-xs text-slate-500">{r.user_name} {r.kelas ? `· ${r.kelas}` : ""}</p></div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">{r.status}</span>
                <button onClick={() => cancelResv(r.id)} className="text-rose-500 hover:bg-rose-50 rounded-lg p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {reservations.length === 0 && <p className="text-sm text-slate-400 p-6 text-center">Tidak ada reservasi aktif.</p>}
          </div>
        </div>
      </TabsContent>

      {/* ---- SETTINGS ---- */}
      <TabsContent value="settings" className="mt-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg">
          <h3 className="font-heading font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings2 className="w-5 h-5 text-sky-600" />Kebijakan Perpustakaan</h3>
          <div className="space-y-4">
            <Field label="Lama Peminjaman (hari)"><Input data-testid="cfg-loan-days" type="number" value={cfgForm?.loan_days ?? ""} onChange={(e) => setCfgForm((c) => ({ ...c, loan_days: e.target.value }))} /></Field>
            <Field label="Maks. Buku per Anggota"><Input data-testid="cfg-max-books" type="number" value={cfgForm?.max_books ?? ""} onChange={(e) => setCfgForm((c) => ({ ...c, max_books: e.target.value }))} /></Field>
            <Field label="Denda per Hari (Rp)"><Input data-testid="cfg-fine" type="number" value={cfgForm?.fine_per_day ?? ""} onChange={(e) => setCfgForm((c) => ({ ...c, fine_per_day: e.target.value }))} /></Field>
            <Button data-testid="save-config-button" onClick={saveCfg} className="bg-slate-900 hover:bg-slate-800 rounded-xl w-full">Simpan Pengaturan</Button>
          </div>
        </div>
      </TabsContent>

      {/* ---- BOOK FORM MODAL ---- */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="book-form-modal">
          <DialogHeader><DialogTitle>{form?.id ? "Edit Buku" : "Tambah Buku Baru"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <Field label="Judul *"><Input data-testid="book-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Penulis"><Input value={form.author || ""} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
                <Field label="Kategori">
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger data-testid="book-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Penerbit"><Input value={form.publisher || ""} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></Field>
                <Field label="Tahun"><Input type="number" value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Jumlah Eksemplar"><Input data-testid="book-copies-input" type="number" min={1} value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: e.target.value })} /></Field>
                <Field label="Lokasi Rak"><Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
              </div>
              <Field label="Deskripsi"><Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Button data-testid="save-book-button" onClick={saveBook} disabled={saving} className="w-full bg-sky-600 hover:bg-sky-700 rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Buku"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-600 mb-1 block">{label}</span>{children}</label>;
}
