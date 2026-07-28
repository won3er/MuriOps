import { ACTIVE_ORCHESTRATION_STATUSES } from "@qa-ai/shared";
import { advance } from "../../application/orchestration.service.js";
import { prisma } from "../database/prisma.js";

/**
 * Runner in-process do orquestrador — mesma forma de `queue/runner.ts`
 * (substitui fila Redis/BullMQ). Sem infraestrutura externa além do banco.
 *
 * Trade-off aceito: runs em andamento se perdem se o processo cair; o boot
 * (`recoverStaleOrchestrationRuns`) marca como FAILED só os estados
 * *ativos* — `AWAITING_APPLY`/`AWAITING_OBSERVATION` são esperas legítimas
 * por humano ou webhook e sobrevivem a um restart intactas.
 */

const CONCURRENCY = 2;
const pending: string[] = [];
const running = new Set<string>();

/**
 * Enfileira um run pra avançar um passo. Deduplicado por runId: se o mesmo
 * run já está pendente ou rodando (ex.: duplo clique em "Aprovar", ou uma
 * observação de webhook chegando junto com o auto-resume da ponte), o
 * segundo enqueue é ignorado — sem isso, `pump()` podia disparar `advance()`
 * duas vezes em paralelo pro mesmo runId, gerando planos de remediação
 * duplicados (mesma classe de bug já visto na reanálise antes desta correção).
 */
export async function enqueueOrchestrationRun(runId: string): Promise<void> {
  if (running.has(runId) || pending.includes(runId)) return;
  pending.push(runId);
  pump();
}

function pump(): void {
  while (running.size < CONCURRENCY && pending.length > 0) {
    const id = pending.shift() as string;
    running.add(id);
    console.log(`▶️  Iniciando orquestração ${id}`);
    void advance(id)
      .then(() => console.log(`✅ Orquestração ${id}: passo concluído`))
      .catch((err) =>
        console.error(
          `❌ Orquestração ${id} falhou:`,
          err instanceof Error ? err.message : err,
        ),
      )
      .finally(() => {
        running.delete(id);
        pump();
      });
  }
}

/**
 * No boot, runs presos em estados ativos (processo reiniciou no meio) são
 * marcados como FAILED. AWAITING_APPLY/AWAITING_OBSERVATION não entram aqui —
 * são esperas legítimas por aprovação humana ou webhook.
 */
export async function recoverStaleOrchestrationRuns(): Promise<void> {
  const stale = await prisma.orchestrationRun.updateMany({
    where: { status: { in: ACTIVE_ORCHESTRATION_STATUSES } },
    data: {
      status: "FAILED",
      error: "Interrompida (API reiniciada). Inicie a execução novamente.",
      finishedAt: new Date(),
    },
  });
  if (stale.count > 0) {
    console.log(
      `♻️  ${stale.count} execução(ões) travada(s) marcada(s) como FAILED no boot.`,
    );
  }
}
