# Atualizar prettier de ^3.3.3 para ^3.5.2
**Categoria:** DEPENDENCY_UPGRADE · **Severidade:** Baixo
**Arquivo sugerido:** `package.json`
## Descrição
Risco: Baixo. 1 mudança(s) que quebram compatibilidade.
## Como aplicar
1. Execute o comando `pnpm update prettier -w` para atualizar na raiz do monorepo.
2. Execute `pnpm -r lint` ou `pnpm exec prettier --write .` para reformatar o código com as novas regras caso haja divergências.

Mudanças que quebram compatibilidade:
- Pequenas mudanças no estilo de formatação de código entre versões minor de Prettier.
---
_Aberto automaticamente pelo MuriOps. Esta PR só é aplicada de verdade quando um humano revisa e faz o merge — o MuriOps nunca faz merge sozinho._