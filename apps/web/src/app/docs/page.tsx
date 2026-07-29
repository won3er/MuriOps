"use client";

import {
  ArrowRight,
  Cable,
  FileSearch,
  GitBranch,
  ListChecks,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { DocsShell } from "@/components/docs-shell";
import { DOCS_COPY } from "@/lib/docs-copy";
import { useLocale } from "@/lib/locale-context";

const FLOW_ICONS = [FileSearch, Wrench, GitBranch] as const;
const SECTION_ICONS = [FileSearch, ListChecks, Cable] as const;

export default function DocsPage() {
  const { locale, href } = useLocale();
  const copy = DOCS_COPY[locale].overview;

  return (
    <DocsShell title={copy.title} description={copy.description}>
      <section className="grid gap-4 sm:grid-cols-3">
        {copy.flowCards.map(([label, content], index) => {
          const Icon = FLOW_ICONS[index];
          return (
            <div key={label} className="rounded-lg border bg-card p-4">
              <Icon className="h-4 w-4 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{label}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {content}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">{copy.answerTitle}</h2>
        <div className="mt-4 divide-y overflow-hidden rounded-lg border bg-card">
          {copy.sections.map((section, index) => {
            const Icon = SECTION_ICONS[index];
            return (
              <Link
                key={section.href}
                href={href(section.href)}
                target="_blank"
                rel="noreferrer"
                className="group flex gap-4 px-5 py-5 hover:bg-accent/40"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium group-hover:text-primary">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {section.description}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
                    {section.action} <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="mt-10 rounded-lg border border-primary/25 bg-primary/[0.06] p-5">
        <h2 className="text-sm font-semibold">{copy.beforeTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {copy.beforeText}
        </p>
      </aside>
    </DocsShell>
  );
}
