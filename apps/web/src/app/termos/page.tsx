"use client";

import { LegalSection, LegalShell } from "@/components/legal-shell";
import { useLocale } from "@/lib/locale-context";
import { LEGAL_COPY } from "@/lib/legal-copy";

export default function TermosPage() {
  const { locale } = useLocale();
  const copy = LEGAL_COPY[locale].terms;

  return (
    <LegalShell title={copy.title} description={copy.description}>
      {copy.sections.map((section) => (
        <LegalSection key={section.title} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>
              {paragraph.includes("jadsonpavia@gmail.com")
                ? paragraph.replace("jadsonpavia@gmail.com", "")
                : paragraph}
              {paragraph.includes("jadsonpavia@gmail.com") && (
                <a
                  className="text-primary hover:underline"
                  href="mailto:jadsonpavia@gmail.com"
                >
                  jadsonpavia@gmail.com
                </a>
              )}
            </p>
          ))}
        </LegalSection>
      ))}
    </LegalShell>
  );
}
