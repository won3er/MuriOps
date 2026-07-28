import { LegalSection, LegalShell } from "@/components/legal-shell";

export const metadata = {
  title: "Privacidade",
  description:
    "Saiba como o MuriOps trata credenciais, dados de projetos e informações da conta.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <LegalShell
      title="Privacidade"
      description="Quais dados são utilizados, por que são necessários e quais controles estão disponíveis."
    >
      <LegalSection title="1. Dados de conta e organização">
        <p>
          Armazenamos informações necessárias para autenticação e operação do
          workspace, como nome, e-mail, identificador do Google quando usado e
          vínculo com a organização. Senhas são armazenadas de forma derivada,
          não em texto puro.
        </p>
      </LegalSection>

      <LegalSection title="2. Projetos e resultados">
        <p>
          Guardamos URLs cadastradas, configurações, páginas descobertas,
          scores, achados, evidências técnicas e resultados gerados. Esses dados
          permitem apresentar histórico, comparar execuções e montar planos de
          remediação.
        </p>
        <p>
          Não cadastre segredos em nomes, descrições ou URLs. Uma análise pode
          observar conteúdo publicamente exposto pelo próprio site analisado.
        </p>
      </LegalSection>

      <LegalSection title="3. Provedores de IA">
        <p>
          Quando você configura Claude, OpenAI ou Gemini, partes relevantes dos
          achados, descrições ou planos são enviadas ao provedor escolhido para
          processamento. O tratamento realizado por esse provedor também segue
          os termos e políticas dele.
        </p>
        <p>
          Sem uma chave própria configurada, o MuriOps não utiliza
          silenciosamente uma chave compartilhada: as respostas degradam para o
          modo determinístico.
        </p>
      </LegalSection>

      <LegalSection title="4. Credenciais de integrações">
        <p>
          Chaves de IA, tokens e senhas de integração são criptografados antes
          de serem armazenados no banco. Eles são descriptografados somente
          quando necessários para a operação solicitada. Ainda assim, use
          credenciais de escopo mínimo e revogue-as na origem ao desconectar um
          serviço.
        </p>
      </LegalSection>

      <LegalSection title="5. Compartilhamento e retenção">
        <p>
          Não vendemos dados pessoais. Dados podem ser processados por serviços
          essenciais de hospedagem, banco, autenticação e provedores escolhidos
          por você, na medida necessária para entregar o produto.
        </p>
        <p>
          Projetos, análises e blueprints podem ser apagados nas áreas
          correspondentes. Para exclusão da conta ou solicitações relativas aos
          seus dados, use o contato abaixo.
        </p>
      </LegalSection>

      <LegalSection title="6. Contato">
        <p>
          Solicitações de privacidade podem ser enviadas para{" "}
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
