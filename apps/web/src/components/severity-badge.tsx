import type { Severity } from "@qa-ai/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<Severity, string> = {
  CRITICAL: "border-red-500/40 bg-red-500/15 text-red-300",
  HIGH: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  MEDIUM: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  LOW: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  INFO: "border-slate-500/40 bg-slate-500/15 text-slate-300",
};

const LABELS: Record<Severity, string> = {
  CRITICAL: "Crítico",
  HIGH: "Alto",
  MEDIUM: "Médio",
  LOW: "Baixo",
  INFO: "Info",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={cn(STYLES[severity])}>{LABELS[severity]}</Badge>;
}
