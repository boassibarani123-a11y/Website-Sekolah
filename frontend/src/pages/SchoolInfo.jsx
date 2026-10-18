import { PageHeader } from "@/components/zx/ui";
import { useState, useEffect } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { School, Save, Pencil, Plus, Trash2, Target, Eye, History as HistoryIcon,
  Phone, Mail, Globe, User, Calendar, Hash, Award, MapPin, FileText, Building2,
  Leaf, Flag, Crosshair, GraduationCap, Image as ImageIcon, Upload } from "lucide-react";
import ImageCropDialog from "@/components/ImageCropDialog";

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
  const [heroCropFile, setHeroCropFile] = useState(null);
  const pickHero = (e) => { const f = e.target.files?.[0]; if (f) setHeroCropFile(f); e.target.value = ""; };
  const uploadCroppedHero = async (out) => {
    const fd = new FormData(); fd.append("file", out);
    try { const r = await api.post("/upload", fd); upd("hero_image_url", `${BACKEND}${r.data.url}`); toast.success("Foto sampul diperbarui"); }
    catch { toast.error("Gagal upload"); }
    setHeroCropFile(null);
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
      <PageHeader title="Informasi Sekolah" subtitle="Identitas, profil, dan informasi resmi sekolah Anda."
        actions={isAdmin && (editing ? (<>
            <button onClick={()=>{setForm(settings); setEditing(false);}} className="zx-btn-ghost">Batal</button>
            <button data-testid="save-school-info-button" disabled={busy} onClick={save} className="zx-btn-primary disabled:opacity-60"><Save className="w-4 h-4"/>{busy?"Menyimpan...":"Simpan"}</button>
          </>) : (
          <button data-testid="edit-school-info-button" onClick={()=>setEditing(true)} className="zx-btn-primary"><Pencil className="w-4 h-4"/>Edit profil sekolah</button>
        ))}/>

      <div className="zx-card overflow-hidden">
        <div className="h-52 sm:h-72 bg-gradient-to-br from-sky-100 via-sky-50 to-white relative">
          {s.hero_image_url ? <img src={s.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover"/> : <School className="absolute inset-0 m-auto w-16 h-16 text-sky-200"/>}
        </div>
        <div className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {s.school_logo_url ? <img src={s.school_logo_url} alt="" className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 object-contain shrink-0"/> : <span className="w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center shrink-0"><School className="w-7 h-7 text-sky-600"/></span>}
            <div className="min-w-0">
              <h2 className="text-[22px] font-semibold tracking-tight text-slate-900 leading-tight">{s.school_full_name}</h2>
              <p className="text-[13px] text-slate-500 flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5 shrink-0"/>{s.school_address}</p>
            </div>
          </div>
          <div className="flex gap-4 text-[12.5px] font-medium">
            {s.accreditation && <span className="text-emerald-600">Akreditasi {s.accreditation}</span>}
            {s.established_year && <span className="text-sky-600">Berdiri {s.established_year}</span>}
          </div>
        </div>
        {editing && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <ImageIcon className="w-4 h-4 text-slate-400 shrink-0"/>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ganti Foto Sampul</label>
              <input type="file" accept="image/*" onChange={pickHero} className="mt-1 w-full text-sm"/>
              <p className="text-[11px] text-slate-400 mt-1">Gambar bisa dipangkas & diatur sebelum disimpan.</p>
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

      {heroCropFile && (
        <ImageCropDialog file={heroCropFile} aspect={16/7} title="Pangkas Foto Sampul"
          onCancel={() => setHeroCropFile(null)} onCropped={uploadCroppedHero}/>
      )}

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
    <div className="zx-card p-4 hover:border-sky-200 transition-colors">
      <p className="text-[12px] text-slate-500">{label}</p>
      {editing ? <input data-testid={`fact-${k}`} value={s[k]||""} onChange={e=>upd(k,e.target.value)} className="mt-2 w-full px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
        : <p className="mt-1.5 text-[15px] font-semibold text-slate-900">{s[k] || "—"}</p>}
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
    <div className="zx-card p-6">
      <h3 className="zx-panel-title mb-3">{title}</h3>
      {children}
    </div>
  );
}
