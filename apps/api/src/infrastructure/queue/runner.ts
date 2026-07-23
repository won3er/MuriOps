import { AnalysisStatus } from "@qa-ai/shared";
import { runAnalysis } from "../../application/analysis-runner.js";
import { prisma } from "../database/prisma.js";

/**
 * Runner in-process de análises — substitui a fila Redis/BullMQ.
 * Sem infraestrutura externa além do banco: o próprio processo da API executa
 * o engine, com um limite de concorrência simples para não sobrecarregar.
 *
 * Trade-off aceito: análises em andamento se perdem se o processo cair; o boot
 * (`recoverStaleAnalyses`) marca essas como FAILED para poderem ser refeitas.
 */

const CONCURRENCY = 2;
const pending: string[] = [];
const running = new Set<string>();

/** Agenda uma análise para processamento assíncrono (não bloqueia a resposta HTTP). */
export async function enqueueAnalysis(analysisId: string): Promise<void> {
  pending.push(analysisId);
  pump();
}

/**
 * Remove uma análise ainda não iniciada da fila em memória.
 * Retorna true se estava pendente; false se já rodava ou não existia.
 */
export function cancelPendingAnalysis(analysisId: string): boolean {
  const idx = pending.indexOf(analysisId);
  if (idx === -1) return false;
  pending.splice(idx, 1);
  return true;
}

function pump(): void {
  while (running.size < CONCURRENCY && pending.length > 0) {
    const id = pending.shift() as string;
    running.add(id);
    console.log(`▶️  Iniciando análise ${id}`);
    void runAnalysis(id)
      .then(() => console.log(`✅ Análise ${id} concluída`))
      .catch((err) =>
        console.error(
          `❌ Análise ${id} falhou:`,
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
 * No boot, análises presas em estados intermediários (processo reiniciou no
 * meio) são marcadas como FAILED — como não há fila persistente, elas nunca
 * terminariam sozinhas.
 */
export async function recoverStaleAnalyses(): Promise<void> {
  const stale = await prisma.analysis.updateMany({
    where: {
      status: {
        in: [
          AnalysisStatus.QUEUED,
          AnalysisStatus.CRAWLING,
          AnalysisStatus.ANALYZING,
          AnalysisStatus.AI_REVIEW,
        ],
      },
    },
    data: {
      status: AnalysisStatus.FAILED,
      error: "Interrompida (API reiniciada). Rode a análise novamente.",
      finishedAt: new Date(),
    },
  });
  if (stale.count > 0) {
    console.log(
      `♻️  ${stale.count} análise(s) travada(s) marcada(s) como FAILED no boot.`,
    );
  }
}
