import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Isótipo: uma harpia estilizada em poucas formas geométricas — cabeça com
 * crista de penas angulares (a coroa característica da harpia-real) e bico
 * curvo, olhando pra frente ("de olho na qualidade do seu site"). Espírito
 * parecido com o Octocat do GitHub: um mascote simples que funciona sozinho
 * como marca, de favicon a hero.
 * Cor "Índigo" (#6366f1), fill sólido — sem gradiente. Ver DESIGN.md.
 */
function isotypePath() {
  return (
    <path d="M8,21.5 L8,10.5 L11,7 L13.5,9.5 L12.3,11 L16.5,9.3 L15.3,12.5 L19.5,10.8 L18.2,14 L26,16 L19,18.2 L20.5,20.5 L14,25 L8,25 Z" />
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
      <g fill="#6366f1">{isotypePath()}</g>
      <circle cx="17.6" cy="12.6" r="1.3" fill="currentColor" className="text-background" />
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
      <g fill="#fff">{isotypePath()}</g>
      <circle cx="17.6" cy="12.6" r="1.3" fill="#6366f1" />
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
