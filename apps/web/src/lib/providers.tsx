"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth";
import { LocaleProvider } from "./locale-context";
import type { Locale } from "./i18n";

/**
 * Provedores globais do app: tema escuro fixo, cache de dados (React Query),
 * autenticação e notificações. Um único ponto no root layout.
 */
export function Providers({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
    >
      <LocaleProvider initialLocale={initialLocale}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
          <Toaster
            richColors
            position="top-right"
            theme="dark"
            closeButton
            toastOptions={{ className: "border-border" }}
          />
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
