/** Caminhos comuns onde segredos/config vazam por erro de deploy. Só GET, leitura. */
export const SECRET_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  ".git/config",
  ".git/HEAD",
  ".aws/credentials",
  "wp-config.php.bak",
  "config.php.bak",
  "id_rsa",
  ".ssh/id_rsa",
  "credentials.json",
  "secrets.json",
  "appsettings.json",
];

export const BACKUP_PATHS = [
  "backup.sql",
  "database.sql",
  "dump.sql",
  "backup.zip",
  "site.zip",
  "backup.tar.gz",
  "www.zip",
  "backup.old",
  "index.php.bak",
  "error.log",
  "debug.log",
  "npm-debug.log",
];

export const API_DOCS_PATHS = [
  "swagger.json",
  "swagger-ui.html",
  "api-docs",
  "openapi.json",
  "graphql",
];

export const ADMIN_PATHS = ["phpmyadmin", "adminer.php", "wp-admin"];

export const DIR_LISTING_PATHS = ["images/", "uploads/", "assets/", "files/", "static/"];

/**
 * Bibliotecas JS com CVEs conhecidas abaixo da versão indicada (curadoria
 * mínima, não exaustiva — checagem 100% passiva: só lê a versão que a
 * própria lib expõe em runtime via `window`, não baixa nem executa nada).
 */
export const VULNERABLE_JS_LIBS: {
  name: string;
  globalCheck: string;
  versionProp: string;
  belowVersion: string;
  cve: string;
}[] = [
  {
    name: "jQuery",
    globalCheck: "jQuery",
    versionProp: "fn.jquery",
    belowVersion: "3.5.0",
    cve: "CVE-2020-11022/11023 (XSS via .html()/.htmlPrefilter())",
  },
  {
    name: "Lodash",
    globalCheck: "_",
    versionProp: "VERSION",
    belowVersion: "4.17.21",
    cve: "CVE-2020-8203/CVE-2021-23337 (prototype pollution / command injection via template)",
  },
  {
    name: "Moment.js",
    globalCheck: "moment",
    versionProp: "version",
    belowVersion: "2.29.4",
    cve: "CVE-2022-31129 (ReDoS no parsing de datas)",
  },
  {
    name: "AngularJS",
    globalCheck: "angular",
    versionProp: "version.full",
    belowVersion: "1.8.0",
    cve: "CVE-2020-7676 (bypass de sandbox / template injection)",
  },
  {
    name: "Bootstrap",
    globalCheck: "bootstrap",
    versionProp: "Tooltip.VERSION",
    belowVersion: "4.3.1",
    cve: "CVE-2019-8331 (XSS via opção data-template/data-content de tooltip/popover)",
  },
];

/**
 * Fingerprint passivo de tecnologia de servidor via header ou meta tag —
 * versão declarada abaixo de `belowVersion` é reportada como potencialmente
 * vulnerável/EOL. Igualmente passivo: só lê o que o próprio site expõe.
 */
export const SERVER_TECH_FINGERPRINTS: {
  name: string;
  belowVersion: string;
  note: string;
}[] = [
  {
    name: "WordPress",
    belowVersion: "6.4.0",
    note: "Versões antigas do core WordPress acumulam múltiplos CVEs corrigidos em releases mais novas — atualize o core e confira plugins/temas separadamente.",
  },
  {
    name: "PHP",
    belowVersion: "8.1.0",
    note: "Versões de PHP anteriores à 8.1 estão fora do ciclo de suporte oficial (sem patch de segurança) ou perto do fim dele — https://www.php.net/supported-versions.php.",
  },
];
