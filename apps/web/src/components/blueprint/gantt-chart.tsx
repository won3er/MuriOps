"use client";

import type { BlueprintMilestone } from "@qa-ai/shared";
import { useMemo } from "react";
import { MermaidDiagram } from "./mermaid-diagram";

/** Escapa caracteres que quebram a sintaxe Mermaid gantt (":" em rótulos). */
function sanitize(label: string): string {
  return label.replace(/[:#]/g, "-").slice(0, 60);
}

/**
 * Converte os marcos do blueprint num diagrama Mermaid `gantt` — o roadmap
 * vira cronograma visual sem depender da IA acertar a sintaxe do gantt
 * (calculamos as datas relativas aqui, de forma determinística).
 */
export function GanttChart({
  milestones,
}: {
  milestones: BlueprintMilestone[];
}) {
  const code = useMemo(() => {
    const lines = [
      "gantt",
      "  dateFormat  YYYY-MM-DD",
      "  axisFormat  sem %U",
      "  title Roadmap do projeto",
    ];
    let cursorWeeks = 0;
    const start = new Date();
    for (const m of milestones) {
      const from = new Date(start);
      from.setDate(from.getDate() + cursorWeeks * 7);
      const iso = from.toISOString().slice(0, 10);
      const weeks = Math.max(1, m.durationWeeks || 1);
      lines.push(
        `  ${sanitize(m.name)} :${iso}, ${weeks}w`,
      );
      cursorWeeks += weeks;
    }
    return lines.join("\n");
  }, [milestones]);

  return <MermaidDiagram code={code} />;
}
