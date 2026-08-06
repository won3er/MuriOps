"use client";

import { Languages } from "lucide-react";
import { LOCALES, PUBLIC_COPY, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/utils";

export function LanguageSelector({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale } = useLocale();
  const copy = PUBLIC_COPY[locale];
  const shortLabels: Record<Locale, string> = { en: "EN", pt: "PT", es: "ES" };
  // Bandeira por idioma — pt aponta pra 🇧🇷 (público do produto), não 🇵🇹, já
  // que toda a copy em português é pt-BR.
  const flags: Record<Locale, string> = { en: "🇺🇸", pt: "🇧🇷", es: "🇪🇸" };

  return (
    <div
      role="group"
      aria-label={copy.language}
      className={cn(
        "inline-flex h-9 items-center gap-1 rounded-md border bg-background/60 p-1 text-muted-foreground",
        className,
      )}
    >
      {!compact && <Languages className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          title={item === "en" ? "English" : item === "pt" ? "Português" : "Español"}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors",
            locale === item
              ? "bg-accent text-foreground shadow-sm"
              : "hover:bg-accent/70 hover:text-foreground",
          )}
        >
          <span className="text-sm leading-none" aria-hidden="true">
            {flags[item]}
          </span>
          {shortLabels[item]}
        </button>
      ))}
    </div>
  );
}
