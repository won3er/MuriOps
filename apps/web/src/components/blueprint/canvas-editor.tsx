"use client";

import type { BlueprintCanvasEdge, BlueprintCanvasNode } from "@qa-ai/shared";
import { Link2, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NODE_W = 132;
const NODE_H = 46;

const PALETTE: { type: string; label: string; color: string }[] = [
  { type: "screen", label: "Tela", color: "#6366f1" },
  { type: "service", label: "Serviço", color: "#0ea5e9" },
  { type: "database", label: "Banco", color: "#10b981" },
  { type: "queue", label: "Fila", color: "#f59e0b" },
  { type: "integration", label: "Integração", color: "#a855f7" },
  { type: "external", label: "Externo", color: "#ef4444" },
];

const colorOf = (type: string) =>
  PALETTE.find((p) => p.type === type)?.color ?? "#64748b";

export interface CanvasValue {
  nodes: BlueprintCanvasNode[];
  edges: BlueprintCanvasEdge[];
}

/**
 * Editor visual de arquitetura: arrasta nós, liga com o modo "Conectar".
 * Componente controlado — o pai guarda o grafo e o serializa para a IA.
 */
export function CanvasEditor({
  value,
  onChange,
}: {
  value: CanvasValue;
  onChange: (v: CanvasValue) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const uid = () => Math.random().toString(36).slice(2, 9);

  function addNode(type: string, label: string) {
    const n: BlueprintCanvasNode = {
      id: uid(),
      type,
      label,
      x: 40 + (value.nodes.length % 4) * 150,
      y: 40 + Math.floor(value.nodes.length / 4) * 90,
    };
    onChange({ ...value, nodes: [...value.nodes, n] });
  }

  function removeNode(id: string) {
    onChange({
      nodes: value.nodes.filter((n) => n.id !== id),
      edges: value.edges.filter((e) => e.from !== id && e.to !== id),
    });
    setSelected(null);
  }

  function renameNode(id: string, label: string) {
    onChange({
      ...value,
      nodes: value.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    });
  }

  function onNodeClick(id: string) {
    if (!linking) {
      setSelected(id);
      return;
    }
    if (linkFrom === null) {
      setLinkFrom(id);
    } else if (linkFrom !== id) {
      const exists = value.edges.some(
        (e) => e.from === linkFrom && e.to === id,
      );
      if (!exists) {
        onChange({
          ...value,
          edges: [...value.edges, { id: uid(), from: linkFrom, to: id }],
        });
      }
      setLinkFrom(null);
    }
  }

  function onPointerDown(e: React.PointerEvent, node: BlueprintCanvasNode) {
    if (linking) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    dragRef.current = {
      id: node.id,
      dx: e.clientX - rect.left - node.x,
      dy: e.clientY - rect.top - node.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    const board = boardRef.current;
    if (!drag || !board) return;
    const rect = board.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(rect.width - NODE_W, e.clientX - rect.left - drag.dx),
    );
    const y = Math.max(
      0,
      Math.min(rect.height - NODE_H, e.clientY - rect.top - drag.dy),
    );
    onChange({
      ...value,
      nodes: value.nodes.map((n) => (n.id === drag.id ? { ...n, x, y } : n)),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const center = (n: BlueprintCanvasNode) => ({
    x: n.x + NODE_W / 2,
    y: n.y + NODE_H / 2,
  });
  const nodeById = (id: string) => value.nodes.find((n) => n.id === id);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            onClick={() => addNode(p.type, p.label)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={linking ? "default" : "outline"}
            onClick={() => {
              setLinking((v) => !v);
              setLinkFrom(null);
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
            {linking ? "Conectando…" : "Conectar"}
          </Button>
          {selected && !linking && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => removeNode(selected)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </Button>
          )}
        </div>
      </div>

      {linking && (
        <p className="text-xs text-primary">
          {linkFrom
            ? "Agora clique no componente de destino."
            : "Clique no componente de origem."}
        </p>
      )}

      <div
        className="overflow-x-auto rounded-lg border border-border"
        aria-label="Canvas de arquitetura; deslize horizontalmente em telas estreitas"
      >
        <div
          ref={boardRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative h-[420px] min-w-[640px] overflow-hidden bg-[radial-gradient(circle,rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:20px_20px]"
        >
          {/* arestas */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <marker
                id="arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#818cf8" />
              </marker>
            </defs>
            {value.edges.map((edge) => {
              const from = nodeById(edge.from);
              const to = nodeById(edge.to);
              if (!from || !to) return null;
              const a = center(from);
              const b = center(to);
              return (
                <line
                  key={edge.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#818cf8"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </svg>

          {/* nós */}
          {value.nodes.map((n) => (
            <div
              key={n.id}
              onPointerDown={(e) => onPointerDown(e, n)}
              onClick={() => onNodeClick(n.id)}
              style={{
                left: n.x,
                top: n.y,
                width: NODE_W,
                borderColor: colorOf(n.type),
              }}
              className={cn(
                "group absolute flex touch-none flex-col rounded-md border-2 bg-card/95 px-2 py-1.5",
                linking
                  ? "cursor-pointer"
                  : "cursor-grab active:cursor-grabbing",
                selected === n.id && "ring-2 ring-primary",
                linkFrom === n.id && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="text-[9px] uppercase tracking-wide"
                  style={{ color: colorOf(n.type) }}
                >
                  {n.type}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(n.id);
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remover componente"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
              <input
                value={n.label}
                onChange={(e) => renameNode(n.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent text-xs font-medium outline-none"
              />
            </div>
          ))}

          {value.nodes.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Adicione componentes pela paleta acima.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
