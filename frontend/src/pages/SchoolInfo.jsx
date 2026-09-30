import { useState, useEffect } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { School, Save, Pencil, Plus, Trash2, Target, Eye, History as HistoryIcon,
  Phone, Mail, Globe, User, Calendar, Hash, Award } from "lucide-react";

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
      await api.patch("/settings", {
        about: form.about, vision: form.vision, mission: form.mission, history: form.history,
        principal_name: form.principal_name, established_year: form.established_year,
        npsn: form.npsn, accreditation: form.accreditation, contact_phone: form.contact_phone,
        contact_email: form.contact_email, contact_website: form.contact_website, hero_image_url: form.hero_image_url,
      });
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

  const s = editing ? form : settings;
  const mission = s.mission || [];

  return (
    <div className="space-y-6" data-testid="school-info-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <School className="w-7 h-7 text-sky-600"/>Informasi Sekolah
          </h1>
          <p className="mt-1 text-sm text-slate-500">Profil lengkap {settings.school_full_name}</p>
        </div>
        {isAdmin && (editing ? (
          <div className="flex gap-2">
            <button onClick={()=>{setForm(settings); setEditing(false);}} className="px-4 py-2.5 border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50">Batal</button>
            <button data-testid="save-school-info-button" disabled={busy} onClick={save} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60">
              <Save className="w-4 h-4"/>{busy?"Menyimpan...":"Simpan"}
            </button>
          </div>
        ) : (
          <button data-testid="edit-school-info-button" onClick={()=>setEditing(true)} className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center gap-2">
            <Pencil className="w-4 h-4"/>Edit Informasi
          </button>
        ))}
      </div>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <div className="h-48 sm:h-64 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 relative flex items-end">
          {s.hero_image_url && <img src={s.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent"/>
          <div className="relative p-6 text-white">
            {s.school_logo_url && <img src={s.school_logo_url} alt="" className="w-14 h-14 rounded-xl bg-white/90 p-1 object-contain mb-2"/>}
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold">{s.school_full_name}</h2>
            <p className="text-sm text-sky-100/90">{s.school_address}</p>
          </div>
        </div>
        {editing && (
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <label className="text-xs font-semibold text-slate-600 uppercase">Ganti Foto Sampul</label>
            <input type="file" accept="image/*" onChange={uploadHero} className="mt-1 w-full text-sm"/>
          </div>
        )}
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Fact icon={User} label="Kepala Sekolah" k="principal_name" s={s} editing={editing} upd={upd}/>
        <Fact icon={Calendar} label="Tahun Berdiri" k="established_year" s={s} editing={editing} upd={upd}/>
        <Fact icon={Hash} label="NPSN" k="npsn" s={s} editing={editing} upd={upd}/>
        <Fact icon={Award} label="Akreditasi" k="accreditation" s={s} editing={editing} upd={upd}/>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card icon={School} title="Tentang Sekolah">
            {editing ? <textarea data-testid="about-input" rows={5} value={s.about||""} onChange={e=>upd("about", e.target.value)} className={ta}/>
              : <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.about || "Belum ada deskripsi."}</p>}
          </Card>

          <Card icon={HistoryIcon} title="Sejarah Singkat">
            {editing ? <textarea rows={5} value={s.history||""} onChange={e=>upd("history", e.target.value)} className={ta}/>
              : <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.history || "Belum ada sejarah."}</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card icon={Eye} title="Visi">
            {editing ? <textarea rows={3} value={s.vision||""} onChange={e=>upd("vision", e.target.value)} className={ta}/>
              : <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.vision || "Belum ada visi."}</p>}
          </Card>

          <Card icon={Target} title="Misi">
            {editing ? (
              <div className="space-y-2">
                {mission.map((m,i)=>(
                  <div key={i} className="flex gap-2">
                    <input value={m} onChange={e=>{const c=[...mission];c[i]=e.target.value;upd("mission",c);}} className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
                    <button onClick={()=>upd("mission", mission.filter((_,idx)=>idx!==i))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
                <button onClick={()=>upd("mission",[...mission,""])} className="text-sky-600 text-sm font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5"/>Tambah misi</button>
              </div>
            ) : mission.length ? (
              <ol className="text-sm text-slate-700 space-y-1.5 list-decimal list-inside">{mission.filter(Boolean).map((m,i)=><li key={i}>{m}</li>)}</ol>
            ) : <p className="text-sm text-slate-400">Belum ada misi.</p>}
          </Card>

          <Card icon={Phone} title="Kontak">
            <div className="space-y-2 text-sm">
              <ContactRow icon={Phone} k="contact_phone" placeholder="Nomor telepon" s={s} editing={editing} upd={upd}/>
              <ContactRow icon={Mail} k="contact_email" placeholder="Email" s={s} editing={editing} upd={upd}/>
              <ContactRow icon={Globe} k="contact_website" placeholder="Website" s={s} editing={editing} upd={upd}/>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const ta = "w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none";

function Fact({ icon:Icon, label, k, s, editing, upd }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400"><Icon className="w-4 h-4"/><span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span></div>
      {editing ? <input data-testid={`fact-${k}`} value={s[k]||""} onChange={e=>upd(k,e.target.value)} className="mt-1 w-full px-2 py-1.5 border-2 border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"/>
        : <p className="mt-1 font-heading font-bold text-slate-900">{s[k] || "—"}</p>}
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
