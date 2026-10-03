import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { GraduationCap, LogIn, Eye, EyeOff, Network, ArrowRight, FileText,
  Presentation as PresentationIcon, MapPin, Phone, Mail, Calendar, Hash, Award, Trophy } from "lucide-react";
import { toast } from "sonner";
import { LoginAnnouncementBanner } from "@/components/LoginAnnouncementBanner";

export default function Login() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoUsers = [
    { role: "Super Admin", email: "admin.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Kepsek", email: "kepsek.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Staff TU", email: "tu.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Guru", email: "guru.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Siswa", email: "siswa.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Ketua OSIS", email: "osis.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Ketua Kelas", email: "kelas.demo@sekolahku.id", pw: "Demo12345" },
    { role: "Admin Perpus", email: "perpus.demo@sekolahku.id", pw: "Demo12345" },
  ];

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

  const facts = [
    { icon: Calendar, label: "Berdiri", value: settings.established_year },
    { icon: Hash, label: "NPSN", value: settings.npsn },
    { icon: Award, label: "Akreditasi", value: (settings.accreditation || "").split("—")[0] },
  ].filter(f => f.value);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,white,transparent_40%)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20 overflow-hidden">
              {settings.school_logo_url
                ? <img src={settings.school_logo_url} alt="Logo" className="w-full h-full object-contain"/>
                : <GraduationCap className="w-7 h-7" />}
            </div>
            <div>
              <h1 data-testid="login-school-name" className="font-heading text-2xl font-extrabold tracking-tight">{settings.school_name}</h1>
              <p className="text-xs text-sky-100/80 font-mono-alt tracking-wider">{settings.login_badge}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <h2 className="font-heading text-4xl xl:text-5xl font-extrabold leading-tight whitespace-pre-line">{settings.login_headline}</h2>
          <p className="mt-6 text-sky-100/90 max-w-md leading-relaxed">{settings.login_description}</p>

          {/* School info summary */}
          <div className="mt-8 max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-5" data-testid="login-school-info">
            <p className="font-heading font-bold text-sm">{settings.school_full_name}</p>
            {settings.school_address && (
              <p className="mt-1.5 flex items-start gap-2 text-xs text-sky-100/90"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0"/>{settings.school_address}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sky-100/90">
              {settings.contact_phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/>{settings.contact_phone}</span>}
              {settings.contact_email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/>{settings.contact_email}</span>}
            </div>
            {facts.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {facts.map(f => (
                  <div key={f.label} className="rounded-xl bg-white/10 border border-white/15 px-2 py-2 text-center">
                    <f.icon className="w-3.5 h-3.5 mx-auto text-sky-200"/>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-sky-200/80">{f.label}</p>
                    <p className="text-xs font-bold truncate">{f.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="relative text-xs text-sky-100/70 font-mono-alt">{settings.login_footer}</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center overflow-hidden">
              {settings.school_logo_url ? <img src={settings.school_logo_url} alt="Logo" className="w-full h-full object-contain"/> : <GraduationCap className="w-6 h-6"/>}
            </div>
            <div><h1 className="font-heading text-xl font-extrabold">{settings.school_name}</h1><p className="text-xs text-slate-500">{settings.footer_text}</p></div>
          </div>
          <LoginAnnouncementBanner />
          <h2 className="font-heading text-3xl font-extrabold text-slate-900">{settings.login_welcome_title}</h2>
          <p className="mt-2 text-slate-500 text-sm">{settings.login_welcome_subtitle}</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-600 tracking-wide uppercase">Email</label>
              <input data-testid="login-email-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-0 outline-none transition-colors" placeholder="nama@sekolah.id"/>
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Coba Akun Demo (klik untuk isi)</p>
            <p className="text-[10px] text-slate-400 mb-3">Perubahan di akun demo terpisah & tidak memengaruhi data asli sekolah.</p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map(d=>(
                <button key={d.email} type="button" data-testid={`demo-login-${d.role.toLowerCase().replace(/\s/g,'-')}`}
                  onClick={()=>{setEmail(d.email);setPassword(d.pw);}}
                  className="text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-sky-400 hover:bg-sky-50 transition-colors">
                  <p className="text-xs font-semibold text-slate-800">{d.role}</p>
                  <p className="text-[10px] text-slate-500 truncate">{d.email}</p>
                </button>
              ))}
            </div>
          </div>

          <a href="/presentasi" data-testid="presentation-link"
            className="mt-6 flex items-center justify-between gap-3 p-4 bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-2xl transition-transform hover:scale-[1.01] shadow-lg shadow-sky-500/20 group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><PresentationIcon className="w-5 h-5"/></div>
              <div><p className="text-sm font-heading font-bold">Lihat Presentasi</p>
                <p className="text-xs text-sky-100/90">Deck interaktif fitur sekolah — bisa dicetak PDF</p></div>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
          </a>

          <a href="/struktur-organisasi" data-testid="public-org-link"
            className="mt-3 flex items-center justify-between gap-3 p-4 bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-2xl transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><Network className="w-5 h-5"/></div>
              <div><p className="text-sm font-heading font-bold text-slate-900">Struktur Organisasi Sekolah</p>
                <p className="text-xs text-slate-500">Lihat bagan organisasi tanpa perlu login</p></div>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform"/>
          </a>

          <a href="/dokumentasi" data-testid="documentation-link"
            className="mt-3 flex items-center justify-between gap-3 p-4 bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-2xl transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FileText className="w-5 h-5"/></div>
              <div><p className="text-sm font-heading font-bold text-slate-900">Dokumentasi Sistem</p>
                <p className="text-xs text-slate-500">TOR, PRD & diagram BPMN — bisa dicetak / diunduh PDF</p></div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform"/>
          </a>

          <a href="/galeri" data-testid="gallery-link"
            className="mt-3 flex items-center justify-between gap-3 p-4 bg-white border-2 border-slate-200 hover:border-amber-400 rounded-2xl transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Trophy className="w-5 h-5"/></div>
              <div><p className="text-sm font-heading font-bold text-slate-900">Galeri Prestasi & Kegiatan</p>
                <p className="text-xs text-slate-500">Lihat pencapaian & dokumentasi kegiatan sekolah</p></div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform"/>
          </a>

          <div className="mt-4 p-4 bg-gradient-to-br from-sky-50 to-white border-2 border-sky-200 rounded-2xl">
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
