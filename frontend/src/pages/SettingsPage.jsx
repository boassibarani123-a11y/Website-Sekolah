import { useState, useEffect } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import { Settings as SettingsIcon, Save, Upload, Plus, Trash2, RotateCcw } from "lucide-react";
import StudentIdCard from "@/components/StudentIdCard";
import ImageCropDialog from "@/components/ImageCropDialog";

export default function SettingsPage() {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const save = async () => {
    setBusy(true);
    try {
      await api.patch("/settings", form);
      await refresh();
      toast.success("Pengaturan tersimpan");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menyimpan");
    } finally { setBusy(false); }
  };

  const [logoCropFile, setLogoCropFile] = useState(null);
  const pickLogo = (e) => { const f = e.target.files?.[0]; if (f) setLogoCropFile(f); e.target.value = ""; };
  const uploadCroppedLogo = async (out) => {
    const fd = new FormData(); fd.append("file", out);
    try {
      const r = await api.post("/upload", fd);
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      setForm({...form, school_logo_url: url});
      toast.success("Logo terunggah, klik Simpan untuk menerapkan");
    } catch { toast.error("Gagal upload"); }
    setLogoCropFile(null);
  };

  const upd = (k, v) => setForm({...form, [k]: v});
  const updRule = (i, v) => { const c = [...(form.id_card_rules||[])]; c[i] = v; upd("id_card_rules", c); };
  const addRule = () => upd("id_card_rules", [...(form.id_card_rules||[]), ""]);
  const delRule = (i) => upd("id_card_rules", form.id_card_rules.filter((_,idx)=>idx!==i));

  const previewStudent = {
    name: "Contoh Siswa", nisn: "0051234567", kelas: "XI IPA 1", jurusan: "IPA",
    qr_code: "SEKOLAHKU-PREVIEW-XXXX", id: "preview"
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7 text-sky-600"/>Pengaturan Sekolah
          </h1>
          <p className="mt-1 text-sm text-slate-500">Kustomisasi identitas & tampilan seluruh sistem {form.school_name || "sekolah"}</p>
        </div>
        <button data-testid="settings-save-button" onClick={save} disabled={busy}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg">
          <Save className="w-4 h-4"/>{busy ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Section title="A. Identitas Sekolah" icon="🏫">
            <Field label="Nama Pendek Sekolah *" hint="Muncul di sidebar & judul tab browser">
              <input value={form.school_name || ""} onChange={e=>upd("school_name", e.target.value)} className={inp}/>
            </Field>
            <Field label="Nama Lengkap Sekolah *" hint="Muncul di kartu pelajar & rapor">
              <input value={form.school_full_name || ""} onChange={e=>upd("school_full_name", e.target.value)} className={inp}/>
            </Field>
            <Field label="Alamat Sekolah">
              <textarea rows={2} value={form.school_address || ""} onChange={e=>upd("school_address", e.target.value)} className={inp}/>
            </Field>
            <Field label="Tagline / Deskripsi">
              <input value={form.footer_text || ""} onChange={e=>upd("footer_text", e.target.value)} className={inp}/>
            </Field>
            <Field label="Tahun Ajaran" hint="Muncul di cover presentasi & PPTX">
              <input data-testid="academic-year-input" value={form.academic_year || ""} onChange={e=>upd("academic_year", e.target.value)} placeholder="2026/2027" className={inp}/>
            </Field>
          </Section>

          <Section title="D. Teks Halaman Login" icon="✍️">
            <p className="text-[11px] text-slate-400 -mt-1">Semua teks ini tampil di halaman login publik dan bisa diubah dengan leluasa.</p>
            <Field label="Badge / Sub-judul" hint="Teks kecil di bawah nama sekolah (sidebar login)">
              <input data-testid="login-badge-input" value={form.login_badge || ""} onChange={e=>upd("login_badge", e.target.value)} className={inp}/>
            </Field>
            <Field label="Headline Utama" hint="Gunakan baris baru (Enter) untuk memisah baris">
              <textarea data-testid="login-headline-input" rows={3} value={form.login_headline || ""} onChange={e=>upd("login_headline", e.target.value)} className={inp}/>
            </Field>
            <Field label="Deskripsi">
              <textarea data-testid="login-description-input" rows={3} value={form.login_description || ""} onChange={e=>upd("login_description", e.target.value)} className={inp}/>
            </Field>
            <Field label="Judul Form (kanan)">
              <input data-testid="login-welcome-title-input" value={form.login_welcome_title || ""} onChange={e=>upd("login_welcome_title", e.target.value)} className={inp}/>
            </Field>
            <Field label="Sub-judul Form">
              <input data-testid="login-welcome-subtitle-input" value={form.login_welcome_subtitle || ""} onChange={e=>upd("login_welcome_subtitle", e.target.value)} className={inp}/>
            </Field>
            <Field label="Teks Footer">
              <input data-testid="login-footer-input" value={form.login_footer || ""} onChange={e=>upd("login_footer", e.target.value)} className={inp}/>
            </Field>
          </Section>

          <Section title="B. Logo Sekolah" icon="🎨">
            <Field label="Upload Logo (opsional)" hint="Bisa dipangkas (1:1) sebelum disimpan. Ideal 200×200px">
              <input type="file" accept="image/*" onChange={pickLogo} className="w-full text-sm"/>
              {form.school_logo_url && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <img src={form.school_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg bg-white border"/>
                  <button onClick={()=>upd("school_logo_url","")} className="text-xs text-rose-600 font-semibold flex items-center gap-1"><Trash2 className="w-3 h-3"/>Hapus logo</button>
                </div>
              )}
            </Field>
            {logoCropFile && (
              <ImageCropDialog file={logoCropFile} aspect={1} round title="Pangkas Logo Sekolah"
                onCancel={() => setLogoCropFile(null)} onCropped={uploadCroppedLogo}/>
            )}
          </Section>

          <Section title="C. Kartu Pelajar (KTP-S)" icon="🎫">
            <Field label="Masa Berlaku Kartu">
              <input value={form.id_card_valid_years || ""} onChange={e=>upd("id_card_valid_years", e.target.value)} placeholder="2025 - 2028" className={inp}/>
            </Field>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 flex items-center justify-between">
                Tata Tertib di Balik Kartu
                <button onClick={addRule} className="text-sky-600 font-semibold flex items-center gap-1 normal-case"><Plus className="w-3 h-3"/>Tambah baris</button>
              </label>
              <div className="mt-2 space-y-2">
                {(form.id_card_rules || []).map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="w-6 h-9 flex items-center justify-center text-xs font-bold text-slate-400">{i+1}.</span>
                    <input value={r} onChange={e=>updRule(i, e.target.value)} className={inp}/>
                    <button onClick={()=>delRule(i)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <button data-testid="settings-reset" onClick={()=>{if(confirm("Reset ke default?")) setForm({...form,school_name:"SMA NEGERI 1 LAGUBOTI",school_full_name:"SMA NEGERI 1 LAGUBOTI",school_address:"Jl. Sekolah No. 3, Pasar Laguboti, Kec. Laguboti, Kab. Toba 22381",school_logo_url:"",id_card_valid_years:"2025 - 2028",id_card_rules:["Kartu ini wajib dibawa selama berada di lingkungan sekolah.","Digunakan untuk presensi QR & peminjaman inventaris.","Apabila hilang/rusak, segera lapor ke Tata Usaha."],footer_text:"Sistem Manajemen Sekolah Terpadu",primary_color:"#0284C7",login_badge:"SISTEM MANAJEMEN SEKOLAH TERPADU",login_headline:"Satu Platform.\nTujuh Peran.\nSekolah Modern.",login_description:"Absensi QR, Schoolgram, Inventaris, Tugas & Quiz, Uang Kas, Dana Sosial, Pemilu OSIS, dan Kartu Pelajar cetak KTP — semuanya dalam satu dashboard elegan.",login_welcome_title:"Masuk ke Akun Anda",login_welcome_subtitle:"Gunakan email dan password yang diberikan oleh Super Admin sekolah.",login_footer:"© 2026 SMA NEGERI 1 LAGUBOTI · Version 1.0"});}}
            className="w-full py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4"/>Reset ke Default
          </button>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-bold text-slate-900 mb-4">🔍 Live Preview Kartu Pelajar</h3>
            <div className="flex flex-col items-center gap-4 py-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Depan</span>
                <StudentIdCard student={previewStudent} school={form.school_full_name || "SMA NEGERI 1 LAGUBOTI"}
                  validYears={form.id_card_valid_years} logoUrl={form.school_logo_url} side="front"/>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Belakang</span>
                <StudentIdCard student={previewStudent} school={form.school_full_name || "SMA NEGERI 1 LAGUBOTI"}
                  logoUrl={form.school_logo_url} rules={form.id_card_rules} side="back"/>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mt-4">
              Perubahan akan tampil di semua kartu siswa setelah disimpan.
            </p>
          </div>

          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-5">
            <h3 className="font-heading font-bold text-slate-900 mb-2">💡 Tips</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Nama pendek muncul di header sidebar dan judul tab</li>
              <li>Nama lengkap muncul di header Kartu Pelajar dan rapor PDF</li>
              <li>Logo akan tampil di Kartu Pelajar mengganti icon default</li>
              <li>Tata tertib bisa ditambah sebanyak yang diperlukan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm";

function Section({title, icon, children}) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
    <h2 className="font-heading font-bold text-slate-900 flex items-center gap-2">
      <span className="w-1.5 h-6 bg-sky-500 rounded-full"/>{icon} {title}
    </h2>
    {children}
  </div>;
}
function Field({label, hint, children}) {
  return <div>
    <label className="text-xs font-semibold uppercase text-slate-600">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
  </div>;
}
