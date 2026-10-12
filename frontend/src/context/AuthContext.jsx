import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/apiClient";

const AuthContext = createContext(null);

const getDeviceId = () => {
  let id = localStorage.getItem("vg_device_id");
  if (!id) {
    id = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem("vg_device_id", id);
  }
  return id;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=auth
  useEffect(() => {
    api.get("/auth/me").then(r => setUser(r.data)).catch(() => setUser(false));
  }, []);
  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password, device_id: getDeviceId() });
    setUser(r.data.user);
    return r.data.user;
  };
  const logout = async () => { await api.post("/auth/logout"); setUser(false); };
  return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
