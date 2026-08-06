/**
 * Fluxos Críticos — monitoramento sintético de jornadas de negócio (login,
 * checkout, formulário de lead etc.). Diferente de Análise (scan pontual sob
 * demanda), um CriticalFlow roda os mesmos passos repetidamente numa
 * frequência fixa, simulando um usuário real via Playwright, pra detectar
 * quebras que fazem a empresa perder vendas/clientes antes que um humano
 * perceba — não é sobre qualidade de código, é sobre a jornada continuar
 * funcionando.
 */

export type CriticalFlowStepAction =
  | "NAVIGATE"
  | "CLICK"
  | "FILL"
  | "SELECT"
  | "WAIT_FOR_SELECTOR"
  | "ASSERT_TEXT"
  | "ASSERT_URL";

export interface CriticalFlowStep {
  action: CriticalFlowStepAction;
  /** Seletor CSS — obrigatório pra CLICK/FILL/SELECT/WAIT_FOR_SELECTOR/ASSERT_TEXT. */
  selector?: string;
  /** Valor a digitar (FILL), opção a escolher (SELECT), ou URL de destino (NAVIGATE). */
  value?: string;
  /** Texto esperado dentro do elemento (ASSERT_TEXT) ou trecho esperado na URL (ASSERT_URL). */
  expected?: string;
  /** Rótulo livre exibido na UI/relatório, ex.: "Preencher e-mail no checkout". */
  label?: string;
}

export type CriticalFlowFrequency = "EVERY_15_MIN" | "EVERY_HOUR" | "DAILY";

export type FlowRunStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED";

export interface CriticalFlow {
  id: string;
  projectId: string;
  name: string;
  startUrl: string;
  steps: CriticalFlowStep[];
  frequency: CriticalFlowFrequency;
  active: boolean;
  alertEmail: string | null;
  alertAfterConsecutiveFailures: number;
  consecutiveFailures: number;
  lastRunAt: string | null;
  lastRunStatus: FlowRunStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlowRun {
  id: string;
  criticalFlowId: string;
  status: FlowRunStatus;
  failedStepIndex: number | null;
  errorMessage: string | null;
  screenshotBase64: string | null;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface CreateCriticalFlowRequest {
  name: string;
  startUrl: string;
  steps: CriticalFlowStep[];
  frequency: CriticalFlowFrequency;
  alertEmail?: string;
  alertAfterConsecutiveFailures?: number;
}

export interface UpdateCriticalFlowRequest {
  name?: string;
  startUrl?: string;
  steps?: CriticalFlowStep[];
  frequency?: CriticalFlowFrequency;
  active?: boolean;
  alertEmail?: string | null;
  alertAfterConsecutiveFailures?: number;
}
