import { AlertCircle } from "lucide-react";

export function ActionError({
  error,
  message = "Não foi possível concluir esta ação. Confira os dados e tente novamente.",
}: {
  error: unknown;
  message?: string;
}) {
  if (!error) return null;

  const technicalDetail =
    error instanceof Error ? error.message : String(error);

  return (
    <div
      className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm"
      role="alert"
    >
      <div className="flex items-start gap-2 text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      {technicalDetail && (
        <details className="mt-2 pl-6 text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none hover:text-foreground">
            Detalhe técnico
          </summary>
          <p className="mt-2 break-words font-mono text-[11px]">
            {technicalDetail}
          </p>
        </details>
      )}
    </div>
  );
}
