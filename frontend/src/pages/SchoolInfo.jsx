import { useState, useEffect } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { School, Save, Pencil, Plus, Trash2, Target, Eye, History as HistoryIcon,
  Phone, Mail, Globe, User, Calendar, Hash, Award, MapPin, FileText, Building2,
  Leaf, Flag, Crosshair, GraduationCap, Image as ImageIcon, Upload } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function SchoolInfo() {
  const { user } = useAuth();
  const { settings, refresh } = useSettings();
  const isAdmin = user.role === "super_admin";
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(settings); }, [settings]);

  const upd = (k, v) => setForm({ ...form, [k]: v });
  const save = async () => {
    setBusy(true);
    try {
      const keys = ["about","vision","mission","history","history_periods","goals","environment",
        "goals_short","goals_medium","goals_long","targets",
        "principal_name","principal_education","principal_major","principal_sk_date","principal_training",
        "established_year","nss","npsn","land_area","accreditation","sk_pendirian","sk_instansi",
        "address_street","address_village","address_district","address_regency","address_postal",
        "contact_phone","contact_email","contact_website","hero_image_url","school_address","gallery_images"];
      const payload = {}; keys.forEach(k => { payload[k] = form[k]; });
      await api.patch("/settings", payload);
      await refresh();
      toast.success("Informasi sekolah tersimpan");
      setEditing(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(false); }
  };
  const uploadHero = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try { const r = await api.post("/upload", fd); upd("hero_image_url", `${BACKEND}${r.data.url}`); toast.success("Gambar terunggah"); }
    catch { toast.error("Gagal upload"); }
  };
  const uploadGallery = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of files) {
        const fd = new FormData(); fd.append("file", f);
        const r = await api.post("/upload", fd);
        urls.push(`${BACKEND}${r.data.url}`);
      }
      upd("gallery_images", [...(form.gallery_images || []), ...urls]);
      toast.success(`${urls.length} gambar ditambahkan`);
    } catch { toast.error("Gagal mengunggah gambar"); }
    finally { setBusy(false); e.target.value = ""; }
  };
  const removeGalleryImage = (idx) => upd("gallery_images", (form.gallery_images || []).filter((_, i) => i !== idx));

  const s = editing ? form : settings;
  const gallery = (s.gallery_images || []).filter(Boolean);

  return (
    <div className="space-y-6" data-testid="school-info-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Profil Lembaga</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-center gap-2.5 mt-1">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center shadow-lg shadow-sky-500/30"><School className="w-6 h-6"/></span>
            Informasi Sekolah
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">Profil lengkap {settings.school_full_name}</p>
        </div>
        {isAdmin && (editing ? (
          <div className="flex gap-2">
            <button onClick={()=>{setForm(settings); setEditing(false);}} className="px-4 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Batal</button>
            <button data-testid="save-school-info-button" disabled={busy} onClick={save} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60 transition-colors">
              <Save className="w-4 h-4"/>{busy?"Menyimpan...":"Simpan"}
            </button>
          </div>
        ) : (
          <button data-testid="edit-school-info-button" onClick={()=>setEditing(true)} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-sky-600/25 transition-colors">
            <Pencil className="w-4 h-4"/>Edit Informasi
          </button>
        ))}
      </div>

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
        <div className="h-56 sm:h-80 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 relative flex items-end">
          {s.hero_image_url && <img src={s.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover"/>}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_45%)]"/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-transparent"/>
          <div className="absolute top-5 right-5 flex gap-2">
            {s.accreditation && <span className="px-3 py-1.5 rounded-full bg-amber-400/95 text-amber-950 text-xs font-extrabold tracking-wide shadow-lg backdrop-blur">Akreditasi {s.accreditation}</span>}
            {s.established_year && <span className="px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold backdrop-blur">Est. {s.established_year}</span>}
          </div>
          <div className="relative p-6 sm:p-8 text-white flex items-end gap-4">
            {s.school_logo_url && <img src={s.school_logo_url} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/95 p-1.5 object-contain shadow-xl ring-1 ring-white/30 shrink-0"/>}
            <div className="min-w-0">
              <h2 className="font-heading text-2xl sm:text-4xl font-extrabold leading-tight drop-shadow-sm">{s.school_full_name}</h2>
              <p className="text-sm sm:text-base text-sky-100/90 flex items-center gap-1.5 mt-1"><MapPin className="w-4 h-4 shrink-0"/>{s.school_address}</p>
            </div>
          </div>
        </div>
        {editing && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <ImageIcon className="w-4 h-4 text-slate-400 shrink-0"/>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ganti Foto Sampul</label>
              <input type="file" accept="image/*" onChange={uploadHero} className="mt-1 w-full text-sm"/>
            </div>
          </div>
        )}
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Fact icon={User} label="Kepala Sekolah" k="principal_name" s={s} editing={editing} upd={upd}/>
        <Fact icon={Calendar} label="Tahun Berdiri" k="established_year" s={s} editing={editing} upd={upd}/>
        <Fact icon={Hash} label="NPSN" k="npsn" s={s} editing={editing} upd={upd}/>
        <Fact icon={Hash} label="NSS" k="nss" s={s} editing={editing} upd={upd}/>
        <Fact icon={MapPin} label="Luas Lahan" k="land_area" s={s} editing={editing} upd={upd}/>
        <Fact icon={Award} label="Akreditasi" k="accreditation" s={s} editing={editing} upd={upd}/>
      </div>

      {/* Profil + Kepala Sekolah */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card icon={Building2} title="Profil & Alamat Sekolah">
          <div className="divide-y divide-slate-100">
            <Row label="Jalan" k="address_street" s={s} editing={editing} upd={upd}/>
            <Row label="Desa / Kelurahan" k="address_village" s={s} editing={editing} upd={upd}/>
            <Row label="Kecamatan" k="address_district" s={s} editing={editing} upd={upd}/>
            <Row label="Kabupaten" k="address_regency" s={s} editing={editing} upd={upd}/>
            <Row label="Kode Pos" k="address_postal" s={s} editing={editing} upd={upd}/>
            <Row label="Telepon" k="contact_phone" s={s} editing={editing} upd={upd}/>
            <Row label="E-mail" k="contact_email" s={s} editing={editing} upd={upd}/>
            <Row label="Website" k="contact_website" s={s} editing={editing} upd={upd}/>
            <Row label="SK Pendirian" k="sk_pendirian" s={s} editing={editing} upd={upd}/>
            <Row label="Instansi Penerbit SK" k="sk_instansi" s={s} editing={editing} upd={upd}/>
          </div>
        </Card>

        <Card icon={GraduationCap} title="Kepala Sekolah">
          <div className="divide-y divide-slate-100">
            <Row label="Nama Lengkap" k="principal_name" s={s} editing={editing} upd={upd}/>
            <Row label="Pendidikan Terakhir" k="principal_education" s={s} editing={editing} upd={upd}/>
            <Row label="Jurusan" k="principal_major" s={s} editing={editing} upd={upd}/>
            <Row label="Tanggal SK Pengangkatan" k="principal_sk_date" s={s} editing={editing} upd={upd}/>
            <Row label="Pelatihan yang Pernah Diikuti" k="principal_training" s={s} editing={editing} upd={upd} textarea/>
          </div>
        </Card>
      </div>

      {/* About + Sejarah */}
      <Card icon={School} title="Tentang Sekolah">
        {editing ? <textarea data-testid="about-input" rows={4} value={s.about||""} onChange={e=>upd("about", e.target.value)} className={ta}/>
          : <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.about || "Belum ada deskripsi."}</p>}
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card icon={HistoryIcon} title="Sejarah Singkat">
            {editing ? <textarea rows={6} value={s.history||""} onChange={e=>upd("history", e.target.value)} className={ta}/>
              : <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.history || "Belum ada sejarah."}</p>}
          </Card>
        </div>
        <Card icon={User} title="Periode Kepemimpinan">
          <ListEditor label="periode" field="history_periods" s={s} editing={editing} upd={upd} ordered />
        </Card>
      </div>

      {/* Visi Misi */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card icon={Eye} title="Visi">
          {editing ? <textarea rows={4} value={s.vision||""} onChange={e=>upd("vision", e.target.value)} className={ta}/>
            : <p className="text-sm text-slate-800 font-semibold italic leading-relaxed">"{s.vision || "Belum ada visi."}"</p>}
        </Card>
        <div className="lg:col-span-2">
          <Card icon={Target} title="Misi">
            <ListEditor label="misi" field="mission" s={s} editing={editing} upd={upd} ordered />
          </Card>
        </div>
      </div>

      {/* Tujuan */}
      <Card icon={Flag} title="Tujuan Sekolah">
        <ListEditor label="tujuan" field="goals" s={s} editing={editing} upd={upd} ordered />
      </Card>

      {/* Lingkungan */}
      <Card icon={Leaf} title="Berwawasan Lingkungan">
        <ListEditor label="poin lingkungan" field="environment" s={s} editing={editing} upd={upd} />
      </Card>

      {/* Tahapan Tujuan */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card icon={Crosshair} title="Tujuan Jangka Pendek">
          <ListEditor label="poin" field="goals_short" s={s} editing={editing} upd={upd} ordered />
        </Card>
        <Card icon={Crosshair} title="Tujuan Jangka Menengah">
          <ListEditor label="poin" field="goals_medium" s={s} editing={editing} upd={upd} ordered />
        </Card>
        <Card icon={Crosshair} title="Tujuan Jangka Panjang">
          <ListEditor label="poin" field="goals_long" s={s} editing={editing} upd={upd} ordered />
        </Card>
      </div>

      {/* Sasaran */}
      <Card icon={Target} title="Sasaran Sekolah">
        <ListEditor label="sasaran" field="targets" s={s} editing={editing} upd={upd} ordered />
      </Card>

      {/* Galeri Foto */}
      <Card icon={ImageIcon} title="Galeri Foto Sekolah">
        {editing && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <label data-testid="gallery-upload-label" className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold text-sm cursor-pointer transition-colors shadow-lg shadow-sky-600/25">
              <Upload className="w-4 h-4"/> Tambah Gambar
              <input data-testid="gallery-upload-input" type="file" accept="image/*" multiple onChange={uploadGallery} className="hidden"/>
            </label>
            <p className="text-xs text-slate-400">Pilih beberapa gambar sekaligus · maks 10MB per gambar</p>
          </div>
        )}
        {gallery.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="gallery-grid">
            {gallery.map((url,i)=>(
              <div key={i} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={url} alt={`Galeri ${i+1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                {editing && (
                  <button data-testid={`gallery-remove-${i}`} onClick={()=>removeGalleryImage(i)} className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400">Belum ada foto.{isAdmin ? " Klik Edit Informasi lalu Tambah Gambar untuk mengunggah." : ""}</p>}
      </Card>

      {/* Kontak */}
      <Card icon={Phone} title="Kontak">
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <ContactRow icon={Phone} k="contact_phone" placeholder="Nomor telepon" s={s} editing={editing} upd={upd}/>
          <ContactRow icon={Mail} k="contact_email" placeholder="Email" s={s} editing={editing} upd={upd}/>
          <ContactRow icon={Globe} k="contact_website" placeholder="Website" s={s} editing={editing} upd={upd}/>
        </div>
      </Card>
    </div>
  );
}

const ta = "w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none";
const inpSm = "w-full px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none";

function Fact({ icon:Icon, label, k, s, editing, upd }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-sky-200 transition-all">
      <div className="flex items-center gap-2 text-slate-400">
        <span className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center"><Icon className="w-4 h-4"/></span>
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {editing ? <input data-testid={`fact-${k}`} value={s[k]||""} onChange={e=>upd(k,e.target.value)} className="mt-2 w-full px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
        : <p className="mt-2 font-heading font-bold text-slate-900 text-sm">{s[k] || "—"}</p>}
    </div>
  );
}

function Row({ label, k, s, editing, upd, textarea }) {
  return (
    <div className="py-2.5 grid grid-cols-2 gap-3 items-start">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      {editing
        ? (textarea
            ? <textarea rows={2} value={s[k]||""} onChange={e=>upd(k,e.target.value)} className={inpSm}/>
            : <input data-testid={`row-${k}`} value={s[k]||""} onChange={e=>upd(k,e.target.value)} className={inpSm}/>)
        : <span className="text-sm text-slate-800 font-medium break-words">{s[k] || "—"}</span>}
    </div>
  );
}

function ContactRow({ icon:Icon, k, placeholder, s, editing, upd }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-sky-600 shrink-0"/>
      {editing ? <input value={s[k]||""} onChange={e=>upd(k,e.target.value)} placeholder={placeholder} className="flex-1 px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
        : <span className="text-slate-700">{s[k] || "—"}</span>}
    </div>
  );
}

function ListEditor({ label, field, s, editing, upd, ordered }) {
  const items = s[field] || [];
  if (editing) {
    return (
      <div className="space-y-2">
        {items.map((m,i)=>(
          <div key={i} className="flex gap-2">
            <span className="w-6 h-9 flex items-center justify-center text-xs font-bold text-slate-400">{i+1}.</span>
            <textarea rows={1} value={m} onChange={e=>{const c=[...items];c[i]=e.target.value;upd(field,c);}} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none resize-y"/>
            <button onClick={()=>upd(field, items.filter((_,idx)=>idx!==i))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
        <button data-testid={`add-${field}`} onClick={()=>upd(field,[...items,""])} className="text-sky-600 text-sm font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5"/>Tambah {label}</button>
      </div>
    );
  }
  const filled = items.filter(Boolean);
  if (!filled.length) return <p className="text-sm text-slate-400">Belum ada data.</p>;
  return ordered
    ? <ol className="text-sm text-slate-700 space-y-1.5 list-decimal list-inside leading-relaxed">{filled.map((m,i)=><li key={i}>{m}</li>)}</ol>
    : <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside leading-relaxed">{filled.map((m,i)=><li key={i}>{m}</li>)}</ul>;
}

function Card({ icon:Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center"><Icon className="w-4 h-4"/></span>{title}
      </h3>
      {children}
    </div>
  );
}
