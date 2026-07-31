import { createHmac } from "node:crypto";
import { env } from "../../config/env.js";

/**
 * Verificação anti-bot simples pro cadastro: um código de 6 dígitos exibido
 * na tela, que troca a cada minuto, e a pessoa precisa digitar de volta pra
 * liberar o botão "Criar conta". Não é um reCAPTCHA de verdade (não distingue
 * humano de script que também sabe ler a tela) — é fricção deliberada contra
 * os bots mais simples de cadastro em massa, pedida explicitamente como
 * medida adicional, sem depender de serviço de terceiro.
 *
 * Sem estado no servidor: o código é derivado deterministicamente da janela
 * de tempo atual (bloco de 60s) via HMAC com o mesmo JWT_SECRET já usado pra
 * assinar sessões — reaproveita um segredo que já existe, sem precisar de
 * mais uma variável de ambiente nem de armazenar nada em memória/banco (o que
 * quebraria com múltiplas instâncias do processo).
 */

const WINDOW_SECONDS = 60;

function windowIndex(offsetWindows = 0): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS) + offsetWindows;
}

function codeForWindow(window: number): string {
  const hmac = createHmac("sha256", env.JWT_SECRET)
    .update(`human-check:${window}`)
    .digest();
  // Usa os primeiros 4 bytes como inteiro sem sinal, reduz a 6 dígitos.
  const n = hmac.readUInt32BE(0) % 1_000_000;
  return String(n).padStart(6, "0");
}

/** Gera o código válido pra janela atual + quanto tempo falta pra trocar. */
export function generateHumanCheck(): {
  code: string;
  secondsRemaining: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = WINDOW_SECONDS - (now % WINDOW_SECONDS);
  return { code: codeForWindow(windowIndex()), secondsRemaining };
}

/**
 * Verifica a resposta contra a janela atual e a anterior — margem de
 * tolerância pra quem digitou bem no momento da troca do código (o front
 * mostrou "123456", o código rotacionou no servidor um instante depois do
 * clique em "Criar conta", sem essa folga a pessoa levaria erro por azar de
 * timing, não por engano de verdade).
 */
export function verifyHumanCheck(answer: string | undefined | null): boolean {
  if (!answer) return false;
  const clean = answer.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  return clean === codeForWindow(windowIndex()) || clean === codeForWindow(windowIndex(-1));
}
