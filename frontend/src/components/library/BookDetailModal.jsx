import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, MapPin, Calendar, Building2, BookMarked, Loader2, Send } from "lucide-react";
import { BookCover, Stars, catBadge, formatRp } from "@/components/library/shared";

export default function BookDetailModal({ bookId, open, onClose, onChanged, canReview = true, config }) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [acting, setActing] = useState(false);

  const load = () => {
    if (!bookId) return;
    setLoading(true);
    api.get(`/books/${bookId}`).then((r) => setBook(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { if (open && bookId) { setBook(null); setMyRating(0); setReviewText(""); load(); } }, [open, bookId]);

  const borrow = async () => {
    setActing(true);
    try {
      await api.post("/loans", { book_id: bookId });
      toast.success("Buku berhasil dipinjam 🎉", { description: `Harap kembalikan dalam ${config?.loan_days || 7} hari.` });
      onChanged?.(); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal meminjam"); } finally { setActing(false); }
  };
  const reserve = async () => {
    setActing(true);
    try {
      await api.post(`/books/${bookId}/reserve`);
      toast.success("Reservasi dibuat", { description: "Anda akan diberi tahu saat buku tersedia." });
      onChanged?.(); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal reservasi"); } finally { setActing(false); }
  };
  const aiSummary = async () => {
    setAiBusy(true);
    try {
      const r = await api.post(`/books/${bookId}/ai-summary`);
      setBook((b) => ({ ...b, ai_summary: r.data.summary }));
    } catch (e) { toast.error(e.response?.data?.detail || "AI belum aktif"); } finally { setAiBusy(false); }
  };
  const submitReview = async () => {
    if (!myRating) return toast.error("Pilih rating dulu");
    try {
      await api.post(`/books/${bookId}/review`, { rating: myRating, text: reviewText });
      toast.success("Ulasan tersimpan"); setReviewText(""); setMyRating(0); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal mengirim ulasan"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto" data-testid="book-detail-modal">
        <DialogTitle className="sr-only">{book?.title || "Detail Buku"}</DialogTitle>
        <DialogDescription className="sr-only">Detail buku, ringkasan AI, dan ulasan pembaca</DialogDescription>
        {loading || !book ? (
          <div className="h-80 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
        ) : (
          <div>
            <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 p-6 sm:p-8 text-white flex gap-5">
              <div className="w-28 h-40 rounded-xl shadow-2xl shrink-0 overflow-hidden ring-1 ring-white/20">
                <BookCover book={book} className="w-full h-full" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${catBadge(book.category)}`}>{book.category || "Umum"}</span>
                <h2 className="font-heading text-2xl font-extrabold mt-2 leading-tight">{book.title}</h2>
                <p className="text-indigo-200 text-sm mt-1">oleh {book.author || "—"}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Stars value={book.rating_avg} />
                  <span className="text-xs text-indigo-200">{book.rating_avg || 0} ({book.rating_count || 0} ulasan)</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-[12px] text-indigo-100">
                  {book.publisher && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{book.publisher}</span>}
                  {book.year && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{book.year}</span>}
                  {book.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{book.location}</span>}
                  <span className="flex items-center gap-1"><BookMarked className="w-3.5 h-3.5" />{book.borrow_count || 0}x dipinjam</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-sm">
                  <span className={`font-bold ${book.available_copies > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {book.available_copies > 0 ? `${book.available_copies} tersedia` : "Stok habis"}
                  </span>
                  <span className="text-slate-400"> / {book.total_copies} eksemplar</span>
                </div>
                {book.available_copies > 0 ? (
                  <Button data-testid="borrow-book-button" onClick={borrow} disabled={acting} className="bg-sky-600 hover:bg-sky-700 rounded-xl">
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pinjam Buku"}
                  </Button>
                ) : (
                  <Button data-testid="reserve-book-button" onClick={reserve} disabled={acting} variant="outline" className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50">
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reservasi (Antre)"}
                  </Button>
                )}
              </div>

              {book.description && <p className="text-sm text-slate-600 leading-relaxed">{book.description}</p>}

              <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-violet-800 flex items-center gap-2 text-sm"><Sparkles className="w-4 h-4" />Ringkasan Pintar (AI)</h4>
                  {!book.ai_summary && (
                    <Button data-testid="ai-summary-button" size="sm" onClick={aiSummary} disabled={aiBusy} className="bg-violet-600 hover:bg-violet-700 rounded-lg h-8">
                      {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buatkan"}
                    </Button>
                  )}
                </div>
                {book.ai_summary ? <p className="text-sm text-violet-900/80 mt-2 leading-relaxed">{book.ai_summary}</p>
                  : <p className="text-xs text-violet-500 mt-2">Minta AI merangkum buku ini untukmu.</p>}
              </div>

              <div>
                <h4 className="font-heading font-bold text-slate-800 text-sm mb-3">Ulasan Pembaca</h4>
                {canReview && (
                  <div className="rounded-xl border border-slate-200 p-3 mb-4 bg-white">
                    <div className="flex items-center gap-3"><span className="text-xs text-slate-500">Beri nilai:</span><Stars value={myRating} size={20} onPick={setMyRating} /></div>
                    <Textarea data-testid="review-text" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Tulis pendapatmu tentang buku ini..." className="mt-2 text-sm" rows={2} />
                    <div className="flex justify-end mt-2">
                      <Button data-testid="submit-review-button" size="sm" onClick={submitReview} className="bg-slate-900 hover:bg-slate-800 rounded-lg h-8"><Send className="w-3.5 h-3.5 mr-1" />Kirim Ulasan</Button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {(book.reviews || []).length === 0 && <p className="text-xs text-slate-400">Belum ada ulasan. Jadilah yang pertama!</p>}
                  {(book.reviews || []).map((rv, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">{rv.user_name?.[0] || "?"}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-700">{rv.user_name}</span><Stars value={rv.rating} size={11} /></div>
                        {rv.text && <p className="text-sm text-slate-600 mt-0.5">{rv.text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
