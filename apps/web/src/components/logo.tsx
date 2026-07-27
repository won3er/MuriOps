import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Isótipo: uma harpia em perfil, formas geométricas simples — crista dupla de
 * penas no topo da cabeça, bico curvo em gancho, olho como furo circular, e
 * corpo arredondado terminando em penas pontudas na base (estilo Octocat do
 * GitHub: um mascote que funciona sozinho como marca, de favicon a hero).
 * Desenhada em grade 0–100 e escalada pro viewBox 32×32 do resto do app.
 * Cor "Índigo" (#6366f1), fill sólido — sem gradiente. Ver DESIGN.md.
 */
function isotypeShape() {
  return (
    <g transform="scale(0.32)">
      <polygon points="22,22 28,2 36,20" />
      <polygon points="32,20 42,6 46,22" />
      <circle cx="30" cy="30" r="13" />
      <path d="M19,29 Q4,34 17,45 Q27,40 22,31 Z" />
      <path
        d="M22,38 Q14,50 20,64 Q26,82 46,90 Q60,94 70,84
           L62,78 L72,86 L66,74 L78,80 L70,66 L80,70 L72,56
           Q76,46 68,40 Q58,28 42,30 Q32,26 22,38 Z"
      />
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
      <circle cx="8.6" cy="8.3" r="0.7" fill="currentColor" className="text-background" />
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
      <circle cx="8.6" cy="8.3" r="0.7" fill="#6366f1" />
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
