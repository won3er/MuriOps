# Elevate QA — Guia do Produto

*O que é, para que serve e como usar. Sem jargão técnico.*

---

## Em uma frase

O Elevate QA olha para um site como se fosse um especialista em qualidade,
aponta tudo o que está errado, e entrega o conserto pronto — do diagnóstico
até a correção aplicada.

---

## O problema que ele resolve

Hoje, quando alguém quer saber se um site está bem feito, o caminho normal é:

1. Contratar (ou ser) um especialista em QA para testar o site à mão.
2. Receber um relatório com dezenas de problemas.
3. Traduzir esse relatório em tarefas para o time de desenvolvimento.
4. Esperar. Cobrar. Esperar mais.
5. Testar de novo para ver se foi corrigido — e descobrir que metade não foi.

Isso é lento, caro, e depende de gente sênior fazendo trabalho repetitivo.

**O Elevate QA automatiza esse ciclo inteiro.** Ele encontra os problemas,
explica cada um em português claro, gera o passo a passo da correção, e — se
você quiser — aplica a correção sozinho e testa de novo para confirmar.

---

## Para quem serve

| Perfil | Como usa |
|---|---|
| **Agência / freelancer** | Roda uma análise no site do cliente e entrega um relatório profissional em PDF. Vira argumento de venda e serviço recorrente. |
| **Dono de site ou loja** | Descobre por que o site está lento, mal ranqueado no Google ou perdendo venda — sem precisar entender de código. |
| **Time de desenvolvimento** | Usa como QA automatizado: analisa, gera o plano, e a própria IA de desenvolvimento do time (Claude Code, Cursor, Windsurf) aplica as correções. |
| **Consultoria / auditoria** | Roda a Análise de Segurança e entrega um laudo com as vulnerabilidades encontradas. |
| **Empresa com sistema legado** | Usa o "Atualizar" para planejar a atualização de dependências antigas sem quebrar o que está em produção. |

---

## As seis funcionalidades

O produto tem seis seções no menu. Cada uma resolve uma parte do ciclo.

### 1. Projetos — seu painel

É onde você cadastra os sites que quer acompanhar.

**Para que serve:** ter uma visão geral. Quantas análises já rodaram, qual foi
a última nota, quando foi a última verificação.

**Como usar:** cadastre um projeto com nome e endereço do site. Pronto. A
partir daí ele aparece como opção nas outras seções.

> Projetos é só o painel administrativo. As análises e correções acontecem nas
> seções seguintes.

---

### 2. Análise — o diagnóstico

É o coração do produto. Ele abre o site num navegador de verdade, navega pelas
páginas como um usuário faria, e examina tudo.

**O que ele verifica:**

- **Interface (UI)** — elementos quebrados, sobrepostos, fora do lugar
- **Experiência (UX)** — navegação confusa, falta de menu, fluxos incompletos
- **Performance** — o que está deixando o site lento e por quê
- **SEO** — o que impede o site de ranquear bem no Google
- **Acessibilidade** — barreiras para pessoas com deficiência
- **Segurança** — configurações inseguras, cabeçalhos ausentes
- **Console e rede** — erros que só aparecem "por baixo do capô"

**Dois tipos de análise:**

- **Análise QA padrão** — a verificação completa de qualidade
- **Análise de Segurança** — auditoria mais profunda e específica: certificado
  do site, arquivos sensíveis expostos, backups esquecidos no servidor, painéis
  administrativos acessíveis, senhas em lugares errados

**Como usar:** escolha o projeto, escolha o tipo de análise, e rode. Em alguns
minutos você recebe uma nota de 0 a 100 (geral e por categoria) e a lista de
problemas encontrados — cada um com print da tela, explicação do impacto e
sugestão de correção.

**O diferencial:** a IA revisa os achados antes de te mostrar. Se um problema
detectado for falso positivo, ela marca como "ignorado" em vez de te fazer
perder tempo. E você pode reverter se discordar.

---

### 3. Projetar — planejamento antes de existir

Serve para quando o site ou sistema **ainda não existe**.

**Para que serve:** você descreve o que quer construir, e a IA devolve um plano
técnico completo — que arquitetura usar, quais tecnologias, como testar, quais
riscos existem, o que precisa estar pronto em cada etapa.

**Como usar:** descreva o projeto (por texto livre, por formulário guiado, ou
desenhando os componentes), e receba o plano. Depois pode mandar esse plano
direto para a Aplicação.

---

### 4. Aplicação — a correção

Aqui os problemas viram um **plano de correção acionável**: uma lista de tarefas,
cada uma com o que fazer, onde fazer e como fazer.

**Três formas de aplicar:**

**a) Manualmente** — baixe o PDF e siga a lista. Vá marcando o que foi feito.

**b) Pela sua IA de desenvolvimento** — o Elevate QA gera um "pacote de
instruções" que você entrega para o Claude Code, Cursor ou Windsurf. A IA lê a
lista, faz as correções no seu código, e vai marcando cada item como concluído.
A tela do Elevate QA atualiza em tempo real conforme ela trabalha.

> Isso funciona sem você precisar pagar API nenhuma do Elevate QA — usa a IA que
> você já tem.

**c) Automaticamente na sua plataforma** — se seu site é WordPress, Shopify, ou
está hospedado em qualquer lugar com acesso a arquivo (Hostinger, Hostgator,
cPanel), o Elevate QA se conecta e registra as correções lá diretamente. No
GitHub, ele abre uma Pull Request com o checklist.

> Importante: nas correções automáticas, o Elevate QA **nunca publica nem faz
> merge sozinho**. Ele deixa tudo pronto em rascunho, esperando uma pessoa
> revisar e aprovar. Isso é proposital.

**Conexões e integrações** também ficam aqui — é onde você conecta o GitHub, o
WordPress, a Shopify ou o FTP do seu servidor.

---

### 5. Orquestração — o ciclo automático

É o Elevate QA trabalhando sozinho, em loop.

**Como funciona o ciclo:**

```
Analisa → Avalia se passou nos critérios de qualidade
        → Se não passou: gera o plano de correção
        → Aplica as correções
        → Analisa de novo
        → Repete até passar (ou até o limite de tentativas)
```

**Para que serve:** em vez de você rodar análise, gerar plano, aplicar e
reanalisar manualmente a cada rodada, ele faz esse ciclo inteiro. Você acompanha
o progresso por uma linha do tempo de eventos.

**Como usar:** escolha o projeto, defina quantas rodadas no máximo, escolha por
onde aplicar (GitHub, WordPress, sua IA de desenvolvimento...) e inicie.

**Três níveis de autonomia:**

- **Manual** — para a cada rodada e espera sua aprovação antes de continuar.
- **Supervisionado** — segue sozinho enquanto a aplicação der certo. Para e
  chama você se algum item falhar ao ser aplicado, ou se a nota do site
  **piorar** em relação à rodada anterior (sinal de que a correção teve efeito
  colateral).
- **Autônomo** — segue até bater os critérios de qualidade ou o limite de
  rodadas que você definiu.

**Uma condição vale para os três:** só dá para seguir sozinho se houver uma
conexão que aplique de verdade (GitHub, WordPress, Shopify ou FTP). Se a
aplicação depende da sua ferramenta de desenvolvimento (via MCP ou ponte), ou
se não há conexão nenhuma, o ciclo espera — porque avançar sem nada ter sido
aplicado só reanalisaria um site inalterado, gastando sua chave de IA à toa.
Nesse caso ele retoma sozinho assim que os itens forem marcados como feitos.

---

### 6. Atualizar — dependências em dia

Todo sistema usa bibliotecas de terceiros. Elas envelhecem, ficam inseguras, ou
param de receber manutenção. Atualizar dá medo porque pode quebrar tudo.

**Para que serve:** a IA analisa as dependências do seu projeto e devolve, uma a
uma: qual versão você tem, para qual deveria ir, qual o risco dessa mudança, o
que vai quebrar, e o passo a passo seguro para migrar.

**Funciona com praticamente qualquer tecnologia:**

Node.js, Python, Ruby, Java, Kotlin, Go, .NET, PHP, Rust — e também sistemas
legado como RPG, Control Language (AS/400, IBM i), COBOL, VB6, Delphi e PL/SQL
antigo.

**Duas formas de usar:**

1. **Colar o arquivo** — cole o conteúdo do arquivo de dependências do seu
   projeto (seja `package.json`, `requirements.txt`, `pom.xml`, `go.mod`, o que
   for) e receba o plano.

2. **Investigar pelo GitHub** — conecte o repositório e o Elevate QA varre tudo
   sozinho, encontra todos os arquivos de dependência e monta um plano único.
   Isso resolve o caso do sistema grande, com várias tecnologias misturadas:
   um front em Node, um serviço em Java, um worker em Python e um módulo legado
   entram todos no mesmo plano.

**Uma regra importante sobre sistemas legado:**

Quando o Elevate QA identifica um sistema legado, ele recomenda **atualização de
versão** (por exemplo, da 4.0.0 para a 4.0.1) de forma padronizada e cuidadosa.

Mas ele é **proibido de recomendar migração de tecnologia** — nada de "reescreva
esse RPG em Java" ou "migre esse VB6 para .NET". Mesmo sendo o que o mercado
costuma fazer, migração de sistema completo exige um processo que esta
ferramenta não cobre. Se a IA identificar que a migração seria o ideal, ela
registra isso como observação e segue recomendando o que dá para fazer dentro da
tecnologia atual.

Isso é uma decisão deliberada: é melhor não recomendar do que recomendar algo
que a ferramenta não consegue sustentar.

---

## Como as peças se conectam

```
     Análise ─────┐
                  │
    Projetar ─────┼──►  Aplicação  ──►  Correção aplicada
                  │      (executa)
   Atualizar ─────┘
                  
              Orquestração
        (roda esse ciclo sozinho,
         em loop, até passar)
```

- **Análise, Projetar e Atualizar** produzem descobertas e planos.
- **Aplicação** é quem executa — recebe de qualquer uma das três.
- **Orquestração** automatiza o ciclo todo, usando as outras.

---

## Um caminho completo, na prática

Digamos que você tem um site e quer deixá-lo em ordem:

1. **Cadastre o projeto** em Projetos, com o endereço do site.
2. **Rode uma Análise QA padrão.** Aguarde alguns minutos.
3. **Leia o resultado** — nota geral, notas por categoria, lista de problemas
   com print e explicação.
4. **Clique em "Enviar para Aplicação".** A IA transforma os problemas numa
   lista de tarefas concretas.
5. **Escolha como aplicar:**
   - Baixe o PDF e faça manualmente, ou
   - Entregue o pacote para sua IA de desenvolvimento, ou
   - Conecte seu WordPress/GitHub e deixe ele registrar as correções.
6. **Rode a análise de novo** e compare a nota. Ou use a **Orquestração** para
   que esse ciclo aconteça sozinho.

---

## Sobre a inteligência artificial

O Elevate QA usa IA para interpretar os achados, escrever as explicações e gerar
os planos de correção.

**Você usa a sua própria chave.** Em Configurações, você cola sua chave da
Claude, OpenAI ou Google Gemini. Não existe uma chave compartilhada do
servidor — cada organização usa a sua, e ela fica criptografada no banco.

**Sem chave configurada**, o produto continua funcionando: ele roda todas as
verificações técnicas normalmente e entrega os resultados, mas as explicações
ficam genéricas em vez de personalizadas. Você configura a chave quando quiser
o plano completo.

---

## Princípios do produto

Algumas decisões que valem entender, porque explicam o comportamento:

**Nunca publica sozinho.** Em toda aplicação automática, o Elevate QA deixa a
mudança em rascunho e espera aprovação humana. Ele não faz merge de Pull
Request, não publica página, não sobrescreve nada em produção sem alguém olhar.

**Não recomenda o que não consegue entregar.** O caso do sistema legado é o
exemplo: em vez de dar um conselho impressionante mas inaplicável, ele diz o
que dá para fazer de verdade.

**Explica em português claro.** Toda a interface e todos os relatórios são em
português. Erros técnicos aparecem com uma mensagem amigável primeiro, e o
detalhe técnico fica recolhido para quem quiser ver.

**Falso positivo não vira tarefa.** A IA revisa os achados antes de te mostrar,
e o que ela julgar irrelevante fica marcado como ignorado — mas visível e
reversível, para você poder discordar.

---

## Estado atual

**Funcionando:**
Projetos, Análise (QA e Segurança), Projetar, Aplicação (com PDF, ponte para IA
de desenvolvimento e conexões com GitHub/WordPress/Shopify/FTP), Atualizar
(multi-linguagem e investigação por GitHub), Orquestração nos três níveis de
autonomia, login com e-mail e com Google, exportação e exclusão de dados da
conta (LGPD).

**Validado em produção:** login por e-mail e Google, análise, aplicação,
Atualizar com manifesto Python e com inventário de sistema legado (incluindo a
regra que impede recomendação de migração de tecnologia).

**Ainda não testado com dados reais:**
Aplicação automática num WordPress, Shopify ou FTP de verdade — depende de
credenciais de um site real. A investigação por GitHub depende de uma conexão
com token válido. Os níveis Supervisionado e Autônomo têm a regra de decisão
testada, mas ainda não rodaram um ciclo completo em produção.

**Fora de escopo por enquanto:**
Migração completa de sistemas legado (RPG para Java, VB6 para .NET). Plataformas
sem API de aplicação, como Wix, Squarespace e Webnode.
