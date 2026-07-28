"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoFull } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/docs/guia", label: "Guia" },
  { href: "/docs/funcionalidades", label: "Funcionalidades" },
  { href: "/docs/integracoes", label: "Integrações" },
];

export function PublicHeader() {
  const { hasSession } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <a
        href="#conteudo-principal"
        className="sr-only z-[100] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Elevate QA — página inicial">
            <LogoFull className="text-sm" />
          </Link>
          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Navegação pública"
          >
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  pathname === item.href && "bg-accent text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {!hasSession && (
              <Link
                href="/login"
                className="px-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Entrar
              </Link>
            )}
            <Link href={hasSession ? "/dashboard" : "/register"}>
              <Button size="sm">
                {hasSession ? "Abrir workspace" : "Criar conta"}
              </Button>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="ml-auto grid h-9 w-9 place-items-center rounded-md hover:bg-accent md:hidden"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="public-mobile-menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {open && (
          <nav
            id="public-mobile-menu"
            className="border-t px-4 py-3 md:hidden"
            aria-label="Navegação pública móvel"
          >
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  pathname === item.href && "bg-accent text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <div
              className={`mt-3 grid gap-2 border-t pt-3 ${hasSession ? "grid-cols-1" : "grid-cols-2"}`}
            >
              {!hasSession && (
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full">
                    Entrar
                  </Button>
                </Link>
              )}
              <Link href={hasSession ? "/dashboard" : "/register"}>
                <Button size="sm" className="w-full">
                  {hasSession ? "Abrir app" : "Criar conta"}
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
