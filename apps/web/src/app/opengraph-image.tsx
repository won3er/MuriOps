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
          <div
            style={{
              display: "flex",
              width: 72,
              height: 72,
              borderRadius: 16,
              background: "#14b8a6",
              color: "#0b1220",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            E
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: "#f8fafc" }}>
            Elevate QA
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
