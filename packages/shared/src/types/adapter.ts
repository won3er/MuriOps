/**
 * Porta do Adapter — o único jeito do núcleo orquestrador falar com um
 * sistema externo (MCP ou GitHub). Um adapter é um
 * mecanismo de integração puro: traduz um RemediationItem pros termos do
 * sistema alvo e nunca carrega regra de negócio/QA (isso mora só no núcleo).
 *
 * Capacidades são declaradas por conexão — nem todo adapter precisa
 * implementar as três.
 */

import type { AdapterCapability, AdapterKind } from "../enums.js";

export type { AdapterKind };

/** "push" = o adapter executa a mudança direto; "pull" = expõe pra uma ferramenta externa puxar e reportar. */
export type AdapterMode = "push" | "pull";

export type AdapterCapabilityName = AdapterCapability;

export interface AdapterConnection {
  id: string;
  projectId: string;
  kind: AdapterKind;
  capabilities: AdapterCapabilityName[];
  mode: AdapterMode;
  config: Record<string, unknown> | null;
  /** Token da ponte (adapters pull) — nunca presente pra adapters push (GitHub etc). */
  bridgeToken: string | null;
  /** PR Security Reviews automático ligado/desligado — só relevante pra GITHUB/GITLAB. */
  prReviewsEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Estado do projeto lido do sistema alvo, usado como contexto adicional (Fase 2 em diante). */
export interface AdapterProjectState {
  summary: string;
  raw?: Record<string, unknown>;
}

export interface AdapterApplyResult {
  /** Identificador da ação no sistema alvo (ex: URL da PR, id do card). */
  reference: string | null;
  /** true quando a ação já deixou o item pronto pra avaliação humana (ex: PR aberta). */
  requiresApproval: boolean;
  message: string;
  /** true quando o Auto-Fix conseguiu gerar e commitar uma correção de código real na branch, além do checklist. */
  autoFixApplied?: boolean;
}

/**
 * [10/08/2026] Auto-Fix — opcional, best-effort. `generateFix` é injetado
 * pelo chamador (remediation.service.ts), nunca importado direto pelo
 * adapter, pra manter o adapter desacoplado de qual provider de IA está em
 * uso. Se ausente, `apply()` se comporta exatamente como antes (só
 * checklist). Se lançar ou devolver null, o adapter ignora e segue — nunca
 * derruba a abertura da PR/MR por causa disso.
 */
export interface AdapterApplyOptions {
  generateFix?: (
    currentFileContent: string,
  ) => Promise<{ newContent: string; explanation: string } | null>;
}

import type { RemediationItem } from "./remediation.js";

/**
 * Contrato de adapter. Implementações: ponte manual (pull), MCP (pull),
 * GitHub (push). O núcleo não conhece o adapter concreto — injeção via
 * factory, mesmo padrão de AiProvider.
 */
export interface Adapter {
  readonly kind: AdapterKind;
  readonly mode: AdapterMode;
  readonly capabilities: AdapterCapabilityName[];

  analyze?(): Promise<AdapterProjectState>;
  apply?(item: RemediationItem, options?: AdapterApplyOptions): Promise<AdapterApplyResult>;
  registerObserver?(onObservation: (event: Record<string, unknown>) => void): void;
}
