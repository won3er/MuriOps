import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Isótipo: um texugo em perfil — orelha e cabeça como círculos, focinho
 * afilado, corpo arredondado. A listra clara que atravessa o rosto (marca
 * registrada do texugo) e o olho são "recortes": desenhados por cima do
 * preenchimento sólido na cor de fundo, técnica reaproveitada em qualquer
 * contexto (isótipo solto, selo colorido). Desenhado numa grade 0–200 e
 * escalado (`scale(0.16)`) pro viewBox 32×32 do resto do app. Fill sólido em
 * índigo (`#6366f1`) — sem gradiente. Ver DESIGN.md.
 */
function isotypeShape() {
  return (
    <g transform="scale(0.16)">
      <circle cx="58" cy="48" r="19" />
      <circle cx="80" cy="92" r="42" />
      <path d="M108,78 C130,82 152,96 160,112 C163,119 160,124 153,123 C138,121 118,110 104,98 Z" />
      <path d="M50,122 C34,134 28,157 36,182 C46,207 74,220 105,217 C136,214 158,197 158,172 C132,180 104,174 88,160 C72,146 60,134 50,122 Z" />
    </g>
  );
}

/** A listra facial e o olho — recortados por cima do isótipo, na cor de fundo. */
function isotypeCutout() {
  return (
    <g transform="scale(0.16)">
      <path d="M60,60 C50,80 52,106 68,127 L87,119 C73,99 71,78 81,62 Z" />
      <circle cx="92" cy="86" r="5" />
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
      <g fill="currentColor" className="text-background">
        {isotypeCutout()}
      </g>
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
      <g fill="#6366f1">{isotypeCutout()}</g>
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
