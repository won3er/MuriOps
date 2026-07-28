# Elevate QA — Product UI Reference

> Plataforma operacional — superfícies neutras, densidade controlada, navegação
> contextual e um único acento cromático, sem gradiente decorativo.

**Tema:** dark único, fixo (`forcedTheme="dark"` no `ThemeProvider`). Sem
variante light.

## Direção atual

Esta versão segue princípios do **GitHub Primer** sem copiar sua marca ou seus
componentes literalmente: alta densidade com leitura calma, superfícies
separadas por bordas, tipografia predominantemente alinhada à esquerda,
navegação global + contextual e layouts que continuam funcionais em telas
estreitas. A paleta usa a família de superfícies grafite do GitHub como
referência, mas preserva o índigo (`#6366f1`) como assinatura do Elevate QA.

Duas versões anteriores foram descartadas por feedback direto do usuário:

1. **v1 "Signal room"** — fundo mogno/âmbar quente + variante clara. Rejeitada:
   tema claro ficou muito aberto, usuário queria preto e branco.
2. **v2 "Console"** — quase-preto neutro estilo GitHub, mas ainda com laranja
   como acento e um glow radial no fundo. Rejeitada: usuário não queria mais
   nenhum laranja, e classificou o gradiente de fundo como "amador".

**v4 "Platform" (atual)** mantém o fundo sólido e o acento índigo, mas troca a
lógica de “coleção de telas SaaS” por uma arquitetura de sistema: barra global,
navegação agrupada, cabeçalhos consistentes, regiões contextuais e páginas
orientadas a entidades.

## Tokens — Cores

| Nome                     | Valor                  | Token CSS              | Papel                                                |
| ------------------------ | ---------------------- | ---------------------- | ---------------------------------------------------- |
| Canvas                   | `#0d1117`              | `--background`         | Fundo de página                                      |
| Surface                  | `#161b22`              | `--card`               | Cards, barras e painéis                              |
| Control                  | `#21262d`              | `--muted` / `--accent` | Controles e hover                                    |
| Border                   | `#30363d`              | `--border`             | Bordas e divisores                                   |
| Secondary                | `#8b949e`              | `--muted-foreground`   | Texto secundário                                     |
| Foreground               | `#f0f6fc`              | `--foreground`         | Texto primário                                       |
| Índigo (não é do Linear) | `#6366f1`              | `--primary`            | Único acento cromático — CTA, link ativo, foco, logo |
| Alarm                    | mantém `--destructive` | `--destructive`        | Vermelho de erro/severidade alta — não muda          |

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
- **Cores funcionais** aparecem somente quando comunicam estado, risco ou
  prioridade. A identidade principal permanece neutra com acento índigo.

## Mascote

O mascote é um **rato em negativo dentro de um selo circular preto**. A marca
foi desenhada para funcionar como símbolo de uma plataforma técnica: poucos
elementos, geometria forte e leitura preservada em 16–32 px. O rosto branco,
as orelhas laterais compactas e o focinho estreito diferenciam o rato de um
camundongo cartunesco.

Arquivo principal: `public/atlas-rat-logo.png`, com fundo transparente.
Derivações:

- `public/atlas-rat-logo-512.png` — marca usada pelos componentes de produto;
- `public/atlas-rat-icon-180.png` — ícone para superfícies externas;
- `app/icon.png` — favicon de 32 px;
- `app/opengraph-image.tsx` — importa a marca estática na imagem social.

O símbolo substituiu integralmente o antigo texugo em 28/07/2026.

## Página inicial — seção de destaques

A home ganhou uma seção de "pills" (`components/feature-showcase.tsx`) no
mesmo espírito da home do GitHub (Código/Planeje/Colabore/Automatize/Proteja):
cinco abas — Analisar, Projetar, Aplicar, Automatizar, Acompanhar — cada uma
com uma descrição curta e um **screenshot real do produto rodando**
(`public/screens/*.jpg`, capturados da aplicação ao vivo), não uma ilustração
genérica. O rodapé (`components/site-footer.tsx`) ganhou três colunas: guia
rápido de uso, status de cada funcionalidade (Disponível/Beta) e links
institucionais (Termos, Privacidade, Contato).

## Arquitetura de navegação

- **Barra global:** marca, busca, ajuda, notificações e conta.
- **Navegação principal:** agrupada em Workspace, Ciclo de qualidade e
  Plataforma.
- **Contexto de entidade:** breadcrumb, cabeçalho, ações e abas locais.
- **Mobile:** barra compacta e drawer; conteúdo sempre em uma coluna útil.
- **Cards:** usados para entidades ou regiões, não como decoração genérica.

## Histórico

- **v1 "Signal room"** — mogno quente + Ember + variante clara. Rejeitada
  (tema claro muito aberto).
- **v2 "Console"** — preto neutro estilo GitHub + Ember + glow radial sutil.
  Rejeitada (ainda tinha laranja, gradiente considerado "amador").
- **v3 "Instrument"** — escala de cinza real do Linear + acento
  índigo sólido + zero gradiente.
- **v4 "Platform" (atual)** — arquitetura de produto inspirada nos princípios
  do GitHub Primer, nova marca do rato e navegação global/contextual.
