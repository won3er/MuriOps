import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Identidade visual do Elevate QA.
 *
 * Mascote: a arte de texugo enviada diretamente pelo usuário (círculo
 * branco com o texugo em silhueta preta, fundo preto) — usada como imagem
 * raster (`/badger-logo-512.png`), não recriada em SVG à mão. Ver DESIGN.md.
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
      src="/badger-logo-512.png"
      alt={title}
      width={512}
      height={512}
      className={cn("h-9 w-9 rounded-full", className)}
      priority
    />
  );
}

/** Versão em selo: a mesma imagem, redonda. Ideal para sidebar/ícone. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/badger-logo-512.png"
      alt="Elevate QA"
      width={512}
      height={512}
      className={cn("h-8 w-8 rounded-full", className)}
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
