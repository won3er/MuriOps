"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { AUTH_COPY } from "@/lib/public-copy";
import { TermsAcceptance } from "@/components/terms-acceptance";

export default function LoginPage() {
  const { login } = useAuth();
  const { locale, href } = useLocale();
  const copy = AUTH_COPY[locale].login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!acceptedTerms) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
      setBusy(false);
    }
  }

  return (
    <AuthShell title={copy.title} description={copy.description}>
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
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              {copy.email}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={copy.emailPlaceholder}
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
              {copy.password}
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={copy.passwordPlaceholder}
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
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !acceptedTerms}
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
          {copy.noAccount}{" "}
          <Link
            href={href("/register")}
            className="font-medium text-primary hover:underline"
          >
            {copy.create}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
