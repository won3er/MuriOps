import type { AnalysisStatus } from "@qa-ai/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONFIG: Record<AnalysisStatus, { label: string; className: string }> = {
  QUEUED: { label: "Na fila", className: "border-slate-500/40 bg-slate-500/15 text-slate-300" },
  CRAWLING: { label: "Explorando", className: "border-sky-500/40 bg-sky-500/15 text-sky-300 animate-pulse" },
  ANALYZING: { label: "Analisando", className: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300 animate-pulse" },
  AI_REVIEW: { label: "Revisão IA", className: "border-primary/40 bg-primary/15 text-primary animate-pulse" },
  COMPLETED: { label: "Concluída", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" },
  FAILED: { label: "Falhou", className: "border-red-500/40 bg-red-500/15 text-red-300" },
};

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const c = CONFIG[status];
  return <Badge className={cn(c.className)}>{c.label}</Badge>;
}
