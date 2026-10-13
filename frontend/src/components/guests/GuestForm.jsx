import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { X, Camera, Building2 } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const inp = "mt-1 w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm";
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

async function upload(file) {
  const fd = new FormData(); fd.append("file", file);
  const r = await api.post("/upload", fd);
  return `${BACKEND}${r.data.url}`;
}

function F({ label, children }) { return <div><label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>{children}</div>; }

export function GuestForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial || { name: "", institution: "", institution_address: "", position: "", phone: "", purpose: "", host: "", visit_date: today(), visit_time: "", photo: "", institution_logo: "", arrived: false });
  const [busy, setBusy] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const pick = async (e, k) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(k);
    try { const url = await upload(file); setF(s => ({ ...s, [k]: url })); } catch { toast.error("Gagal unggah"); } finally { setBusy(""); }
  };
  const submit = async (e) => {
    e.preventDefault(); setBusy("save");
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null));
    try {
      const r = initial?.id ? await api.patch(`/guests/${initial.id}`, body) : await api.post("/guests", body);
      toast.success(initial?.id ? "Data tamu diperbarui" : "Tamu terdaftar, ID card siap dicetak"); onSaved(r.data);
    } catch (err) { toast.error(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || "Gagal menyimpan"); }
    finally { setBusy(""); }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" data-testid="guest-form-modal">
      <form onSubmit={submit} className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="font-heading text-xl font-extrabold">{initial?.id ? "Edit Tamu" : "Daftarkan Tamu"}</h3>
          <button type="button" data-testid="guest-form-close" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid sm:grid-cols-[150px_1fr] gap-6">
          <div className="space-y-4">
            <label className="block cursor-pointer">
              <div className="w-[150px] h-[180px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 transition-colors">
                {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover" /> : <><Camera className="w-8 h-8" /><span className="text-xs mt-2">{busy === "photo" ? "Mengunggah…" : "Foto tamu"}</span></>}
              </div>
              <input data-testid="guest-photo-input" type="file" accept="image/*" capture="user" className="hidden" onChange={e => pick(e, "photo")} />
            </label>
            <label className="block cursor-pointer">
              <div className="w-[150px] h-16 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center gap-2 text-slate-400 hover:border-emerald-500 transition-colors">
                {f.institution_logo ? <img src={f.institution_logo} alt="" className="h-12 object-contain" /> : <><Building2 className="w-5 h-5" /><span className="text-xs">{busy === "institution_logo" ? "…" : "Logo instansi"}</span></>}
              </div>
              <input data-testid="guest-logo-input" type="file" accept="image/*" className="hidden" onChange={e => pick(e, "institution_logo")} />
            </label>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="Nama Tamu *"><input data-testid="guest-name" required value={f.name} onChange={set("name")} className={inp} /></F>
              <F label="Jabatan"><input data-testid="guest-position" value={f.position || ""} onChange={set("position")} className={inp} /></F>
            </div>
            <F label="Nama Instansi *"><input data-testid="guest-institution" required value={f.institution} onChange={set("institution")} className={inp} /></F>
            <F label="Alamat / Info Instansi"><input data-testid="guest-institution-address" value={f.institution_address || ""} onChange={set("institution_address")} className={inp} /></F>
            <F label="Tujuan Kunjungan *"><input data-testid="guest-purpose" required value={f.purpose} onChange={set("purpose")} className={inp} /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="Bertemu Dengan"><input data-testid="guest-host" value={f.host || ""} onChange={set("host")} className={inp} /></F>
              <F label="No. HP"><input data-testid="guest-phone" value={f.phone || ""} onChange={set("phone")} className={inp} /></F>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="Tanggal *"><input data-testid="guest-date" type="date" required value={f.visit_date} onChange={set("visit_date")} className={inp} /></F>
              <F label="Jam"><input data-testid="guest-time" type="time" value={f.visit_time || ""} onChange={set("visit_time")} className={inp} /></F>
            </div>
            {!initial?.id && (
              <label className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 cursor-pointer">
                <span className="text-sm font-semibold">Tamu sudah datang sekarang</span>
                <input data-testid="guest-arrived" type="checkbox" checked={f.arrived} onChange={e => setF({ ...f, arrived: e.target.checked })} className="w-5 h-5 accent-emerald-600" />
              </label>
            )}
          </div>
        </div>
        <div className="p-6 border-t"><button data-testid="guest-save" disabled={!!busy} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60">{busy === "save" ? "Menyimpan…" : "Simpan & Buat ID Card"}</button></div>
      </form>
    </div>
  );
}
