"use client";

import type { BlueprintMaturityDimension } from "@qa-ai/shared";

/**
 * Radar de maturidade de QA — polígono SVG. Cada eixo é uma dimensão (0-100).
 * Comunica de relance a "senioridade" projetada do plano.
 */
export function QaRadar({
  data,
  size = 320,
}: {
  data: BlueprintMaturityDimension[];
  size?: number;
}) {
  const dims = data.slice(0, 8);
  const n = dims.length;
  if (n < 3) {
    return (
      <p className="text-sm text-muted-foreground">
        Dados insuficientes para o radar.
      </p>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 44;
  const rings = [0.25, 0.5, 0.75, 1];

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, radius: number) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i)),
  });

  const polygon = dims
    .map((d, i) => {
      const p = point(i, (Math.max(0, Math.min(100, d.score)) / 100) * r);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto h-auto w-full max-w-[360px]"
      role="img"
      aria-label="Radar de maturidade de QA"
    >
      {/* anéis de grade */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={dims
            .map((_, i) => {
              const p = point(i, r * ring);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
        />
      ))}

      {/* eixos + rótulos */}
      {dims.map((d, i) => {
        const edge = point(i, r);
        const label = point(i, r + 20);
        const anchor =
          Math.abs(label.x - cx) < 12
            ? "middle"
            : label.x > cx
              ? "start"
              : "end";
        return (
          <g key={d.dimension}>
            <line
              x1={cx}
              y1={cy}
              x2={edge.x}
              y2={edge.y}
              stroke="currentColor"
              className="text-border"
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {d.dimension}
            </text>
          </g>
        );
      })}

      {/* área de valores */}
      <polygon
        points={polygon}
        fill="#6366f1"
        fillOpacity={0.25}
        stroke="#818cf8"
        strokeWidth={2}
      />
      {dims.map((d, i) => {
        const p = point(i, (Math.max(0, Math.min(100, d.score)) / 100) * r);
        return <circle key={d.dimension} cx={p.x} cy={p.y} r={3} fill="#a5b4fc" />;
      })}
    </svg>
  );
}
