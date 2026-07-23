"use client";

import {
  DraftingCompass,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/blueprints", label: "Projetar", icon: DraftingCompass },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Fecha o drawer ao navegar.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  const brand = (
    <Link href="/" className="flex items-center gap-2 px-2 font-semibold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        E
      </span>
      Elevate QA
    </Link>
  );

  const navLinks = (
    <nav className="flex-1 space-y-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const accountFooter = (
    <div className="border-t pt-4">
      <div className="px-3 py-2 text-sm">
        <p className="font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <ThemeToggle />
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Barra superior — só mobile/tablet (sidebar assume em md+). */}
      <header className="glass sticky top-0 z-40 flex items-center justify-between border-b p-3 md:hidden">
        {brand}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="glass absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col border-r p-4">
            <div className="mb-8 flex items-center justify-between">
              {brand}
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navLinks}
            {accountFooter}
          </aside>
        </div>
      )}

      {/* Sidebar — desktop */}
      <aside className="glass sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r p-4 md:flex">
        <div className="mb-8">{brand}</div>
        {navLinks}
        {accountFooter}
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:px-10 md:py-8">
        {children}
      </main>
    </div>
  );
}
