import { ImageResponse } from "next/og";
import ratLogo from "../../public/atlas-rat-logo-negative-512.png";

export const runtime = "edge";
export const alt =
  "MuriOps — Gestão de qualidade digital, do diagnóstico à correção";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Gera a imagem de compartilhamento com a mesma marca usada pelo produto.
 * O import estático mantém o asset disponível também no runtime edge.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d1117",
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
        <img src={ratLogo.src} width={88} height={88} alt="" />
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#f0f6fc",
            display: "flex",
          }}
        >
          Muri<span style={{ color: "#7c81ff" }}>Ops</span>
        </div>
      </div>
      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: "#f0f6fc",
          textAlign: "center",
          maxWidth: 920,
          lineHeight: 1.25,
        }}
      >
        Gestão de qualidade digital, do diagnóstico à correção
      </div>
      <div
        style={{
          marginTop: 28,
          fontSize: 24,
          color: "#8b949e",
          textAlign: "center",
          maxWidth: 880,
        }}
      >
        Analise, projete, aplique e orquestre a evolução dos seus produtos
        digitais
      </div>
    </div>,
    { ...size },
  );
}
