"use client";

import type { Issue } from "@qa-ai/shared";
import { ChevronDown, ExternalLink, Wrench } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/severity-badge";
import { Badge } from "@/components/ui/badge";
import { evidenceUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<string, string> = {
  UI: "UI",
  UX: "UX",
  PERFORMANCE: "Performance",
  SEO: "SEO",
  ACCESSIBILITY: "Acessibilidade",
  SECURITY: "Segurança",
  CONSOLE: "Console",
  NETWORK: "Network",
  DEEP_SECURITY: "Segurança Avançada",
};

export function IssueCard({ issue }: { issue: Issue }) {
  const [open, setOpen] = useState(false);
  const screenshot = issue.evidence.find((e) => e.type === "SCREENSHOT");

  const ignored = issue.status === "IGNORED";

  return (
    <Card className={cn(ignored && "opacity-60")}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-4 text-left"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <Badge className="text-muted-foreground">
              {CATEGORY_LABEL[issue.category] ?? issue.category}
            </Badge>
            {ignored && (
              <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-500">
                Descartado pela IA (provável falso positivo)
              </Badge>
            )}
          </div>
          <p className="font-medium">{issue.title}</p>
          <p className="text-sm text-muted-foreground">{issue.description}</p>
          {issue.pageUrl && (
            <p className="truncate text-xs text-muted-foreground">
              {issue.pageUrl}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <CardContent className="space-y-4 border-t pt-4">
          {issue.impact && (
            <Section title="Impacto">{issue.impact}</Section>
          )}
          {issue.stepsToReproduce.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Passos para reproduzir
              </h4>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/90">
                {issue.stepsToReproduce.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {issue.suggestion && (
            <div>
              <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Wrench className="h-3 w-3" /> Sugestão de correção
              </h4>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">
                {issue.suggestion}
              </p>
            </div>
          )}
          {issue.selector && (
            <Section title="Elemento">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {issue.selector}
              </code>
            </Section>
          )}
          {issue.raw && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Evidência bruta (console/network)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/40 p-3 text-xs">
                {issue.raw}
              </pre>
            </details>
          )}
          {screenshot && (
            <a
              href={evidenceUrl(screenshot.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Ver screenshot da página
            </a>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}
