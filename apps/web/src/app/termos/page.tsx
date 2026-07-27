import Link from "next/link";
import { LogoIsotype } from "@/components/logo";

export const metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-10 inline-flex items-center gap-2 font-semibold">
        <LogoIsotype className="h-7 w-7" title="Elevate QA" />
        Elevate <span className="text-primary">QA</span>
      </Link>
      <h1 className="text-3xl font-semibold">Termos de uso</h1>
      <div className="prose prose-invert mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          O Elevate QA analisa sites informados por você (ou que você tem
          permissão para analisar) e usa provedores de IA de terceiros
          (Claude, Gemini ou OpenAI, conforme configurado) para interpretar os
          resultados e sugerir correções.
        </p>
        <p>
          Você é responsável por ter autorização para analisar a URL
          informada. O Elevate QA não altera nada no seu site automaticamente
          — toda correção sugerida (via documento ou via IA de desenvolvimento)
          é aplicada por você ou por uma ferramenta que você controla.
        </p>
        <p>
          O serviço é oferecido "como está", sem garantia de disponibilidade
          contínua. Resultados de análise e recomendações de IA podem conter
          imprecisões — sempre revise antes de aplicar em produção.
        </p>
        <p>
          Dúvidas: entre em contato pelo e-mail no rodapé da página inicial.
        </p>
      </div>
    </main>
  );
}
