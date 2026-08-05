/**
 * Extrai texto de PDF e planilhas Excel (.xlsx/.xls) pra alimentar o
 * Guardian — usado tanto pelo upload direto de arquivo quanto pela leitura
 * de arquivos do Google Drive. Mantém a mesma filosofia dos outros parsers
 * do produto: bibliotecas leves, sem dependência de serviço externo.
 *
 * PDF: extrai só o texto corrido (via pdf-parse). PDFs escaneados sem OCR
 * (imagem pura) não têm texto extraível — o resultado fica vazio e o
 * chamador deve tratar isso como "documento sem conteúdo legível".
 *
 * Excel: cada planilha do arquivo é convertida pra CSV e concatenada, com
 * o nome da aba como cabeçalho — formato que a IA do Guardian já lê bem
 * (mesmo formato que o export "Google Sheets → CSV" já usa).
 */
import * as XLSX from "xlsx";

export class DocumentExtractionError extends Error {
  readonly statusCode = 400;
}

const PDF_MIME_TYPES = new Set(["application/pdf"]);
const EXCEL_MIME_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function isExtractableBinaryMime(mimeType: string): boolean {
  return PDF_MIME_TYPES.has(mimeType) || EXCEL_MIME_TYPES.has(mimeType);
}

export async function extractTextFromBinary(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  if (PDF_MIME_TYPES.has(mimeType) || fileName.toLowerCase().endsWith(".pdf")) {
    return extractPdfText(buffer, fileName);
  }
  if (
    EXCEL_MIME_TYPES.has(mimeType) ||
    /\.(xlsx|xls)$/i.test(fileName)
  ) {
    return extractExcelText(buffer, fileName);
  }
  throw new DocumentExtractionError(
    `"${fileName}" não é um PDF nem uma planilha Excel reconhecida (${mimeType}).`,
  );
}

async function extractPdfText(buffer: Buffer, fileName: string): Promise<string> {
  // Import dinâmico: pdf-parse roda um teste de debug no require() top-level
  // que tenta ler um arquivo de exemplo do próprio pacote — importar sob
  // demanda evita esse efeito colateral em todo boot do servidor.
  const pdfParse = (await import("pdf-parse")).default;
  let result: { text: string };
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    throw new DocumentExtractionError(
      `Não foi possível ler "${fileName}" como PDF: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const text = result.text.trim();
  if (!text) {
    throw new DocumentExtractionError(
      `"${fileName}" não tem texto extraível — provavelmente é um PDF escaneado (imagem), sem OCR. O Guardian ainda não faz OCR; tente colar o conteúdo manualmente.`,
    );
  }
  return text;
}

function extractExcelText(buffer: Buffer, fileName: string): string {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    throw new DocumentExtractionError(
      `Não foi possível ler "${fileName}" como planilha: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) parts.push(`# ${sheetName}\n${csv.trim()}`);
  }
  const text = parts.join("\n\n").trim();
  if (!text) {
    throw new DocumentExtractionError(`"${fileName}" está vazia ou não pôde ser lida.`);
  }
  return text;
}
