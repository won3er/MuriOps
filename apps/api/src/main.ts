import { analysisScheduleService } from "./application/analysis-schedule.service.js";
import { criticalFlowService } from "./application/critical-flow.service.js";
import { projectionService } from "./application/projection.service.js";
import { recoverStaleRemediationPlans } from "./application/remediation.service.js";
import { recoverStaleUpgradePlans } from "./application/upgrade.service.js";
import { env } from "./config/env.js";
import { recoverStaleAnalyses } from "./infrastructure/queue/runner.js";
import { buildApp } from "./presentation/app.js";

async function main(): Promise<void> {
  const app = await buildApp();
  // Sem fila persistente: análises/aplicações/execuções presas por um restart viram FAILED
  // (exceto execuções esperando aprovação humana ou webhook — essas sobrevivem intactas).
  await recoverStaleAnalyses();
  await recoverStaleRemediationPlans();
  await recoverStaleUpgradePlans();
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  app.log.info(`🚀 MuriOps API em http://${env.API_HOST}:${env.API_PORT}`);

  // Sync da Projeção (plano de Aplicação → tarefas com Issue no GitHub): sem
  // webhook dedicado ainda, então um polling de 10min verifica se alguma
  // issue foi fechada no GitHub e marca a tarefa como DONE aqui. Falha
  // isolada por tarefa não derruba o processo nem afeta as demais.
  const PROJECTION_SYNC_CHECK_MS = 10 * 60 * 1000;
  setInterval(() => {
    projectionService
      .syncAllPending()
      .catch((err) => app.log.error({ err }, "Falha ao sincronizar tarefas de Projeção"));
  }, PROJECTION_SYNC_CHECK_MS);
  void projectionService
    .syncAllPending()
    .catch((err) => app.log.error({ err }, "Falha ao sincronizar tarefas de Projeção (boot)"));

  // Fluxos Críticos: checagem a cada 5min de quem já passou do próprio
  // intervalo (15min/1h/diário) desde a última execução — mesmo padrão de
  // polling leve dos outros agendamentos, sem fila/cron externo. Falha em
  // um fluxo não derruba o processo nem afeta os demais.
  const CRITICAL_FLOW_CHECK_MS = 5 * 60 * 1000;
  setInterval(() => {
    criticalFlowService
      .runDueFlows()
      .catch((err) => app.log.error({ err }, "Falha ao rodar Fluxos Críticos"));
  }, CRITICAL_FLOW_CHECK_MS);
  void criticalFlowService
    .runDueFlows()
    .catch((err) => app.log.error({ err }, "Falha ao rodar Fluxos Críticos (boot)"));

  // Agendamento de Análise de Segurança ("Continuous Coverage" passivo):
  // granularidade é diária/semanal (uma Análise crawleia o site inteiro,
  // bem mais pesado que checar uma URL), então uma checagem a cada 30min é
  // sobra suficiente pra nunca atrasar mais que isso.
  const ANALYSIS_SCHEDULE_CHECK_MS = 30 * 60 * 1000;
  setInterval(() => {
    analysisScheduleService
      .runDueSchedules()
      .catch((err) => app.log.error({ err }, "Falha ao rodar agendamentos de Análise de Segurança"));
  }, ANALYSIS_SCHEDULE_CHECK_MS);
  void analysisScheduleService
    .runDueSchedules()
    .catch((err) => app.log.error({ err }, "Falha ao rodar agendamentos de Análise de Segurança (boot)"));
}

main().catch((err) => {
  console.error("Falha ao iniciar a API:", err);
  process.exit(1);
});
