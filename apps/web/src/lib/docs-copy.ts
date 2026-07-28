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
            "Compare GitHub, MCP, WordPress, Shopify and FTP before connecting credentials.",
          action: "Explore integrations",
        },
      ],
      beforeTitle: "Before you begin",
      beforeText:
        "The crawler works without an AI key. For AI interpretations, blueprints and generated plans, configure your own key in Settings. Without it, the system uses deterministic responses and does not call an external provider.",
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
            "Security Analysis performs dedicated security checks.",
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
            "Supervised and Autonomous modes are not available yet.",
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
              "Advanced checks for headers, HTTPS, CSP, TLS, DNS and unintended exposure.",
            ],
            [
              "Design",
              "available",
              "Blueprint with architecture, stack, risks, testing strategy, quality gates and roadmap.",
            ],
            [
              "Update",
              "available",
              "Dependency upgrade plan from package.json.",
            ],
          ],
        },
        {
          title: "Apply and track",
          items: [
            [
              "Application",
              "available",
              "Turns analyses, blueprints and upgrades into remediation checklists.",
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
              "development",
              "Planned with explicit approvals between stages.",
            ],
            [
              "Autonomous Orchestration",
              "development",
              "Planned for automatic cycles constrained by quality gates.",
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
              "WordPress",
              "available",
              "Creates or updates a draft checklist page; theme changes remain manual.",
            ],
            [
              "Shopify",
              "available",
              "Creates an unpublished checklist page; it does not edit themes or Liquid.",
            ],
            [
              "FTP/FTPS",
              "available",
              "Writes a Markdown file to the server; it does not automatically change existing code.",
            ],
            [
              "Wix, Squarespace and Webnode",
              "deferred",
              "No real application adapter; reconsider only if a suitable API becomes available.",
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
          "Creates a branch, writes the checklist in .atlas-qa/remediation and opens a pull request.",
          "It does not implement code fixes and never merges.",
        ],
        [
          "WordPress",
          "Draft record",
          "Creates or updates a draft page through the REST API using an Application Password.",
          "It does not change themes, plugins or website files.",
        ],
        [
          "Shopify",
          "Draft record",
          "Creates an unpublished checklist page through the Admin API.",
          "It does not change themes, Liquid or apps.",
        ],
        [
          "FTP/FTPS",
          "Traceable file",
          "Writes Markdown under atlas-qa/ at the configured remote path.",
          "It does not automatically edit existing files.",
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
            "Compare GitHub, MCP, WordPress, Shopify e FTP antes de conectar credenciais.",
          action: "Explorar integrações",
        },
      ],
      beforeTitle: "Antes de começar",
      beforeText:
        "O crawler funciona sem uma chave de IA. Para interpretações, blueprints e planos gerados por IA, configure sua própria chave em Configurações. Sem ela, o sistema usa respostas determinísticas e não chama um provedor externo.",
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
            "Análise de Segurança executa verificações específicas de segurança.",
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
            "Modos Supervisionado e Autônomo ainda não estão disponíveis.",
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
              "Verificações aprofundadas de headers, HTTPS, CSP, TLS, DNS e exposição indevida.",
            ],
            [
              "Projetar",
              "available",
              "Blueprint com arquitetura, stack, riscos, estratégia de testes, quality gates e roadmap.",
            ],
            [
              "Atualizar",
              "available",
              "Plano de atualização de dependências a partir de um package.json.",
            ],
          ],
        },
        {
          title: "Aplicar e acompanhar",
          items: [
            [
              "Aplicação",
              "available",
              "Transforma análises, blueprints e upgrades em checklists de remediação.",
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
              "development",
              "Prevista para aprovações explícitas entre as etapas.",
            ],
            [
              "Orquestração Autônoma",
              "development",
              "Prevista para ciclos automáticos limitados por quality gates.",
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
              "WordPress",
              "available",
              "Cria ou atualiza uma página em rascunho com o checklist; mudanças de tema continuam manuais.",
            ],
            [
              "Shopify",
              "available",
              "Cria uma página não publicada com o checklist; não edita tema ou Liquid.",
            ],
            [
              "FTP/FTPS",
              "available",
              "Grava um arquivo Markdown no servidor; não modifica automaticamente o código existente.",
            ],
            [
              "Wix, Squarespace e Webnode",
              "deferred",
              "Sem adapter de aplicação real; reconsiderar apenas se houver uma API adequada.",
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
          "Cria uma branch, grava o checklist em .atlas-qa/remediation e abre uma pull request.",
          "Não implementa a correção de código e nunca faz merge.",
        ],
        [
          "WordPress",
          "Registro em rascunho",
          "Cria ou atualiza uma página em rascunho pela API REST usando Application Password.",
          "Não altera tema, plugin ou arquivos do site.",
        ],
        [
          "Shopify",
          "Registro em rascunho",
          "Cria uma página não publicada com o checklist usando a Admin API.",
          "Não altera tema, Liquid ou aplicativos.",
        ],
        [
          "FTP/FTPS",
          "Arquivo rastreável",
          "Grava um Markdown em atlas-qa/ no caminho remoto configurado.",
          "Não edita automaticamente os arquivos existentes.",
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
            "Compara GitHub, MCP, WordPress, Shopify y FTP antes de conectar credenciales.",
          action: "Explorar integraciones",
        },
      ],
      beforeTitle: "Antes de empezar",
      beforeText:
        "El crawler funciona sin una clave de IA. Para interpretaciones, blueprints y planes generados por IA, configura tu propia clave en Ajustes. Sin ella, el sistema usa respuestas deterministas y no llama a un proveedor externo.",
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
            "Análisis de Seguridad realiza verificaciones específicas de seguridad.",
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
            "Los modos Supervisado y Autónomo aún no están disponibles.",
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
              "Verificaciones avanzadas de headers, HTTPS, CSP, TLS, DNS y exposición indebida.",
            ],
            [
              "Diseñar",
              "available",
              "Blueprint con arquitectura, stack, riesgos, estrategia de pruebas, quality gates y roadmap.",
            ],
            [
              "Actualizar",
              "available",
              "Plan de actualización de dependencias a partir de package.json.",
            ],
          ],
        },
        {
          title: "Aplicar y acompañar",
          items: [
            [
              "Aplicación",
              "available",
              "Convierte análisis, blueprints y upgrades en checklists de remediación.",
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
              "development",
              "Prevista con aprobaciones explícitas entre etapas.",
            ],
            [
              "Orquestación Autónoma",
              "development",
              "Prevista para ciclos automáticos limitados por quality gates.",
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
              "WordPress",
              "available",
              "Crea o actualiza una página borrador con el checklist; los cambios de tema siguen siendo manuales.",
            ],
            [
              "Shopify",
              "available",
              "Crea una página no publicada con el checklist; no edita temas ni Liquid.",
            ],
            [
              "FTP/FTPS",
              "available",
              "Escribe un archivo Markdown en el servidor; no modifica automáticamente el código existente.",
            ],
            [
              "Wix, Squarespace y Webnode",
              "deferred",
              "Sin adapter de aplicación real; reconsiderar solo si existe una API adecuada.",
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
          "Crea una branch, escribe el checklist en .atlas-qa/remediation y abre una pull request.",
          "No implementa la corrección de código y nunca hace merge.",
        ],
        [
          "WordPress",
          "Registro en borrador",
          "Crea o actualiza una página borrador mediante la API REST y Application Password.",
          "No cambia temas, plugins ni archivos del sitio.",
        ],
        [
          "Shopify",
          "Registro en borrador",
          "Crea una página no publicada con el checklist mediante la Admin API.",
          "No cambia temas, Liquid ni aplicaciones.",
        ],
        [
          "FTP/FTPS",
          "Archivo rastreable",
          "Escribe Markdown en atlas-qa/ dentro de la ruta remota configurada.",
          "No edita automáticamente archivos existentes.",
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
