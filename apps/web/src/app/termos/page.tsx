import { LegalSection, LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Termos de uso",
  description:
    "Condições essenciais para utilizar o Elevate QA de forma responsável.",
  alternates: { canonical: "/termos" },
};

export default function TermosPage() {
  return (
    <LegalShell
      title="Termos de uso"
      description="As condições essenciais para utilizar o Elevate QA de forma responsável."
    >
      <LegalSection title="1. Uso autorizado">
        <p>
          Você deve cadastrar e analisar apenas sites, lojas, servidores e
          repositórios que administra ou para os quais possui autorização
          explícita. Não use o serviço para contornar controles de acesso,
          interromper sistemas ou testar terceiros sem permissão.
        </p>
      </LegalSection>

      <LegalSection title="2. Como o serviço funciona">
        <p>
          O Elevate QA combina crawler, automação de navegador e verificações
          técnicas para produzir scores, achados e evidências. Quando uma chave
          própria é configurada, provedores de IA podem interpretar esses dados
          e gerar resumos, blueprints e planos.
        </p>
        <p>
          Resultados automatizados podem conter falsos positivos, omissões ou
          recomendações inadequadas ao seu ambiente. A revisão humana continua
          necessária antes de qualquer alteração em produção.
        </p>
      </LegalSection>

      <LegalSection title="3. Aplicação e integrações">
        <p>
          Algumas conexões escrevem dados em sistemas externos. GitHub pode
          criar branches, checklists e pull requests; WordPress e Shopify podem
          criar rascunhos; FTP pode gravar arquivos Markdown. Essas ações
          dependem das credenciais e permissões fornecidas.
        </p>
        <p>
          Esses registros não garantem que a correção técnica tenha sido
          implementada. O Elevate QA não faz merge automático no GitHub e não
          deve publicar rascunhos sem uma ação posterior de uma pessoa
          autorizada.
        </p>
      </LegalSection>

      <LegalSection title="4. Credenciais e segurança">
        <p>
          Você é responsável por fornecer credenciais com o menor privilégio
          necessário, acompanhar seu uso e revogá-las na plataforma de origem
          quando a conexão não for mais necessária. Não compartilhe credenciais
          em campos que não sejam destinados a elas.
        </p>
      </LegalSection>

      <LegalSection title="5. Disponibilidade e responsabilidade">
        <p>
          O serviço é fornecido “como está” e pode passar por
          indisponibilidades, alterações ou limitações. Faça backup, use
          ambientes de teste quando possível e valide toda mudança antes de
          publicá-la. Você permanece responsável pelas decisões tomadas a partir
          dos relatórios e pelos efeitos das integrações que autorizar.
        </p>
      </LegalSection>

      <LegalSection title="6. Contato">
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a
            className="text-primary hover:underline"
            href="mailto:jadsonpavia@gmail.com"
          >
            jadsonpavia@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
