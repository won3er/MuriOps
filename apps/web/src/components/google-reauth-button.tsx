"use client";

import Script from "next/script";
import { useCallback, useRef } from "react";

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

export function GoogleReauthButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const initialize = useCallback(() => {
    if (!CLIENT_ID || !window.google || !containerRef.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: "outline",
      size: "large",
      width: Math.min(320, containerRef.current.clientWidth || 320),
      text: "continue_with",
      shape: "rectangular",
      locale: "pt-BR",
    });
  }, [onCredential]);

  if (!CLIENT_ID) {
    return (
      <p className="text-sm text-destructive">
        A confirmação pelo Google não está disponível neste ambiente.
      </p>
    );
  }

  return (
    <div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initialize}
      />
      <div ref={containerRef} className="min-h-10 w-full max-w-[320px]" />
    </div>
  );
}
