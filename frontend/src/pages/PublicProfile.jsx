import { Link } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import {
  GraduationCap, MapPin, Phone, Mail, Globe, Calendar, Hash, Award, Target,
  Eye, History as HistoryIcon, Flag, Leaf, ArrowLeft, LogIn, School, Building2, User,
} from "lucide-react";

function Section({ icon: Icon, title, children, tone = "sky" }) {
  const tones = { sky: "bg-sky-100 text-sky-600", emerald: "bg-emerald-100 text-emerald-600", violet: "bg-violet-100 text-violet-600", amber: "bg-amber-100 text-amber-600" };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h3 className="font-heading font-bold text-slate-900 flex items-center gap-2 mb-3 text-lg">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-4.5 h-4.5" /></span>{title}
      </h3>
      {children}
    </div>
  );
}

function List({ items, ordered }) {
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return <p className="text-sm text-slate-400">Belum ada data.</p>;
  const Tag = ordered ? "ol" : "ul";
  return <Tag className={`text-sm text-slate-700 space-y-1.5 leading-relaxed ${ordered ? "list-decimal" : "list-disc"} list-inside`}>{filled.map((m, i) => <li key={i}>{m}</li>)}</Tag>;
}

export default function PublicProfile() {
  const { settings: s } = useSettings();
  const facts = [
    { icon: User, label: "Kepala Sekolah", value: s.principal_name },
    { icon: Calendar, label: "Berdiri", value: s.established_year },
    { icon: Hash, label: "NPSN", value: s.npsn },
    { icon: Award, label: "Akreditasi", value: (s.accreditation || "").split("—")[0] },
    { icon: MapPin, label: "Luas Lahan", value: s.land_area },
  ].filter((f) => f.value);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="public-profile-page">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link to="/login" data-testid="back-to-login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />Kembali
          </Link>
          <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold">
            <LogIn className="w-4 h-4" />Masuk
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="h-64 sm:h-80 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 relative flex items-end">
          {s.hero_image_url && <img src={s.hero_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="relative max-w-5xl mx-auto w-full px-5 pb-8 text-white">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/90 p-1.5 flex items-center justify-center overflow-hidden">
                {s.school_logo_url ? <img src={s.school_logo_url} alt="" className="w-full h-full object-contain" /> : <GraduationCap className="w-8 h-8 text-sky-700" />}
              </div>
              <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold tracking-wide">PROFIL SEKOLAH</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-extrabold mt-4 tracking-tight">{s.school_full_name || s.school_name}</h1>
            {s.school_address && <p className="mt-2 text-sky-100/90 flex items-center gap-2 text-sm"><MapPin className="w-4 h-4" />{s.school_address}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 -mt-14 relative">
          {facts.map((f) => (
            <div key={f.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md">
              <f.icon className="w-5 h-5 text-sky-600" />
              <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{f.label}</p>
              <p className="font-heading font-bold text-slate-900 text-sm truncate">{f.value}</p>
            </div>
          ))}
        </div>

        {s.about && <Section icon={School} title="Tentang Sekolah"><p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.about}</p></Section>}

        <div className="grid lg:grid-cols-3 gap-6">
          <Section icon={Eye} title="Visi" tone="violet">
            <p className="text-sm text-slate-800 font-semibold italic leading-relaxed">"{s.vision || "Belum ada visi."}"</p>
          </Section>
          <div className="lg:col-span-2">
            <Section icon={Target} title="Misi" tone="emerald"><List items={s.mission} ordered /></Section>
          </div>
        </div>

        {s.history && (
          <Section icon={HistoryIcon} title="Sejarah Singkat">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{s.history}</p>
          </Section>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Section icon={Flag} title="Tujuan Sekolah" tone="amber"><List items={s.goals} ordered /></Section>
          <Section icon={Leaf} title="Berwawasan Lingkungan" tone="emerald"><List items={s.environment} /></Section>
        </div>

        {/* Address & contact */}
        <Section icon={Building2} title="Alamat & Kontak">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Row label="Jalan" value={s.address_street} />
            <Row label="Desa / Kelurahan" value={s.address_village} />
            <Row label="Kecamatan" value={s.address_district} />
            <Row label="Kabupaten" value={s.address_regency} />
            <Row label="Kode Pos" value={s.address_postal} />
            <Row label="Telepon" value={s.contact_phone} icon={Phone} />
            <Row label="E-mail" value={s.contact_email} icon={Mail} />
            <Row label="Website" value={s.contact_website} icon={Globe} />
          </div>
        </Section>

        <div className="text-center py-6">
          <p className="text-sm text-slate-500">Ingin bergabung atau mengakses layanan sekolah?</p>
          <Link to="/login" className="mt-3 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-lg shadow-sky-500/30">
            <LogIn className="w-4 h-4" />Masuk ke Aplikasi
          </Link>
          <p className="mt-3 text-xs text-slate-400">{s.login_footer}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-100">
      {Icon && <Icon className="w-4 h-4 text-sky-600 shrink-0" />}
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium break-words">{value || "—"}</span>
    </div>
  );
}
