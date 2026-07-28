import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricTile({
  label,
  value,
  icon: Icon,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 border-r px-4 py-4 last:border-r-0 sm:px-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className={cn("tabular mt-2 text-2xl font-semibold", valueClassName)}>
        {value}
      </p>
      {detail && (
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}
