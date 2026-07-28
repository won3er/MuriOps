import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { env } from "../../config/env.js";

/**
 * Storage de evidências em disco local.
 * Abstraído para permitir troca por S3/GCS no futuro sem mudar chamadores.
 */
export interface EvidenceStorage {
  /** Salva um artefato e retorna o caminho relativo (para persistir no banco). */
  save(analysisId: string, fileName: string, data: Buffer | string): Promise<string>;
  /** Caminho absoluto no disco para servir o arquivo. */
  absolutePath(relativePath: string): string;
  /** Remove todos os artefatos de uma análise. */
  removeAnalysis(analysisId: string): Promise<void>;
}

class LocalEvidenceStorage implements EvidenceStorage {
  private readonly root = resolve(env.STORAGE_DIR);

  async save(
    analysisId: string,
    fileName: string,
    data: Buffer | string,
  ): Promise<string> {
    const safeName = sanitize(fileName);
    const dir = join(this.root, analysisId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, safeName), data);
    return `${analysisId}/${safeName}`;
  }

  absolutePath(relativePath: string): string {
    // Impede path traversal — resolve e confirma que fica dentro do root.
    const abs = resolve(this.root, relativePath);
    const fromRoot = relative(this.root, abs);
    if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
      throw new Error("Caminho de evidência inválido");
    }
    return abs;
  }

  async removeAnalysis(analysisId: string): Promise<void> {
    const dir = this.absolutePath(analysisId);
    await rm(dir, { recursive: true, force: true });
  }
}

/** Sanitiza nome de arquivo, mantendo extensão. */
function sanitize(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (cleaned && cleaned !== "." && cleaned !== "..") return cleaned;
  return createHash("sha1").update(name).digest("hex");
}

export const storage: EvidenceStorage = new LocalEvidenceStorage();
