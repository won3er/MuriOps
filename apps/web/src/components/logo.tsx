import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Isotipo: um "E" monograma construído com barras que crescem de baixo para
 * cima — lê-se ao mesmo tempo como a letra e como um gráfico de elevação
 * ("eleve a qualidade"). Sem texto: funciona sozinho como marca.
 * Paleta "Ember" (âmbar profundo → vermelho-alaranjado), ver DESIGN.md.
 */
function isotypePaths() {
  return (
    <>
      {/* espinha vertical do E */}
      <rect x="5" y="6" width="5.5" height="22" rx="2.75" />
      {/* barra superior (a mais longa — o topo da elevação) */}
      <rect x="5" y="6" width="22" height="5.5" rx="2.75" />
      {/* barra do meio */}
      <rect x="5" y="13.25" width="16" height="5.5" rx="2.75" />
      {/* barra inferior (a mais curta — o ponto de partida) */}
      <rect x="5" y="22.5" width="10.5" height="5.5" rx="2.75" />
    </>
  );
}

/** Isotipo puro: a marca em laranja, sem fundo e sem texto. */
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
      <defs>
        <linearGradient id="eqa-iso" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#e35a26" />
          <stop offset="100%" stopColor="#f5943f" />
        </linearGradient>
      </defs>
      <g fill="url(#eqa-iso)">{isotypePaths()}</g>
    </svg>
  );
}

/** Versão em selo: isotipo branco sobre fundo laranja. Ideal para sidebar/ícone. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="eqa-badge" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#e35a26" />
          <stop offset="100%" stopColor="#f5943f" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill="url(#eqa-badge)" />
      <g fill="#fff" transform="translate(16 16) scale(0.72) translate(-16 -16)">
        {isotypePaths()}
      </g>
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
