import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-border/80 pb-5 sm:pb-6",
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Navegação estrutural">
          <ol className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <li
                key={`${item.label}-${index}`}
                className="flex min-w-0 items-center gap-1"
              >
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="truncate hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate text-foreground">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <h1 className="break-words text-2xl font-semibold leading-tight text-foreground sm:text-[1.75rem]">
            {title}
          </h1>
          {description && (
            <div className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export function LocalNav({
  items,
}: {
  items: Array<{
    label: string;
    href: string;
    active?: boolean;
    count?: number;
  }>;
}) {
  return (
    <nav
      className="-mx-1 overflow-x-auto border-b"
      aria-label="Navegação contextual"
    >
      <div className="flex min-w-max px-1">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "relative flex h-10 items-center gap-2 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
              item.active && "font-medium text-foreground",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="tabular rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {item.count}
              </span>
            )}
            {item.active && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
