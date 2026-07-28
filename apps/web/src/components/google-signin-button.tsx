"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
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
export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const handleCredential = useCallback(
    async (resp: { credential: string }) => {
      setBusy(true);
      try {
        await loginWithGoogle(resp.credential);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Falha ao entrar com Google",
        );
        setBusy(false);
      }
    },
    [loginWithGoogle],
  );

  const initGoogle = useCallback(() => {
    if (!CLIENT_ID || !window.google || !containerRef.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(320, containerRef.current.clientWidth || 320),
      text: "continue_with",
      shape: "rectangular",
    });
  }, [handleCredential]);

  if (!CLIENT_ID) return null;

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
