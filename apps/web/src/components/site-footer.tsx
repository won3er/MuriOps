"use client";

import Link from "next/link";
import { LogoFull } from "@/components/logo";
import { PUBLIC_COPY } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { PRIVACY_EMAIL } from "@/lib/privacy";

export function SiteFooter() {
  const { locale, href } = useLocale();
  const copy = PUBLIC_COPY[locale];
  const groups = [
    {
      title: copy.footer.product,
      links: [
        { href: "/docs/guia", label: copy.footer.guide },
        { href: "/docs/funcionalidades", label: copy.footer.features },
        { href: "/docs/integracoes", label: copy.footer.integrations },
      ],
    },
    {
      title: copy.footer.resources,
      links: [
        { href: "/docs", label: copy.footer.docs },
        { href: "/login", label: copy.footer.signIn },
        { href: "/register", label: copy.footer.createAccount },
      ],
    },
    {
      title: copy.footer.legal,
      links: [
        { href: "/termos", label: copy.footer.terms },
        { href: "/privacidade", label: copy.footer.privacy },
        {
          href: `mailto:${PRIVACY_EMAIL}`,
          label: copy.footer.contact,
        },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_repeat(3,180px)]">
        <div>
          <Link href={href("/")} aria-label={copy.homeAria}>
            <LogoFull className="text-sm" />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            {copy.footer.tagline}
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((item) => (
                <li key={item.href}>
                  <Link
                    href={href(item.href)}
                    target={
                      item.href.startsWith("mailto:") ? undefined : "_blank"
                    }
                    rel={
                      item.href.startsWith("mailto:")
                        ? undefined
                        : "noreferrer"
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MuriOps.</span>
          <span>{copy.footer.closing}</span>
        </div>
      </div>
    </footer>
  );
}
