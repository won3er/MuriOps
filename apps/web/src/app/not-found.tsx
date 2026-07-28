import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main
        id="conteudo-principal"
        className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-5 py-20"
      >
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border bg-card text-primary">
            <FileQuestion className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Erro 404
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Página não encontrada</h1>
          <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">
            O endereço pode ter mudado ou o conteúdo não está mais disponível.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Link href="/">
              <Button>
                <ArrowLeft className="h-4 w-4" />
                Voltar ao início
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline">Abrir documentação</Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
