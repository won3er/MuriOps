"use client";

import { CheckCircle2, Clock3, PauseCircle } from "lucide-react";
import { DocsShell } from "@/components/docs-shell";
import { Badge } from "@/components/ui/badge";
import { DOCS_COPY } from "@/lib/docs-copy";
import { useLocale } from "@/lib/locale-context";

const STATUS = {
  available: {
    icon: CheckCircle2,
    className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  },
  development: {
    icon: Clock3,
    className: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  },
  deferred: {
    icon: PauseCircle,
    className: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  },
} as const;

type StatusKey = keyof typeof STATUS;

export default function FuncionalidadesPage() {
  const { locale } = useLocale();
  const copy = DOCS_COPY[locale].features;

  return (
    <DocsShell
      title={copy.title}
      description={copy.description}
      eyebrow={copy.eyebrow}
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {(Object.keys(STATUS) as StatusKey[]).map((status) => {
          const config = STATUS[status];
          return (
            <Badge key={status} className={config.className}>
              <config.icon className="h-3 w-3" /> {copy.statuses[status]}
            </Badge>
          );
        })}
      </div>

      <div className="space-y-10">
        {copy.groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-lg font-semibold">{group.title}</h2>
            <div className="divide-y overflow-hidden rounded-lg border bg-card">
              {group.items.map(([name, statusValue, description]) => {
                const status = statusValue as StatusKey;
                const config = STATUS[status];
                return (
                  <div
                    key={name}
                    className="grid gap-2 px-4 py-4 sm:grid-cols-[200px_minmax(0,1fr)_auto] sm:items-start"
                  >
                    <h3 className="text-sm font-medium">{name}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                    <Badge className={config.className}>
                      <config.icon className="h-3 w-3" />{" "}
                      {copy.statuses[status]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </DocsShell>
  );
}
