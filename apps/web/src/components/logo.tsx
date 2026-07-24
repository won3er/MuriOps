import { cn } from "@/lib/utils";

/**
 * Marca do Elevate QA.
 * Conceito: um chevron subindo (elevação) sobre um checkmark (qualidade
 * aprovada) — "eleve seu site com QA de verdade". Gradiente teal → ciano
 * derivado do --primary do tema.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="eqa-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill="url(#eqa-g)" />
      {/* chevron de elevação */}
      <path
        d="M9.5 13.5 L16 7 L22.5 13.5"
        fill="none"
        stroke="#04211f"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 1)"
      />
      <path
        d="M9.5 13.5 L16 7 L22.5 13.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* check de qualidade */}
      <path
        d="M9.5 19.5 L14 24 L22.5 15.5"
        fill="none"
        stroke="#04211f"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 1)"
      />
      <path
        d="M9.5 19.5 L14 24 L22.5 15.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marca + nome, para headers e sidebars. */
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
