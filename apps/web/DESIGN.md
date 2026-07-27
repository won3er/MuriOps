# Elevate QA — Style Reference
> Signal room — um console de engenharia quase-preto e quente onde cada achado de QA vira um sinal que acende.

**Tema:** dark (padrão) com variante light. Ambos usam a mesma lógica de tokens.

## Por que esse design

O Elevate QA é uma ferramenta técnica (crawler + IA analisando UI/UX, performance,
SEO, acessibilidade, segurança) usada por gente que já vive dentro de terminais e
dashboards escuros — GitHub, Vercel, consoles de CI. O design precisa ter essa
mesma credibilidade "instrumento de verdade", mas sem copiar a paleta fria
azul-acinzentada que praticamente toda ferramenta dev usa (GitHub, Linear, Vercel
são todos variações do mesmo azul-marinho).

A saída: manter a atmosfera escura e densa de dado técnico, mas trocar o
sub-tom frio por um **quase-preto quente** (mogno/carvão, não azul-marinho) e usar
como cor de assinatura um **âmbar profundo** — não o laranja genérico que o app já
tinha, um tom mais rico e mais vermelho, que remete a brasa/calor e conecta
direto com o nome "Elevate" e o isótipo (barras subindo — gráfico de elevação).
Um verde-sinal desaturado (mais teal que os verdes puros de ferramentas de QA
como Sauce Labs) marca "tudo certo"; os alertas usam os tons de severidade que
já existem no produto (âmbar/vermelho), sem inventar um sistema novo.

Não é cópia de nenhuma referência específica — é uma combinação própria
(quase-preto quente + âmbar rico + teal-sinal) que nenhuma delas usa exatamente
assim, informada por: a profundidade atmosférica de consoles dev escuros, a
disciplina de "uma cor de ação só" de plataformas de QA/teste, e a confiança
tipográfica preto-no-branco de produtos de pesquisa/IA.

## Tokens — Cores (dark, padrão)

| Nome | Valor | Token CSS | Papel |
|------|-------|-----------|-------|
| Void | `#141110` | `--background` | Fundo de página, canvas primário — quase-preto com sub-tom quente de carvão/mogno, não azul |
| Ember | `#e35a26` | `--primary` | Cor de ação e marca — âmbar profundo/vermelho-alaranjado, usada com parcimônia (CTAs, links ativos, foco, logo) |
| Paper | `#f6f1e9` | `--foreground` | Texto primário — branco quente, nunca branco puro sobre o Void |
| Panel | `#1f1a16` | `--card` | Superfície elevada — cards, modais, painéis de navegação |
| Seam | `#3a312a` | `--border` | Bordas e divisores — hairline estrutural, sem ornamento |
| Fog | `#a89c8f` | `--muted-foreground` | Texto secundário, legendas, placeholders |
| Ash | `#26201b` | `--muted` | Fundo sutil para seções secundárias, hover discreto |
| Signal | `#35b78c` | (uso pontual) | Verde-sinal para estado positivo/sucesso — mais teal que verde puro, para não repetir o verde-neon de plataformas de teste |
| Alarm | mantém `--destructive` atual | `--destructive` | Vermelho de erro/severidade alta — já calibrado, não muda |

## Tokens — Cores (light)

| Nome | Valor | Token CSS | Papel |
|------|-------|-----------|-------|
| Linen | `#faf6ef` | `--background` | Fundo — papel quente, não cinza-azulado |
| Card | `#ffffff` | `--card` | Superfícies elevadas |
| Ink | `#211a15` | `--foreground` | Texto primário — quase-preto quente |
| Ember | `#d94f1c` | `--primary` | Mesma família do dark, ajustada pra contraste em fundo claro |
| Seam | `#e6dccf` | `--border` | Bordas |
| Fog | `#7d7266` | `--muted-foreground` | Texto secundário |

## Tokens — Tipografia

Mantém a dupla já usada no projeto (deliberadamente evita Inter/Space Grotesk,
o par-padrão de todo produto de IA):

- **Plus Jakarta Sans** — UI, corpo, headings. Humanista, geométrica o
  suficiente pra parecer técnica sem virar fria.
- **JetBrains Mono** — dados tabulares (score, ms, status code, seletor CSS).
  Aplicada via classe `.tabular` já existente.

Ajuste novo: headings (`h1`–`h3`) ganham `letter-spacing: -0.02em` e peso 600+,
pra dar mais presença editorial ao número/score que costuma abrir cada tela —
hoje o type scale é uniforme demais.

## Tokens — Forma

- **Raio base:** `0.75rem` (12px) nos cards e inputs — um ponto mais confiante
  que o `0.625rem` genérico atual, sem virar squircle.
- **Pill (`9999px`) reservado só pra badges de severidade/status** (Baixa/Média/Alta,
  Pronta/Concluída, etc.) — isso cria uma linguagem visual consistente: "formato
  pílula = sinal/estado", nunca decorativo em outro lugar.
- **Sombra:** mínima ou nenhuma — profundidade vem da diferença de luminância
  entre Void/Panel/Ash, não de drop-shadow.

## Atmosfera

Mantém os radiais de fundo já existentes em `body{}`, recalibrados pro Ember
novo — halo quente vindo do topo, bem sutil (12% opacidade), pra não competir
com o conteúdo.

## Onde isso não muda

- **Cores de severidade/status** já usadas em badges (emerald/amber/red/sky do
  Tailwind) continuam — já fazem o trabalho de comunicar prioridade e não fazem
  parte da identidade de marca, só da linguagem de dados.
- **Isótipo** (barras ascendentes formando "E") mantém a forma; só o gradiente
  interno passa a usar o Ember novo em vez do laranja genérico anterior.
