import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/apiClient";

const DEFAULTS = {
  school_name: "SEKOLAHKU",
  school_full_name: "SMA NEGERI 1 SEKOLAHKU",
  school_address: "Jl. Pendidikan No. 1, Jakarta",
  school_logo_url: "",
  id_card_valid_years: "2025 - 2028",
  id_card_rules: [
    "Kartu ini wajib dibawa selama berada di lingkungan sekolah.",
    "Digunakan untuk presensi QR & peminjaman inventaris.",
    "Apabila hilang/rusak, segera lapor ke Tata Usaha."
  ],
  footer_text: "Sistem Manajemen Sekolah Terpadu",
  primary_color: "#0284C7",
};

const SettingsContext = createContext(DEFAULTS);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const refresh = () => api.get("/settings").then(r => setSettings({...DEFAULTS, ...r.data})).catch(()=>{});
  useEffect(() => { refresh(); }, []);
  return <SettingsContext.Provider value={{settings, refresh}}>{children}</SettingsContext.Provider>;
}
export const useSettings = () => useContext(SettingsContext);
