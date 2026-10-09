import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { LockKeyhole, LogOut } from "lucide-react";

export default function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ current_password: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  if (user === null) return null;
  if (user === false) return <Navigate to="/login" replace/>;
  const submit = async e => {
    e.preventDefault();
    if (f.new_password !== f.confirm) { toast.error("Konfirmasi password tidak cocok"); return; }
    if (f.new_password.length < 8 || !/[A-Za-z]/.test(f.new_password) || !/\d/.test(f.new_password)) {
      toast.error("Password minimal 8 karakter dan mengandung huruf & angka"); return;
    }
    setBusy(true);
    try {
      const r = await api.post("/auth/change-password", { current_password: f.current_password, new_password: f.new_password });
      setUser(r.data.user);
      toast.success("Password berhasil diganti");
      nav("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengganti password");
    } finally { setBusy(false); }
  };
  const inp = "w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 outline-none";
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6" data-testid="change-password-page">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4"><LockKeyhole className="w-7 h-7"/></div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900">Ganti Password</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.must_change_password ? "Anda login dengan password sementara. Buat password baru untuk melanjutkan." : "Buat password baru untuk akun Anda."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input data-testid="change-current-input" type="password" required value={f.current_password} onChange={e=>setF({...f, current_password: e.target.value})}
            placeholder={user.must_change_password ? "Password sementara" : "Password saat ini"} className={inp}/>
          <input data-testid="change-new-input" type="password" required value={f.new_password} onChange={e=>setF({...f, new_password: e.target.value})}
            placeholder="Password baru (min. 8, huruf & angka)" className={inp}/>
          <input data-testid="change-confirm-input" type="password" required value={f.confirm} onChange={e=>setF({...f, confirm: e.target.value})}
            placeholder="Konfirmasi password baru" className={inp}/>
          <button data-testid="change-submit-button" disabled={busy} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-60">
            {busy ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
        <button data-testid="change-logout-button" onClick={async()=>{ await logout(); nav("/login"); }} className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <LogOut className="w-4 h-4"/>Keluar
        </button>
      </div>
    </div>
  );
}
