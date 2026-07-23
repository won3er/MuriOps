import PDFDocument from "pdfkit";
import type { AnalysisDetail } from "@qa-ai/shared";

const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
  INFO: "Informativa",
};

const CATEGORY_LABEL: Record<string, string> = {
  UI: "Interface",
  UX: "Experiência do usuário",
  PERFORMANCE: "Performance",
  SEO: "SEO",
  ACCESSIBILITY: "Acessibilidade",
  SECURITY: "Segurança",
  CONSOLE: "Console",
  NETWORK: "Rede",
  DEEP_SECURITY: "Segurança Avançada",
};

/** Gera o relatório em PDF de uma análise: resumo, score e lista de problemas. */
export function generateAnalysisReportPdf(
  analysis: AnalysisDetail,
  siteUrl: string,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(20).text("Relatório de Qualidade — Elevate QA", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(siteUrl);
  doc
    .fillColor("#666")
    .text(
      `Análise v${analysis.version} · gerado em ${new Date().toLocaleString("pt-BR")}`,
    );
  doc.fillColor("#000");
  doc.moveDown(1);

  if (analysis.score) {
    doc.fontSize(14).text(`Score geral: ${analysis.score.overall}/100`);
    doc.moveDown(0.3);
    doc.fontSize(10);
    for (const [cat, val] of Object.entries(analysis.score.categories)) {
      doc.text(`${CATEGORY_LABEL[cat] ?? cat}: ${val}/100`);
    }
    doc.moveDown(1);
  }

  if (analysis.aiSummary) {
    doc.fontSize(13).text("Resumo executivo");
    doc.moveDown(0.2);
    doc.fontSize(10).text(analysis.aiSummary, { align: "justify" });
    doc.moveDown(1);
  }

  const realIssues = analysis.issues.filter((i) => i.status !== "IGNORED");
  doc.fontSize(13).text(`Problemas encontrados (${realIssues.length})`);
  doc.moveDown(0.5);

  if (realIssues.length === 0) {
    doc.fontSize(10).fillColor("#666").text("Nenhum problema encontrado.");
  }

  for (const issue of realIssues) {
    if (doc.y > 700) doc.addPage();

    doc
      .fontSize(11)
      .fillColor("#000")
      .text(issue.title, { continued: false });
    doc
      .fontSize(8)
      .fillColor("#888")
      .text(
        `${CATEGORY_LABEL[issue.category] ?? issue.category} · Severidade: ${SEVERITY_LABEL[issue.severity] ?? issue.severity}`,
      );

    if (issue.pageUrl) {
      doc.fontSize(8).fillColor("#2563eb").text(issue.pageUrl, { link: issue.pageUrl });
    }

    doc.fillColor("#333").fontSize(9).moveDown(0.2);
    doc.text(issue.description, { align: "justify" });

    if (issue.impact) {
      doc.moveDown(0.15);
      doc.font("Helvetica-Bold").text("Impacto: ", { continued: true });
      doc.font("Helvetica").text(issue.impact, { align: "justify" });
    }

    if (issue.suggestion) {
      doc.moveDown(0.15);
      doc.font("Helvetica-Bold").text("Sugestão de correção: ", { continued: true });
      doc.font("Helvetica").text(issue.suggestion, { align: "justify" });
    }

    if (issue.stepsToReproduce.length) {
      doc.moveDown(0.15);
      doc.font("Helvetica-Bold").text("Como reproduzir:");
      doc.font("Helvetica");
      for (const step of issue.stepsToReproduce) {
        doc.text(`• ${step}`);
      }
    }

    doc.moveDown(0.6);
    doc
      .strokeColor("#ddd")
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(0.6);
    doc.fillColor("#000");
  }

  doc.end();
  return doc;
}
