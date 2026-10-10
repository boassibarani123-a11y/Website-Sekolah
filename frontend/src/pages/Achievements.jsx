import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { GalleryCard } from "@/pages/PublicGallery";
import { Trophy, ClipboardCheck, BrainCircuit, Plus, Camera, X, Upload, Crown, Search } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const MANAGE_ROLES = ["super_admin", "kepsek", "staff_tu", "ketua_osis"];

export default function Achievements() {
  const { user } = useAuth();
  const canManage = MANAGE_ROLES.includes(user.role);
  const canDelete = ["super_admin", "kepsek", "staff_tu"].includes(user.role);
  const [data, setData] = useState({ most_diligent: [], top_academic: [] });
  const [gallery, setGallery] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [cat, setCat] = useState("Semua");
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const levels = [...new Set(gallery.map(g => g.level).filter(Boolean))];
  const shownGallery = gallery.filter(g => (cat === "Semua" || g.category === cat) && (!level || g.level === level) &&
    (!q || `${g.title} ${g.description}`.toLowerCase().includes(q.toLowerCase())));

  const loadGallery = () => api.get("/gallery").then(r => setGallery(r.data));
  useEffect(() => { api.get("/achievements").then(r => setData(r.data)); loadGallery(); }, []);

  const removeItem = async (item) => {
    if (!window.confirm(`Hapus "${item.title}"?`)) return;
    try { await api.delete(`/gallery/${item.id}`); toast.success("Item dihapus"); loadGallery(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menghapus"); }
  };

  return (
    <div className="space-y-8" data-testid="achievements-page">
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
        <Trophy className="w-12 h-12" />
        <div><h1 className="font-heading text-3xl font-extrabold">Papan Prestasi Semester</h1>
          <p className="text-sm opacity-90 mt-1">Siswa terbaik berdasarkan kerajinan & akademik</p></div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Board title="Siswa Paling Rajin" subtitle="Berdasarkan jumlah tugas terkumpul" icon={ClipboardCheck} items={data.most_diligent} field="count" unit="tugas" />
        <Board title="Prestasi Akademik Terbaik" subtitle="Berdasarkan rata-rata skor Mini-Quiz" icon={BrainCircuit} items={data.top_academic} field="avg" unit="%" />
      </div>

      {/* Galeri Prestasi & Kegiatan */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Camera className="w-6 h-6 text-sky-600" />Galeri Prestasi & Kegiatan
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Dokumentasi tampil di halaman publik <a href="/galeri" target="_blank" rel="noreferrer" className="text-sky-600 font-semibold">/galeri</a></p>
        </div>
        {canManage && (
          <button data-testid="add-gallery-button" onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" />Tambah Dokumentasi
          </button>
        )}
      </div>

      {gallery.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="gallery-filters">
          {["Semua", "Prestasi", "Kegiatan"].map(c => (
            <button key={c} data-testid={`gallery-filter-${c}`} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${cat === c ? "bg-slate-900 text-white" : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-400"}`}>{c}</button>
          ))}
          <select data-testid="gallery-level-filter" value={level} onChange={e => setLevel(e.target.value)} className="px-3 py-1.5 border-2 border-slate-200 rounded-xl text-sm">
            <option value="">Semua Tingkat</option>{levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input data-testid="gallery-search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari prestasi / kegiatan..." className="w-full pl-9 pr-3 py-1.5 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" />
          </div>
        </div>
      )}

      {gallery.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
          <Camera className="w-9 h-9 text-slate-300 mx-auto" />
          <p className="mt-3 text-slate-500">Belum ada dokumentasi. {canManage && "Klik \"Tambah Dokumentasi\" untuk memulai."}</p>
        </div>
      ) : shownGallery.length === 0 ? (
        <p data-testid="gallery-no-result" className="text-center text-slate-400 py-8">Tidak ada item yang cocok dengan filter.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shownGallery.map(it => <GalleryCard key={it.id} item={it} onDelete={canDelete ? removeItem : undefined} onEdit={canManage ? setEditItem : undefined} />)}
        </div>
      )}

      {showForm && <GalleryForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); loadGallery(); }} />}
      {editItem && <GalleryForm initial={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); loadGallery(); }} />}
    </div>
  );
}

function GalleryForm({ onClose, onSaved, initial }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({ title: initial?.title || "", category: initial?.category || "Prestasi", level: initial?.level || "", date: initial?.date || "", description: initial?.description || "", image_url: initial?.image_url || "" });
  const [busy, setBusy] = useState(false);
  const upd = (k, v) => setForm({ ...form, [k]: v });

  const uploadImg = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try { const r = await api.post("/upload", fd); upd("image_url", `${BACKEND}${r.data.url}`); toast.success("Gambar terunggah"); }
    catch { toast.error("Gagal upload"); }
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Judul wajib diisi");
    setBusy(true);
    try { if (isEdit) await api.patch(`/gallery/${initial.id}`, form); else await api.post("/gallery", form);
      toast.success(isEdit ? "Dokumentasi diperbarui" : "Dokumentasi ditambahkan"); onSaved(); }
    catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  const inp = "mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm";
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" data-testid="gallery-form-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading font-bold text-slate-900">{isEdit ? "Edit Dokumentasi" : "Tambah Dokumentasi"}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Judul *</label>
            <input data-testid="gallery-title-input" value={form.title} onChange={e => upd("title", e.target.value)} className={inp} placeholder="Juara 1 Olimpiade Matematika Kabupaten" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">Kategori</label>
              <select data-testid="gallery-category-select" value={form.category} onChange={e => upd("category", e.target.value)} className={inp}>
                <option value="Prestasi">Prestasi</option>
                <option value="Kegiatan">Kegiatan</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">Tingkat (opsional)</label>
              <input value={form.level} onChange={e => upd("level", e.target.value)} className={inp} placeholder="Kabupaten / Provinsi" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Tanggal</label>
            <input type="date" value={form.date} onChange={e => upd("date", e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Deskripsi</label>
            <textarea rows={3} value={form.description} onChange={e => upd("description", e.target.value)} className={inp} placeholder="Deskripsi singkat pencapaian atau kegiatan..." />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600">Foto (opsional)</label>
            <input type="file" accept="image/*" onChange={uploadImg} className="mt-1 w-full text-sm" />
            {form.image_url && <img src={form.image_url} alt="" className="mt-2 w-full h-36 object-cover rounded-xl border border-slate-200" />}
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
          <button data-testid="save-gallery-button" disabled={busy} onClick={save}
            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-60">
            <Upload className="w-4 h-4" />{busy ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Board({ title, subtitle, icon: Icon, items, field, unit }) {
  const fmt = (it) => field === "avg" ? (it[field] || 0).toFixed(1) : it[field];
  const podium = [items[1], items[0], items[2]];
  const style = [
    { h: "h-20", c: "from-slate-300 to-slate-400", rank: 2 },
    { h: "h-28", c: "from-amber-300 to-amber-500", rank: 1 },
    { h: "h-14", c: "from-amber-600 to-amber-800", rank: 3 },
  ];
  return <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid={`board-${field}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
      <div><h2 className="font-heading font-bold text-slate-900">{title}</h2><p className="text-xs text-slate-500">{subtitle} · Top 10</p></div>
    </div>
    {items.length === 0 && <p className="text-slate-400 italic text-sm">Belum ada data.</p>}
    {items.length > 0 && (
      <div className="grid grid-cols-3 gap-2 items-end mb-4" data-testid={`podium-${field}`}>
        {podium.map((it, i) => (
          <div key={i} className="flex flex-col items-center text-center">
            {it ? <>
              {style[i].rank === 1 && <Crown className="w-5 h-5 text-amber-500 mb-0.5" />}
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${style[i].c} text-white font-black flex items-center justify-center shadow`}>{it.name?.[0] || "?"}</div>
              <p className="mt-1 text-xs font-semibold text-slate-800 line-clamp-1">{it.name}</p>
              <p className="text-[11px] font-bold text-slate-500">{fmt(it)}{unit}</p>
            </> : <div className="h-16" />}
            <div className={`mt-1 w-full ${style[i].h} rounded-t-xl bg-gradient-to-b ${style[i].c} flex items-start justify-center pt-1 text-white font-heading font-black text-lg`}>{style[i].rank}</div>
          </div>
        ))}
      </div>
    )}
    <div className="space-y-2">
      {items.slice(3, 10).map((it, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <span className="w-8 h-8 rounded-full font-black text-sm flex items-center justify-center border-2 border-white shadow bg-slate-100 text-slate-600">{i + 4}</span>
          <p className="flex-1 font-semibold text-sm">{it.name}</p>
          <p className="font-heading font-bold text-slate-900">{fmt(it)}<span className="text-xs text-slate-500 ml-1">{unit}</span></p>
        </div>
      ))}
    </div>
  </div>;
}
