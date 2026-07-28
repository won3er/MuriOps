import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Mascote: rato em negativo dentro de um selo circular — uma marca simples,
 * técnica e legível mesmo nos menores pontos da interface.
 */
export function LogoIsotype({
  className,
  title = "Elevate QA",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <Image
      src="/atlas-rat-logo-negative-512.png"
      alt={title}
      width={512}
      height={512}
      className={cn("h-9 w-9 object-contain", className)}
      priority
    />
  );
}

/** Versão em selo: a mesma imagem, redonda. Ideal para sidebar/ícone. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/atlas-rat-logo-negative-512.png"
      alt=""
      width={512}
      height={512}
      className={cn("h-8 w-8 object-contain", className)}
      priority
    />
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
