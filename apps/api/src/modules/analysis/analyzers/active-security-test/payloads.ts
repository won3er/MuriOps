/**
 * Payloads canônicos de detecção — pequenos, não-destrutivos, o suficiente
 * pra revelar um comportamento (erro de SQL, reflexão sem escape) sem tentar
 * de fato explorar nada (sem UPDATE/DELETE, sem tentar RCE). Lista curta e
 * curada de propósito: isso é auditoria, não uma wordlist de ataque real.
 */
export const DETECTION_PAYLOADS: { label: string; value: string }[] = [
  { label: "sqli-quote", value: "qa-probe' OR '1'='1" },
  { label: "sqli-comment", value: "qa-probe'--" },
  { label: "xss-marker", value: '<script>/*qa-probe*/</script>' },
  { label: "path-traversal", value: "../../../../etc/passwd" },
  { label: "template-injection", value: "${7*7}{{7*7}}" },
];

/** Assinaturas de erro de banco de dados vazando na resposta (indício de SQLi). */
export const SQL_ERROR_SIGNATURES: RegExp[] = [
  /you have an error in your sql syntax/i,
  /warning:\s*mysqli?_/i,
  /unclosed quotation mark after the character string/i,
  /quoted string not properly terminated/i,
  /ORA-\d{5}/,
  /PostgreSQL.*ERROR/i,
  /SQLSTATE\[\w+\]/,
  /pg_query\(\)/i,
  /sqlite3\.OperationalError/i,
];

/** Assinaturas de stack trace de servidor vazando (indício de erro não tratado). */
export const STACK_TRACE_SIGNATURES: RegExp[] = [
  /at\s+\S+\s+\(.+:\d+:\d+\)/,
  /node_modules[\\/]/,
  /Traceback \(most recent call last\)/,
  /Fatal error:.*on line \d+/i,
];
