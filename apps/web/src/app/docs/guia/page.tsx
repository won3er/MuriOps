"use client";

import { ArrowRight, Check, CircleAlert } from "lucide-react";
import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";
import { Button } from "@/components/ui/button";
import { DOCS_COPY } from "@/lib/docs-copy";
import { useLocale } from "@/lib/locale-context";

export default function GuiaPage() {
  const { locale, href } = useLocale();
  const copy = DOCS_COPY[locale].guide;

  return (
    <DocsShell
      title={copy.title}
      description={copy.description}
      eyebrow={copy.eyebrow}
    >
      <aside className="mb-9 flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm leading-6 text-muted-foreground">
          {copy.warning}
        </p>
      </aside>

      <ol className="space-y-8">
        {copy.steps.map((step) => (
          <li
            key={step.number}
            className="grid gap-4 sm:grid-cols-[52px_minmax(0,1fr)]"
          >
            <span className="tabular text-sm font-semibold text-primary">
              {step.number}
            </span>
            <div className="border-b pb-8">
              <h2 className="text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
              <ul className="mt-4 space-y-2.5">
                {step.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-6">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link href={href("/register")} target="_blank" rel="noreferrer">
          <Button>
            {copy.create} <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={href("/docs/integracoes")} target="_blank" rel="noreferrer">
          <Button variant="outline">{copy.compare}</Button>
        </Link>
      </div>
    </DocsShell>
  );
}
