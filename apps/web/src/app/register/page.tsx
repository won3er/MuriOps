"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
      // Se veio da landing com uma URL, a análise pode ser iniciada no dashboard.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      {pendingUrl && (
        <p className="mt-1 text-sm text-muted-foreground">
          Pronto para analisar{" "}
          <span className="text-foreground">{pendingUrl}</span> após o cadastro.
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-3">
        <Input
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Senha (mínimo 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
