import Link from "next/link";
import { LogoFull } from "@/components/logo";

const GROUPS = [
  {
    title: "Produto",
    links: [
      { href: "/docs/guia", label: "Guia de uso" },
      { href: "/docs/funcionalidades", label: "Funcionalidades" },
      { href: "/docs/integracoes", label: "Integrações" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { href: "/docs", label: "Documentação" },
      { href: "/login", label: "Entrar" },
      { href: "/register", label: "Criar conta" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/termos", label: "Termos de uso" },
      { href: "/privacidade", label: "Privacidade" },
      {
        href: "mailto:jadsonpavia@gmail.com",
        label: "Contato",
        external: true,
      },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_repeat(3,180px)]">
        <div>
          <Link href="/" aria-label="Elevate QA — página inicial">
            <LogoFull className="text-sm" />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
            Gestão contínua de qualidade para produtos digitais, do diagnóstico
            à aplicação.
          </p>
        </div>
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
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
          <span>© {new Date().getFullYear()} Elevate QA.</span>
          <span>Qualidade é um processo contínuo.</span>
        </div>
      </div>
    </footer>
  );
}
