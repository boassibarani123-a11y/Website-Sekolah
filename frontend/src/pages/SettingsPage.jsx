import { useState, useEffect } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useSettings } from "@/context/SettingsContext";
import { Settings as SettingsIcon, Save, Upload, Plus, Trash2, RotateCcw } from "lucide-react";
import StudentIdCard from "@/components/StudentIdCard";

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

  const uploadLogo = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await api.post("/upload", fd);
      const url = `${process.env.REACT_APP_BACKEND_URL}${r.data.url}`;
      setForm({...form, school_logo_url: url});
      toast.success("Logo terunggah, klik Simpan untuk menerapkan");
    } catch { toast.error("Gagal upload"); }
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
          <p className="mt-1 text-sm text-slate-500">Kustomisasi identitas & tampilan seluruh sistem SEKOLAHKU</p>
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
          </Section>

          <Section title="B. Logo Sekolah" icon="🎨">
            <Field label="Upload Logo (opsional)" hint="Recommended: 200×200px PNG/JPG">
              <input type="file" accept="image/*" onChange={uploadLogo} className="w-full text-sm"/>
              {form.school_logo_url && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <img src={form.school_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg bg-white border"/>
                  <button onClick={()=>upd("school_logo_url","")} className="text-xs text-rose-600 font-semibold flex items-center gap-1"><Trash2 className="w-3 h-3"/>Hapus logo</button>
                </div>
              )}
            </Field>
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

          <button data-testid="settings-reset" onClick={()=>{if(confirm("Reset ke default?")) setForm({school_name:"SEKOLAHKU",school_full_name:"SMA NEGERI 1 SEKOLAHKU",school_address:"Jl. Pendidikan No. 1, Jakarta",school_logo_url:"",id_card_valid_years:"2025 - 2028",id_card_rules:["Kartu ini wajib dibawa selama berada di lingkungan sekolah.","Digunakan untuk presensi QR & peminjaman inventaris.","Apabila hilang/rusak, segera lapor ke Tata Usaha."],footer_text:"Sistem Manajemen Sekolah Terpadu",primary_color:"#0284C7"});}}
            className="w-full py-2.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4"/>Reset ke Default
          </button>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-heading font-bold text-slate-900 mb-4">🔍 Live Preview Kartu Pelajar</h3>
            <div className="flex flex-col items-center py-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
              <StudentIdCard student={previewStudent} school={form.school_full_name || "SMA NEGERI 1 SEKOLAHKU"}
                validYears={form.id_card_valid_years} logoUrl={form.school_logo_url}/>
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
