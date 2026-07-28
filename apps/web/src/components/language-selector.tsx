"use client";

import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS, PUBLIC_COPY, type Locale } from "@/lib/i18n";
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

  return (
    <label
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border bg-background/60 px-2 text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground",
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{copy.language}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={copy.language}
        className={cn(
          "cursor-pointer appearance-none bg-transparent text-xs font-medium uppercase outline-none",
          compact ? "w-6" : "w-[76px]",
        )}
      >
        {LOCALES.map((item) => (
          <option key={item} value={item} className="bg-card text-foreground">
            {compact ? item.toUpperCase() : LOCALE_LABELS[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
