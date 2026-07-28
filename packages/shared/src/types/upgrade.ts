/**
 * Atualizar (UpgradePlan) — inspirado no conceito do Upgrade-Assistant:
 * recebe o manifesto de dependências de um projeto (package.json,
 * requirements.txt, pom.xml, go.mod, .csproj, Gemfile...) e devolve um plano
 * de atualização concreto — o que subir, quais quebras esperar, e como
 * migrar, item por item. Mesma filosofia da Aplicação: pode ser seguido
 * manualmente ou entregue a uma IA de dev via ponte universal.
 *
 * Multi-linguagem desde 29/07/2026 — antes disso só aceitava package.json.
 */

export type UpgradeStatus = "PENDING" | "READY" | "FAILED";
export type UpgradeItemStatus = "pending" | "done";
export type UpgradeProviderName = "claude" | "openai" | "gemini";
export type UpgradeRiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Ecossistema de dependências do manifesto analisado. `legacy` cobre
 * sistemas legado (RPG/CL, COBOL, VB6, PL/SQL antigo, Delphi...), onde a
 * regra de negócio é diferente: recomenda-se atualizar versão de forma
 * padronizada, mas NUNCA migrar de tecnologia (ex.: RPG → Java, VB6 →
 * .NET) — migração completa de sistema exige uma arquitetura que o produto
 * ainda não tem.
 */
export type UpgradeEcosystem =
  | "npm"
  | "pip"
  | "poetry"
  | "bundler"
  | "maven"
  | "gradle"
  | "go"
  | "nuget"
  | "composer"
  | "cargo"
  | "legacy"
  | "unknown";

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
  /**
   * Ecossistema deste item. Normalmente igual ao do plano; fica no item pra
   * suportar projetos poliglotas (um plano cobrindo vários manifestos).
   */
  ecosystem?: UpgradeEcosystem;
  status: UpgradeItemStatus;
}

export interface UpgradeResult {
  summary: string;
  /** Risco geral da atualização completa, considerando todos os itens. */
  overallRisk: UpgradeRiskLevel;
  /** Ordem recomendada de execução (ids de UpgradeItem), quando a IA julgar relevante. */
  recommendedOrder: string[];
  items: UpgradeItem[];
  /**
   * Avisos de escopo — usados principalmente pra registrar que uma migração
   * de tecnologia foi deliberadamente NÃO recomendada em sistema legado
   * (fora do escopo do produto), pra o usuário entender a ausência.
   */
  scopeNotes?: string[];
}

export interface UpgradePlan {
  id: string;
  projectId: string | null;
  title: string;
  /** Manifesto original enviado pelo usuário (referência/auditoria). */
  manifestRaw: string;
  /**
   * @deprecated Use `manifestRaw`. Mantido com o mesmo valor por
   * compatibilidade com clientes anteriores ao suporte multi-linguagem.
   */
  packageJsonRaw: string;
  /** Ecossistema detectado do manifesto. */
  ecosystem: UpgradeEcosystem;
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
  ecosystem: UpgradeEcosystem;
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
  /**
   * Conteúdo bruto do manifesto (texto colado ou lido de upload) — de
   * qualquer ecossistema suportado, não só package.json.
   */
  manifest?: string;
  /**
   * @deprecated Use `manifest`. Alias aceito por compatibilidade com o
   * cliente anterior ao suporte multi-linguagem; um dos dois é obrigatório.
   */
  packageJson?: string;
  /**
   * Nome do arquivo de origem, quando conhecido (ex.: "pom.xml") — melhora
   * muito a precisão da detecção de ecossistema.
   */
  fileName?: string | null;
  /** Força o ecossistema em vez de detectar (escape hatch pra caso ambíguo). */
  ecosystem?: UpgradeEcosystem;
  provider?: UpgradeProviderName;
}
