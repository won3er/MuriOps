"use client";

import { LegalSection, LegalShell } from "@/components/legal-shell";
import { useLocale } from "@/lib/locale-context";
import { LEGAL_COPY } from "@/lib/legal-copy";
import { PRIVACY_EMAIL } from "@/lib/privacy";

export default function TermosPage() {
  const { locale } = useLocale();
  const copy = LEGAL_COPY[locale].terms;

  return (
    <LegalShell title={copy.title} description={copy.description}>
      {copy.sections.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>
              {paragraph.includes(PRIVACY_EMAIL)
                ? paragraph.replace(PRIVACY_EMAIL, "")
                : paragraph}
              {paragraph.includes(PRIVACY_EMAIL) && (
                <a
                  className="text-primary hover:underline"
                  href={`mailto:${PRIVACY_EMAIL}`}
                >
                  {PRIVACY_EMAIL}
                </a>
              )}
            </p>
          ))}
        </LegalSection>
      ))}
    </LegalShell>
  );
}
