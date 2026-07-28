"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { LogoFull, LogoIsotype } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

function RegisterForm() {
  const { register } = useAuth();
  const params = useSearchParams();
  const pendingUrl = params.get("url");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center text-center">
        <LogoIsotype className="h-12 w-12" />
        <h1 className="mt-4 text-2xl font-semibold">Crie sua conta no Elevate QA</h1>
        {pendingUrl && (
          <p className="mt-1 text-sm text-muted-foreground">
            Pronto para analisar <span className="text-foreground">{pendingUrl}</span> após o cadastro.
          </p>
        )}
      </div>

      <Card className="space-y-5 p-6">
        <GoogleSignInButton />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou com e-mail
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-medium text-muted-foreground">
              Nome
            </label>
            <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-muted-foreground">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-muted-foreground">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <nav aria-label="Principal" className="fixed left-0 top-0 p-6">
        <Link href="/">
          <LogoFull className="text-lg" />
        </Link>
      </nav>
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
