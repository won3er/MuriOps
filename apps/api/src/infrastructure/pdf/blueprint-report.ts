import PDFDocument from "pdfkit";
import type { Blueprint } from "@qa-ai/shared";

/** Gera o relatório em PDF de um blueprint: objetivos, stack, testes, riscos, roadmap. */
export function generateBlueprintReportPdf(bp: Blueprint): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const r = bp.result;

  doc.fontSize(20).text("Blueprint de Projeto — MuriOps", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(bp.title);
  doc.text(`IA: ${bp.provider} · gerado em ${new Date().toLocaleString("pt-BR")}`);
  doc.fillColor("#000");
  doc.moveDown(1);

  if (!r) {
    doc.fontSize(11).text("Este blueprint ainda não foi gerado.");
    doc.end();
    return doc;
  }

  section(doc, "Resumo executivo");
  doc.fontSize(10).text(r.summary || "—", { align: "justify" });
  doc.moveDown(1);

  section(doc, "Objetivos");
  field(doc, "Meta", r.objectives.goal);
  field(doc, "Escopo", r.objectives.scope);
  field(doc, "Fora de escopo", r.objectives.outOfScope);
  if (r.objectives.successCriteria.length) {
    doc.font("Helvetica-Bold").fontSize(10).text("Critérios de sucesso:");
    doc.font("Helvetica");
    for (const c of r.objectives.successCriteria) doc.text(`• ${c}`);
  }
  doc.moveDown(1);

  if (r.techStack.length) {
    section(doc, "Stack recomendada");
    for (const t of r.techStack) {
      doc.font("Helvetica-Bold").fontSize(10).text(`${t.category}: `, { continued: true });
      doc.font("Helvetica").text(t.choice);
      if (t.rationale) doc.fontSize(9).fillColor("#555").text(t.rationale);
      doc.fillColor("#000");
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  section(doc, "Estratégia de teste");
  const p = r.testStrategy.pyramid;
  doc
    .fontSize(10)
    .text(`Pirâmide: unitários ${p.unit}% · integração ${p.integration}% · E2E ${p.e2e}%`);
  if (r.testStrategy.tooling.length)
    doc.text(`Ferramentas: ${r.testStrategy.tooling.join(", ")}`);
  if (r.testStrategy.approaches.length)
    doc.text(`Abordagens: ${r.testStrategy.approaches.join(", ")}`);
  doc.moveDown(1);

  if (r.riskMatrix.length) {
    section(doc, "Matriz de risco");
    for (const risk of r.riskMatrix) {
      if (doc.y > 700) doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${risk.risk} `, { continued: true });
      doc
        .font("Helvetica")
        .fillColor("#666")
        .text(`(${risk.category} · P${risk.likelihood}×I${risk.impact})`);
      doc.fillColor("#000").fontSize(9).text(risk.mitigation);
      doc.moveDown(0.4);
    }
    doc.moveDown(0.5);
  }

  if (r.milestones.length) {
    section(doc, "Marcos & roadmap");
    r.milestones.forEach((m, i) => {
      if (doc.y > 700) doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${i + 1}. ${m.name} `, { continued: true });
      doc.font("Helvetica").fillColor("#666").text(`(~${m.durationWeeks} sem)`);
      doc.fillColor("#000").fontSize(9).text(m.deliverables.join(" · "));
      if (m.qaFocus) doc.fillColor("#0a7d5c").text(`QA: ${m.qaFocus}`);
      doc.fillColor("#000");
      doc.moveDown(0.4);
    });
    doc.moveDown(0.5);
  }

  if (r.qualityGates.length) {
    section(doc, "Quality gates");
    for (const g of r.qualityGates) {
      if (doc.y > 700) doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(`${g.stage} — ${g.metric}: ${g.threshold}`);
      doc.font("Helvetica").fontSize(9);
      for (const c of g.criteria) doc.text(`• ${c}`);
      doc.moveDown(0.4);
    }
  }

  doc.end();
  return doc;
}

function section(doc: PDFKit.PDFDocument, title: string): void {
  if (doc.y > 680) doc.addPage();
  doc.fontSize(13).fillColor("#000").text(title);
  doc.moveDown(0.3);
}

function field(doc: PDFKit.PDFDocument, label: string, value: string): void {
  if (!value) return;
  doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, { continued: true });
  doc.font("Helvetica").text(value, { align: "justify" });
  doc.moveDown(0.2);
}
