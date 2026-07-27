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
          background: "#08090a",
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
            <rect width="32" height="32" rx="7" fill="#6366f1" />
            <g fill="#fff" transform="scale(0.16)">
              <circle cx="58" cy="48" r="19" />
              <circle cx="80" cy="92" r="42" />
              <path d="M108,78 C130,82 152,96 160,112 C163,119 160,124 153,123 C138,121 118,110 104,98 Z" />
              <path d="M50,122 C34,134 28,157 36,182 C46,207 74,220 105,217 C136,214 158,197 158,172 C132,180 104,174 88,160 C72,146 60,134 50,122 Z" />
            </g>
            <g fill="#6366f1" transform="scale(0.16)">
              <path d="M60,60 C50,80 52,106 68,127 L87,119 C73,99 71,78 81,62 Z" />
              <circle cx="92" cy="86" r="5" />
            </g>
          </svg>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#ffffff", display: "flex" }}>
            Elevate&nbsp;<span style={{ color: "#6366f1" }}>QA</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#ffffff",
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
            color: "#8a8f98",
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
