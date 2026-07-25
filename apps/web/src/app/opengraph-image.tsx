import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Elevate QA — Sua equipe de QA, do diagnóstico à correção";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Gera a imagem de Open Graph (og:image/twitter:image) sob demanda, sem
 * precisar de um asset estático. Next.js expõe isso automaticamente em
 * /opengraph-image e injeta a tag <meta property="og:image"> sozinho.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1220",
          backgroundImage:
            "radial-gradient(60% 60% at 50% -10%, rgba(234,88,12,0.38), transparent), radial-gradient(50% 50% at 100% 0%, rgba(251,191,36,0.18), transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 36,
          }}
        >
          <svg width="84" height="84" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8.5" fill="url(#g)" />
            <g fill="#fff" transform="translate(16 16) scale(0.72) translate(-16 -16)">
              <rect x="5" y="6" width="5.5" height="22" rx="2.75" />
              <rect x="5" y="6" width="22" height="5.5" rx="2.75" />
              <rect x="5" y="13.25" width="16" height="5.5" rx="2.75" />
              <rect x="5" y="22.5" width="10.5" height="5.5" rx="2.75" />
            </g>
          </svg>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#f8fafc", display: "flex" }}>
            Elevate&nbsp;<span style={{ color: "#fb923c" }}>QA</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#f8fafc",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Sua equipe de QA, do diagnóstico à correção
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          Analisa UI, performance, SEO, acessibilidade e segurança — e entrega o
          plano de correção pronto para aplicar
        </div>
      </div>
    ),
    { ...size },
  );
}
