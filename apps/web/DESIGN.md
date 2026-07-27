# Elevate QA — Style Reference

> Console — um terminal quase-preto e neutro onde o único ponto de cor é o
> resultado de uma análise ou uma ação a tomar.

**Tema:** dark único, fixo (`forcedTheme="dark"` no `ThemeProvider`). Sem
variante light por enquanto — a primeira versão do sistema ("Signal room",
fundo mogno/âmbar com variante clara) foi descartada por feedback direto do
usuário: o tema claro ficou "muito claro" e ele queria algo mais preto e
branco, no estilo de ferramentas como GitHub.

## Por que esse design

O Elevate QA é usado por gente que já vive dentro de terminais, editores de
código e dashboards de CI — GitHub, Vercel, VS Code. A referência mais direta
pedida pelo usuário foi justamente "estilo GitHub": interface quase
monocromática (preto/cinza/branco), onde cor é reservada só para o que
precisa de atenção — um link ativo, um botão primário, ou (no caso do
Elevate QA) a nota e a severidade de um achado de QA.

Isso significa: nada de gradientes chamativos, nada de fundo colorido, nada
de "identidade visual" competindo com o dado. O laranja "Ember" continua
sendo a cor de marca (logo, CTA principal, foco, link ativo), mas em uma
única intensidade e usado com muita parcimônia — o resto da interface é
neutro.

## Tokens — Cores (dark, único tema)

| Nome | Valor aprox. | Token CSS | Papel |
|------|--------------|-----------|-------|
| Canvas | `#0d1117` | `--background` | Fundo de página — quase-preto neutro (leve frieza azulada, como GitHub dark), não mogno/quente como na v1 |
| Panel | `#161b22` | `--card` | Superfície elevada — cards, modais, painéis |
| Ember | `#e35a26` | `--primary` | Único ponto de cor da marca — CTAs, links ativos, foco, logo. Usado com parcimônia |
| Paper | `#e6edf3` | `--foreground` | Texto primário — quase-branco, levemente frio |
| Seam | `#3a414a` | `--border` | Bordas e divisores — hairline estrutural |
| Fog | `#8b949e` | `--muted-foreground` | Texto secundário, legendas, placeholders |
| Ash | `#21262d` | `--muted` / `--accent` | Fundo sutil para hover, seções secundárias |
| Alarm | mantém `--destructive` | `--destructive` | Vermelho de erro/severidade alta — não muda |

Não existe token de tema claro no momento — `:root` e `.dark` compartilham os
mesmos valores para não haver flash de cor errada antes da hidratação, já
que o app roda sempre com a classe `.dark`.

## Tokens — Tipografia

Mantém a dupla já usada no projeto:

- **Plus Jakarta Sans** — UI, corpo, headings.
- **JetBrains Mono** — dados tabulares (score, ms, status code, seletor CSS),
  via classe `.tabular`.

Headings (`h1`–`h3`) mantêm `letter-spacing: -0.02em` da v1.

## Tokens — Forma

- **Raio base:** `0.75rem` (12px) nos cards e inputs.
- **Pill (`9999px`)** reservado só para badges de severidade/status.
- **Sombra:** mínima ou nenhuma — profundidade vem da diferença de
  luminância entre Canvas/Panel/Ash, não de drop-shadow.

## Atmosfera

Radiais de fundo em `body{}` ficaram bem mais discretos que na v1 (7% e 5%
de opacidade) — um leve halo de Ember no topo e um cinza-azulado muito sutil
no canto, só para não deixar o fundo 100% chapado, sem competir com o
conteúdo.

## Onde isso não muda

- **Cores de severidade/status** (emerald/amber/red/sky do Tailwind)
  continuam — comunicam prioridade, não fazem parte da identidade de marca.
- **Isótipo** (barras ascendentes formando "E") mantém a forma e o gradiente
  Ember introduzido na v1.

## Histórico

- **v1 ("Signal room")** — quase-preto quente (mogno) + Ember + variante
  clara em tom "Linen". Descartada: usuário achou o tema claro muito aberto
  e pediu algo mais preto e branco.
- **v2 ("Console", atual)** — quase-preto neutro estilo GitHub, dark único,
  Ember como único acento de cor.
