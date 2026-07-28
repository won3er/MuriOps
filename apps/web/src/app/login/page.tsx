"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { LogoFull, LogoIsotype } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("demo@qa-ai.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <nav aria-label="Principal" className="fixed left-0 top-0 p-6">
        <Link href="/">
          <LogoFull className="text-lg" />
        </Link>
      </nav>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoIsotype className="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-semibold">Entrar no Elevate QA</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use a conta demo ou a sua.</p>
        </div>

        <Card className="space-y-5 p-6">
          <GoogleSignInButton />

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            ou com e-mail
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              aria-label="E-mail"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              aria-label="Senha"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Criar agora
          </Link>
        </p>
      </div>
    </main>
  );
}
