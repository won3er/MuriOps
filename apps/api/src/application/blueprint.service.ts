// [06/08/2026] Pilar "Projetar"/Blueprint removido — ver CLAUDE.md, sessão
// "Corte do pilar Blueprint/Projetar". Decisão de produto: a geração de
// arquitetura a partir de uma descrição solta não usava nenhuma evidência
// real (diferente de Análise/Atualizar/Guardian/Fluxos Críticos), e não
// havia uso registrado da funcionalidade. A Projeção (tarefas → Issues no
// GitHub) foi migrada para operar sobre RemediationPlan (ver
// projection.service.ts) e o roteamento do Atualizar foi trocado por um
// aviso interno (ver upgrade.service.ts / atualizar/[id]/page.tsx).
//
// Arquivo mantido vazio, não apagado fisicamente (sandbox sem `rm`) — rode
// `git rm apps/api/src/application/blueprint.service.ts` no seu terminal
// quando confirmar que nada mais importa daqui.
export {};
