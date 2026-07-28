import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QueryErrorState({
  title = "Não foi possível carregar os dados",
  description = "A conexão pode estar temporariamente indisponível. Tente novamente.",
  onRetry,
  compact = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
          : "rounded-lg border border-amber-500/30 bg-amber-500/5 px-6 py-10 text-center"
      }
      role="alert"
    >
      <AlertTriangle
        className={
          compact
            ? "mb-3 h-5 w-5 text-amber-300"
            : "mx-auto h-6 w-6 text-amber-300"
        }
      />
      <p className={compact ? "text-sm font-medium" : "mt-3 font-medium"}>
        {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
