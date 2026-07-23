import { AnalysisCategory, Severity, type DetectedIssue } from "@qa-ai/shared";
import type { PageAnalyzer, PageContext } from "../types.js";
import { issue } from "./helpers.js";

const SLOW_REQUEST_MS = 3000;

/**
 * Módulo 8 — Network.
 * Detecta 404, 500, timeouts, requests lentas, arquivos inexistentes e
 * falhas de API.
 */
export class NetworkAnalyzer implements PageAnalyzer {
  readonly id = "network";

  async analyze(ctx: PageContext): Promise<DetectedIssue[]> {
    const issues: DetectedIssue[] = [];

    for (const req of ctx.network) {
      const kind = resourceKindLabel(req.resourceType);

      if (req.failed) {
        issues.push(
          issue({
            title: "Requisição de rede falhou",
            description: `${kind} ${req.method} para ${req.url} não completou: ${req.failureText ?? "sem resposta do servidor"}. Motivo comum: DNS não resolveu, servidor recusou a conexão, CORS bloqueou, ou a rede caiu no meio do carregamento — o efeito prático depende do tipo de recurso (um script pode quebrar funcionalidade da página; uma imagem só deixa de aparecer).`,
            category: AnalysisCategory.NETWORK,
            severity: Severity.HIGH,
            pageUrl: ctx.url,
            raw: `${req.method} ${req.url} — ${req.failureText ?? ""}`,
            fingerprintExtra: [req.url],
          }),
        );
        continue;
      }

      if (req.status && req.status >= 500) {
        issues.push(
          issue({
            title: `Erro de servidor ${req.status}`,
            description: `${kind} para ${req.url} retornou ${req.status} — o servidor/API que atende essa URL quebrou ao processar a requisição (bug no backend, dependência fora do ar, ou sobrecarga). Se for uma chamada de API usada pela página, a funcionalidade que depende dela para de funcionar para o usuário.`,
            category: AnalysisCategory.NETWORK,
            severity: Severity.CRITICAL,
            pageUrl: ctx.url,
            raw: `${req.status} ${req.method} ${req.url}`,
            fingerprintExtra: [req.url, String(req.status)],
          }),
        );
      } else if (req.status && req.status === 404) {
        issues.push(
          issue({
            title: "Recurso inexistente (404)",
            description: `${kind} ${req.url} retornou 404 — o arquivo/endpoint não existe no servidor (link quebrado, deploy incompleto, ou caminho digitado errado no código). ${req.resourceType === "image" ? "Resultado: imagem quebrada visível ao usuário." : req.resourceType === "script" || req.resourceType === "stylesheet" ? "Resultado: a página pode perder funcionalidade ou estilo, já que esse arquivo nunca carrega." : "Resultado: a chamada que dependia desse recurso falha."}`,
            category: AnalysisCategory.NETWORK,
            severity: Severity.MEDIUM,
            pageUrl: ctx.url,
            raw: `404 ${req.url}`,
            fingerprintExtra: [req.url],
          }),
        );
      } else if (req.status && req.status >= 400) {
        issues.push(
          issue({
            title: `Requisição com erro ${req.status}`,
            description: `${kind} para ${req.url} retornou ${req.status} — normalmente indica um problema do lado de quem fez a requisição (autenticação ausente/expirada, payload inválido, ou permissão negada), não do servidor.`,
            category: AnalysisCategory.NETWORK,
            severity: Severity.MEDIUM,
            pageUrl: ctx.url,
            raw: `${req.status} ${req.url}`,
            fingerprintExtra: [req.url, String(req.status)],
          }),
        );
      }

      if (req.durationMs && req.durationMs > SLOW_REQUEST_MS && !req.fromCache) {
        issues.push(
          issue({
            title: "Requisição lenta",
            description: `${kind} para ${req.url} levou ${Math.round(req.durationMs)}ms pra responder (acima do limite de ${SLOW_REQUEST_MS}ms) — se estiver bloqueando a renderização da página, o usuário fica olhando pra tela em branco/carregando por esse tempo.`,
            category: AnalysisCategory.NETWORK,
            severity: Severity.LOW,
            pageUrl: ctx.url,
            raw: `${Math.round(req.durationMs)}ms ${req.url}`,
            fingerprintExtra: [req.url],
          }),
        );
      }
    }

    return issues;
  }
}

/** Traduz o resourceType do Playwright pra um rótulo legível em português. */
function resourceKindLabel(resourceType: string): string {
  const labels: Record<string, string> = {
    document: "O documento HTML",
    stylesheet: "A folha de estilo (CSS)",
    script: "O script (JS)",
    image: "A imagem",
    font: "A fonte",
    xhr: "A chamada de API (XHR)",
    fetch: "A chamada de API (fetch)",
    media: "O arquivo de mídia",
    websocket: "A conexão WebSocket",
  };
  return labels[resourceType] ?? "A requisição";
}
