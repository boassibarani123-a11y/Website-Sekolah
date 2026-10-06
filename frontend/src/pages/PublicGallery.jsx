import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useSettings } from "@/context/SettingsContext";
import { Trophy, GraduationCap, ArrowLeft, Calendar, MapPin, Camera, Award } from "lucide-react";

export default function PublicGallery() {
  const { settings } = useSettings();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/gallery").then(r => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  const shown = filter === "Semua" ? items : items.filter(i => i.category === filter);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="public-gallery-page">
      <header className="bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden">
              {settings.school_logo_url ? <img src={settings.school_logo_url} alt="Logo" className="w-full h-full object-contain"/> : <GraduationCap className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="font-heading text-xl font-extrabold tracking-tight">{settings.school_name}</h1>
              <p className="text-[11px] text-sky-100/80">Galeri Prestasi & Kegiatan</p>
            </div>
          </div>
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />Masuk
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-7 h-7 text-amber-500" />
          <h2 className="font-heading text-3xl font-extrabold text-slate-900">Galeri Prestasi & Kegiatan</h2>
        </div>
        <p className="text-sm text-slate-500 mb-6">Dokumentasi pencapaian dan kegiatan {settings.school_full_name}.</p>

        <div className="flex flex-wrap gap-2 mb-8" data-testid="gallery-filter-tabs">
          {["Semua", "Prestasi", "Kegiatan"].map(t => (
            <button key={t} data-testid={`gallery-filter-${t.toLowerCase()}`} onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === t ? "bg-sky-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:border-sky-400"}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400 py-20 text-center">Memuat galeri...</p>
        ) : shown.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <Camera className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-3 text-slate-500 font-medium">Belum ada dokumentasi yang dipublikasikan.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shown.map(it => <GalleryCard key={it.id} item={it} />)}
          </div>
        )}
      </main>
    </div>
  );
}

export function GalleryCard({ item, onDelete }) {
  const isPrestasi = item.category === "Prestasi";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow" data-testid="gallery-card">
      <div className="h-44 bg-gradient-to-br from-sky-500 to-indigo-700 relative flex items-center justify-center">
        {item.image_url
          ? <img src={item.image_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover"/>
          : (isPrestasi ? <Trophy className="w-12 h-12 text-white/70"/> : <Camera className="w-12 h-12 text-white/70"/>)}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold ${isPrestasi ? "bg-amber-400 text-slate-900" : "bg-sky-500 text-white"}`}>
          {item.category}
        </span>
        {onDelete && (
          <button data-testid={`gallery-delete-${item.id}`} onClick={() => onDelete(item)}
            className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold">Hapus</button>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-heading font-bold text-slate-900 leading-snug">{item.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {item.date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>{item.date}</span>}
          {item.level && <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5"/>{item.level}</span>}
        </div>
        {item.description && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.description}</p>}
      </div>
    </div>
  );
}
