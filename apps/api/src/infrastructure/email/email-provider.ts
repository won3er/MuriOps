/**
 * Envio de e-mail pro resumo das auditorias agendadas do Guardian. Só
 * suporta Resend por enquanto (API HTTP simples, sem SMTP, sem SDK extra —
 * um `fetch` já basta). Cada organização usa a própria chave, criada e colada
 * por ela em Configurações — o mesmo padrão de "sem chave compartilhada do
 * servidor" já usado pra IA e pro Google Drive.
 *
 * Sem chave configurada, `sendEmail` não é chamado — quem decide isso é o
 * chamador (guardian-schedule runner), não este módulo.
 */

export class EmailSendError extends Error {}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmailViaResend(
  apiKey: string,
  fromAddress: string,
  input: SendEmailInput,
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new EmailSendError(`Resend API error: ${res.status} ${body}`);
  }
}
