# Elevate QA — Style Reference

> Instrument — cinza-grafite puro, um único acento cromático, sem gradiente
> decorativo.

**Tema:** dark único, fixo (`forcedTheme="dark"` no `ThemeProvider`). Sem
variante light.

## De onde veio

Esta versão usa literalmente a escala de cinza do design system real do
**Linear**, capturado via [styles.refero.design](https://styles.refero.design)
(não é "inspirado em" — os valores hex abaixo são os tokens documentados lá
para o Linear: Void/Carbon/Obsidian/Graphite/Smoke/Fog/Bone/Paper). A cor de
acento não é a do Linear (eles usam um verde-lima elétrico só num botão) —
trocamos por um índigo (`#6366f1`), comum em ferramentas de dev/IA (tags do
próprio Linear, GitHub Copilot, Vercel em alguns contextos) e sem nenhuma
relação com o laranja usado nas duas versões anteriores.

Duas versões anteriores foram descartadas por feedback direto do usuário:

1. **v1 "Signal room"** — fundo mogno/âmbar quente + variante clara. Rejeitada:
   tema claro ficou muito aberto, usuário queria preto e branco.
2. **v2 "Console"** — quase-preto neutro estilo GitHub, mas ainda com laranja
   como acento e um glow radial no fundo. Rejeitada: usuário não queria mais
   nenhum laranja, e classificou o gradiente de fundo como "amador".

**v3 "Instrument" (atual)** corrige os dois pontos: acento trocado para
índigo, e o `body{}` não tem mais nenhum `background-image` — é um flat color
sólido, sem glow, sem gradiente. O logo (isótipo em barras) manteve a forma
mas passou a usar fill sólido em vez de gradiente interno — a filosofia do
Linear é "quase tudo neutro, uma única cor plana quando precisa de ação".

## Tokens — Cores

| Nome (Linear) | Valor | Token CSS | Papel |
|------|-------|-----------|-------|
| Void | `#08090a` | `--background` | Fundo de página — canvas padrão |
| Carbon | `#0f1011` | `--card` | Cards, navs — um degrau acima do canvas |
| Obsidian | `#161718` | `--muted` | Superfícies levemente elevadas |
| Graphite | `#23252a` | `--border` / `--accent` | Bordas, divisores, hover |
| Fog | `#8a8f98` | `--muted-foreground` | Texto secundário, placeholder |
| Paper | `#ffffff` | `--foreground` | Texto primário — branco puro |
| Índigo (não é do Linear) | `#6366f1` | `--primary` | Único acento cromático — CTA, link ativo, foco, logo |
| Alarm | mantém `--destructive` | `--destructive` | Vermelho de erro/severidade alta — não muda |

Sem token de tema claro — app roda sempre com `.dark`.

## Tokens — Tipografia

Mantém a dupla já usada no projeto:

- **Plus Jakarta Sans** — UI, corpo, headings.
- **JetBrains Mono** — dados tabulares (score, ms, status code, seletor CSS),
  via classe `.tabular`.

Headings (`h1`–`h3`) com `letter-spacing: -0.02em` (o Linear real usa
`-0.022em`, ficamos bem próximos).

## Tokens — Forma

- **Raio base:** `0.5rem` (8px) — mais próximo da escala compacta do Linear
  (6px/12px) que o `0.75rem` das versões anteriores.
- **Pill (`9999px`)** reservado só para badges de severidade/status.
- **Sombra:** nenhuma — profundidade vem só da diferença de luminância entre
  Void/Carbon/Obsidian, sem drop-shadow.

## Atmosfera

**Sem gradiente.** `body{}` é `background: hsl(var(--background))` puro,
sem `background-image`. Essa foi a correção mais direta pedida pelo usuário
— nenhum glow radial, nenhum halo de cor no topo da página.

## Onde isso não muda

- **Cores de severidade/status** (emerald/amber/red/sky do Tailwind, e os
  hexs de score em `lib/utils.ts`) continuam — comunicam prioridade, não
  fazem parte da identidade de marca.
- **Isótipo** (barras ascendentes formando "E") mantém a forma exata das
  versões anteriores; só a cor e o fill (sólido, não gradiente) mudaram.

## Mascote

O mascote é um **texugo geométrico em perfil** — orelha e cabeça como
círculos simples, focinho afilado, corpo arredondado. A marca registrada do
bicho, a listra clara que atravessa o rosto escuro (e o olho), é desenhada
como um "recorte": um path na cor de fundo por cima do preenchimento sólido,
a mesma técnica usada antes só pro olho da harpia, agora reaproveitada pra
listra inteira. Isso faz a peça funcionar em qualquer contexto — cutout na
cor do background no isótipo solto, cutout na cor índigo dentro do selo —
sem precisar de gradiente. Formas bem separadas, fáceis de ler mesmo em
24px, no espírito do Octocat do GitHub. Desenhado numa grade 0–200 (círculos
e paths simples) e escalado (`scale(0.16)`) pro viewBox 32×32 do resto do
app. Fill sólido em índigo (`#6366f1`). Formas em `components/logo.tsx`
(`isotypeShape()` pro corpo, `isotypeCutout()` pra listra/olho),
reaproveitadas em `icon.svg` e `opengraph-image.tsx`.

Trocou o mascote anterior (harpia) por pedido direto do usuário, que mandou
uma referência visual de um texugo em círculo preto/branco — mesmo espírito
de isótipo geométrico simples, bicho diferente.

## Página inicial — seção de destaques

A home ganhou uma seção de "pills" (`components/feature-showcase.tsx`) no
mesmo espírito da home do GitHub (Código/Planeje/Colabore/Automatize/Proteja):
cinco abas — Analisar, Projetar, Aplicar, Automatizar, Acompanhar — cada uma
com uma descrição curta e um **screenshot real do produto rodando**
(`public/screens/*.jpg`, capturados da aplicação ao vivo), não uma ilustração
genérica. O rodapé (`components/site-footer.tsx`) ganhou três colunas: guia
rápido de uso, status de cada funcionalidade (Disponível/Beta) e links
institucionais (Termos, Privacidade, Contato).

## Histórico

- **v1 "Signal room"** — mogno quente + Ember + variante clara. Rejeitada
  (tema claro muito aberto).
- **v2 "Console"** — preto neutro estilo GitHub + Ember + glow radial sutil.
  Rejeitada (ainda tinha laranja, gradiente considerado "amador").
- **v3 "Instrument" (atual)** — escala de cinza real do Linear + acento
  índigo sólido + zero gradiente.
