import type { ReactNode } from "react";
import { PublicHeader } from "@/components/public-header";

export function LegalShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main
        id="conteudo-principal"
        className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:py-14"
      >
        <aside>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Legal
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <p className="mt-5 text-xs text-muted-foreground">
            Atualizado em 28 de julho de 2026
          </p>
        </aside>
        <article className="min-w-0 space-y-9">{children}</article>
      </main>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b pb-8 last:border-b-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
