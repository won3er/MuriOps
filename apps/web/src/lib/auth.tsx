"use client";

import type { AuthSession, User } from "@qa-ai/shared";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, getToken, setToken } from "./api";

interface AuthContextValue {
  user: User | null;
  plan: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((s) => {
        setUser(s.user);
        setPlan(s.plan);
      })
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const apply = (session: AuthSession) => {
    setToken(session.token);
    setUser(session.user);
    setPlan(session.plan);
  };

  const value: AuthContextValue = {
    user,
    plan,
    loading,
    login: async (email, password) => {
      apply(await api.login({ email, password }));
      router.push("/dashboard");
    },
    register: async (name, email, password) => {
      apply(await api.register({ name, email, password }));
      router.push("/dashboard");
    },
    logout: () => {
      clearToken();
      setUser(null);
      setPlan(null);
      router.push("/login");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
