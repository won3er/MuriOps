/**
 * Padrões de segredo commitado no código-fonte. Cada regex é deliberadamente
 * específica (prefixo/formato conhecido do provedor) para minimizar falso
 * positivo — uma varredura de segurança que grita alarme falso o tempo todo
 * é ignorada pelo usuário, o que é pior do que não ter a checagem.
 */
export interface SecretPattern {
  id: string;
  label: string;
  regex: RegExp;
}

export const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: "aws-access-key",
    label: "Chave de acesso AWS (AKIA...)",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    id: "aws-secret-key",
    label: "Possível chave secreta AWS",
    regex: /aws(.{0,20})?(secret|access)?[_-]?key(.{0,20})?[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/gi,
  },
  {
    id: "private-key-block",
    label: "Bloco de chave privada (PEM)",
    regex: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: "google-api-key",
    label: "Chave de API do Google",
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
  },
  {
    id: "stripe-key",
    label: "Chave de API da Stripe",
    regex: /\b(sk|rk)_(live|test)_[0-9a-zA-Z]{16,}\b/g,
  },
  {
    id: "slack-token",
    label: "Token do Slack",
    regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
  },
  {
    id: "github-token",
    label: "Token de acesso do GitHub",
    regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  },
  {
    id: "jwt",
    label: "JSON Web Token embutido",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: "generic-api-key-assignment",
    label: "Possível chave/segredo em variável (atribuição direta)",
    regex: /(api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{16,}["']/gi,
  },
  {
    id: "db-connection-string-with-password",
    label: "String de conexão de banco com senha embutida",
    regex: /(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/[^:\s"']+:[^@\s"']+@/gi,
  },
];

/** Nomes de variável comuns o bastante que geram muito falso positivo em placeholders/exemplos. */
const PLACEHOLDER_VALUE_HINTS = [
  "xxxxx",
  "changeme",
  "your_api_key",
  "your-api-key",
  "example",
  "placeholder",
  "<key>",
  "${",
  "process.env",
  "os.environ",
];

export function looksLikePlaceholder(matchedText: string): boolean {
  const lower = matchedText.toLowerCase();
  return PLACEHOLDER_VALUE_HINTS.some((h) => lower.includes(h));
}
