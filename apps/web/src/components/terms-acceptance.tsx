"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

const COPY: Record<
  Locale,
  { before: string; terms: string; join: string; privacy: string }
> = {
  en: {
    before: "I have read and accept the",
    terms: "Terms of use",
    join: "and the",
    privacy: "Privacy Policy",
  },
  pt: {
    before: "Li e aceito os",
    terms: "Termos de uso",
    join: "e a",
    privacy: "Política de privacidade",
  },
  es: {
    before: "He leído y acepto los",
    terms: "Términos de uso",
    join: "y la",
    privacy: "Política de privacidad",
  },
};

export function TermsAcceptance({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const { locale, href } = useLocale();
  const copy = COPY[locale];

  return (
    <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        required
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <span>
        {copy.before}{" "}
        <Link
          href={href("/termos")}
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:underline"
        >
          {copy.terms}
        </Link>{" "}
        {copy.join}{" "}
        <Link
          href={href("/privacidade")}
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:underline"
        >
          {copy.privacy}
        </Link>
        .
      </span>
    </label>
  );
}
