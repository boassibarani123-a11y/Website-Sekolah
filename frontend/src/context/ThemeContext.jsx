import { createContext, useContext, useEffect, useState } from "react";
import { useSettings } from "@/context/SettingsContext";

const ThemeContext = createContext(null);

function shade(hex, pct) {
  try {
    const n = parseInt(String(hex).replace("#", ""), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = pct < 0 ? 0 : 255, p = Math.abs(pct) / 100;
    r = Math.round((t - r) * p) + r;
    g = Math.round((t - g) * p) + g;
    b = Math.round((t - b) * p) + b;
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

export function ThemeProvider({ children }) {
  const { settings } = useSettings();
  const [dark, setDark] = useState(() => localStorage.getItem("theme-dark") === "1");

  useEffect(() => {
    const el = document.documentElement;
    if (dark) el.classList.add("dark"); else el.classList.remove("dark");
    localStorage.setItem("theme-dark", dark ? "1" : "0");
  }, [dark]);

  useEffect(() => {
    const c = settings.primary_color || "#0284C7";
    const root = document.documentElement;
    root.style.setProperty("--brand", c);
    root.style.setProperty("--brand-dark", shade(c, -18));
    root.style.setProperty("--brand-light", shade(c, 35));
  }, [settings.primary_color]);

  return (
    <ThemeContext.Provider value={{ dark, setDark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
