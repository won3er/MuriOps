import { recoverStaleBlueprints } from "./application/blueprint.service.js";
import { env } from "./config/env.js";
import { recoverStaleAnalyses } from "./infrastructure/queue/runner.js";
import { buildApp } from "./presentation/app.js";

async function main(): Promise<void> {
  const app = await buildApp();
  // Sem fila persistente: análises/blueprints presos por um restart viram FAILED.
  await recoverStaleAnalyses();
  await recoverStaleBlueprints();
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  app.log.info(`🚀 Elevate QA API em http://${env.API_HOST}:${env.API_PORT}`);
}

main().catch((err) => {
  console.error("Falha ao iniciar a API:", err);
  process.exit(1);
});
