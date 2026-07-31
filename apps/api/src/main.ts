import { recoverStaleBlueprints } from "./application/blueprint.service.js";
import { recoverStaleGuardianRuns } from "./application/guardian.service.js";
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
}

main().catch((err) => {
  console.error("Falha ao iniciar a API:", err);
  process.exit(1);
});
