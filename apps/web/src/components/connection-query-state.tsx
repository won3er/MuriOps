import { AlertCircle, Loader2 } from "lucide-react";

export function ConnectionQueryState({
  state,
}: {
  state: "loading" | "error";
}) {
  if (state === "loading") {
    return (
      <div
        className="flex items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Consultando conexão…
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-3 text-sm text-red-300"
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Não foi possível consultar esta conexão. Tente novamente em alguns
        instantes.
      </span>
    </div>
  );
}
