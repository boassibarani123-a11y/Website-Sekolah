import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, LogIn, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Selamat datang kembali!");
      nav("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const demoUsers = [
    { role: "Super Admin", email: "cassandramarsada@gmail.com", pw: "Admin@Sekolah2026" },
    { role: "Kepsek", email: "kepsek@sekolahku.id", pw: "Kepsek@2026" },
    { role: "Staff TU", email: "tu@sekolahku.id", pw: "TU@2026" },
    { role: "Guru", email: "guru@sekolahku.id", pw: "Guru@2026" },
    { role: "Siswa", email: "siswa@sekolahku.id", pw: "Siswa@2026" },
    { role: "Ketua OSIS", email: "ketuaosis@sekolahku.id", pw: "Osis@2026" },
    { role: "Ketua Kelas", email: "ketuakelas@sekolahku.id", pw: "Kelas@2026" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold tracking-tight">SEKOLAHKU</h1>
              <p className="text-xs text-sky-100/80 font-mono-alt tracking-wider">SISTEM MANAJEMEN SEKOLAH TERPADU</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <h2 className="font-heading text-4xl xl:text-5xl font-extrabold leading-tight">Satu Platform.<br/>Tujuh Peran.<br/><span className="text-sky-200">Sekolah Modern.</span></h2>
          <p className="mt-6 text-sky-100/90 max-w-md leading-relaxed">Absensi QR, Schoolgram, Inventaris, Tugas & Quiz, Uang Kas, Dana Sosial, Pemilu OSIS, dan Kartu Pelajar cetak KTP — semuanya dalam satu dashboard elegan.</p>
        </div>
        <div className="relative text-xs text-sky-100/70 font-mono-alt">© 2026 SEKOLAHKU · Version 1.0</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center"><GraduationCap className="w-6 h-6"/></div>
            <div><h1 className="font-heading text-xl font-extrabold">SEKOLAHKU</h1><p className="text-xs text-slate-500">Sistem Manajemen Sekolah</p></div>
          </div>
          <h2 className="font-heading text-3xl font-extrabold text-slate-900">Masuk ke Akun Anda</h2>
          <p className="mt-2 text-slate-500 text-sm">Gunakan email dan password yang diberikan oleh Super Admin sekolah.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 tracking-wide uppercase">Email</label>
              <input data-testid="login-email-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-0 outline-none transition-colors" placeholder="nama@sekolahku.id"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 tracking-wide uppercase">Password</label>
              <div className="relative">
                <input data-testid="login-password-input" type={show?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)}
                  className="mt-1.5 w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-0 outline-none transition-colors" placeholder="••••••••"/>
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-slate-400 hover:text-slate-700">
                  {show?<EyeOff className="w-5 h-5"/>:<Eye className="w-5 h-5"/>}
                </button>
              </div>
            </div>
            <button data-testid="login-form-submit-button" disabled={loading} type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20">
              {loading ? "Memproses..." : (<><LogIn className="w-4 h-4"/>Masuk</>)}
            </button>
            <div className="text-center">
              <a href="/forgot-password" data-testid="forgot-password-link" className="text-sm text-sky-600 hover:text-sky-800 font-semibold">Lupa password?</a>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Coba Akun Demo (klik untuk isi)</p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map(d=>(
                <button key={d.email} onClick={()=>{setEmail(d.email);setPassword(d.pw);}}
                  className="text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-sky-400 hover:bg-sky-50 transition-colors">
                  <p className="text-xs font-semibold text-slate-800">{d.role}</p>
                  <p className="text-[10px] text-slate-500 truncate">{d.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-br from-sky-50 to-white border-2 border-sky-200 rounded-2xl">
            <p className="text-sm font-heading font-bold text-slate-900">📥 Calon Siswa Baru?</p>
            <p className="text-xs text-slate-600 mt-1">Daftar online tanpa perlu akun, upload berkas, dan pantau status kelulusan.</p>
            <a href="/ppdb" data-testid="ppdb-cta-link"
              className="mt-2 inline-block px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg">
              Buka Formulir PPDB →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
