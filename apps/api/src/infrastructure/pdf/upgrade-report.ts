import PDFDocument from "pdfkit";
import type { UpgradePlan } from "@qa-ai/shared";

const RISK_LABEL: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

/** Gera o relatório em PDF do plano de atualização: risco e migração por dependência. */
export function generateUpgradeReportPdf(plan: UpgradePlan): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const r = plan.result;

  doc.fontSize(20).text("Plano de Atualização — MuriOps", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(plan.title);
  doc.text(
    `IA: ${plan.provider} · gerado em ${new Date().toLocaleString("pt-BR")}`,
  );
  doc.fillColor("#000");
  doc.moveDown(1);

  if (!r) {
    doc.fontSize(11).text("Este plano ainda não foi gerado.");
    doc.end();
    return doc;
  }

  section(doc, "Resumo executivo");
  doc.fontSize(10).text(r.summary || "—", { align: "justify" });
  doc.moveDown(0.4);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Risco geral: ${RISK_LABEL[r.overallRisk] ?? r.overallRisk}`);
  doc.font("Helvetica");
  doc.moveDown(1);

  section(doc, `Dependências a atualizar (${r.items.length})`);
  for (const item of r.items) {
    if (doc.y > 660) doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(item.status === "done" ? "#0a7d5c" : "#000")
      .text(
        `${item.status === "done" ? "[x]" : "[ ]"} ${item.packageName} — ${item.currentVersion} → ${item.targetVersion}`,
      );
    doc
      .font("Helvetica")
      .fillColor("#666")
      .fontSize(8)
      .text(`Risco: ${RISK_LABEL[item.riskLevel] ?? item.riskLevel}`);
    doc.fillColor("#000").fontSize(9);
    if (item.breakingChanges.length > 0) {
      doc.font("Helvetica-Bold").text("Breaking changes:", { continued: false });
      for (const bc of item.breakingChanges) doc.font("Helvetica").text(`• ${bc}`);
    }
    if (item.migrationSteps) {
      doc.font("Helvetica-Bold").text("Como migrar:", { continued: true });
      doc.font("Helvetica").text(` ${item.migrationSteps}`, { align: "justify" });
    }
    doc.moveDown(0.6);
  }

  doc.end();
  return doc;
}

function section(doc: PDFKit.PDFDocument, title: string): void {
  if (doc.y > 680) doc.addPage();
  doc.fontSize(13).fillColor("#000").text(title);
  doc.moveDown(0.3);
}
