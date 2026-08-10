// [09/08/2026] Orquestração (ciclo autônomo) removida do produto — ver
// CLAUDE.md. Substituída pela Reconciliação, exibida direto na página de
// cada projeto. Redirect mantido pra não quebrar links/favoritos antigos.
import { redirect } from "next/navigation";

export default function OrquestracaoRedirectPage() {
  redirect("/projects");
}
