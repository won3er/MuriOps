"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogoFull } from "@/components/logo";

export default function PublicErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-5 py-20">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 text-center sm:p-8">
        <LogoFull className="mx-auto w-fit text-sm" />
        <AlertTriangle className="mx-auto mt-8 h-7 w-7 text-amber-300" />
        <h1 className="mt-4 text-2xl font-semibold">
          Não foi possível abrir esta página
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O problema pode ser temporário. Tente carregar novamente ou retorne à
          página inicial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Link href="/">
            <Button variant="outline">Voltar ao início</Button>
          </Link>
        </div>
        {error.digest && (
          <p className="tabular mt-5 text-xs text-muted-foreground">
            Referência: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
