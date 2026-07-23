"use client";

import type { BlueprintTestStrategy } from "@qa-ai/shared";

/** Pirâmide de testes — três faixas trapezoidais proporcionais aos percentuais. */
export function TestPyramid({
  pyramid,
}: {
  pyramid: BlueprintTestStrategy["pyramid"];
}) {
  const bands = [
    { label: "E2E", value: pyramid.e2e, color: "#f472b6" },
    { label: "Integração", value: pyramid.integration, color: "#818cf8" },
    { label: "Unitários", value: pyramid.unit, color: "#34d399" },
  ];

  const W = 260;
  const H = 180;
  const rowH = H / 3;
  // Larguras crescentes de cima (estreito) para baixo (largo).
  const widths = [W * 0.32, W * 0.62, W];

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[280px]">
        {bands.map((b, i) => {
          const wTop = i === 0 ? widths[0] * 0.35 : widths[i - 1];
          const wBot = widths[i];
          const y = i * rowH;
          const x1 = (W - wTop) / 2;
          const x2 = (W + wTop) / 2;
          const x3 = (W + wBot) / 2;
          const x4 = (W - wBot) / 2;
          return (
            <g key={b.label}>
              <polygon
                points={`${x1},${y} ${x2},${y} ${x3},${y + rowH} ${x4},${y + rowH}`}
                fill={b.color}
                fillOpacity={0.8}
                stroke="#0f172a"
                strokeWidth={2}
              />
              <text
                x={W / 2}
                y={y + rowH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-900 text-[11px] font-semibold"
              >
                {b.label} {b.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
