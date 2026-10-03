import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import {
  GraduationCap, MapPin, Phone, Mail, Globe, Calendar, Hash, Award, Target,
  Eye, History as HistoryIcon, Flag, Leaf, ArrowLeft, LogIn, School, Building2, User,
  Trophy, Medal, Plus, Pencil, Trash2, X, Image as ImageIcon,
} from "lucide-react";

function Section({ icon: Icon, title, children, tone = "sky" }) {
  const tones = { sky: "bg-sky-100 text-sky-600", emerald: "bg-emerald-100 text-emerald-600", violet: "bg-violet-100 text-violet-600", amber: "bg-amber-100 text-amber-600" };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-3 text-lg">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-4.5 h-4.5" /></span>{title}
      </h3>
      {children}
    </div>
  );
}

function List({ items, ordered }) {
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return <p className="text-sm text-slate-400">Belum ada data.</p>;
  const Tag = ordered ? "ol" : "ul";
  return <Tag className={`text-sm text-slate-700 space-y-1.5 leading-relaxed ${ordered ? "list-decimal" : "list-disc"} list-inside`}>{filled.map((m, i) => <li key={i}>{m}</li>)}</Tag>;
}

export default function PublicProfile() {
  const { settings: s } = useSettings();
  const facts = [
    { icon: User, label: "Kepala Sekolah", value: s.principal_name },
    { icon: Calendar, label: "Berdiri", value: s.established_year },
    { icon: Hash, label: "NPSN", value: s.npsn },
    { icon: Award, label: "Akreditasi", value: (s.accreditation || "").split("—")[0] },
    { icon: MapPin, label: "Luas Lahan", value: s.land_area },
  ].filter((f) => f.value);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="public-profile-page">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link to="/login" data-testid="back-to-login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />Kembali
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
            <LogIn className="w-4 h-4" />Masuk
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="h-64 sm:h-80 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 relative flex items-end">
          {s.hero_image_url && <img src={s.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="relative max-w-5xl mx-auto w-full px-5 pb-8 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/90 p-1.5 flex items-center justify-center overflow-hidden">
                {s.school_logo_url ? <img src={s.school_logo_url} alt="" className="w-full h-full object-contain" /> : <GraduationCap className="w-8 h-8 text-sky-700" />}
              </div>
              <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold tracking-wide">PROFIL SEKOLAH</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold mt-4 tracking-tight">{s.school_full_name || s.school_name}</h1>
            {s.school_address && <p className="mt-2 text-sky-100/90 flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" />{s.school_address}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 -mt-14 relative">
          {facts.map((f) => (
            <div key={f.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md">
              <f.icon className="w-5 h-5 text-sky-600" />
              <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{f.label}</p>
              <p className="font-heading font-bold text-slate-900 text-sm truncate">{f.value}</p>
            </div>
          ))}
        </div>

        {s.about && <Section icon={School} title="Tentang Sekolah"><p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.about}</p></Section>}

        {/* Galeri Prestasi — kelola khusus Super Admin */}
        <AchievementsGallery />

        <div className="grid lg:grid-cols-3 gap-6">
          <Section icon={Eye} title="Visi" tone="violet">
            <p className="text-sm text-slate-800 font-semibold italic leading-relaxed">"{s.vision || "Belum ada visi."}"</p>
          </Section>
          <div className="lg:col-span-2">
            <Section icon={Target} title="Misi" tone="emerald"><List items={s.mission} ordered /></Section>
          </div>
        </div>

        {s.history && (
          <Section icon={HistoryIcon} title="Sejarah Singkat">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.history}</p>
          </Section>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Section icon={Flag} title="Tujuan Sekolah" tone="amber"><List items={s.goals} ordered /></Section>
          <Section icon={Leaf} title="Berwawasan Lingkungan" tone="emerald"><List items={s.environment} /></Section>
        </div>

        {/* Address & contact */}
        <Section icon={Building2} title="Alamat & Kontak">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Row label="Jalan" value={s.address_street} />
            <Row label="Desa / Kelurahan" value={s.address_village} />
            <Row label="Kecamatan" value={s.address_district} />
            <Row label="Kabupaten" value={s.address_regency} />
            <Row label="Kode Pos" value={s.address_postal} />
            <Row label="Telepon" value={s.contact_phone} icon={Phone} />
            <Row label="E-mail" value={s.contact_email} icon={Mail} />
            <Row label="Website" value={s.contact_website} icon={Globe} />
          </div>
        </Section>

        <div className="text-center py-6">
          <p className="text-sm text-slate-500">Ingin bergabung atau mengakses layanan sekolah?</p>
          <Link to="/login" className="mt-3 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-lg shadow-sky-500/30">
            <LogIn className="w-4 h-4" />Masuk ke Aplikasi
          </Link>
          <p className="mt-3 text-xs text-slate-400">{s.login_footer}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100">
      {Icon && <Icon className="w-4 h-4 text-sky-600 shrink-0" />}
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium break-words">{value || "—"}</span>
    </div>
  );
}

const LEVEL_TONE = {
  Internasional: "bg-fuchsia-100 text-fuchsia-700",
  Nasional: "bg-rose-100 text-rose-700",
  Provinsi: "bg-amber-100 text-amber-700",
  Kabupaten: "bg-sky-100 text-sky-700",
  Sekolah: "bg-emerald-100 text-emerald-700",
};

function AchievementsGallery() {
  const { user } = useAuth();
  const isAdmin = user && user.role === "super_admin";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (new) | object (edit)

  const load = () => api.get("/profile-achievements").then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (a) => {
    if (!window.confirm(`Hapus prestasi "${a.title}"?`)) return;
    try { await api.delete(`/profile-achievements/${a.id}`); toast.success("Prestasi dihapus"); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Gagal menghapus"); }
  };

  const emptySlots = !loading && items.length === 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" data-testid="profile-achievements">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2 text-lg">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600"><Trophy className="w-4.5 h-4.5" /></span>
          Galeri Prestasi Sekolah
        </h3>
        {isAdmin && (
          <button data-testid="add-achievement-button" onClick={() => setEditing({})}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-lg shadow-amber-500/30 transition-colors">
            <Plus className="w-4 h-4" />Tambah Prestasi
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Memuat prestasi...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="achievements-grid">
          {items.map((a) => (
            <div key={a.id} className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 hover:shadow-lg transition-shadow" data-testid="achievement-card">
              <div className="h-40 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 relative flex items-center justify-center overflow-hidden">
                {a.image_url ? (
                  <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                ) : (
                  <Medal className="w-14 h-14 text-white/80" />
                )}
                {a.level && <span className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-bold ${LEVEL_TONE[a.level] || "bg-white/90 text-slate-700"}`}>{a.level}</span>}
                {a.year && <span className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-900/70 text-white backdrop-blur">{a.year}</span>}
              </div>
              <div className="p-4">
                <p className="font-heading font-bold text-slate-900 text-sm leading-snug">{a.title}</p>
                {a.description && <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-3">{a.description}</p>}
              </div>
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button data-testid="edit-achievement-button" onClick={() => setEditing(a)} className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:bg-white shadow"><Pencil className="w-3.5 h-3.5" /></button>
                  <button data-testid="delete-achievement-button" onClick={() => remove(a)} className="p-1.5 rounded-lg bg-white/95 text-rose-600 hover:bg-white shadow"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}

          {/* Admin: tombol slot tambah selalu tampil */}
          {isAdmin && (
            <button data-testid="add-achievement-slot" onClick={() => setEditing({})}
              className="h-full min-h-[224px] rounded-2xl border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/40 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 transition-colors">
              <Plus className="w-8 h-8" /><span className="mt-2 text-sm font-semibold">Tambah Prestasi</span>
            </button>
          )}

          {/* Slot kosong untuk pengunjung ketika belum ada prestasi */}
          {emptySlots && !isAdmin && [0, 1, 2].map((i) => (
            <div key={i} className="min-h-[224px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center text-slate-300" data-testid="achievement-empty-slot">
              <ImageIcon className="w-10 h-10" />
              <span className="mt-2 text-xs font-medium">Prestasi segera hadir</span>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <AchievementModal item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function AchievementModal({ item, onClose, onSaved }) {
  const isEdit = item && item.id;
  const [form, setForm] = useState({
    title: item.title || "", year: item.year || "", level: item.level || "",
    description: item.description || "", image_url: item.image_url || "",
  });
  const [busy, setBusy] = useState(false);

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    api.post("/upload", fd).then((r) => {
      setForm((s) => ({ ...s, image_url: `${process.env.REACT_APP_BACKEND_URL}${r.data.url}` }));
      toast.success("Foto terunggah");
    }).catch(() => toast.error("Gagal upload foto"));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Judul prestasi wajib diisi"); return; }
    setBusy(true);
    try {
      if (isEdit) await api.patch(`/profile-achievements/${item.id}`, form);
      else await api.post("/profile-achievements", form);
      toast.success(isEdit ? "Prestasi diperbarui" : "Prestasi ditambahkan");
      onSaved();
    } catch (err) { toast.error(err.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-heading text-xl font-bold">{isEdit ? "Edit Prestasi" : "Tambah Prestasi"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <Field label="Judul Prestasi">
            <input data-testid="achievement-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              placeholder="Juara 1 Olimpiade Sains Nasional" className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tahun">
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                placeholder="2026" className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none" />
            </Field>
            <Field label="Tingkat">
              <select data-testid="achievement-level-select" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none bg-white">
                <option value="">-- Pilih tingkat --</option>
                {["Sekolah", "Kabupaten", "Provinsi", "Nasional", "Internasional"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Deskripsi (opsional)">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              placeholder="Keterangan singkat tentang prestasi ini." className="mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-amber-500 outline-none resize-none" />
          </Field>
          <Field label="Foto / Piala (opsional)">
            <input type="file" accept="image/*" onChange={onFile} className="mt-1 w-full text-sm" />
            {form.image_url && <img src={form.image_url} alt="" className="mt-2 w-full h-36 object-cover rounded-xl border" />}
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-achievement-button" disabled={busy} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold disabled:opacity-60">
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

