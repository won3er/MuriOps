"use client";

import {
  ArrowUpCircle,
  Boxes,
  CircleHelp,
  DraftingCompass,
  FileSearch,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoFull } from "@/components/logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/projects", label: "Projetos", icon: FolderKanban },
    ],
  },
  {
    label: "Ciclo de qualidade",
    items: [
      { href: "/analyses", label: "Análises", icon: FileSearch },
      { href: "/blueprints", label: "Projetar", icon: DraftingCompass },
      { href: "/aplicacao", label: "Aplicações", icon: Wrench },
      { href: "/orquestracao", label: "Orquestrações", icon: GitBranch },
      { href: "/atualizar", label: "Atualizações", icon: ArrowUpCircle },
    ],
  },
  {
    label: "Plataforma",
    items: [{ href: "/settings", label: "Configurações", icon: Settings }],
  },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Fecha o drawer ao navegar.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeMenuRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const brand = (
    <Link
      href="/dashboard"
      className="shrink-0"
      aria-label="Elevate QA — início"
    >
      <LogoFull className="text-sm" markClassName="h-8 w-8" />
    </Link>
  );

  const navLinks = (
    <nav aria-label="Navegação principal" className="flex-1 space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "group-hover:text-foreground",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const accountFooter = (
    <div className="border-t pt-3">
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#conteudo-principal"
        className="sr-only z-[100] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      {/* Navegação global: marca, busca/comandos e ações da conta. */}
      <header className="flex h-16 items-center gap-3 border-b bg-card px-4 sm:px-5">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {brand}

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/docs"
            aria-label="Ajuda e documentação"
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <CircleHelp className="h-4 w-4" />
          </Link>
        </div>

        <Link
          href="/settings"
          className="flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background/70 px-2 text-sm hover:bg-accent"
          aria-label={`Abrir configurações da conta de ${user.name}`}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden max-w-28 truncate lg:block">{user.name}</span>
        </Link>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r bg-card p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
          >
            <div className="mb-7 flex items-center justify-between">
              {brand}
              <button
                ref={closeMenuRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navLinks}
            <div className="mb-3 rounded-md border bg-background/50 p-3">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            {accountFooter}
          </aside>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Navegação local persistente no desktop. */}
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/50 p-4 md:flex">
          <div className="mb-5 flex items-center gap-2 rounded-md border bg-background/60 px-2.5 py-2 text-xs text-muted-foreground">
            <Boxes className="h-4 w-4 text-primary" />
            <span className="truncate">Workspace principal</span>
          </div>
          {navLinks}
          {accountFooter}
        </aside>

        <main
          id="conteudo-principal"
          className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
