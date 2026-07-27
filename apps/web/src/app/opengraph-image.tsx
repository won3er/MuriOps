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
            <g fill="#fff" transform="scale(0.32)">
              <polygon points="22,22 28,2 36,20" />
              <polygon points="32,20 42,6 46,22" />
              <circle cx="30" cy="30" r="13" />
              <path d="M19,29 Q4,34 17,45 Q27,40 22,31 Z" />
              <path d="M22,38 Q14,50 20,64 Q26,82 46,90 Q60,94 70,84 L62,78 L72,86 L66,74 L78,80 L70,66 L80,70 L72,56 Q76,46 68,40 Q58,28 42,30 Q32,26 22,38 Z" />
            </g>
            <circle cx="8.6" cy="8.3" r="0.7" fill="#6366f1" />
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
