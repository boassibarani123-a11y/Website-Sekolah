import { useEffect, useState, useCallback } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Search, Sparkles, Library as LibraryIcon, BookMarked, Clock, RotateCcw,
  Loader2, Wand2, CalendarClock, X,
} from "lucide-react";
import { BookCover, Stars, catBadge, formatRp, LoanStatusBadge } from "@/components/library/shared";
import BookDetailModal from "@/components/library/BookDetailModal";
import LibraryAdmin from "@/pages/LibraryAdmin";

const ADMIN = ["admin_perpus", "super_admin"];

function BookCard({ book, onOpen, index }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.4) }}
      whileHover={{ y: -4 }} onClick={() => onOpen(book.id)} data-testid={`book-card-${book.id}`}
      className="group text-left bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-sky-300 transition-all">
      <div className="h-44 relative"><BookCover book={book} className="w-full h-full" />
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catBadge(book.category)}`}>{book.category}</span>
        {book.available_copies <= 0 && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-600 text-white">Habis</span>}
      </div>
      <div className="p-3">
        <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-sky-700 transition-colors">{book.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{book.author || "—"}</p>
        <div className="flex items-center justify-between mt-2">
          <span className={`text-[11px] font-semibold ${book.available_copies > 0 ? "text-emerald-600" : "text-rose-500"}`}>{book.available_copies > 0 ? `${book.available_copies} tersedia` : "Antre"}</span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1"><BookMarked className="w-3 h-3" />{book.borrow_count || 0}</span>
        </div>
      </div>
    </motion.button>
  );
}

function Catalog({ config, onChanged }) {
  const [books, setBooks] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [reco, setReco] = useState(null);
  const [recoBusy, setRecoBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat && cat !== "Semua") p.set("category", cat);
    if (onlyAvail) p.set("available", "true");
    api.get(`/books?${p.toString()}`).then((r) => setBooks(r.data)).finally(() => setLoading(false));
  }, [q, cat, onlyAvail]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get("/books/categories").then((r) => setCats(r.data)).catch(() => {}); }, []);

  const getReco = async () => {
    setRecoBusy(true);
    try { const r = await api.get("/library/ai-recommendations"); setReco(r.data.recommendations); }
    catch (e) { toast.error(e.response?.data?.detail || "AI belum aktif"); } finally { setRecoBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 p-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 opacity-20"><Wand2 className="w-32 h-32" /></div>
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div><h3 className="font-heading font-bold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5" />Rekomendasi Pintar untukmu</h3>
            <p className="text-sm text-white/80">AI memilih buku sesuai riwayat bacaanmu.</p></div>
          <Button data-testid="ai-reco-button" onClick={getReco} disabled={recoBusy} className="bg-white text-violet-700 hover:bg-violet-50 rounded-xl font-semibold">
            {recoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dapatkan Rekomendasi"}
          </Button>
        </div>
        {reco && <div className="relative mt-4 bg-white/15 backdrop-blur rounded-xl p-4 text-sm whitespace-pre-line leading-relaxed">{reco}</div>}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input data-testid="book-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, penulis, ISBN..." className="pl-9 rounded-xl" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger data-testid="category-filter" className="w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="Semua">Semua Kategori</SelectItem>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <button data-testid="avail-toggle" onClick={() => setOnlyAvail((v) => !v)}
          className={`px-4 h-9 rounded-xl text-sm font-medium border transition-colors ${onlyAvail ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>Tersedia saja</button>
      </div>

      {loading ? <div className="h-60 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
        : books.length === 0 ? <div className="text-center py-16 text-slate-400"><BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />Tidak ada buku ditemukan.</div>
          : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">{books.map((b, i) => <BookCard key={b.id} book={b} index={i} onOpen={setOpenId} />)}</div>}

      <BookDetailModal bookId={openId} open={!!openId} config={config} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged?.(); }} />
    </div>
  );
}

function MyLoans({ refreshKey }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); api.get("/loans/my").then((r) => setLoans(r.data)).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const doReturn = async (l) => {
    try {
      const r = await api.post(`/loans/${l.id}/return`);
      toast.success("Buku dikembalikan", { description: r.data.fine > 0 ? `Denda: ${formatRp(r.data.fine)} (${r.data.days_late} hari telat)` : "Tepat waktu, tanpa denda." });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal"); }
  };

  const active = loans.filter((l) => l.status === "dipinjam");
  const history = loans.filter((l) => l.status !== "dipinjam");
  if (loading) return <div className="h-40 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading font-bold text-slate-800 mb-3 flex items-center gap-2"><BookMarked className="w-5 h-5 text-sky-600" />Sedang Dipinjam ({active.length})</h3>
        {active.length === 0 ? <p className="text-sm text-slate-400">Kamu belum meminjam buku apa pun.</p>
          : <div className="grid sm:grid-cols-2 gap-3">
            {active.map((l) => (
              <div key={l.id} className={`bg-white rounded-2xl border p-3 flex gap-3 shadow-sm ${l.overdue ? "border-rose-300" : "border-slate-200"}`} data-testid={`my-loan-${l.id}`}>
                <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0"><BookCover book={{ title: l.book_title, cover_url: l.book_cover }} className="w-full h-full" /></div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="text-sm font-bold text-slate-800 line-clamp-2">{l.book_title}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><CalendarClock className="w-3 h-3" />Jatuh tempo: {l.due_date}</p>
                  <div className="mt-1"><LoanStatusBadge loan={l} /></div>
                  <Button data-testid={`return-my-loan-${l.id}`} onClick={() => doReturn(l)} size="sm" className="mt-auto bg-emerald-600 hover:bg-emerald-700 rounded-lg h-8"><RotateCcw className="w-3.5 h-3.5 mr-1" />Kembalikan</Button>
                </div>
              </div>
            ))}
          </div>}
      </div>
      {history.length > 0 && (
        <div>
          <h3 className="font-heading font-bold text-slate-800 mb-3">Riwayat</h3>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
            {history.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 text-sm">
                <div className="flex-1 min-w-0"><p className="font-medium text-slate-700 truncate">{l.book_title}</p><p className="text-xs text-slate-400">Kembali: {(l.returned_at || "").slice(0, 10)}</p></div>
                {l.fine > 0 ? <span className="text-xs font-semibold text-rose-600">{formatRp(l.fine)}</span> : <span className="text-xs text-emerald-600">Selesai</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MyReservations({ refreshKey }) {
  const [list, setList] = useState([]);
  const load = useCallback(() => api.get("/reservations").then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load, refreshKey]);
  const cancel = async (id) => { try { await api.delete(`/reservations/${id}`); toast.success("Reservasi dibatalkan"); load(); } catch { toast.error("Gagal"); } };
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-sm text-slate-400">Belum ada reservasi. Buku yang stoknya habis bisa kamu reservasi.</p>}
      {list.map((r) => (
        <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm" data-testid={`my-reservation-${r.id}`}>
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{r.book_title}</p><p className="text-xs text-slate-400">Status: {r.status}</p></div>
          <button onClick={() => cancel(r.id)} className="text-slate-400 hover:text-rose-500 p-1.5"><X className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

export default function Library() {
  const { user } = useAuth();
  const isAdmin = ADMIN.includes(user.role);
  const [config, setConfig] = useState({ loan_days: 7, max_books: 3, fine_per_day: 500, currency: "Rp" });
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  useEffect(() => { api.get("/library/config").then((r) => setConfig(r.data)).catch(() => {}); }, []);

  return (
    <div className="space-y-6" data-testid="library-page">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 p-6 sm:p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 14px)" }} />
        <div className="absolute -right-8 -bottom-10 opacity-15"><LibraryIcon className="w-56 h-56" /></div>
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold tracking-wide"><Sparkles className="w-3.5 h-3.5" />PERPUSTAKAAN PINTAR</span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">Pustaka Digital Sekolah</h1>
          <p className="text-indigo-100 mt-2 max-w-xl text-sm sm:text-base">
            {isAdmin ? "Kelola koleksi, sirkulasi, reservasi, dan kebijakan perpustakaan dalam satu dasbor cerdas."
              : "Jelajahi koleksi, pinjam & kembalikan buku, dan dapatkan rekomendasi bacaan dari AI."}
          </p>
          <div className="flex gap-5 mt-5 text-sm">
            <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4 text-sky-300" />Pinjam {config.loan_days} hari</span>
            <span className="flex items-center gap-1.5"><BookMarked className="w-4 h-4 text-sky-300" />Maks {config.max_books} buku</span>
            <span className="flex items-center gap-1.5 hidden sm:flex"><Clock className="w-4 h-4 text-sky-300" />Denda {formatRp(config.fine_per_day)}/hari</span>
          </div>
        </div>
      </motion.div>

      {isAdmin ? (
        <LibraryAdmin config={config} setConfig={setConfig} reload={bump} />
      ) : (
        <Tabs defaultValue="catalog" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="catalog" data-testid="tab-catalog" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><BookOpen className="w-4 h-4 mr-1.5" />Katalog</TabsTrigger>
            <TabsTrigger value="my-loans" data-testid="tab-my-loans" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><BookMarked className="w-4 h-4 mr-1.5" />Pinjaman Saya</TabsTrigger>
            <TabsTrigger value="my-reservations" data-testid="tab-my-reservations" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow"><Clock className="w-4 h-4 mr-1.5" />Reservasi</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog" className="mt-5"><Catalog config={config} onChanged={bump} /></TabsContent>
          <TabsContent value="my-loans" className="mt-5"><MyLoans refreshKey={tick} /></TabsContent>
          <TabsContent value="my-reservations" className="mt-5"><MyReservations refreshKey={tick} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
