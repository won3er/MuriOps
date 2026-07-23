import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Placeholder de carregamento — pulso sutil no lugar do conteúdo. */
export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
