import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, IdCard, Mail, Phone, Users as UsersIcon, BookOpen, Hash, CalendarDays, School, QrCode, UserCircle2, Briefcase } from "lucide-react";

const ROLE_LABEL = {
  super_admin: "Super Admin", kepsek: "Kepala Sekolah", staff_tu: "Staff TU",
  guru: "Guru / Wali Kelas", siswa: "Siswa", ketua_osis: "Ketua OSIS", ketua_kelas: "Ketua Kelas",
  admin_perpus: "Admin Perpustakaan", admin_absensi: "Admin Absensi",
};
const ROLE_BADGE = {
  super_admin: "bg-violet-100 text-violet-700", kepsek: "bg-amber-100 text-amber-700",
  staff_tu: "bg-indigo-100 text-indigo-700", guru: "bg-emerald-100 text-emerald-700",
  siswa: "bg-sky-100 text-sky-700", ketua_osis: "bg-rose-100 text-rose-700",
  ketua_kelas: "bg-teal-100 text-teal-700", admin_perpus: "bg-cyan-100 text-cyan-700",
  admin_absensi: "bg-orange-100 text-orange-700",
};
const STUDENT_ROLES = ["siswa", "ketua_kelas", "ketua_osis"];

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Icon className="w-4 h-4"/></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
        <p className="text-sm text-slate-900 font-medium break-words">{value || <span className="text-slate-300">—</span>}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [tab, setTab] = useState("akademik");
  if (!user) return null;
  const isStudent = STUDENT_ROLES.includes(user.role);
  const joined = user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "";

  const tabs = [
    { k: "akademik", label: "Data Akademik", icon: School },
    { k: "pribadi", label: "Data Pribadi", icon: UserCircle2 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="profile-page">
      <div>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">Informasi data diri dan akademik akun Anda.</p>
      </div>

      {/* Header card */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900"/>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-3xl font-extrabold overflow-hidden ring-4 ring-white shadow-lg shrink-0">
              {user.photo ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover"/> : (user.name?.[0] || "?")}
            </div>
            <div className="sm:pb-1 min-w-0">
              <h2 className="font-heading text-2xl font-extrabold text-slate-900 truncate" data-testid="profile-name">{user.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span data-testid="profile-role-badge" className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ROLE_BADGE[user.role] || "bg-slate-100 text-slate-700"}`}>{ROLE_LABEL[user.role] || user.role}</span>
                {user.kelas && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Kelas {user.kelas}</span>}
                <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5"/>{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(t => (
          <button key={t.k} data-testid={`profile-tab-${t.k}`} onClick={()=>setTab(t.k)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab===t.k ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            <t.icon className="w-4 h-4"/>{t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        {tab === "akademik" ? (
          <div className="grid sm:grid-cols-2 gap-x-8" data-testid="profile-akademik">
            <Row icon={Briefcase} label="Peran / Jabatan" value={ROLE_LABEL[user.role] || user.role}/>
            {isStudent
              ? <Row icon={Hash} label="NISN" value={user.nisn}/>
              : <Row icon={IdCard} label="NIP" value={user.nip}/>}
            <Row icon={School} label="Kelas" value={user.kelas}/>
            <Row icon={CalendarDays} label="Bergabung Sejak" value={joined}/>
            {user.role === "guru" && (
              <div className="sm:col-span-2 flex items-start gap-3 py-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4"/></div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Mata Pelajaran Diampu</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(user.subjects && user.subjects.length) ? user.subjects.map(s=>(
                      <span key={s} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{s}</span>
                    )) : <span className="text-sm text-slate-300">—</span>}
                  </div>
                </div>
              </div>
            )}
            <Row icon={QrCode} label="Kode Barcode" value={user.qr_code}/>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-8" data-testid="profile-pribadi">
            <Row icon={UserCircle2} label="Nama Lengkap" value={user.name}/>
            <Row icon={Mail} label="Email Akademik" value={user.email}/>
            <Row icon={Phone} label="Nomor WhatsApp" value={user.phone}/>
            {isStudent && <>
              <Row icon={UsersIcon} label="Nama Orang Tua / Wali" value={user.parent_name}/>
              <Row icon={Mail} label="Email Orang Tua" value={user.parent_email}/>
              <Row icon={Phone} label="Nomor Orang Tua" value={user.parent_phone}/>
            </>}
          </div>
        )}
      </div>

      {isStudent && (
        <a href="/my-card" data-testid="profile-mycard-link"
          className="flex items-center justify-between gap-3 p-4 bg-white border-2 border-slate-200 hover:border-sky-400 rounded-2xl transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><IdCard className="w-5 h-5"/></div>
            <div><p className="text-sm font-heading font-bold text-slate-900">Kartu Pelajar Saya</p>
              <p className="text-xs text-slate-500">Lihat & cetak kartu pelajar digital Anda</p></div>
          </div>
          <GraduationCap className="w-5 h-5 text-sky-500 group-hover:translate-x-1 transition-transform"/>
        </a>
      )}
    </div>
  );
}
