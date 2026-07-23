"use client";

import type { CategoryScores } from "@qa-ai/shared";
import { motion } from "framer-motion";
import { cn, scoreColor, scoreStroke } from "@/lib/utils";

const LABELS: Record<string, string> = {
  UI: "Interface (UI)",
  UX: "Experiência (UX)",
  PERFORMANCE: "Performance",
  SEO: "SEO",
  ACCESSIBILITY: "Acessibilidade",
  SECURITY: "Segurança",
  CONSOLE: "Console",
  NETWORK: "Network",
  DEEP_SECURITY: "Segurança Avançada",
};

export function ScoreBars({ scores }: { scores: CategoryScores }) {
  const entries = Object.entries(scores);
  return (
    <div className="space-y-3">
      {entries.map(([key, value], i) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{LABELS[key] ?? key}</span>
            <span className={cn("tabular", scoreColor(value))}>{value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: scoreStroke(value) }}
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, delay: i * 0.05 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
