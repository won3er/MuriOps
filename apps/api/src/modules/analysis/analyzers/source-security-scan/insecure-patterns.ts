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
  // [07/08/2026] Padrões adicionais inspirados no escopo de SAST do Strix —
  // mesma heurística textual simples do resto do arquivo, sem AST.
  {
    id: "tls-verification-disabled",
    label: "Verificação de certificado TLS desabilitada",
    description:
      "rejectUnauthorized: false (ou NODE_TLS_REJECT_UNAUTHORIZED=0) desativa a validação de certificado TLS — abre a conexão para ataques man-in-the-middle. Nunca desabilite isso fora de um teste local isolado.",
    severity: "CRITICAL",
    regex: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/g,
  },
  {
    id: "weak-hash-for-password",
    label: "Hash fraco (MD5/SHA1) aparentemente usado para senha",
    description:
      "MD5/SHA1 perto de uma variável de senha — esses algoritmos são rápidos demais e vulneráveis a rainbow table/força bruta. Use bcrypt, scrypt ou argon2 para senhas.",
    severity: "HIGH",
    regex: /(md5|sha1)\([^)]*\b(pass(word)?|senha)\b/gi,
  },
  {
    id: "insecure-random-for-token",
    label: "Math.random() usado para gerar token/segredo",
    description:
      "Math.random() não é criptograficamente seguro — previsível o suficiente para ser explorado em token de sessão, reset de senha ou API key. Use crypto.randomBytes/randomUUID.",
    severity: "HIGH",
    regex: /Math\.random\(\)[^;]{0,60}\b(token|secret|senha|password|apikey|api_key)\b/gi,
  },
  {
    id: "path-traversal-fs-user-input",
    label: "Possível path traversal em leitura/escrita de arquivo",
    description:
      "fs.readFile/writeFile/unlink recebendo um caminho montado por concatenação/template — se algum trecho vier de input do usuário sem sanitização (ex.: bloquear \"..\"), permite ler/escrever arquivos fora do diretório esperado.",
    severity: "HIGH",
    regex: /fs\.(readFile|writeFile|unlink|createReadStream)(Sync)?\s*\(\s*(`[^`]*\$\{|["'][^"']*["']\s*\+)/g,
  },
  {
    id: "insecure-deserialization",
    label: "Desserialização insegura",
    description:
      "eval/Function/node-serialize/vm usados para desserializar dados vindos de fora do processo — permite execução remota de código se o payload for controlável pelo atacante.",
    severity: "CRITICAL",
    regex: /\b(node-serialize|unserialize)\s*\.\s*(parse|unserialize)\s*\(/g,
  },
];
