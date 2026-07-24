import PDFDocument from "pdfkit";
import type { RemediationPlan } from "@qa-ai/shared";

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  info: "Informativa",
};

/** Gera o relatório em PDF do plano de aplicação: checklist de mudanças. */
export function generateRemediationReportPdf(
  plan: RemediationPlan,
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const r = plan.result;

  doc.fontSize(20).text("Plano de Aplicação — Elevate QA", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(plan.title);
  doc.text(
    `IA: ${plan.provider} · origem: ${plan.sourceType === "analysis" ? "análise" : "blueprint"} · gerado em ${new Date().toLocaleString("pt-BR")}`,
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
  doc.moveDown(1);

  section(doc, `Itens do checklist (${r.items.length})`);
  for (const item of r.items) {
    if (doc.y > 680) doc.addPage();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(item.status === "done" ? "#0a7d5c" : "#000")
      .text(`${item.status === "done" ? "[x]" : "[ ]"} ${item.title}`);
    doc
      .font("Helvetica")
      .fillColor("#666")
      .fontSize(8)
      .text(
        `${SEVERITY_LABEL[item.severity] ?? item.severity} · ${item.category}${
          item.filePath ? ` · ${item.filePath}` : ""
        }`,
      );
    doc.fillColor("#000").fontSize(9);
    if (item.description) doc.text(item.description, { align: "justify" });
    if (item.howTo) {
      doc.font("Helvetica-Bold").text("Como aplicar:", { continued: true });
      doc.font("Helvetica").text(` ${item.howTo}`, { align: "justify" });
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
