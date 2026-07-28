"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function WorkspaceErrorPage({
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
    <div className="mx-auto max-w-2xl py-10">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8">
        <AlertTriangle className="h-7 w-7 text-amber-300" />
        <h1 className="mt-4 text-2xl font-semibold">
          Esta área encontrou um problema
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Seus dados não foram alterados. Tente carregar novamente ou volte à
          visão geral do workspace.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">Voltar à visão geral</Button>
          </Link>
        </div>
        {error.digest && (
          <p className="tabular mt-5 text-xs text-muted-foreground">
            Referência: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
