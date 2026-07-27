/**
 * Atualizar (UpgradePlan) — inspirado no conceito do Upgrade-Assistant:
 * recebe o `package.json` de um projeto e devolve um plano de atualização
 * de dependências concreto — o que subir, quais quebras esperar, e como
 * migrar, item por item. Mesma filosofia da Aplicação: pode ser seguido
 * manualmente ou entregue a uma IA de dev via ponte universal.
 */

export type UpgradeStatus = "PENDING" | "READY" | "FAILED";
export type UpgradeItemStatus = "pending" | "done";
export type UpgradeProviderName = "claude" | "openai" | "gemini";
export type UpgradeRiskLevel = "low" | "medium" | "high" | "critical";

export interface UpgradeItem {
  id: string;
  packageName: string;
  currentVersion: string;
  targetVersion: string;
  /** low = patch/minor sem breaking changes conhecidas; critical = major com muita quebra/EOL. */
  riskLevel: UpgradeRiskLevel;
  /** Mudanças que quebram compatibilidade, uma por linha. */
  breakingChanges: string[];
  /** Passo a passo de como migrar essa dependência com segurança. */
  migrationSteps: string;
  /** Caminho do arquivo afetado quando fizer sentido (ex.: package.json, arquivo de config específico). */
  filePath: string | null;
  status: UpgradeItemStatus;
}

export interface UpgradeResult {
  summary: string;
  /** Risco geral da atualização completa, considerando todos os itens. */
  overallRisk: UpgradeRiskLevel;
  /** Ordem recomendada de execução (ids de UpgradeItem), quando a IA julgar relevante. */
  recommendedOrder: string[];
  items: UpgradeItem[];
}

export interface UpgradePlan {
  id: string;
  projectId: string | null;
  title: string;
  /** package.json original enviado pelo usuário (referência/auditoria). */
  packageJsonRaw: string;
  provider: string;
  status: UpgradeStatus;
  result: UpgradeResult | null;
  error: string | null;
  /** Token da ponte universal — mesma mecânica da Aplicação. */
  apiToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpgradeSummary {
  id: string;
  projectId: string | null;
  title: string;
  status: UpgradeStatus;
  itemCount: number;
  doneCount: number;
  overallRisk: UpgradeRiskLevel | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUpgradePlanRequest {
  projectId?: string | null;
  title?: string;
  /** Conteúdo bruto do package.json (texto colado ou lido de upload). */
  packageJson: string;
  provider?: UpgradeProviderName;
}
