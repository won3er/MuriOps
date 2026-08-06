import { recoverStaleBlueprints } from "./application/blueprint.service.js";
import { guardianScheduleService } from "./application/guardian-schedule.service.js";
import { recoverStaleGuardianRuns } from "./application/guardian.service.js";
import { projectionService } from "./application/projection.service.js";
import { recoverStaleRemediationPlans } from "./application/remediation.service.js";
import { recoverStaleUpgradePlans } from "./application/upgrade.service.js";
import { env } from "./config/env.js";
import { recoverStaleOrchestrationRuns } from "./infrastructure/queue/orchestration-runner.js";
import { recoverStaleAnalyses } from "./infrastructure/queue/runner.js";
import { buildApp } from "./presentation/app.js";

async function main(): Promise<void> {
  const app = await buildApp();
  // Sem fila persistente: análises/blueprints/aplicações/execuções presas por um restart viram FAILED
  // (exceto execuções esperando aprovação humana ou webhook — essas sobrevivem intactas).
  await recoverStaleAnalyses();
  await recoverStaleBlueprints();
  await recoverStaleRemediationPlans();
  await recoverStaleUpgradePlans();
  await recoverStaleGuardianRuns();
  await recoverStaleOrchestrationRuns();
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  app.log.info(`🚀 MuriOps API em http://${env.API_HOST}:${env.API_PORT}`);

  // Agendamentos do Guardian (reauditoria diária + e-mail): sem fila/cron
  // externo no projeto, então um setInterval de 15min checa quem está na
  // hora certa de rodar hoje (ver guardianScheduleService.runDueSchedules).
  // Falhas em um agendamento não derrubam o processo nem afetam os outros.
  const GUARDIAN_SCHEDULE_CHECK_MS = 15 * 60 * 1000;
  setInterval(() => {
    guardianScheduleService
      .runDueSchedules()
      .catch((err) => app.log.error({ err }, "Falha ao rodar agendamentos do Guardian"));
  }, GUARDIAN_SCHEDULE_CHECK_MS);
  // Roda uma checagem logo no boot também, sem esperar o primeiro intervalo.
  void guardianScheduleService
    .runDueSchedules()
    .catch((err) => app.log.error({ err }, "Falha ao rodar agendamentos do Guardian (boot)"));

  // Sync da Projeção (Projetar → tarefas com Issue no GitHub): sem webhook
  // dedicado ainda, então um polling de 10min verifica se alguma issue foi
  // fechada no GitHub e marca a tarefa como DONE aqui. Falha isolada por
  // tarefa não derruba o processo nem afeta as demais.
  const PROJECTION_SYNC_CHECK_MS = 10 * 60 * 1000;
  setInterval(() => {
    projectionService
      .syncAllPending()
      .catch((err) => app.log.error({ err }, "Falha ao sincronizar tarefas de Projeção"));
  }, PROJECTION_SYNC_CHECK_MS);
  void projectionService
    .syncAllPending()
    .catch((err) => app.log.error({ err }, "Falha ao sincronizar tarefas de Projeção (boot)"));
}

main().catch((err) => {
  console.error("Falha ao iniciar a API:", err);
  process.exit(1);
});
