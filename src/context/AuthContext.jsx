import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, fmtErr } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: fmtErr(e.response?.data?.detail) || e.message };
    }
  }, []);
  const register = useCallback(async (email, password, name) => {
    try {
      const { data } = await api.post("/auth/register", { email, password, name });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: fmtErr(e.response?.data?.detail) || e.message };
    }
  }, []);
  const acceptInvite = useCallback(async (token, password) => {
    try {
      const { data } = await api.post(`/invitations/${token}/accept`, { password });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: fmtErr(e.response?.data?.detail) || e.message };
    }
  }, []);
  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (err) { console.debug("Logout POST failed; clearing session locally:", err?.message || err); }
    setUser(false);
  }, []);
  const contextValue = useMemo(
    () => ({ user, login, register, acceptInvite, logout }),
    [acceptInvite, login, logout, register, user],
  );

  return (
    <AuthCtx.Provider value={contextValue}>
      {children}
    </AuthCtx.Provider>
  );
}
