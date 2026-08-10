// [09/08/2026] Guardian removido do produto (não servia à tese central —
// QA/segurança de projetos de software, não auditoria de documento de
// negócio). Redirect mantido pra não quebrar links/favoritos antigos.
import { redirect } from "next/navigation";

export default function GuardianRedirectPage() {
  redirect("/dashboard");
}
