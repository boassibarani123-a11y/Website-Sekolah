import { GraduationCap, LayoutDashboard, UsersRound, QrCode, Boxes, Camera, HandCoins, Vote, Trophy, Megaphone, MessageSquareWarning,
  BarChart3, FileText, Presentation as PresentationIcon, CalendarDays, UserPlus2, Settings as SettingsIcon, IdCard, Info, School, Network,
  BookOpen, CalendarCheck, CalendarRange, Award, KeyRound, ScanFace, ShieldCheck, UserCheck, Contact, DoorOpen, ClipboardCheck, Tornado,
  Radar, Library, Send, MonitorPlay } from "lucide-react";

const ADM = ["super_admin", "kepsek", "staff_tu", "piket_gerbang"];
const STU = ["siswa", "ketua_kelas", "ketua_osis"];

export const GROUPS = [
  { id: "institusi", label: "Institusi", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: "*" },
    { to: "/school-info", label: "Informasi Sekolah", icon: Info, roles: "*" },
    { to: "/org-structure", label: "Struktur Organisasi", icon: Network, roles: "*" },
    { to: "/my-card", label: "Kartu Saya", icon: IdCard, roles: STU },
    { to: "/accounts", label: "Kelola Akun", icon: UsersRound, roles: ["super_admin"] },
    { to: "/reset-requests", label: "Permintaan Reset", icon: KeyRound, roles: ["super_admin"] },
    { to: "/guru-staff", label: "Guru & Staff", icon: GraduationCap, roles: ["super_admin", "kepsek", "staff_tu"] },
    { to: "/settings", label: "Pengaturan", icon: SettingsIcon, roles: ["super_admin"] },
    { to: "/presentasi", label: "Presentasi", icon: PresentationIcon, roles: ["super_admin"] },
    { to: "/dokumentasi", label: "Dokumentasi", icon: FileText, roles: ["super_admin"] },
    { to: "/admin-ppdb", label: "Admin PPDB", icon: UserPlus2, roles: ["super_admin", "kepsek", "staff_tu"] },
    { to: "/analytics", label: "Analitik", icon: BarChart3, roles: ["kepsek", "super_admin"] },
  ]},
  { id: "kehadiran", label: "Kehadiran", items: [
    { to: "/attendance", label: "Absensi Barcode", icon: QrCode, roles: ADM },
    { to: "/face-attendance", label: "Absensi Face ID", icon: ScanFace, roles: ADM },
    { to: "/face-enroll", label: "Daftar Wajah", icon: UserCheck, roles: ADM },
    { to: "/absensi-harian", label: "Absensi Guru & Siswa", icon: ClipboardCheck, roles: ADM },
    { to: "/teacher-attendance", label: "Absensi Guru", icon: ClipboardCheck, roles: ADM },
    { to: "/gate-monitor", label: "Pantau Gerbang", icon: Radar, roles: ["super_admin", "kepsek", "staff_tu", "guru", "piket_gerbang"] },
    { to: "/gate-monitor", label: "Riwayat Gerbang", icon: Radar, roles: STU },
    { to: "/izin-keluar", label: "Izin Keluar (IK)", icon: DoorOpen, roles: [...ADM, "guru", ...STU] },
    { to: "/guests", label: "Kunjungan Tamu", icon: Contact, roles: ADM },
    { to: "/piket", label: "Jadwal Piket", icon: ShieldCheck, roles: ["super_admin", "kepsek", "staff_tu", "guru", "piket_gerbang"] },
    { to: "/attendance-recap", label: "Rekap Absensi", icon: CalendarCheck, roles: [...ADM, "guru"] },
  ]},
  { id: "akademik", label: "Akademik & Aktivitas", items: [
    { to: "/calendar", label: "Kalender", icon: CalendarDays, roles: "*" },
    { to: "/jadwal", label: "Jadwal Pelajaran", icon: CalendarRange, roles: "*" },
    { to: "/leaderboard", label: "Papan Peringkat", icon: Award, roles: "*" },
    { to: "/schoolgram", label: "Schoolgram", icon: Camera, roles: "*" },
    { to: "/inventory", label: "Inventaris", icon: Boxes, roles: "*" },
    { to: "/library", label: "Perpustakaan", icon: BookOpen, roles: "*" },
    { to: "/classes", label: "Kelas", icon: School, roles: "*" },
    { to: "/pemantau-live", label: "Pemantau Kelas Live", icon: MonitorPlay, roles: ["kepsek", "super_admin"] },
    { to: "/bank-soal", label: "Bank Soal", icon: Library, roles: ["guru", "super_admin"] },
    { to: "/pengajuan-ujian", label: "Pengajuan Ujian", icon: Send, roles: ["guru", "super_admin"] },
  ]},
  { id: "layanan", label: "Layanan Sekolah", items: [
    { to: "/vortex-guard", label: "Vortex Guard", icon: Tornado, roles: ["guru", "super_admin", ...STU] },
    { to: "/reports", label: "Rapor Digital", icon: FileText, roles: ["guru", "kepsek", "super_admin", "siswa"] },
    { to: "/social-fund", label: "Dana Sosial", icon: HandCoins, roles: ["super_admin", "kepsek", "ketua_osis"] },
    { to: "/elections", label: "Pemilu OSIS", icon: Vote, roles: "*" },
    { to: "/achievements", label: "Prestasi", icon: Trophy, roles: "*" },
    { to: "/announcements", label: "Pengumuman", icon: Megaphone, roles: "*" },
    { to: "/feedback", label: "Kritik & Saran", icon: MessageSquareWarning, roles: "*" },
  ]},
];

export const PIKET_GERBANG_PATHS = ["/", "/attendance", "/face-attendance", "/absensi-harian", "/izin-keluar", "/attendance-recap", "/guests"];

export const ROLE_LABEL = {
  super_admin: "Super Admin", kepsek: "Kepala Sekolah", staff_tu: "Staff TU",
  guru: "Guru / Wali Kelas", siswa: "Siswa", ketua_osis: "Ketua OSIS", ketua_kelas: "Ketua Kelas",
  admin_perpus: "Admin Perpustakaan", piket_gerbang: "Piket Gerbang",
};

const canSee = (m, user) => m.roles === "*" || m.roles.includes(user.role) || (user.teaching_duty && m.roles.includes("guru"));

export function visibleGroups(user) {
  return GROUPS.map(g => ({ ...g, items: g.items
    .filter(m => canSee(m, user))
    .filter(m => user.role !== "piket_gerbang" || PIKET_GERBANG_PATHS.includes(m.to)) }))
    .filter(g => g.items.length);
}

export function findCrumb(pathname) {
  for (const g of GROUPS) for (const m of g.items) {
    if (m.to === "/" ? pathname === "/" : pathname === m.to || pathname.startsWith(m.to + "/")) return { group: g.label, label: m.label };
  }
  if (pathname.startsWith("/profile")) return { group: "Akun", label: "Profil Saya" };
  return { group: "Institusi", label: "Halaman" };
}

export function semesterLabel(academicYear) {
  const m = new Date().getMonth();
  return `Semester ${m >= 6 ? "Ganjil" : "Genap"} ${academicYear || ""}`.trim();
}
