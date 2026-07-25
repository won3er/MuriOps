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
  /**
   * Existe um token salvo? Resolve na hora (localStorage), sem esperar a API.
   * Serve para a UI decidir "Dashboard" vs "Entrar/Criar conta" imediatamente
   * — a API no free tier pode levar ~50s pra acordar, e travar o header nisso
   * deixava a home parecendo quebrada.
   */
  hasSession: boolean;
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
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      setHasSession(false);
      setLoading(false);
      return;
    }
    // Já sabemos que há sessão salva — a UI pode reagir agora, sem esperar
    // a validação na API (que pode demorar por cold start do servidor).
    setHasSession(true);
    api
      .me()
      .then((s) => {
        setUser(s.user);
        setPlan(s.plan);
      })
      .catch(() => {
        clearToken();
        setHasSession(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const apply = (session: AuthSession) => {
    setToken(session.token);
    setUser(session.user);
    setPlan(session.plan);
    setHasSession(true);
  };

  const value: AuthContextValue = {
    user,
    plan,
    loading,
    hasSession,
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
      setHasSession(false);
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
