// [09/08/2026] Guardian removido do produto — ver /guardian/page.tsx.
import { redirect } from "next/navigation";

export default function GuardianRunRedirectPage() {
  redirect("/dashboard");
}
