import type { UpgradeEcosystem } from "@qa-ai/shared";

/**
 * Detecta o ecossistema de dependências a partir do manifesto colado pelo
 * usuário. A entrada é texto bruto (sem nome de arquivo garantido), então a
 * detecção é por conteúdo — com um palpite opcional pelo nome do arquivo
 * quando o front mandar.
 *
 * Antes desta funcionalidade o "Atualizar" só aceitava `package.json` (fazia
 * `JSON.parse` obrigatório e recusava qualquer outra coisa). Agora cobre os
 * ecossistemas mais usados + sistemas legado.
 *
 * IMPORTANTE — legado: a detecção de legado é intencionalmente conservadora
 * e serve só pra ligar a regra de negócio "atualizar versão sim, migrar
 * tecnologia não" no prompt da IA. Ver `upgrade-prompt.ts`.
 */

export interface DetectionResult {
  ecosystem: UpgradeEcosystem;
  /** Rótulo amigável pra UI/prompt (ex.: "Python (pip)"). */
  label: string;
  /** Arquivo de manifesto canônico do ecossistema, usado como filePath padrão. */
  manifestFile: string;
  /**
   * Confiança da detecção. "low" = heurística fraca; o prompt pede pra IA
   * confirmar pelo conteúdo em vez de assumir cegamente.
   */
  confidence: "high" | "medium" | "low";
}

const ECOSYSTEM_META: Record<
  UpgradeEcosystem,
  { label: string; manifestFile: string }
> = {
  npm: { label: "Node.js (npm/pnpm/yarn)", manifestFile: "package.json" },
  pip: { label: "Python (pip)", manifestFile: "requirements.txt" },
  poetry: { label: "Python (Poetry/PEP 621)", manifestFile: "pyproject.toml" },
  bundler: { label: "Ruby (Bundler)", manifestFile: "Gemfile" },
  maven: { label: "Java (Maven)", manifestFile: "pom.xml" },
  gradle: { label: "Java/Kotlin (Gradle)", manifestFile: "build.gradle" },
  go: { label: "Go (go modules)", manifestFile: "go.mod" },
  nuget: { label: ".NET (NuGet)", manifestFile: "*.csproj" },
  composer: { label: "PHP (Composer)", manifestFile: "composer.json" },
  cargo: { label: "Rust (Cargo)", manifestFile: "Cargo.toml" },
  legacy: { label: "Sistema legado", manifestFile: "inventario-legado.txt" },
  unknown: { label: "Não identificado", manifestFile: "manifesto.txt" },
};

export function ecosystemLabel(ecosystem: UpgradeEcosystem): string {
  return ECOSYSTEM_META[ecosystem]?.label ?? ECOSYSTEM_META.unknown.label;
}

export function ecosystemManifestFile(ecosystem: UpgradeEcosystem): string {
  return ECOSYSTEM_META[ecosystem]?.manifestFile ?? ECOSYSTEM_META.unknown.manifestFile;
}

/** Palpite pelo nome do arquivo, quando disponível (mais confiável que o conteúdo). */
function detectByFileName(fileName: string): UpgradeEcosystem | null {
  const f = fileName.trim().toLowerCase().split(/[\\/]/).pop() ?? "";
  if (!f) return null;

  if (f === "package.json") return "npm";
  if (f === "requirements.txt" || f.startsWith("requirements-")) return "pip";
  if (f === "pipfile" || f === "setup.py" || f === "setup.cfg") return "pip";
  if (f === "pyproject.toml") return "poetry";
  if (f === "gemfile" || f.endsWith(".gemspec")) return "bundler";
  if (f === "pom.xml") return "maven";
  if (f === "build.gradle" || f === "build.gradle.kts" || f === "libs.versions.toml")
    return "gradle";
  if (f === "go.mod") return "go";
  if (f.endsWith(".csproj") || f.endsWith(".vbproj") || f.endsWith(".fsproj")) return "nuget";
  if (f === "packages.config" || f === "directory.packages.props") return "nuget";
  if (f === "composer.json") return "composer";
  if (f === "cargo.toml") return "cargo";
  return null;
}

/**
 * Detecção por conteúdo. A ordem importa: formatos com assinatura forte
 * (XML do Maven, `module ` do go.mod) são checados antes dos heurísticos.
 */
function detectByContent(raw: string): { ecosystem: UpgradeEcosystem; confidence: DetectionResult["confidence"] } {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // ---- JSON: npm vs composer (ambos são JSON com "require"/"dependencies") ----
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      // composer usa "require"/"require-dev"; npm usa "dependencies"/"devDependencies".
      if ("require" in parsed || "require-dev" in parsed) {
        return { ecosystem: "composer", confidence: "high" };
      }
      if (
        "dependencies" in parsed ||
        "devDependencies" in parsed ||
        "peerDependencies" in parsed ||
        "engines" in parsed
      ) {
        return { ecosystem: "npm", confidence: "high" };
      }
      // JSON válido mas sem seção de dependência reconhecida.
      return { ecosystem: "npm", confidence: "low" };
    } catch {
      // JSON malformado — cai nas heurísticas abaixo em vez de rejeitar.
    }
  }

  // ---- XML: Maven (pom.xml) / NuGet (.csproj, packages.config) ----
  if (text.startsWith("<")) {
    if (lower.includes("<project") && lower.includes("maven.apache.org")) {
      return { ecosystem: "maven", confidence: "high" };
    }
    if (lower.includes("<modelversion") || lower.includes("<artifactid")) {
      return { ecosystem: "maven", confidence: "high" };
    }
    if (
      lower.includes("<packagereference") ||
      lower.includes("<targetframework") ||
      lower.includes("<project sdk=") ||
      lower.includes("<packages")
    ) {
      return { ecosystem: "nuget", confidence: "high" };
    }
    return { ecosystem: "unknown", confidence: "low" };
  }

  // ---- go.mod ----
  if (/^module\s+\S+/m.test(text) && /^(require|go)\s/m.test(text)) {
    return { ecosystem: "go", confidence: "high" };
  }

  // ---- TOML: pyproject / Cargo / gradle version catalog ----
  if (lower.includes("[tool.poetry") || lower.includes("[project]") && lower.includes("dependencies")) {
    return { ecosystem: "poetry", confidence: "high" };
  }
  if (lower.includes("[package]") && lower.includes("[dependencies]")) {
    return { ecosystem: "cargo", confidence: "high" };
  }
  if (lower.includes("[versions]") && lower.includes("[libraries]")) {
    return { ecosystem: "gradle", confidence: "high" };
  }

  // ---- Gradle (Groovy/Kotlin DSL) ----
  if (
    (lower.includes("dependencies {") || lower.includes("plugins {")) &&
    (lower.includes("implementation") ||
      lower.includes("compileonly") ||
      lower.includes("testimplementation") ||
      lower.includes("classpath"))
  ) {
    return { ecosystem: "gradle", confidence: "high" };
  }

  // ---- Gemfile ----
  if (/^\s*source\s+["']https?:\/\/rubygems\.org/m.test(text) || /^\s*gem\s+["']/m.test(text)) {
    return { ecosystem: "bundler", confidence: "high" };
  }

  // ---- requirements.txt (pip) ----
  // Linhas tipo "pacote==1.2.3", "pacote>=1.0", "pacote~=2.0".
  const pipLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (
    pipLines.length > 0 &&
    pipLines.filter((l) => /^[A-Za-z0-9._-]+\s*(==|>=|<=|~=|!=|>|<)/.test(l) || /^-r\s/.test(l))
      .length >=
      Math.max(1, Math.floor(pipLines.length * 0.5))
  ) {
    return { ecosystem: "pip", confidence: "high" };
  }

  // ---- Legado: procura menções explícitas de tecnologias legadas ----
  if (LEGACY_HINTS.some((h) => lower.includes(h))) {
    return { ecosystem: "legacy", confidence: "medium" };
  }

  return { ecosystem: "unknown", confidence: "low" };
}

/**
 * Sinais de sistema legado. Casar aqui NÃO significa que o plano vira só
 * "legado" — significa que o prompt liga a trava anti-migração de tecnologia,
 * que é justamente a regra de negócio pedida: subir 4.0.0 → 4.0.1 tudo bem,
 * propor reescrever RPG em Java não.
 */
const LEGACY_HINTS = [
  "rpgle",
  "rpg iv",
  "rpg/400",
  "control language",
  "as/400",
  "as400",
  "ibm i",
  "iseries",
  "cobol",
  "vb6",
  "visual basic 6",
  // .vbp é o projeto do VB6 (legado). NÃO confundir com .vbproj, que é
  // VB.NET moderno e resolve pra NuGet — por isso "vbproj" não entra aqui.
  ".vbp",
  "delphi",
  "powerbuilder",
  "pl/sql",
  "forms 6i",
  "oracle forms",
  "clipper",
  "fortran",
];

/**
 * Detecta o ecossistema. `fileName` é opcional e tem prioridade sobre o
 * conteúdo (mais confiável); se ele não resolver, cai na análise do texto.
 */
export function detectManifest(raw: string, fileName?: string | null): DetectionResult {
  const byName = fileName ? detectByFileName(fileName) : null;
  if (byName) {
    return {
      ecosystem: byName,
      label: ecosystemLabel(byName),
      manifestFile: fileName ?? ecosystemManifestFile(byName),
      confidence: "high",
    };
  }

  const { ecosystem, confidence } = detectByContent(raw);
  return {
    ecosystem,
    label: ecosystemLabel(ecosystem),
    manifestFile: ecosystemManifestFile(ecosystem),
    confidence,
  };
}

/** Ecossistemas tratados como legado pela regra anti-migração de tecnologia. */
export function isLegacyEcosystem(ecosystem: UpgradeEcosystem): boolean {
  return ecosystem === "legacy";
}

export interface ExtractedDependency {
  name: string;
  version: string;
}

/**
 * Extração best-effort de dependências, por ecossistema. NÃO substitui a IA
 * — serve pro NoopProvider (organização sem chave de IA configurada) render
 * uma lista útil em vez de um plano vazio, e como sanidade na detecção.
 *
 * Deliberadamente tolerante: manifesto malformado devolve lista vazia em vez
 * de lançar, porque o fluxo não pode quebrar por causa disso.
 */
export function extractDependencies(
  raw: string,
  ecosystem: UpgradeEcosystem,
): ExtractedDependency[] {
  try {
    switch (ecosystem) {
      case "npm":
        return extractFromJsonDeps(raw, ["dependencies", "devDependencies", "peerDependencies"]);
      case "composer":
        return extractFromJsonDeps(raw, ["require", "require-dev"]);
      case "pip":
        return extractPip(raw);
      case "poetry":
        return extractToml(raw);
      case "cargo":
        return extractToml(raw);
      case "bundler":
        return extractGemfile(raw);
      case "maven":
        return extractMaven(raw);
      case "gradle":
        return extractGradle(raw);
      case "go":
        return extractGoMod(raw);
      case "nuget":
        return extractNuGet(raw);
      default:
        return [];
    }
  } catch {
    return [];
  }
}

function extractFromJsonDeps(raw: string, sections: string[]): ExtractedDependency[] {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const out: ExtractedDependency[] = [];
  for (const section of sections) {
    const block = parsed[section];
    if (block && typeof block === "object") {
      for (const [name, version] of Object.entries(block as Record<string, unknown>)) {
        out.push({ name, version: typeof version === "string" ? version : "?" });
      }
    }
  }
  return out;
}

function extractPip(raw: string): ExtractedDependency[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("-"))
    .map((line) => {
      // Remove marcadores de ambiente e comentário inline.
      const clean = line.split(";")[0]!.split("#")[0]!.trim();
      const m = clean.match(/^([A-Za-z0-9._-]+(?:\[[^\]]+\])?)\s*(.*)$/);
      if (!m) return null;
      // "==1.2.3" é pin exato: mostra só "1.2.3". Outros operadores (>=, ~=,
      // <) são faixa de verdade e ficam como estão, porque a informação da
      // faixa importa pra decidir o upgrade.
      const spec = (m[2] ?? "").trim();
      const version = spec.startsWith("==") ? spec.slice(2).trim() : spec;
      return { name: m[1]!, version: version || "sem versão fixada" };
    })
    .filter((d): d is ExtractedDependency => d !== null);
}

function extractToml(raw: string): ExtractedDependency[] {
  const out: ExtractedDependency[] = [];
  let inDeps = false;
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("[")) {
      inDeps = /\[(tool\.poetry\.)?(dev-)?dependencies\]/i.test(t) || /\[dependencies\]/i.test(t);
      continue;
    }
    if (!inDeps || !t || t.startsWith("#")) continue;
    const m = t.match(/^([A-Za-z0-9._-]+)\s*=\s*(.+)$/);
    if (m) {
      out.push({ name: m[1]!, version: m[2]!.replace(/['"]/g, "").trim() });
    }
  }
  return out;
}

function extractGemfile(raw: string): ExtractedDependency[] {
  const out: ExtractedDependency[] = [];
  const re = /^\s*gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push({ name: m[1]!, version: m[2] ?? "sem versão fixada" });
  }
  return out;
}

function extractMaven(raw: string): ExtractedDependency[] {
  const out: ExtractedDependency[] = [];
  const re = /<dependency>([\s\S]*?)<\/dependency>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const block = m[1]!;
    const groupId = block.match(/<groupId>\s*([^<]+?)\s*<\/groupId>/)?.[1];
    const artifactId = block.match(/<artifactId>\s*([^<]+?)\s*<\/artifactId>/)?.[1];
    const version = block.match(/<version>\s*([^<]+?)\s*<\/version>/)?.[1];
    if (artifactId) {
      out.push({
        name: groupId ? `${groupId}:${artifactId}` : artifactId,
        version: version ?? "gerenciada pelo parent/BOM",
      });
    }
  }
  return out;
}

function extractGradle(raw: string): ExtractedDependency[] {
  const out: ExtractedDependency[] = [];
  // implementation 'group:artifact:version' / implementation("group:artifact:version")
  const re =
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|classpath)\s*[\s(]\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const coord = m[1]!;
    const parts = coord.split(":");
    if (parts.length >= 2) {
      out.push({
        name: `${parts[0]}:${parts[1]}`,
        version: parts[2] ?? "gerenciada pelo BOM/catálogo",
      });
    }
  }
  return out;
}

function extractGoMod(raw: string): ExtractedDependency[] {
  const out: ExtractedDependency[] = [];
  // Bloco require ( ... ) e linhas require single.
  const blockMatch = raw.match(/require\s*\(([\s\S]*?)\)/);
  const lines = blockMatch
    ? blockMatch[1]!.split(/\r?\n/)
    : raw.split(/\r?\n/).filter((l) => /^\s*require\s+/.test(l));
  for (const line of lines) {
    const t = line.replace(/^\s*require\s+/, "").trim();
    if (!t || t.startsWith("//")) continue;
    const m = t.match(/^(\S+)\s+(\S+)/);
    if (m) out.push({ name: m[1]!, version: m[2]! });
  }
  return out;
}

function extractNuGet(raw: string): ExtractedDependency[] {
  const out: ExtractedDependency[] = [];
  // <PackageReference Include="X" Version="1.2.3" /> e <package id="X" version="1.2.3" />
  const re =
    /<(?:PackageReference|package)\s+(?:Include|id)\s*=\s*"([^"]+)"[^>]*?(?:Version|version)\s*=\s*"([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push({ name: m[1]!, version: m[2]! });
  }
  // PackageReference sem Version (Central Package Management).
  const reNoVer = /<PackageReference\s+Include\s*=\s*"([^"]+)"(?![^>]*Version)/gi;
  while ((m = reNoVer.exec(raw)) !== null) {
    if (!out.some((d) => d.name === m![1])) {
      out.push({ name: m[1]!, version: "gerenciada centralmente" });
    }
  }
  return out;
}
