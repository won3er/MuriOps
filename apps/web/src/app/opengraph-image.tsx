import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Elevate QA — Sua equipe de QA, do diagnóstico à correção";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Arte do texugo enviada pelo usuário, embutida como base64 (96×96) direto
 * no código-fonte — evita ler arquivo do disco em runtime (o que quebra a
 * geração estática no Windows quando o caminho do projeto tem espaço) e
 * mantém a rota compatível com o runtime edge.
 */
const BADGER_B64 =
  "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";

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
          <img
            src={`data:image/png;base64,${BADGER_B64}`}
            width={84}
            height={84}
            style={{ borderRadius: "9999px" }}
          />
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
