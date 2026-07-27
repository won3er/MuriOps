import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Isótipo: uma harpia em perfil, formas geométricas simples e bem separadas
 * — crista dupla, cabeça e corpo como círculos, bico em gancho, três penas
 * na base. Desenhada numa grade 0–200 e escalada pro viewBox 32×32 do resto
 * do app. Cor "Índigo" (#6366f1), fill sólido — sem gradiente. Ver DESIGN.md.
 */
function isotypeShape() {
  return (
    <g transform="scale(0.16)">
      <polygon points="60,50 68,15 80,52" />
      <polygon points="78,48 92,20 98,54" />
      <circle cx="70" cy="75" r="28" />
      <path d="M48,68 Q14,74 40,100 Q58,92 52,74 Z" />
      <circle cx="115" cy="122" r="46" />
      <polygon points="94,158 100,190 113,162" />
      <polygon points="112,162 121,193 132,163" />
      <polygon points="131,160 144,188 150,157" />
    </g>
  );
}

/** Isotipo puro: a marca em índigo sólido, sem fundo e sem texto. */
export function LogoIsotype({
  className,
  title = "Elevate QA",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={cn("h-9 w-9", className)}
    >
      <g fill="#6366f1">{isotypeShape()}</g>
      <circle cx="9.8" cy="10.6" r="0.7" fill="currentColor" className="text-background" />
    </svg>
  );
}

/** Versão em selo: isotipo branco sobre fundo índigo sólido. Ideal para sidebar/ícone. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="#6366f1" />
      <g fill="#fff">{isotypeShape()}</g>
      <circle cx="9.8" cy="10.6" r="0.7" fill="#6366f1" />
    </svg>
  );
}

/** Marca + nome, para headers e sidebars onde o texto ajuda no reconhecimento. */
export function LogoFull({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <LogoMark className={markClassName} />
      <span>
        Elevate <span className="text-primary">QA</span>
      </span>
    </span>
  );
}
