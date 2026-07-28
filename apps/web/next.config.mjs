const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@qa-ai/shared"],
  // Não expõe "X-Powered-By: Next.js" — evita fingerprint fácil de versão.
  poweredByHeader: false,
  webpack: (config) => {
    // O pacote @qa-ai/shared usa extensões .js nos imports (necessário p/ o
    // backend NodeNext). Permite ao webpack resolvê-las para .ts/.tsx.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  // Headers de segurança aplicados a toda página — mesma checklist que o
  // módulo de Segurança Avançada cobra nos sites analisados.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // 'unsafe-inline'/'unsafe-eval' em script-src são necessários pra
            // hidratação do Next.js funcionar; frame-ancestors 'none' já
            // cobre clickjacking (mais forte que X-Frame-Options sozinho).
            // accounts.google.com liberado em script-src/connect-src/frame-src
            // pro botão "Entrar com Google" (Google Identity Services carrega
            // um script de terceiro e renderiza o botão dentro de um iframe
            // deles) — sem isso o CSP bloqueia silenciosamente o script e o
            // botão nunca aparece (bug encontrado e corrigido em 28/07/2026).
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ${apiUrl} https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
