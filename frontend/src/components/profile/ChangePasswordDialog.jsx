import { useState } from "react";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { X, LockKeyhole, Eye, EyeOff } from "lucide-react";

const inp = "w-full px-4 py-3 pr-11 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none text-sm";

function PwInput({ testid, value, onChange, placeholder, show }) {
  return <input data-testid={testid} type={show ? "text" : "password"} required value={value} onChange={onChange} placeholder={placeholder} className={inp}/>;
}

export function ChangePasswordDialog({ onClose }) {
  const { setUser } = useAuth();
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const strong = f.next.length >= 8 && /[A-Za-z]/.test(f.next) && /\d/.test(f.next);
  const submit = async (e) => {
    e.preventDefault();
    if (!strong) { toast.error("Password minimal 8 karakter dan mengandung huruf & angka"); return; }
    if (f.next !== f.confirm) { toast.error("Konfirmasi password tidak cocok"); return; }
    setBusy(true);
    try {
      const r = await api.post("/auth/change-password", { current_password: f.current, new_password: f.next });
      setUser(r.data.user);
      toast.success("Password berhasil diganti. Sesi di perangkat lain otomatis keluar.");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengganti password");
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" data-testid="change-password-dialog">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-3 animate-in zoom-in-95 fade-in duration-150">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold flex items-center gap-2"><LockKeyhole className="w-5 h-5 text-sky-600"/>Ganti Password</h3>
          <button type="button" data-testid="change-password-close" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button>
        </div>
        <PwInput testid="profile-current-password" show={show} value={f.current} onChange={e => setF({ ...f, current: e.target.value })} placeholder="Password saat ini"/>
        <PwInput testid="profile-new-password" show={show} value={f.next} onChange={e => setF({ ...f, next: e.target.value })} placeholder="Password baru"/>
        <PwInput testid="profile-confirm-password" show={show} value={f.confirm} onChange={e => setF({ ...f, confirm: e.target.value })} placeholder="Ulangi password baru"/>
        <div className="flex items-center justify-between text-xs">
          <span className={strong ? "text-emerald-600 font-semibold" : "text-slate-400"}>Min. 8 karakter, huruf & angka</span>
          <button type="button" data-testid="profile-toggle-password" onClick={() => setShow(s => !s)} className="flex items-center gap-1 text-slate-500 hover:text-slate-800">
            {show ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}{show ? "Sembunyikan" : "Tampilkan"}
          </button>
        </div>
        <button data-testid="profile-change-password-submit" disabled={busy} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold disabled:opacity-60 transition-colors">
          {busy ? "Menyimpan..." : "Simpan Password Baru"}
        </button>
      </form>
    </div>
  );
}
