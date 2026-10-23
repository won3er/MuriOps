# MuriOps

Gestão contínua de qualidade digital: uma plataforma que analisa sites como uma equipe de QA faria e transforma os problemas encontrados em um plano de correção aplicável.

## Para quem é
Times de produto, agências e desenvolvedores que precisam manter sites e sistemas web com qualidade, segurança e bom desempenho, sem montar uma equipe de QA dedicada.

## O que faz
- **Diagnóstico de QA**: navega pelo site, testa páginas e fluxos e avalia interface, experiência de uso, desempenho, SEO, acessibilidade, console e rede, com nota por dimensão.
- **Análise de segurança**: verificação passiva de exposição, configurações e bibliotecas vulneráveis; varredura do repositório (segredos, dependências vulneráveis, Dockerfile, Terraform e Kubernetes); e teste ativo opcional, só com autorização registrada do dono do site.
- **Planos de ação**: transforma os achados em um checklist de correção aplicável por PDF, por link para a IA de desenvolvimento do usuário (Claude Code, Cursor, Windsurf) ou abrindo um Pull Request/Merge Request no GitHub ou GitLab, com sugestão automática de correção.
- **PR Security Reviews**: comenta automaticamente em cada Pull Request/Merge Request os riscos de segurança dos arquivos alterados.
- **Atualizar**: gera um plano de atualização de dependências para vários ecossistemas (npm, pip, Maven, Go, Cargo e outros), avaliando se o projeto está pronto para receber a atualização.
- **Monitoramento contínuo**: sugere as páginas críticas (login, checkout, contato) e verifica de tempos em tempos se continuam funcionando, avisando por e-mail quando algo quebra.
- **Reconciliação e relatório**: mostra se a última análise já foi corrigida e gera um relatório de autoavaliação do projeto.
- **Conexão com GitHub e GitLab** por login direto, e uso da chave de IA do próprio cliente (Claude, OpenAI, Gemini e outras), com troca automática entre chaves.

## Telas

**Visão geral: saúde do projeto e próximo passo**

![Visão geral](images/centro-de-comando.jpg)

**Diagnóstico com nota por dimensão e resumo da IA**

![Diagnóstico](images/diagnostico.jpg)

**Achados de todos os projetos, por severidade**

![Achados](images/achados.jpg)

**Plano de ação aplicável, com correção via GitHub**

![Plano de ação](images/plano-de-acao.jpg)

**Fluxos críticos monitorados**

![Fluxos críticos](images/fluxos-criticos.jpg)

As telas usam dados fictícios de demonstração.

---

Este repositório é uma **vitrine** do projeto: mostra o que o sistema faz e como ele é na interface. O código-fonte não é público.

Desenvolvido por [@won3er](https://github.com/won3er).