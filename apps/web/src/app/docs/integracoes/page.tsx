"use client";

import {
  Bot,
  Check,
  Code2,
  KeyRound,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { DocsShell } from "@/components/docs-shell";
import { Badge } from "@/components/ui/badge";
import { DOCS_COPY } from "@/lib/docs-copy";
import { useLocale } from "@/lib/locale-context";

export default function IntegracoesPage() {
  const { locale } = useLocale();
  const copy = DOCS_COPY[locale].integrations;

  return (
    <DocsShell
      title={copy.title}
      description={copy.description}
      eyebrow={copy.eyebrow}
    >
      <section>
        <div className="mb-4 flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{copy.adapters}</h2>
        </div>
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {copy.connections.map(([name, mode, does, limit]) => (
            <article
              key={name}
              className="grid gap-3 px-5 py-5 sm:grid-cols-[140px_minmax(0,1fr)]"
            >
              <div>
                <h3 className="font-medium">{name}</h3>
                <Badge className="mt-2 border-primary/30 bg-primary/10 text-primary">
                  {mode}
                </Badge>
              </div>
              <div className="space-y-2 text-sm leading-6">
                <p className="flex gap-2">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{does}</span>
                </p>
                <p className="text-muted-foreground">
                  <strong className="font-medium text-foreground">
                    {copy.limit}
                  </strong>{" "}
                  {limit}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{copy.aiTitle}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-5">
            <KeyRound className="h-4 w-4 text-primary" />
            <h3 className="mt-3 font-medium">{copy.providerTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.providerText}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <Code2 className="h-4 w-4 text-primary" />
            <h3 className="mt-3 font-medium">{copy.bridgeTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.bridgeText}
            </p>
          </div>
        </div>
      </section>

      <aside className="mt-10 flex gap-3 rounded-lg border border-primary/25 bg-primary/[0.06] p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{copy.principleTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.principleText}
          </p>
        </div>
      </aside>
    </DocsShell>
  );
}
