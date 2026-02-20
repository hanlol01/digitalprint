import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getData, getToken, postData, setToken } from "@/lib/api";
import type { UserRole } from "@/types";

type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
};

type LoginPayload = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    const me = await getData<AuthUser>("/auth/me");
    setUser(me);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await refreshMe();
      } catch {
        clearToken();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [refreshMe]);

  const login = useCallback(async (username: string, password: string) => {
    const payload = await postData<LoginPayload, { username: string; password: string }>("/auth/login", { username, password });
    setToken(payload.token);
    setUser(payload.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshMe,
    }),
    [user, isLoading, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
