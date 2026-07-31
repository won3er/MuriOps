/**
 * Padrões de código inseguro — heurísticas textuais simples (não é um AST
 * linter). Cada uma é um cheiro conhecido de vulnerabilidade comum, restrito
 * a extensões de código de verdade (ver `CODE_EXTENSIONS` no orquestrador)
 * para não disparar em markdown/config de exemplo.
 */
export interface InsecurePattern {
  id: string;
  label: string;
  description: string;
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  regex: RegExp;
}

export const INSECURE_PATTERNS: InsecurePattern[] = [
  {
    id: "eval-usage",
    label: "Uso de eval()",
    description:
      "eval() executa string como código arbitrário — se a string incluir qualquer dado vindo do usuário, é execução remota de código. Evite eval(); use JSON.parse ou uma alternativa segura para o caso de uso.",
    severity: "HIGH",
    // Exclui $eval()/$$eval() do Playwright (locator.$eval, page.$$eval) —
    // homônimo de nome, mas roda código dentro do browser controlado pelo
    // próprio teste, não é o eval() global perigoso do Node. O caractere
    // imediatamente antes de "eval" nesses casos é sempre "$".
    regex: /(?<!\$)\beval\s*\(/g,
  },
  {
    id: "dangerously-set-inner-html",
    label: "dangerouslySetInnerHTML sem sanitização visível",
    description:
      "dangerouslySetInnerHTML injeta HTML bruto no DOM — se o conteúdo vier de input do usuário sem passar por um sanitizador (ex.: DOMPurify), é uma XSS armazenada/refletida.",
    severity: "MEDIUM",
    regex: /dangerouslySetInnerHTML\s*=\s*\{\{\s*__html:\s*(?!.*(?:DOMPurify|sanitize|purify))/gi,
  },
  {
    id: "sql-string-concat",
    label: "Possível SQL montado por concatenação de string",
    description:
      "Uma query SQL parece montada por concatenação/template string em vez de parâmetro bindado (prepared statement). Se algum trecho vier de input do usuário, é SQL Injection. Use query parametrizada/ORM.",
    severity: "CRITICAL",
    regex: /(SELECT|INSERT|UPDATE|DELETE)[^`'"]{0,200}(\+|\$\{)[^`'"]{0,80}(FROM|WHERE|VALUES|SET)/gi,
  },
  {
    id: "cors-wildcard-credentials",
    label: "CORS com origem coringa em código de servidor",
    description:
      "Access-Control-Allow-Origin definido como \"*\" (ou refletindo qualquer origem) no código do servidor. Combinado com credenciais, permite que qualquer site leia respostas autenticadas do usuário.",
    severity: "MEDIUM",
    regex: /access-control-allow-origin["']?\s*[:=]\s*["']\*["']/gi,
  },
  {
    id: "child-process-exec-with-concat",
    label: "Execução de comando de shell com entrada concatenada",
    description:
      "exec()/execSync() do Node recebendo uma string montada por concatenação/template — se algum trecho vier de input do usuário, é Command Injection. Prefira execFile/spawn com argumentos em array.",
    severity: "CRITICAL",
    regex: /\b(exec|execSync)\s*\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/g,
  },
  {
    id: "hardcoded-jwt-secret-fallback",
    label: "Segredo de JWT com valor padrão fixo no código",
    description:
      "jwt.sign/verify com um segredo que tem um fallback fixo hardcoded (ex.: `process.env.JWT_SECRET || \"algum-valor\"`). Se a variável de ambiente não estiver configurada em produção, qualquer um pode forjar tokens válidos usando o valor público do código-fonte.",
    severity: "HIGH",
    regex: /jwt\.(sign|verify)\([^)]*\|\|\s*["'][^"']{4,}["']/g,
  },
];
