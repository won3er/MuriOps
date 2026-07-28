"use client";

import { BookOpen, Cable, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";
import { cn } from "@/lib/utils";

const DOCS_NAV = [
  { href: "/docs", label: "Visão geral", icon: BookOpen },
  { href: "/docs/guia", label: "Guia de uso", icon: FileText },
  { href: "/docs/funcionalidades", label: "Funcionalidades", icon: ListChecks },
  { href: "/docs/integracoes", label: "Integrações", icon: Cable },
];

export function DocsShell({
  title,
  description,
  eyebrow = "Documentação",
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-[minmax(0,1fr)] md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b px-4 py-4 md:min-h-[calc(100vh-4rem)] md:border-b-0 md:border-r md:px-5 md:py-8">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Primeiros passos
          </p>
          <nav
            className="flex max-w-full gap-1 overflow-x-auto md:block md:space-y-1"
            aria-label="Documentação"
          >
            {DOCS_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-w-max items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                    active && "bg-accent font-medium text-foreground",
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4", active && "text-primary")}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main
          id="conteudo-principal"
          className="min-w-0 px-5 py-9 sm:px-8 md:px-10 md:py-12"
        >
          <div className="mx-auto max-w-4xl">
            <header className="mb-10 border-b pb-8">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
              <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {description}
              </p>
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
