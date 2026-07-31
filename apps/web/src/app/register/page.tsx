"use client";

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { AUTH_COPY } from "@/lib/public-copy";
import { TermsAcceptance } from "@/components/terms-acceptance";

/**
 * Verificação anti-bot simples pro cadastro: código de 6 dígitos que o
 * backend troca a cada minuto (stateless, ver human-check.ts), exibido aqui
 * pra pessoa digitar de volta. Não substitui um reCAPTCHA de verdade, mas
 * cria fricção deliberada contra os bots mais simples sem depender de
 * serviço de terceiro.
 */
function useHumanCheck() {
  const [code, setCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loadError, setLoadError] = useState(false);

  async function fetchCode() {
    try {
      const res = await api.getHumanCheck();
      setCode(res.code);
      setSecondsRemaining(res.secondsRemaining);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    void fetchCode();
    const tick = setInterval(() => {
      setSecondsRemaining((s) => {
        if (s <= 1) {
          void fetchCode();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return { code, secondsRemaining, loadError, refresh: fetchCode };
}

function RegisterForm() {
  const { register } = useAuth();
  const { locale, href } = useLocale();
  const copy = AUTH_COPY[locale].register;
  const params = useSearchParams();
  const pendingUrl = params.get("url");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [humanCheckAnswer, setHumanCheckAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const humanCheck = useHumanCheck();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acceptedTerms) return;
    setBusy(true);
    setError(null);
    try {
      await register(
        name.trim(),
        email.trim(),
        password,
        true,
        humanCheckAnswer.trim(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
      setHumanCheckAnswer("");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={copy.title}
      description={
        pendingUrl ? (
          <>
            {copy.pendingBefore}{" "}
            <span className="break-all text-foreground">{pendingUrl}</span>{" "}
            {copy.pendingAfter}
          </>
        ) : (
          copy.description
        )
      }
    >
      <div className="space-y-6">
        <TermsAcceptance
          checked={acceptedTerms}
          onChange={setAcceptedTerms}
          disabled={busy}
        />
        <GoogleSignInButton enabled={acceptedTerms} />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {copy.divider}
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              {copy.name}
            </label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder={copy.namePlaceholder}
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
              {copy.email}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={copy.emailPlaceholder}
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
              {copy.password}
            </label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder={copy.passwordPlaceholder}
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
              {copy.passwordHelp}
            </p>
          </div>
          <div className="space-y-2.5 rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {copy.humanCheckLabel}
              {!humanCheck.loadError && (
                <span className="font-normal">
                  ({copy.humanCheckRefresh} {humanCheck.secondsRemaining}s)
                </span>
              )}
            </div>

            {humanCheck.loadError ? (
              <div className="flex items-center gap-2 text-xs text-red-300">
                <span>{copy.humanCheckError}</span>
                <button
                  type="button"
                  onClick={() => void humanCheck.refresh()}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="flex gap-1.5"
                  aria-live="polite"
                  aria-label={copy.humanCheckLabel}
                >
                  {(humanCheck.code ?? "······").split("").map((digit, i) => (
                    <div
                      key={i}
                      className="grid h-11 w-9 select-none place-items-center rounded-md border border-border bg-background font-mono text-xl font-semibold tabular-nums text-amber-400"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {humanCheck.secondsRemaining}s
                  </span>
                  <button
                    type="button"
                    onClick={() => void humanCheck.refresh()}
                    aria-label={copy.humanCheckRefresh}
                    className="grid h-6 w-6 place-items-center rounded-md hover:bg-accent hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="human-check-answer"
                className="mb-1.5 block text-sm font-medium"
              >
                {copy.humanCheckInputLabel}
              </label>
              <Input
                id="human-check-answer"
                name="humanCheckAnswer"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={copy.humanCheckPlaceholder}
                value={humanCheckAnswer}
                onChange={(event) => {
                  setHumanCheckAnswer(event.target.value.replace(/\D/g, ""));
                  if (error) setError(null);
                }}
                disabled={busy}
                required
              />
            </div>
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
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !acceptedTerms || humanCheckAnswer.length !== 6}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {copy.submitting}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {copy.haveAccount}{" "}
          <Link
            href={href("/login")}
            className="font-medium text-primary hover:underline"
          >
            {copy.signIn}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  const { locale } = useLocale();
  const copy = AUTH_COPY[locale].register;
  return (
    <Suspense
      fallback={
        <div
          className="grid min-h-screen place-items-center bg-background text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="mt-3 text-sm">{copy.preparing}</span>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
