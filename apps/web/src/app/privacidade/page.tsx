import Link from "next/link";
import { LogoIsotype } from "@/components/logo";

export const metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="mb-10 inline-flex items-center gap-2 font-semibold">
        <LogoIsotype className="h-7 w-7" title="Elevate QA" />
        Elevate <span className="text-primary">QA</span>
      </Link>
      <h1 className="text-3xl font-semibold">Privacidade</h1>
      <div className="prose prose-invert mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          Guardamos o essencial pra você usar o produto: seus dados de conta
          (nome, e-mail), os projetos e URLs que você cadastra, e os
          resultados das análises (score, achados, screenshots, requisições)
          gerados a partir dessas URLs.
        </p>
        <p>
          Para interpretar os achados e gerar planos de correção, o conteúdo
          da análise é enviado ao provedor de IA configurado (Claude, Gemini
          ou OpenAI). Esses provedores processam o conteúdo conforme as
          próprias políticas de privacidade.
        </p>
        <p>
          Não vendemos seus dados a terceiros. Você pode apagar projetos,
          análises e blueprints a qualquer momento diretamente no app.
        </p>
        <p>
          Dúvidas ou pedido de exclusão de conta: entre em contato pelo
          e-mail no rodapé da página inicial.
        </p>
      </div>
    </main>
  );
}
