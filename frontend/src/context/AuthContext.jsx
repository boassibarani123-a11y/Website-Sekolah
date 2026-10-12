import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, obj=auth
  useEffect(() => {
    api.get("/auth/me").then(r => setUser(r.data)).catch(() => setUser(false));
  }, []);
  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    setUser(r.data.user);
    return r.data.user;
    return r.data.user;
  };
  const logout = async () => { await api.post("/auth/logout"); setUser(false); };
  return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
