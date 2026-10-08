import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/apiClient";

const DEFAULTS = {
  school_name: "SMA NEGERI 1 LAGUBOTI",
  school_full_name: "SMA NEGERI 1 LAGUBOTI",
  school_address: "Jl. Sekolah No. 3, Pasar Laguboti, Kec. Laguboti, Kab. Toba 22381",
  school_logo_url: "",
  id_card_valid_years: "2025 - 2028",
  id_card_rules: [
    "Kartu ini wajib dibawa selama berada di lingkungan sekolah.",
    "Digunakan untuk presensi QR & peminjaman inventaris.",
    "Apabila hilang/rusak, segera lapor ke Tata Usaha."
  ],
  footer_text: "Sistem Manajemen Sekolah Terpadu",
  primary_color: "#0284C7",
  academic_year: "2026/2027",
  login_badge: "SISTEM MANAJEMEN SEKOLAH TERPADU",
  login_headline: "Satu Platform.\nTujuh Peran.\nSekolah Modern.",
  login_description: "Absensi QR, Schoolgram, Inventaris, Tugas & Quiz, Uang Kas, Dana Sosial, Pemilu OSIS, dan Kartu Pelajar cetak KTP — semuanya dalam satu dashboard elegan.",
  login_welcome_title: "Masuk ke Akun Anda",
  login_welcome_subtitle: "Gunakan email dan password yang diberikan oleh Super Admin sekolah.",
  login_footer: "© 2026 SMA NEGERI 1 LAGUBOTI · Version 1.0",
  about: "",
  vision: "",
  mission: [],
  history: "",
  history_periods: [],
  goals: [],
  environment: [],
  goals_short: [],
  goals_medium: [],
  goals_long: [],
  targets: [],
  principal_name: "",
  principal_education: "",
  principal_major: "",
  principal_sk_date: "",
  principal_training: "",
  established_year: "",
  nss: "",
  land_area: "",
  npsn: "",
  accreditation: "",
  sk_pendirian: "",
  sk_instansi: "",
  address_street: "",
  address_village: "",
  address_district: "",
  address_regency: "",
  address_postal: "",
  contact_phone: "",
  contact_email: "",
  contact_website: "",
  hero_image_url: "",
};

const SettingsContext = createContext(DEFAULTS);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const refresh = () => api.get("/settings").then(r => setSettings({...DEFAULTS, ...r.data})).catch(()=>{});
  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (settings.school_name) document.title = settings.school_name; }, [settings.school_name]);
  return <SettingsContext.Provider value={{settings, refresh}}>{children}</SettingsContext.Provider>;
}
export const useSettings = () => useContext(SettingsContext);
