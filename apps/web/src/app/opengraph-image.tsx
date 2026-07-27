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
  "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//+gcGrlUrCcFip5hIZtEgZJISImo333XnnTTfe+Id/+Eee72/YsP6f/unhq7dtnZ6ZueWnf/q++z/7wAN//cl7Pzk8MvzAAw/0dPdsv2Z74PuHDx/+6wce6O/vv3LTpuMnTmy+crMQdOzY8S996S/e//5fLJVKH/nIR5pR89577w3DcGpy8hvf+MZbbrhhanLylz/wgS98/vP33Xf/V77ywN13350kqdbq+uuu//rXv/7JT95b6+qJ4/l16//d0PD2anXVjic/1dt3RVfXyv37vvL03j91nJD5rLCDF6ZFziBrreN6333ou5/73OfuuONdt976Ntd1EXHNmjWe683NzV199bY1q9e84Q2v/8HDD99044233PLTN99004EDBy+77DIhRBiGo6Ojy5ctC4Lg5ptvdj33vvvuS5L42LGjY2Njt91220Pfeei9731fX1/fL7z//U/teGpoaLhSqWqt4zi+6aabpSNHhoduvOGGufm5W2+9lUg0m3XHKY2Pv/2bf3/Hgf1/OT5+W57Nf+Pv3rlm7XuEcBfNHVjKDIqj5rvedccb3/hGRHr88Ue3bNkShuHExERvby8A7Nmz95577rn//vuiKPriF7/0mtdc098/sHHjxq9+9asbr7gi8INdu3enSbJt29aDBw8yw99+/W9vv/32EydO3HXXXSMjox/7jx9N0yyKop27dr1q8+bHHnv8nnvuvu7663/9wx8eHh7u7u7+xCc+cfXVr77//vs++MEPfuGLX+zvH/jUp37/qm2/FYajlcolzz7zp319V7pueWrqiSef+P2lzKDFq3kiJ2rOXXrpGiHk448/tWr1unK59MwzTw8MDFUqlaNHj8zP17u6ulatGn/88ceFLK0av/hXPvSLn/3snxw+dEBIPH78ZF9f7RO/c++9935q79NPT5w4eullG13X27VrZ5JEG9a/qlRynt33dL1e37LlqqNHj05MTKRpOjp60cjI8MaNlz/44LcmJ0826nPVatcVm65cdcn4Zz97fxAGXd2XpclkHB93ve5yednU5CNC+Az2hWA7PyIGJXHU23dxd8/2LJudnnowjhIAcD03z3IAEBIQQSsorjdv+dhjj36mt1slaTI3Gwdhv1Jzq1bfavXje/bsAIBSuRw1mwAQhCWts+UrfibLGkcOfa1U6YoacwDg+S4ip4k69QsJkBKMQWA2F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";

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
