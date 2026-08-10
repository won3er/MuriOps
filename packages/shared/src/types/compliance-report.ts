/**
 * Relatório de compliance — autoavaliação estruturada a partir de achados
 * reais, NUNCA uma certificação (ver compliance-report.service.ts). Não
 * inclui nenhum selo ISO/SOC — o MuriOps não passou por auditoria formal.
 */
export interface ComplianceReport {
  projectId: string;
  projectName: string;
  projectUrl: string;
  generatedAt: string;
  repoConnected: boolean;
  latestAnalysis: {
    id: string;
    version: number;
    finishedAt: string | null;
    overallScore: number | null;
    openIssueCount: number;
    issuesBySeverity: Record<string, number>;
    issuesByCategory: Record<string, number>;
  } | null;
  continuousMonitoring: {
    criticalFlowCount: number;
    criticalFlowActiveCount: number;
    criticalFlowFailingCount: number;
    securityScheduleCount: number;
    securityScheduleActiveCount: number;
  };
}
