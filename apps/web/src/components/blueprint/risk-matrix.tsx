"use client";

import type { BlueprintRisk } from "@qa-ai/shared";
import { useState } from "react";

/**
 * Matriz de risco 5x5 (probabilidade × impacto). Cada célula colore por
 * severidade (produto); os riscos aparecem como pontos posicionados na célula.
 */
export function RiskMatrix({ risks }: { risks: BlueprintRisk[] }) {
  const [hover, setHover] = useState<BlueprintRisk | null>(null);

  // Cor da célula pela zona de severidade (likelihood * impact).
  const cellColor = (l: number, i: number): string => {
    const s = l * i;
    if (s >= 15) return "rgba(239,68,68,0.30)"; // vermelho
    if (s >= 8) return "rgba(249,115,22,0.28)"; // laranja
    if (s >= 4) return "rgba(245,158,11,0.24)"; // amarelo
    return "rgba(52,211,153,0.20)"; // verde
  };

  // Agrupa riscos por célula para distribuir os pontos.
  const byCell = new Map<string, BlueprintRisk[]>();
  for (const r of risks) {
    const key = `${r.likelihood}-${r.impact}`;
    const list = byCell.get(key) ?? [];
    list.push(r);
    byCell.set(key, list);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {/* eixo Y (impacto) */}
        <div className="flex flex-col items-center justify-center">
          <span className="rotate-180 text-[10px] uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl]">
            Impacto →
          </span>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {/* Linhas de impacto 5 (topo) → 1 (base). */}
            {[5, 4, 3, 2, 1].map((impact) =>
              [1, 2, 3, 4, 5].map((likelihood) => {
                const key = `${likelihood}-${impact}`;
                const cellRisks = byCell.get(key) ?? [];
                return (
                  <div
                    key={key}
                    className="relative flex aspect-square items-center justify-center rounded-sm"
                    style={{ backgroundColor: cellColor(likelihood, impact) }}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-0.5">
                      {cellRisks.map((r, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => setHover(r)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setHover(r)}
                          onBlur={() => setHover(null)}
                          className="h-2.5 w-2.5 rounded-full bg-foreground/80 ring-2 ring-background transition-transform hover:scale-150"
                          aria-label={r.risk}
                        />
                      ))}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
          <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
            Probabilidade →
          </p>
        </div>
      </div>

      {hover && (
        <div className="rounded-md border border-border bg-black/40 p-2 text-xs">
          <span className="font-medium">{hover.risk}</span>{" "}
          <span className="text-muted-foreground">
            ({hover.category} · P{hover.likelihood}×I{hover.impact})
          </span>
          <p className="mt-0.5 text-muted-foreground">{hover.mitigation}</p>
        </div>
      )}
    </div>
  );
}
