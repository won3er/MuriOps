import type { Locale } from "@/lib/i18n";

export const DOCS_COPY = {
  en: {
    overview: {
      title: "MuriOps documentation",
      description:
        "Learn how to run the quality cycle, understand each module and know exactly what every integration does.",
      flowCards: [
        ["Analyze", "Find and prioritize problems."],
        ["Apply", "Turn findings into traceable work."],
        ["Orchestrate", "Repeat the cycle with control."],
      ],
      answerTitle: "Find your answer",
      sections: [
        {
          href: "/docs/guia",
          title: "Start with the main workflow",
          description:
            "Register a project, run an analysis and turn findings into an actionable plan.",
          action: "Open the user guide",
        },
        {
          href: "/docs/funcionalidades",
          title: "Understand what is available",
          description:
            "See the real stage of each module and the current automation limits.",
          action: "View features",
        },
        {
          href: "/docs/integracoes",
          title: "Choose how to apply",
          description:
            "Compare GitHub and MCP before connecting credentials.",
          action: "Explore integrations",
        },
      ],
      beforeTitle: "Before you begin",
      beforeText:
        "The crawler works without an AI key. For AI interpretations and generated plans, configure your own key in Settings. Without it, the system uses deterministic responses and does not call an external provider.",
    },
    guide: {
      title: "User guide",
      description:
        "The recommended path from a registered URL to a measurable improvement cycle.",
      eyebrow: "Getting started",
      warning:
        "Some integrations create a checklist or draft on the connected platform. This provides traceability, but it does not mean the website code was fixed.",
      steps: [
        {
          number: "01",
          title: "Register the project",
          description:
            "In Projects, enter a name and the public URL to analyze.",
          items: [
            "Use a URL you manage or are authorized to test.",
            "Confirm the website is accessible without a private session.",
            "The project provides context for analyses, applications and orchestrations.",
          ],
        },
        {
          number: "02",
          title: "Run an analysis",
          description: "In Analyses, choose the project and verification type.",
          items: [
            "Standard QA Analysis covers UI/UX, performance, SEO, accessibility, console and network.",
            "Security Analysis performs passive TLS/certificate, DNS, HTTP-header, cookie, CORS, exposed-file, HTTP-method and client-library version checks. It does not send attack payloads or replace a penetration test.",
            "Wait for completion before comparing scores or creating an application.",
          ],
        },
        {
          number: "03",
          title: "Review findings",
          description:
            "Open the report and assess priority, evidence and context.",
          items: [
            "Scores show trends; they do not replace reviewing each finding.",
            "Filter issues by category, severity and status.",
            "Review AI recommendations before applying them in production.",
          ],
        },
        {
          number: "04",
          title: "Send to Application",
          description:
            "Convert the completed analysis into a remediation checklist.",
          items: [
            "Download the PDF plan for manual execution.",
            "Use the universal bridge or MCP with your development tool.",
            "Connect a platform only after understanding what its adapter actually writes.",
          ],
        },
        {
          number: "05",
          title: "Reanalyze and track",
          description: "Measure the outcome of changes and continue the cycle.",
          items: [
            "Manual autonomy keeps checkpoints under your control.",
            "Orchestration can resume after bridge items are completed.",
            "Supervised and Autonomous modes respect the configured iteration limit and stop when an external action needs review.",
          ],
        },
      ],
      create: "Create account",
      compare: "Compare integrations",
    },
    features: {
      title: "Feature status",
      description:
        "An honest view of what you can use today, what is in development and each integration's limits.",
      eyebrow: "Product",
      statuses: {
        available: "Available",
        development: "In development",
        deferred: "Deferred",
      },
      groups: [
        {
          title: "Analyze and plan",
          items: [
            [
              "Standard QA Analysis",
              "available",
              "Crawler checks UI/UX, performance, SEO, accessibility, console and network.",
            ],
            [
              "Security Analysis",
              "available",
              "Passive checks for headers, HTTPS, CSP, TLS, DNS and unintended exposure, plus detection of exposed secrets and credentials in the rendered HTML (API keys, tokens, passwords in attributes or scripts), masked before ever appearing in the report.",
            ],
            [
              "Update",
              "available",
              "Dependency upgrade plan from a pasted manifest (npm, pip, Maven, Gradle, Go, NuGet, Composer, Cargo and others) or investigated directly on GitHub, with a repository readiness assessment (tests, CI, overall risk) shown inline when the project isn't ready to receive it safely.",
            ],
            [
              "Authorized active testing",
              "available",
              "Opt-in only: rate-limit checks, user-enumeration signals and a curated set of detection payloads, with a circuit breaker. Requires explicit per-project consent.",
            ],
            [
              "Security scan via GitHub or GitLab",
              "available",
              "Scans a connected repository (GitHub or GitLab) for known-vulnerable dependencies (CVEs), insecure code patterns, committed secrets and Dockerfile misconfigurations, without touching the live site. Connecting GitHub or GitLab is now required to run any analysis on a project.",
            ],
          ],
        },
        {
          title: "Business audit",
          items: [
            [
              "Guardian",
              "available",
              "Audits pasted documents (spreadsheets, contracts, forms) or files picked from a connected Google Drive folder against optional business rules, with severity, evidence and a suggested fix. Requires a connected AI key.",
            ],
          ],
        },
        {
          title: "Continuous monitoring",
          items: [
            [
              "Critical Flows",
              "available",
              "Scripted synthetic monitoring of business-critical journeys (login, checkout, lead forms) running on a schedule (every 15 minutes, hourly or daily). Alerts by email with a screenshot of the exact step that broke, so a broken journey is caught before it costs sales.",
            ],
          ],
        },
        {
          title: "Apply and track",
          items: [
            [
              "Application",
              "available",
              "Turns analyses and upgrades into remediation checklists, and can break a plan into trackable GitHub issues (Projection).",
            ],
            [
              "PDF and universal bridge",
              "available",
              "Export for human execution or a development AI.",
            ],
            [
              "MCP server per project",
              "available",
              "Read the plan and update items through MCP.",
            ],
            [
              "Manual Orchestration",
              "available",
              "Runs the cycle with checkpoints and resumes after items are applied.",
            ],
            [
              "Supervised Orchestration",
              "available",
              "Continues after a successful application and pauses for review if an item fails or the score regresses.",
            ],
            [
              "Autonomous Orchestration",
              "available",
              "Continues within the iteration limit until it reaches quality gates or needs an external application.",
            ],
          ],
        },
        {
          title: "Connections",
          items: [
            [
              "GitHub",
              "available",
              "Creates a branch, traceable checklist and pull request; it does not change code or merge.",
            ],
            [
              "MCP and universal bridge",
              "available",
              "Lets a development tool read the plan and update its checklist without exposing a shared AI key.",
            ],
            [
              "Google Drive",
              "available",
              "Read-only OAuth connection per organization. Guardian lists folders and reads a document straight from Drive, including for scheduled automatic re-audits.",
            ],
          ],
        },
      ],
    },
    integrations: {
      title: "Integrations and technologies",
      description:
        "Understand required data, what each connection executes and where a human step remains.",
      eyebrow: "Connectivity",
      adapters: "Application adapters",
      limit: "Limit:",
      connections: [
        [
          "GitHub",
          "Push with approval",
          "For example, creates a separate branch and stores a checklist file in .muriops/remediation inside your repository, then opens a pull request for review.",
          "It does not implement code fixes and never merges.",
        ],
        [
          "Google Drive",
          "Read-only",
          "Connected once per organization via OAuth. Guardian lists your folders and reads a document (Google Docs, Sheets, PDF, Excel, CSV/TXT/TSV/JSON) directly from Drive — including for a daily scheduled re-audit that can email a summary via Resend when configured.",
          "Read-only — never writes to or edits anything in Drive.",
        ],
      ],
      aiTitle: "AI and development tools",
      providerTitle: "Organization AI provider",
      providerText:
        "Configure a Claude, OpenAI or Gemini key. It is encrypted before storage and used only for requested operations.",
      bridgeTitle: "MCP and universal bridge",
      bridgeText:
        "Codex, Claude Code, Cursor, Windsurf or another tool can read the plan and update its checklist without using a MuriOps AI key.",
      principleTitle: "Principle: credentials stay under control",
      principleText:
        "MuriOps never falls back to a shared server key. Without your own key, AI functions return deterministic responses. Revoke platform tokens and AI keys at their source whenever you want to end access.",
    },
  },
  pt: {
    overview: {
      title: "Documentação do MuriOps",
      description:
        "Aprenda a operar o ciclo de qualidade, entenda o papel de cada módulo e saiba exatamente o que cada integração faz.",
      flowCards: [
        ["Analisar", "Encontre e priorize problemas."],
        ["Aplicar", "Transforme achados em trabalho."],
        ["Orquestrar", "Repita o ciclo com controle."],
      ],
      answerTitle: "Encontre sua resposta",
      sections: [
        {
          href: "/docs/guia",
          title: "Comece pelo fluxo principal",
          description:
            "Cadastre um projeto, execute uma análise e transforme os achados em um plano aplicável.",
          action: "Abrir guia de uso",
        },
        {
          href: "/docs/funcionalidades",
          title: "Entenda o que está disponível",
          description:
            "Consulte o estágio real de cada módulo e o limite atual das automações.",
          action: "Ver funcionalidades",
        },
        {
          href: "/docs/integracoes",
          title: "Escolha como aplicar",
          description:
            "Compare GitHub e MCP antes de conectar credenciais.",
          action: "Explorar integrações",
        },
      ],
      beforeTitle: "Antes de começar",
      beforeText:
        "O crawler funciona sem uma chave de IA. Para interpretações e planos gerados por IA, configure sua própria chave em Configurações. Sem ela, o sistema usa respostas determinísticas e não chama um provedor externo.",
    },
    guide: {
      title: "Guia de uso",
      description:
        "O caminho recomendado para sair de uma URL cadastrada até um ciclo mensurável de melhoria.",
      eyebrow: "Primeiros passos",
      warning:
        "Algumas integrações registram um checklist ou rascunho na plataforma conectada. Isso cria rastreabilidade, mas não significa que o código do site foi corrigido.",
      steps: [
        {
          number: "01",
          title: "Cadastre o projeto",
          description:
            "Em Projetos, informe um nome e a URL pública que será analisada.",
          items: [
            "Use uma URL que você administra ou tem autorização para testar.",
            "Confirme que o site pode ser acessado sem uma sessão privada.",
            "O projeto será o contexto para análises, aplicações e orquestrações.",
          ],
        },
        {
          number: "02",
          title: "Execute uma análise",
          description:
            "Em Análises, escolha o projeto e o tipo de verificação.",
          items: [
            "Análise QA padrão cobre UI/UX, performance, SEO, acessibilidade, console e rede.",
            "Análise de Segurança verifica passivamente TLS/certificado, DNS, headers HTTP, cookies, CORS, arquivos expostos, métodos HTTP e versões de bibliotecas do cliente. Ela não envia payloads de ataque nem substitui um pentest.",
            "Aguarde a conclusão antes de comparar scores ou criar uma aplicação.",
          ],
        },
        {
          number: "03",
          title: "Revise os achados",
          description:
            "Abra o relatório e avalie prioridade, evidências e contexto.",
          items: [
            "Scores ajudam a observar tendência; não substituem a revisão dos achados.",
            "Problemas podem ser filtrados por categoria, severidade e status.",
            "Revise recomendações de IA antes de aplicá-las em produção.",
          ],
        },
        {
          number: "04",
          title: "Envie para Aplicação",
          description:
            "Converta a análise concluída em um checklist de remediação.",
          items: [
            "Baixe o plano em PDF para execução manual.",
            "Use a ponte universal ou MCP com sua ferramenta de desenvolvimento.",
            "Conecte uma plataforma apenas depois de entender o que o adapter realmente grava.",
          ],
        },
        {
          number: "05",
          title: "Reanalise e acompanhe",
          description: "Meça o resultado das mudanças e continue o ciclo.",
          items: [
            "Na autonomia Manual, você mantém o controle dos checkpoints.",
            "A orquestração pode retomar quando os itens da ponte forem concluídos.",
            "Os modos Supervisionado e Autônomo respeitam o limite de iterações e param quando uma ação externa precisa de revisão.",
          ],
        },
      ],
      create: "Criar conta",
      compare: "Comparar integrações",
    },
    features: {
      title: "Status das funcionalidades",
      description:
        "Uma visão honesta do que pode ser usado hoje, do que ainda está em desenvolvimento e dos limites de cada integração.",
      eyebrow: "Produto",
      statuses: {
        available: "Disponível",
        development: "Em desenvolvimento",
        deferred: "Adiado",
      },
      groups: [
        {
          title: "Analisar e planejar",
          items: [
            [
              "Análise QA padrão",
              "available",
              "Crawler com verificações de UI/UX, performance, SEO, acessibilidade, console e rede.",
            ],
            [
              "Análise de Segurança",
              "available",
              "Verificações passivas de headers, HTTPS, CSP, TLS, DNS e exposição indevida, além de detecção de segredos e credenciais expostos no HTML renderizado (chaves de API, tokens, senhas em atributos ou scripts), mascarados antes de aparecer no relatório.",
            ],
            [
              "Atualizar",
              "available",
              "Plano de atualização de dependências a partir de um manifesto colado (npm, pip, Maven, Gradle, Go, NuGet, Composer, Cargo e outros) ou investigado direto no GitHub, com avaliação de prontidão do repositório (testes, CI, risco geral) mostrada direto na tela quando o projeto ainda não está pronto para receber a atualização com segurança.",
            ],
            [
              "Teste Ativo Autorizado",
              "available",
              "Opt-in: checagem de rate-limit, indícios de enumeração de usuário e um conjunto curado de payloads de detecção, com circuit breaker. Exige consentimento explícito registrado no projeto.",
            ],
            [
              "Análise de segurança via GitHub ou GitLab",
              "available",
              "Varre um repositório conectado (GitHub ou GitLab) em busca de dependências com CVE conhecida, padrões de código inseguro, segredos commitados e configurações inseguras de Dockerfile, sem tocar no site em produção. Conectar GitHub ou GitLab agora é obrigatório para rodar qualquer análise no projeto.",
            ],
          ],
        },
        {
          title: "Auditoria de negócio",
          items: [
            [
              "Guardian",
              "available",
              "Audita um documento colado (planilha, contrato, formulário) ou escolhido de uma pasta do Google Drive conectada, contra regras de negócio opcionais, com severidade, evidência e correção sugerida. Exige chave de IA conectada.",
            ],
          ],
        },
        {
          title: "Monitoramento contínuo",
          items: [
            [
              "Fluxos Críticos",
              "available",
              "Monitoramento sintético por script de jornadas críticas de negócio (login, checkout, formulário de lead) rodando numa frequência fixa (15 min, 1h ou diária). Alerta por e-mail com screenshot do exato passo que quebrou, pra pegar uma jornada quebrada antes que ela custe uma venda.",
            ],
          ],
        },
        {
          title: "Aplicar e acompanhar",
          items: [
            [
              "Aplicação",
              "available",
              "Transforma análises e upgrades em checklists de remediação, e pode decompor um plano em tarefas rastreáveis no GitHub (Projeção).",
            ],
            [
              "PDF e ponte universal",
              "available",
              "Exportação para execução humana ou por uma IA de desenvolvimento.",
            ],
            [
              "Servidor MCP por projeto",
              "available",
              "Permite consultar o plano e atualizar itens por protocolo MCP.",
            ],
            [
              "Orquestração Manual",
              "available",
              "Executa o ciclo com checkpoints e retomada após a aplicação dos itens.",
            ],
            [
              "Orquestração Supervisionada",
              "available",
              "Prossegue após uma aplicação bem-sucedida e para para revisão se algum item falhar ou se a nota regredir.",
            ],
            [
              "Orquestração Autônoma",
              "available",
              "Prossegue dentro do limite de iterações até atingir os quality gates ou depender de aplicação externa.",
            ],
          ],
        },
        {
          title: "Conexões",
          items: [
            [
              "GitHub",
              "available",
              "Cria branch, checklist rastreável e pull request; não altera o código nem faz merge.",
            ],
            [
              "MCP e ponte universal",
              "available",
              "Permite que uma ferramenta de desenvolvimento leia o plano e atualize o checklist sem expor uma chave de IA compartilhada.",
            ],
            [
              "Google Drive",
              "available",
              "Conexão só leitura por organização via OAuth. O Guardian lista pastas e lê um documento direto do Drive, inclusive para reauditoria automática agendada.",
            ],
          ],
        },
      ],
    },
    integrations: {
      title: "Integrações e tecnologias",
      description:
        "Entenda quais dados são necessários, o que cada conexão executa e onde ainda existe uma etapa humana.",
      eyebrow: "Conectividade",
      adapters: "Adapters de aplicação",
      limit: "Limite:",
      connections: [
        [
          "GitHub",
          "Push com aprovação",
          "Por exemplo, cria uma branch separada e salva um arquivo de checklist em .muriops/remediation dentro do seu repositório; depois abre uma pull request para revisão.",
          "Não implementa a correção de código e nunca faz merge.",
        ],
        [
          "Google Drive",
          "Só leitura",
          "Conectado uma vez por organização via OAuth. O Guardian lista suas pastas e lê um documento (Google Docs, Sheets, PDF, Excel, CSV/TXT/TSV/JSON) direto do Drive — inclusive para uma reauditoria diária agendada que pode enviar um resumo por e-mail via Resend quando configurado.",
          "Só leitura — nunca grava nem edita nada no Drive.",
        ],
      ],
      aiTitle: "IA e ferramentas de desenvolvimento",
      providerTitle: "Provedor de IA da organização",
      providerText:
        "Configure uma chave de Claude, OpenAI ou Gemini. A chave é criptografada antes de ser armazenada e usada somente nas operações solicitadas.",
      bridgeTitle: "MCP e ponte universal",
      bridgeText:
        "Codex, Claude Code, Cursor, Windsurf ou outra ferramenta pode ler o plano e atualizar o checklist sem usar uma chave de IA do MuriOps.",
      principleTitle: "Princípio: credenciais sob controle",
      principleText:
        "O MuriOps não usa uma chave compartilhada do servidor como fallback. Sem uma chave própria, as funções de IA retornam respostas determinísticas. Revogue tokens e chaves na origem quando quiser encerrar o acesso.",
    },
  },
  es: {
    overview: {
      title: "Documentación de MuriOps",
      description:
        "Aprende a operar el ciclo de calidad, entiende cada módulo y conoce exactamente qué hace cada integración.",
      flowCards: [
        ["Analizar", "Encuentra y prioriza problemas."],
        ["Aplicar", "Convierte hallazgos en trabajo."],
        ["Orquestar", "Repite el ciclo con control."],
      ],
      answerTitle: "Encuentra tu respuesta",
      sections: [
        {
          href: "/docs/guia",
          title: "Empieza por el flujo principal",
          description:
            "Registra un proyecto, ejecuta un análisis y convierte los hallazgos en un plan aplicable.",
          action: "Abrir la guía de uso",
        },
        {
          href: "/docs/funcionalidades",
          title: "Entiende qué está disponible",
          description:
            "Consulta el estado real de cada módulo y los límites actuales de la automatización.",
          action: "Ver funciones",
        },
        {
          href: "/docs/integracoes",
          title: "Elige cómo aplicar",
          description:
            "Compara GitHub y MCP antes de conectar credenciales.",
          action: "Explorar integraciones",
        },
      ],
      beforeTitle: "Antes de empezar",
      beforeText:
        "El crawler funciona sin una clave de IA. Para interpretaciones y planes generados por IA, configura tu propia clave en Ajustes. Sin ella, el sistema usa respuestas deterministas y no llama a un proveedor externo.",
    },
    guide: {
      title: "Guía de uso",
      description:
        "El camino recomendado desde una URL registrada hasta un ciclo de mejora medible.",
      eyebrow: "Primeros pasos",
      warning:
        "Algunas integraciones crean un checklist o borrador en la plataforma conectada. Esto aporta trazabilidad, pero no significa que el código del sitio haya sido corregido.",
      steps: [
        {
          number: "01",
          title: "Registra el proyecto",
          description:
            "En Proyectos, introduce un nombre y la URL pública que se analizará.",
          items: [
            "Usa una URL que administras o tienes autorización para probar.",
            "Confirma que el sitio es accesible sin una sesión privada.",
            "El proyecto será el contexto de análisis, aplicaciones y orquestaciones.",
          ],
        },
        {
          number: "02",
          title: "Ejecuta un análisis",
          description:
            "En Análisis, elige el proyecto y el tipo de verificación.",
          items: [
            "Análisis QA estándar cubre UI/UX, rendimiento, SEO, accesibilidad, consola y red.",
            "Análisis de Seguridad comprueba pasivamente TLS/certificado, DNS, headers HTTP, cookies, CORS, archivos expuestos, métodos HTTP y versiones de bibliotecas del cliente. No envía payloads de ataque ni sustituye un pentest.",
            "Espera a que termine antes de comparar puntuaciones o crear una aplicación.",
          ],
        },
        {
          number: "03",
          title: "Revisa los hallazgos",
          description:
            "Abre el informe y evalúa prioridad, evidencia y contexto.",
          items: [
            "Las puntuaciones muestran tendencias; no sustituyen la revisión de hallazgos.",
            "Filtra problemas por categoría, severidad y estado.",
            "Revisa las recomendaciones de IA antes de aplicarlas en producción.",
          ],
        },
        {
          number: "04",
          title: "Enviar a Aplicación",
          description:
            "Convierte el análisis completado en un checklist de remediación.",
          items: [
            "Descarga el plan PDF para ejecución manual.",
            "Usa el puente universal o MCP con tu herramienta de desarrollo.",
            "Conecta una plataforma solo después de entender qué escribe su adapter.",
          ],
        },
        {
          number: "05",
          title: "Vuelve a analizar y acompaña",
          description: "Mide el resultado de los cambios y continúa el ciclo.",
          items: [
            "La autonomía Manual mantiene los checkpoints bajo tu control.",
            "La orquestación puede reanudarse cuando se completen los elementos del puente.",
            "Los modos Supervisado y Autónomo respetan el límite de iteraciones y se detienen cuando una acción externa necesita revisión.",
          ],
        },
      ],
      create: "Crear cuenta",
      compare: "Comparar integraciones",
    },
    features: {
      title: "Estado de las funciones",
      description:
        "Una visión honesta de lo que se puede usar hoy, lo que está en desarrollo y los límites de cada integración.",
      eyebrow: "Producto",
      statuses: {
        available: "Disponible",
        development: "En desarrollo",
        deferred: "Aplazado",
      },
      groups: [
        {
          title: "Analizar y planificar",
          items: [
            [
              "Análisis QA estándar",
              "available",
              "Crawler con verificaciones de UI/UX, rendimiento, SEO, accesibilidad, consola y red.",
            ],
            [
              "Análisis de Seguridad",
              "available",
              "Verificaciones pasivas de headers, HTTPS, CSP, TLS, DNS y exposición indebida, además de detección de secretos y credenciales expuestos en el HTML renderizado (claves de API, tokens, contraseñas en atributos o scripts), enmascarados antes de aparecer en el informe.",
            ],
            [
              "Actualizar",
              "available",
              "Plan de actualización de dependencias a partir de un manifiesto pegado (npm, pip, Maven, Gradle, Go, NuGet, Composer, Cargo y otros) o investigado directamente en GitHub, con una evaluación de preparación del repositorio (pruebas, CI, riesgo general) mostrada directo en pantalla cuando el proyecto todavía no está listo para recibir la actualización con seguridad.",
            ],
            [
              "Prueba activa autorizada",
              "available",
              "Opcional: comprobación de rate-limit, señales de enumeración de usuarios y un conjunto curado de payloads de detección, con circuit breaker. Requiere consentimiento explícito registrado en el proyecto.",
            ],
            [
              "Análisis de seguridad vía GitHub o GitLab",
              "available",
              "Escanea un repositorio conectado (GitHub o GitLab) en busca de dependencias con CVE conocida, patrones de código inseguros, secretos confirmados en el código y configuraciones inseguras de Dockerfile, sin tocar el sitio en producción. Conectar GitHub o GitLab ahora es obligatorio para ejecutar cualquier análisis en el proyecto.",
            ],
          ],
        },
        {
          title: "Auditoría de negocio",
          items: [
            [
              "Guardian",
              "available",
              "Audita un documento pegado (hoja de cálculo, contrato, formulario) o elegido desde una carpeta de Google Drive conectada, contra reglas de negocio opcionales, con severidad, evidencia y corrección sugerida. Requiere una clave de IA conectada.",
            ],
          ],
        },
        {
          title: "Monitoreo continuo",
          items: [
            [
              "Flujos Críticos",
              "available",
              "Monitoreo sintético con script de recorridos críticos del negocio (login, checkout, formulario de contacto) que corre en una frecuencia fija (15 min, 1h o diaria). Alerta por correo con una captura del paso exacto que falló, para detectar un recorrido roto antes de que cueste una venta.",
            ],
          ],
        },
        {
          title: "Aplicar y acompañar",
          items: [
            [
              "Aplicación",
              "available",
              "Convierte análisis y upgrades en checklists de remediación, y puede descomponer un plan en tareas rastreables en GitHub (Proyección).",
            ],
            [
              "PDF y puente universal",
              "available",
              "Exportación para ejecución humana o mediante una IA de desarrollo.",
            ],
            [
              "Servidor MCP por proyecto",
              "available",
              "Permite consultar el plan y actualizar elementos por MCP.",
            ],
            [
              "Orquestación Manual",
              "available",
              "Ejecuta el ciclo con checkpoints y se reanuda después de aplicar elementos.",
            ],
            [
              "Orquestación Supervisada",
              "available",
              "Continúa después de una aplicación correcta y se detiene para revisión si un elemento falla o la puntuación empeora.",
            ],
            [
              "Orquestación Autónoma",
              "available",
              "Continúa dentro del límite de iteraciones hasta alcanzar los quality gates o depender de una aplicación externa.",
            ],
          ],
        },
        {
          title: "Conexiones",
          items: [
            [
              "GitHub",
              "available",
              "Crea una branch, checklist rastreable y pull request; no cambia código ni hace merge.",
            ],
            [
              "MCP y puente universal",
              "available",
              "Permite que una herramienta de desarrollo lea el plan y actualice el checklist sin exponer una clave de IA compartida.",
            ],
            [
              "Google Drive",
              "available",
              "Conexión de solo lectura por organización vía OAuth. Guardian lista carpetas y lee un documento directo desde Drive, incluida la reauditoría automática programada.",
            ],
          ],
        },
      ],
    },
    integrations: {
      title: "Integraciones y tecnologías",
      description:
        "Entiende qué datos son necesarios, qué ejecuta cada conexión y dónde aún existe un paso humano.",
      eyebrow: "Conectividad",
      adapters: "Adapters de aplicación",
      limit: "Límite:",
      connections: [
        [
          "GitHub",
          "Push con aprobación",
          "Por ejemplo, crea una branch separada y guarda un archivo de checklist en .muriops/remediation dentro de tu repositorio; luego abre una pull request para revisión.",
          "No implementa la corrección de código y nunca hace merge.",
        ],
        [
          "Google Drive",
          "Solo lectura",
          "Conectado una vez por organización vía OAuth. Guardian lista tus carpetas y lee un documento (Google Docs, Sheets, PDF, Excel, CSV/TXT/TSV/JSON) directo desde Drive — incluida una reauditoría diaria programada que puede enviar un resumen por correo vía Resend cuando está configurado.",
          "Solo lectura — nunca escribe ni edita nada en Drive.",
        ],
      ],
      aiTitle: "IA y herramientas de desarrollo",
      providerTitle: "Proveedor de IA de la organización",
      providerText:
        "Configura una clave de Claude, OpenAI o Gemini. Se cifra antes de almacenarse y se usa solo para las operaciones solicitadas.",
      bridgeTitle: "MCP y puente universal",
      bridgeText:
        "Codex, Claude Code, Cursor, Windsurf u otra herramienta puede leer el plan y actualizar el checklist sin usar una clave de IA de MuriOps.",
      principleTitle: "Principio: credenciales bajo control",
      principleText:
        "MuriOps no usa una clave compartida del servidor como fallback. Sin tu propia clave, las funciones de IA devuelven respuestas deterministas. Revoca tokens y claves en el origen cuando quieras finalizar el acceso.",
    },
  },
} satisfies Record<Locale, unknown>;
