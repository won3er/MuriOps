import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Elevate QA — Eleve a qualidade do seu site com IA";
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
            "radial-gradient(60% 60% at 50% -10%, rgba(20,184,166,0.35), transparent), radial-gradient(50% 50% at 100% 0%, rgba(56,189,248,0.2), transparent)",
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
          <svg width="80" height="80" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8.5" fill="url(#g)" />
            <path
              d="M9.5 13.5 L16 7 L22.5 13.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 19.5 L14 24 L22.5 15.5"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#f8fafc", display: "flex" }}>
            Elevate&nbsp;<span style={{ color: "#2dd4bf" }}>QA</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#f8fafc",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Eleve qualquer site ao nível de uma equipe profissional de QA
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 24,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          Análise automática de UI, UX, performance, SEO, acessibilidade e segurança
        </div>
      </div>
    ),
    { ...size },
  );
}
