"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { Button } from "@/components/ui/button";
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar sua conta.",
      );
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Crie seu workspace"
      description={
        pendingUrl ? (
          <>
            Depois do cadastro, você poderá adicionar{" "}
            <span className="break-all text-foreground">{pendingUrl}</span> como
            projeto.
          </>
        ) : (
          "Comece organizando seus projetos e acompanhando a qualidade em um único lugar."
        )
      }
    >
      <div className="space-y-6">
        <GoogleSignInButton />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          ou cadastre-se com e-mail
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Seu nome
            </label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Como devemos chamar você?"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "register-error" : undefined}
              disabled={busy}
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? "register-error" : undefined}
              disabled={busy}
              required
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-sm font-medium"
            >
              Senha
            </label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Mínimo de 8 caracteres"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={
                error
                  ? "register-error register-password-help"
                  : "register-password-help"
              }
              disabled={busy}
              required
            />
            <p
              id="register-password-help"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              Use uma senha exclusiva, com pelo menos 8 caracteres.
            </p>
          </div>
          {error && (
            <div
              id="register-error"
              role="alert"
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Criando conta…
              </>
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          Ao criar uma conta, você concorda com os{" "}
          <Link href="/termos" className="text-foreground hover:underline">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-foreground hover:underline">
            Política de privacidade
          </Link>
          .
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Já possui uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid min-h-screen place-items-center bg-background text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">Preparando cadastro…</span>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
