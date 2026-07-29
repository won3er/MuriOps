"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

const COOKIE_NAME = "muriops-cookie-notice";
const COPY: Record<
  Locale,
  { title: string; description: string; terms: string; privacy: string; accept: string }
> = {
  en: {
    title: "Essential cookies only",
    description:
      "MuriOps uses a functional cookie to remember your language and local browser storage to keep an authenticated session. We do not use advertising or behavioral analytics cookies.",
    terms: "Terms",
    privacy: "Privacy",
    accept: "Understood",
  },
  pt: {
    title: "Somente cookies essenciais",
    description:
      "O MuriOps usa um cookie funcional para lembrar o idioma e o armazenamento local do navegador para manter a sessão autenticada. Não usamos cookies de publicidade nem de análise comportamental.",
    terms: "Termos",
    privacy: "Privacidade",
    accept: "Entendi",
  },
  es: {
    title: "Solo cookies esenciales",
    description:
      "MuriOps usa una cookie funcional para recordar el idioma y el almacenamiento local del navegador para mantener la sesión autenticada. No usamos cookies publicitarias ni de analítica del comportamiento.",
    terms: "Términos",
    privacy: "Privacidad",
    accept: "Entendido",
  },
};

export function CookieNotice() {
  const { locale, href } = useLocale();
  const [visible, setVisible] = useState(false);
  const copy = COPY[locale];

  useEffect(() => {
    const acknowledged = document.cookie
      .split("; ")
      .some((cookie) => cookie.startsWith(`${COOKIE_NAME}=v1`));
    setVisible(!acknowledged);
  }, []);

  if (!visible) return null;

  function acknowledge() {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=v1; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
    setVisible(false);
  }

  return (
    <aside
      aria-label={copy.title}
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-xl border bg-background/95 p-4 shadow-2xl backdrop-blur sm:bottom-5 sm:flex sm:items-center sm:gap-5"
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {copy.description}
        </p>
        <div className="mt-2 flex gap-3 text-xs">
          <Link
            href={href("/termos")}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {copy.terms}
          </Link>
          <Link
            href={href("/privacidade")}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {copy.privacy}
          </Link>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={acknowledge}
        className="mt-4 w-full sm:mt-0 sm:w-auto"
      >
        {copy.accept}
      </Button>
    </aside>
  );
}
