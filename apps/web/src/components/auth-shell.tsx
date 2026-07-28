"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSelector } from "@/components/language-selector";
import { LogoFull, LogoIsotype } from "@/components/logo";
import { useLocale } from "@/lib/locale-context";
import { AUTH_COPY } from "@/lib/public-copy";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  const { locale, href } = useLocale();
  const copy = AUTH_COPY[locale];

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="relative hidden overflow-hidden border-r bg-card lg:flex lg:flex-col lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -bottom-32 -right-40 h-[680px] w-[680px] rounded-full bg-primary/[0.045] blur-3xl xl:-right-16" />
          <Image
            src="/atlas-rat-mascot-login.png"
            alt=""
            width={1024}
            height={1536}
            sizes="(min-width: 1280px) 620px, 520px"
            className="absolute -bottom-28 -right-40 h-auto w-[520px] select-none opacity-[0.075] xl:-bottom-36 xl:-right-16 xl:w-[620px] 2xl:right-4 2xl:opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-card to-transparent" />
        </div>

        <Link href={href("/")} className="relative z-10 w-fit">
          <LogoFull className="text-base" />
        </Link>
        <div className="relative z-10 my-auto max-w-xl">
          <LogoIsotype className="mb-8 h-16 w-16" />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {copy.category}
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight">
            {copy.pitchTitle}
          </h2>
          <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
            {copy.pitchDescription}
          </p>
          <ul className="mt-8 space-y-3">
            {copy.benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-muted-foreground">
          © 2026 MuriOps
        </p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between lg:hidden">
          <Link href={href("/")}>
            <LogoFull className="text-sm" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector compact />
            <Link
              href={href("/docs/guia")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {copy.help}
            </Link>
          </div>
        </div>
        <LanguageSelector className="absolute right-6 top-6 hidden lg:inline-flex" />
        <div className="my-auto w-full max-w-sm self-center py-12">
          <header className="mb-7">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </div>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
