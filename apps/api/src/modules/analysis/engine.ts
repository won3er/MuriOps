import {
  AnalysisStatus,
  EvidenceType,
  IssueStatus,
  type AnalysisCategory,
  type DetectedIssue,
  type ScoreBreakdown,
  type Severity,
} from "@qa-ai/shared";
import { storage } from "../../infrastructure/storage/storage.js";
import {
  createAiProvider,
  type AiIssueInput,
  type AiOverride,
} from "../../infrastructure/ai/index.js";
import { selectPageAnalyzers, selectSiteAnalyzers } from "./analyzers/index.js";
import { crawl } from "./crawler.js";
import { computeScores } from "./scoring.js";
import type { PageContext } from "./types.js";

export interface EngineInput {
  analysisId: string;
  siteUrl: string;
  categories: AnalysisCategory[];
  maxDepth: number;
  maxPages: number;
  /**
   * Chave de IA própria da organização. Se ausente, `createAiProvider`
   * degrada pro NoopProvider (resultado determinístico, sem IA de verdade) —
   * NÃO existe chave padrão do servidor como fallback.
   */
  aiOverride?: AiOverride | null;
  onStatus?: (status: AnalysisStatus, meta?: Record<string, unknown>) => Promise<void>;
}

export interface EngineIssue extends DetectedIssue {
  /** Caminhos de evidência (screenshot da página) ligados a este problema. */
  evidencePaths: string[];
  /** OPEN por padrão; a IA pode marcar como IGNORED se julgar falso positivo. */
  status: IssueStatus;
}

export interface EnginePage {
  url: string;
  title: string | null;
  depth: number;
  linkedFrom: string | null;
  statusCode: number | null;
}

export interface EngineEvidence {
  type: EvidenceType;
  path: string;
  pageUrl: string | null;
  viewport: string | null;
  meta: Record<string, unknown> | null;
}

export interface EngineResult {
  pages: EnginePage[];
  issues: EngineIssue[];
  evidence: EngineEvidence[];
  score: ScoreBreakdown;
  aiSummary: string;
  durationMs: number;
}

/**
 * Orquestra uma análise completa de ponta a ponta:
 * crawl → analyzers (por página + site) → scoring → revisão por IA.
 * Não escreve no banco; devolve um resultado que o caso de uso persiste.
 */
export async function runEngine(input: EngineInput): Promise<EngineResult> {
  const startedAt = Date.now();
  const {
    analysisId,
    siteUrl,
    categories,
    maxDepth,
    maxPages,
    aiOverride,
    onStatus,
  } = input;

  const evidence: EngineEvidence[] = [];
  const pageAnalyzers = selectPageAnalyzers(categories);
  const siteAnalyzers = selectSiteAnalyzers(categories);

  // Mapa fingerprint -> issue agregada (deduplicação entre páginas).
  const byFingerprint = new Map<string, EngineIssue>();
  const merge = (detected: DetectedIssue) => {
    if (byFingerprint.has(detected.fingerprint)) return;
    byFingerprint.set(detected.fingerprint, {
      ...detected,
      evidencePaths: [],
      status: IssueStatus.OPEN,
    });
  };

  await onStatus?.(AnalysisStatus.CRAWLING);

  // Analyzers por-página rodam aqui, ainda durante o crawl (via callback),
  // com a aba daquela página ainda aberta — o crawler fecha cada uma logo
  // em seguida (exceto a primeira). Isso mantém o pico de memória do
  // Chromium em ~2 abas simultâneas em vez de uma por página descoberta,
  // que era a causa do estouro de memória (>512MB) no Render free tier em
  // sites com bastante JS/trackers (ex.: lojas Nuvemshop/Shopify).
  const crawlResult = await crawl({
    siteUrl,
    maxDepth,
    maxPages,
    storagePrefix: analysisId,
    onPage: (url, i, total) => {
      void onStatus?.(AnalysisStatus.CRAWLING, { url, i, total });
    },
    onPageReady: async (ctx) => {
      if (ctx.screenshotPath) {
        evidence.push({
          type: EvidenceType.SCREENSHOT,
          path: ctx.screenshotPath,
          pageUrl: ctx.url,
          viewport: "1366x900",
          meta: { title: ctx.title },
        });
      }

      for (const analyzer of pageAnalyzers) {
        const detected = await analyzer.analyze(ctx).catch((err) => {
          // Falha de analyzer é engolida de propósito (um módulo quebrado não
          // pode derrubar a análise inteira), mas NUNCA em silêncio: sem log,
          // uma categoria que quebrou fica indistinguível de uma categoria
          // que rodou e não achou nada — o relatório diria "sem problemas"
          // pra uma checagem que na verdade nem executou.
          console.error(
            `⚠️  Analyzer "${analyzer.id}" falhou em ${ctx.url}:`,
            err instanceof Error ? err.message : err,
          );
          return [];
        });
        for (const d of detected) {
          merge(d);
          const issue = byFingerprint.get(d.fingerprint)!;
          if (ctx.screenshotPath && !issue.evidencePaths.includes(ctx.screenshotPath)) {
            issue.evidencePaths.push(ctx.screenshotPath);
          }
        }
      }

      await saveLogEvidence(analysisId, ctx, evidence);
    },
  });

  const { browser, pages } = crawlResult;

  if (pages.length === 0) {
    await browser.close().catch(() => {});
    throw new Error(
      "Não foi possível abrir nenhuma página do site — verifique se a URL está acessível e tente novamente.",
    );
  }

  try {
    await onStatus?.(AnalysisStatus.ANALYZING, { pages: pages.length });

    // Analyzers de nível site — rodam depois do crawl. Só a primeira página
    // (pages[0]) tem o Page do Playwright ainda vivo (SiteSeo/DeepSecurity
    // usam isso); os demais analyzers de site (UX, Security) trabalham só
    // com dados já capturados no crawl (hasNav, responseHeaders etc.), sem
    // precisar de nenhuma página aberta.
    for (const analyzer of siteAnalyzers) {
      // Mesmo motivo do catch com log nos analyzers por-página acima.
      const detected = await analyzer.analyze(pages, siteUrl).catch((err) => {
        console.error(
          `⚠️  Analyzer de site "${analyzer.id}" falhou:`,
          err instanceof Error ? err.message : err,
        );
        return [];
      });
      for (const d of detected) {
        merge(d);
        const issue = byFingerprint.get(d.fingerprint)!;
        if (issue.evidencePaths.length > 0) continue;
        const matchingPage =
          pages.find((p) => p.url === issue.pageUrl) ?? pages[0]!;
        if (matchingPage.screenshotPath) {
          issue.evidencePaths.push(matchingPage.screenshotPath);
        }
      }
    }

    const issues = [...byFingerprint.values()];
    const preliminaryScore = computeScores(issues);

    // Módulo 11 — Revisão por IA (pode marcar falsos positivos como IGNORED).
    await onStatus?.(AnalysisStatus.AI_REVIEW, { issues: issues.length });
    const aiSummary = await enrichWithAi(
      siteUrl,
      pages.length,
      preliminaryScore,
      issues,
      aiOverride,
    );

    // Recalcula o score sem os problemas descartados pela IA — falsos
    // positivos não devem penalizar a nota do site.
    const validIssues = issues.filter((i) => i.status !== IssueStatus.IGNORED);
    const score = computeScores(validIssues);

    return {
      pages: pages.map((p) => ({
        url: p.url,
        title: p.title,
        depth: p.depth,
        linkedFrom: null,
        statusCode: p.statusCode,
      })),
      issues,
      evidence,
      score,
      aiSummary,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Salva console.json e network.json de uma página como evidência. */
async function saveLogEvidence(
  analysisId: string,
  ctx: PageContext,
  evidence: EngineEvidence[],
): Promise<void> {
  if (ctx.console.length > 0) {
    const path = await storage.save(
      analysisId,
      `console_${hash(ctx.url)}.json`,
      JSON.stringify(ctx.console, null, 2),
    );
    evidence.push({
      type: EvidenceType.CONSOLE,
      path,
      pageUrl: ctx.url,
      viewport: null,
      meta: { count: ctx.console.length },
    });
  }
  if (ctx.network.length > 0) {
    const path = await storage.save(
      analysisId,
      `network_${hash(ctx.url)}.json`,
      JSON.stringify(ctx.network, null, 2),
    );
    evidence.push({
      type: EvidenceType.NETWORK,
      path,
      pageUrl: ctx.url,
      viewport: null,
      meta: { count: ctx.network.length },
    });
  }
}

/** Envia os dados coletados à IA e aplica o enriquecimento aos problemas. */
async function enrichWithAi(
  siteUrl: string,
  pagesDiscovered: number,
  score: ScoreBreakdown,
  issues: EngineIssue[],
  aiOverride?: AiOverride | null,
): Promise<string> {
  const aiProvider = createAiProvider(aiOverride);
  const aiInput: AiIssueInput[] = issues.map((i) => ({
    fingerprint: i.fingerprint,
    title: i.title,
    description: i.description,
    category: i.category,
    severity: i.severity,
    pageUrl: i.pageUrl,
    selector: i.selector,
    raw: i.raw,
  }));

  try {
    const result = await aiProvider.enrichAnalysis({
      siteUrl,
      pagesDiscovered,
      overallScore: score.overall,
      categoryScores: score.categories,
      issues: aiInput,
    });

    const map = new Map(result.enrichments.map((e) => [e.fingerprint, e]));
    for (const issue of issues) {
      const e = map.get(issue.fingerprint);
      if (!e) continue;
      issue.impact = e.impact || issue.impact;
      issue.suggestion = e.suggestion || issue.suggestion;
      if (e.stepsToReproduce.length) issue.stepsToReproduce = e.stepsToReproduce;
      if (e.severity) issue.severity = e.severity as Severity;
      // A IA revisou e julgou não ser uma falha real — marca como ignorado
      // em vez de descartar (auditável, o usuário pode reverter na UI).
      if (e.valid === false) issue.status = IssueStatus.IGNORED;
    }

    return result.summary;
  } catch {
    // A indisponibilidade do provedor não invalida a coleta. Não exponha a
    // resposta bruta do provedor como se fosse um resumo executivo.
    return "Coleta concluída. A revisão por IA não ficou disponível neste momento; os achados coletados continuam disponíveis.";
  }
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
