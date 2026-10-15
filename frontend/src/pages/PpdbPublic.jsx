import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { GraduationCap, Upload, CheckCircle2, ArrowLeft, FileUp, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function PpdbPublic() {
  const { settings } = useSettings();
  const [form, setForm] = useState({
    full_name:"", nisn:"", birth_place:"", birth_date:"", gender:"L",
    address:"", phone:"", parent_name:"", parent_phone:"", parent_email:"",
    prev_school:"", nem_avg:80,
    berkas_urls:[], photo_url:""
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const uploadFile = async (e, key) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await api.post("/ppdb/upload", fd);
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      if (key === "photo_url") setForm({...form, photo_url: url});
      else setForm({...form, berkas_urls: [...form.berkas_urls, {name: f.name, url}]});
      toast.success(`${f.name} terunggah`);
    } catch { toast.error("Gagal upload"); }
  };
  const removeBerkas = (i) => setForm({...form, berkas_urls: form.berkas_urls.filter((_,idx)=>idx!==i)});

  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = {...form, berkas_urls: form.berkas_urls.map(b=>b.url||b), nem_avg: parseFloat(form.nem_avg)};
      const r = await api.post("/ppdb/register", payload);
      setDone(r.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mendaftar");
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-10 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 animate-in zoom-in">
            <CheckCircle2 className="w-10 h-10"/>
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900">Pendaftaran Berhasil!</h1>
          <p className="mt-3 text-slate-600">Terima kasih sudah mendaftar di <b>{settings.school_full_name}</b>. Panitia PPDB akan meninjau dokumen Anda dan menghubungi via email/WA.</p>
          <div className="mt-6 p-4 bg-sky-50 border-2 border-dashed border-sky-300 rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-sky-700 font-bold">Nomor Pendaftaran</p>
            <p className="mt-1 font-heading text-3xl font-extrabold text-sky-900 font-mono-alt">{done.id.slice(0,8).toUpperCase()}</p>
          </div>
          <Link to="/login" className="mt-8 inline-block text-sky-600 hover:text-sky-800 font-semibold text-sm">← Ke Halaman Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-sky-600 via-sky-700 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur">
              <GraduationCap className="w-8 h-8"/>
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold">Pendaftaran Peserta Didik Baru</h1>
              <p className="text-sm text-sky-100/85 mt-0.5">Tahun Ajaran 2026/2027 · {settings.school_full_name}</p>
            </div>
          </div>
          <Link to="/login" className="hidden sm:inline-flex items-center gap-1 text-sm text-sky-100 hover:text-white">
            <ArrowLeft className="w-4 h-4"/>Login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form onSubmit={submit} className="space-y-6" data-testid="ppdb-form">
          <Card title="A. Data Pribadi Calon Siswa">
            <Grid>
              <Input label="Nama Lengkap *" v={form.full_name} on={v=>setForm({...form,full_name:v})} required/>
              <Input label="NISN" v={form.nisn} on={v=>setForm({...form,nisn:v})}/>
              <Input label="Tempat Lahir" v={form.birth_place} on={v=>setForm({...form,birth_place:v})}/>
              <Input label="Tanggal Lahir" type="date" v={form.birth_date} on={v=>setForm({...form,birth_date:v})}/>
              <Select label="Jenis Kelamin" v={form.gender} on={v=>setForm({...form,gender:v})} opts={[["L","Laki-laki"],["P","Perempuan"]]}/>
              <Input label="No. HP" v={form.phone} on={v=>setForm({...form,phone:v})} required/>
            </Grid>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-slate-600">Alamat Lengkap *</label>
              <textarea rows={2} required value={form.address} onChange={e=>setForm({...form,address:e.target.value})}
                className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/>
            </div>
          </Card>

          <Card title="B. Data Orang Tua / Wali">
            <Grid>
              <Input label="Nama Ortu/Wali *" v={form.parent_name} on={v=>setForm({...form,parent_name:v})} required/>
              <Input label="No. HP Ortu *" v={form.parent_phone} on={v=>setForm({...form,parent_phone:v})} required/>
              <Input label="Email Ortu *" type="email" v={form.parent_email} on={v=>setForm({...form,parent_email:v})} required/>
            </Grid>
          </Card>

          <Card title="C. Akademik">
            <Grid>
              <Input label="Asal Sekolah *" v={form.prev_school} on={v=>setForm({...form,prev_school:v})} required/>
              <Input label="Nilai Rata-rata (0-100) *" type="number" step="0.1" min="0" max="100"
                v={form.nem_avg} on={v=>setForm({...form,nem_avg:v})} required/>
            </Grid>
          </Card>

          <Card title="D. Berkas Pendukung">
            <div className="grid sm:grid-cols-2 gap-4">
              <FileField label="Foto (JPG/PNG maks 5MB)" onChange={e=>uploadFile(e,"photo_url")}
                preview={form.photo_url}/>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 mb-1 block">Berkas Lain (Ijazah, Rapor, KK, dll)</label>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e=>uploadFile(e,"berkas")}
                  className="w-full text-sm"/>
                <div className="mt-2 space-y-1">
                  {form.berkas_urls.map((b,i)=>(
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg text-xs">
                      <FileUp className="w-3 h-3 text-slate-500"/>
                      <span className="flex-1 truncate">{b.name || `Berkas ${i+1}`}</span>
                      <button type="button" onClick={()=>removeBerkas(i)} className="text-rose-500"><X className="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p className="text-xs text-slate-500 flex-1">Dengan menekan tombol daftar, Anda menyetujui data akan diproses oleh panitia PPDB {settings.school_full_name}.</p>
            <button data-testid="ppdb-submit-button" disabled={busy}
              className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg shadow-slate-900/30 flex items-center justify-center gap-2">
              <Upload className="w-4 h-4"/>{busy?"Mendaftar...":"Daftar Sekarang"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Card({title, children}) { return <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"><h2 className="font-heading font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-sky-500 rounded-full"/>{title}</h2>{children}</div>; }
function Grid({children}) { return <div className="grid sm:grid-cols-2 gap-4">{children}</div>; }
function Input({label, v, on, ...p}) {
  return <div><label className="text-xs font-semibold uppercase text-slate-600">{label}</label>
    <input value={v} onChange={e=>on(e.target.value)} {...p}
      className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none"/></div>;
}
function Select({label, v, on, opts}) {
  return <div><label className="text-xs font-semibold uppercase text-slate-600">{label}</label>
    <select value={v} onChange={e=>on(e.target.value)} className="mt-1 w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none">
      {opts.map(([k,l])=><option key={k} value={k}>{l}</option>)}
    </select></div>;
}
function FileField({label, onChange, preview}) {
  return <div>
    <label className="text-xs font-semibold uppercase text-slate-600 mb-1 block">{label}</label>
    <input type="file" accept="image/*" onChange={onChange} className="w-full text-sm"/>
    {preview && <img src={preview} alt="" className="mt-2 w-24 h-28 object-cover rounded-lg border-2 border-slate-200"/>}
  </div>;
}
