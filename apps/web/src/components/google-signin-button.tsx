"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale-context";
import { AUTH_COPY } from "@/lib/public-copy";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
            use_fedcm_for_button?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Botão "Entrar com Google" via Google Identity Services — sem redirect
 * server-side, o navegador troca o token direto com o Google e a gente só
 * valida o ID token resultante no backend (/auth/google).
 */
export function GoogleSignInButton({ enabled = true }: { enabled?: boolean }) {
  const { loginWithGoogle } = useAuth();
  const { locale } = useLocale();
  const copy = AUTH_COPY[locale].login;
  const containerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleCredential = useCallback(
    async (resp: { credential: string }) => {
      setBusy(true);
      try {
        await loginWithGoogle(resp.credential, true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : copy.googleError);
        setBusy(false);
      }
    },
    [copy.googleError, loginWithGoogle],
  );

  const initGoogle = useCallback(() => {
    if (!CLIENT_ID || !window.google || !containerRef.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      // Em navegadores Chromium atuais, o FedCM é mediado pelo próprio
      // navegador e evita a janela `gsi/transform` em branco. Em navegadores
      // sem suporte, o Google mantém o fluxo de popup como fallback.
      use_fedcm_for_button: true,
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(320, containerRef.current.clientWidth || 320),
      text: "continue_with",
      shape: "rectangular",
      locale: locale === "pt" ? "pt-BR" : locale,
    });
  }, [handleCredential, locale]);

  if (!CLIENT_ID) return null;
  if (!enabled) {
    return (
      <div className="rounded-md border bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
        {locale === "pt"
          ? "Aceite os termos para continuar com o Google."
          : locale === "es"
            ? "Acepta los términos para continuar con Google."
            : "Accept the terms to continue with Google."}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogle}
      />
      <div
        ref={containerRef}
        aria-busy={busy}
        className="w-full max-w-[320px] overflow-hidden"
      />
    </div>
  );
}
