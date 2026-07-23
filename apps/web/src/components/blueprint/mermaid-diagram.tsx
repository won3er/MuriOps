"use client";

import { AlertTriangle, Download, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Renderiza um diagrama Mermaid no cliente, com zoom/pan e export PNG.
 * Mermaid é pesado e usa APIs de browser, então é importado dinamicamente e
 * só roda no efeito. Sintaxe inválida vinda da IA cai num fallback legível
 * (mostra o código-fonte).
 */
export function MermaidDiagram({ code }: { code: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "strict",
          themeVariables: {
            fontFamily: "inherit",
            primaryColor: "#1e293b",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#6366f1",
            lineColor: "#64748b",
            secondaryColor: "#0f172a",
          },
        });
        const { svg } = await mermaid.render(`m${rawId}`, code.trim());
        if (!cancelled && hostRef.current) hostRef.current.innerHTML = svg;
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, rawId]);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(0.4, z - e.deltaY * 0.001)));
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  /** Rasteriza o SVG renderizado num canvas e baixa como PNG. */
  async function exportPng() {
    const svgEl = hostRef.current?.querySelector("svg");
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    const box = svgEl.getBoundingClientRect();
    const width = box.width || 800;
    const height = box.height || 600;
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const scale = 2; // exporta em resolução maior para nitidez
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "diagrama.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Não foi possível renderizar o diagrama. Código-fonte abaixo:
        </p>
        <pre className="overflow-x-auto rounded-md bg-black/40 p-3 text-xs text-muted-foreground">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(4, z + 0.2))}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Redefinir
        </button>
        <button
          type="button"
          onClick={exportPng}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Exportar como PNG"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative h-[320px] touch-none overflow-hidden rounded-md border border-border bg-black/20 [&_svg]:h-auto [&_svg]:max-w-none"
        style={{ cursor: dragRef.current ? "grabbing" : "grab" }}
      >
        <div
          ref={hostRef}
          className="mermaid-host absolute left-1/2 top-1/2 flex justify-center"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
}
