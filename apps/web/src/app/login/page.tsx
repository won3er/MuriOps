"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Entre no seu workspace"
      description="Acesse seus projetos, análises e planos de aplicação."
    >
      <div className="space-y-6">
        <GoogleSignInButton />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou continue com e-mail
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              disabled={busy}
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              disabled={busy}
              required
            />
          </div>
          {error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem uma conta?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
