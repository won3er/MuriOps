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

/** Bibliotecas JS com CVEs conhecidas abaixo da versão indicada (curadoria mínima, não exaustiva). */
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
];
