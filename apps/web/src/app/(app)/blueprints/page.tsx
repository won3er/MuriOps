import { redirect } from "next/navigation";

// [06/08/2026] Pilar "Projetar"/Blueprint removido — ver CLAUDE.md. Decisão
// de produto: gerava arquitetura a partir de uma descrição solta, sem
// evidência real por trás (diferente do resto do produto), e não havia uso
// registrado. A Projeção (tarefas → Issues no GitHub) foi migrada para
// dentro de Aplicação, e o aviso de prontidão do Atualizar ficou só
// informativo (sem destino externo). Rota mantida como redirect pra não
// quebrar links/favoritos antigos.
export default function BlueprintsRedirect() {
  redirect("/aplicacao");
}
