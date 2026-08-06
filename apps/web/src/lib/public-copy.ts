import type { Locale } from "@/lib/i18n";

export const LANDING_COPY = {
  en: {
    eyebrow: "Continuous website quality management",
    heroBefore: "Turn quality reports into a",
    heroAccent: "management process",
    heroDescription:
      "Organize projects, run analyses, turn findings into plans and track every improvement cycle in one connected workspace.",
    openWorkspace: "Open workspace",
    createWorkspace: "Create my workspace",
    signInPrompt: "Already have an account? Sign in",
    trustLine:
      "Start without a credit card · Bring your own AI key · Keep approval control",
    cycleEyebrow: "One connected cycle",
    cycleTitle: "Six workflows, one workspace",
    cycleDescription:
      "From the first diagnosis to improvement tracking, every stage preserves project context and prepares the next decision — including Guardian, a separate audit layer for business documents, not just websites.",
    howItWorks: "From input to tracked work",
    howItWorksDescription:
      "The main workflow connects three real outputs: a diagnosis or plan, an Application checklist, and execution progress.",
    steps: [
      {
        n: "01",
        title: "Choose the source",
        desc: "Run a website analysis, generate a product blueprint, or inspect a dependency manifest.",
      },
      {
        n: "02",
        title: "Review the result",
        desc: "Inspect findings, evidence, risks, quality gates, or upgrade items before taking action.",
      },
      {
        n: "03",
        title: "Send to Application",
        desc: "Convert the selected output into a prioritized checklist with context and instructions.",
      },
      {
        n: "04",
        title: "Execute and track",
        desc: "Work manually, through the universal bridge or MCP, or with a configured adapter; then track item status and reanalysis.",
      },
    ],
    application: {
      eyebrow: "Application",
      title: "Turn a finding into a work item",
      description:
        "For example, an analysis can identify a missing page title, poor contrast and a broken request. Application turns those findings into a prioritized checklist with evidence and instructions. Your team or development tool carries out the change; MuriOps records the work and its status without editing or merging code by itself.",
      badges: [
        "Single document",
        "Package for development AI",
        "Live checklist",
      ],
      planStatus: "Application plan · 2 of 3 applied",
      checklist: [
        "Add meta description",
        "Fix primary button contrast",
        "Review Content-Security-Policy",
      ],
    },
    coverage: {
      eyebrow: "Diagnostic depth",
      title: "What the analysis covers",
      description:
        "Ten disciplines work together across Standard QA Analysis and Security Analysis. Every finding includes context, evidence and priority to guide the next action.",
      modules: [
        ["Smart crawler", "Discovers pages, menus and flows automatically."],
        ["Performance", "LCP, CLS, INP and real loading time."],
        ["UI & UX", "Hierarchy, contrast, click targets and usability."],
        ["SEO", "Titles, metadata, canonical, Open Graph, sitemap and robots."],
        [
          "Accessibility",
          "Labels, alternatives, focus and keyboard navigation (WCAG).",
        ],
        [
          "Passive security checks",
          "HTTPS/TLS, security headers, cookie flags, CORS, DNS email records, exposed files and known client-library versions; no attack payloads or penetration testing.",
        ],
        [
          "Console & network",
          "JavaScript errors, failed requests and heavy resources.",
        ],
        [
          "Authorized active testing",
          "Opt-in only: rate-limit checks, user-enumeration signals and a curated set of detection payloads (SQLi/XSS/path traversal), with a circuit breaker. Requires explicit consent recorded per project.",
        ],
        [
          "Security scan via GitHub",
          "Scans a connected repository for known-vulnerable dependencies (CVEs) and insecure code patterns, without touching the live site.",
        ],
        ["Version comparison", "What was fixed, introduced or remains."],
      ],
    },
    integrations: {
      eyebrow: "Real integrations",
      title: "Connects to the tools you already use",
      description:
        "Nothing here is decorative — every connection below exists in the product and does exactly what's described.",
      items: [
        [
          "Google Drive",
          "Read-only connection per organization. Guardian lists your folders and reads a document (Google Docs, Sheets, PDF, Excel, CSV/TXT/TSV/JSON) straight from Drive, no need to paste text manually — including for scheduled automatic re-audits.",
        ],
        [
          "GitHub",
          "Connect a repository (owner/repo/branch) to apply the remediation plan via direct push, or use it as a source for Security Analysis (CVE-flagged dependencies, insecure patterns) and Update (detects dependency manifests and generates an upgrade plan).",
        ],
        [
          "Your development AI",
          "The universal bridge generates a link and a token: paste it into Claude Code, Cursor, Windsurf, Codex or any dev AI — it reads the remediation plan via curl or MCP and marks items as done, no key from us required.",
        ],
        [
          "Claude, OpenAI and Gemini",
          "Each organization pastes its own API key in Settings. Used to interpret findings and generate remediation plans, architecture (Blueprint), upgrade plans (Update) and document audits (Guardian).",
        ],
      ],
    },
    cta: {
      eyebrow: "Workspace access",
      title: "Start a quality baseline for a project",
      description:
        "Create a project, run a non-invasive analysis and keep findings, plans and execution history in one technical workspace.",
      dashboard: "Open workspace",
      start: "Create workspace",
    },
  },
  pt: {
    eyebrow: "Gestão contínua de qualidade digital",
    heroBefore: "Qualidade deixa de ser relatório e vira",
    heroAccent: "processo de gestão",
    heroDescription:
      "Organize projetos, execute análises, transforme achados em planos e acompanhe cada ciclo de melhoria em um workspace conectado.",
    openWorkspace: "Abrir workspace",
    createWorkspace: "Criar meu workspace",
    signInPrompt: "Já tem conta? Entrar",
    trustLine:
      "Comece sem cartão · Use sua própria chave de IA · Mantenha o controle das aprovações",
    cycleEyebrow: "Um ciclo conectado",
    cycleTitle: "Seis frentes, um só workspace",
    cycleDescription:
      "Do primeiro diagnóstico ao acompanhamento das melhorias, cada etapa preserva o contexto do projeto e prepara a próxima decisão — incluindo o Guardian, uma camada de auditoria separada para documentos de negócio, não só sites.",
    howItWorks: "Da origem ao trabalho acompanhado",
    howItWorksDescription:
      "O fluxo principal conecta três resultados reais: um diagnóstico ou plano, um checklist em Aplicação e o acompanhamento da execução.",
    steps: [
      {
        n: "01",
        title: "Escolha a origem",
        desc: "Execute uma análise de site, gere um blueprint de produto ou investigue um manifesto de dependências.",
      },
      {
        n: "02",
        title: "Revise o resultado",
        desc: "Confira achados, evidências, riscos, quality gates ou itens de atualização antes de agir.",
      },
      {
        n: "03",
        title: "Envie para Aplicação",
        desc: "Converta o resultado selecionado em checklist priorizado, com contexto e instruções.",
      },
      {
        n: "04",
        title: "Execute e acompanhe",
        desc: "Trabalhe manualmente, pela ponte universal ou MCP, ou com um adapter configurado; depois acompanhe status e reanálise.",
      },
    ],
    application: {
      eyebrow: "Aplicação",
      title: "Do achado à tarefa de trabalho",
      description:
        "Por exemplo: uma análise encontra título ausente, contraste ruim e uma requisição quebrada. Aplicação transforma esses achados em checklist priorizado, com evidência e orientação. Seu time ou ferramenta de desenvolvimento executa a mudança; o MuriOps registra o trabalho e seu status, sem alterar ou fazer merge de código sozinho.",
      badges: ["Documento único", "Pacote para IA de dev", "Checklist ao vivo"],
      planStatus: "Plano de aplicação · 2 de 3 aplicados",
      checklist: [
        "Adicionar meta description",
        "Corrigir contraste do botão principal",
        "Revisar Content-Security-Policy",
      ],
    },
    coverage: {
      eyebrow: "Profundidade de diagnóstico",
      title: "O que a análise cobre",
      description:
        "Dez frentes trabalham em conjunto entre a Análise QA padrão e a Análise de Segurança. Cada achado chega com contexto, evidência e prioridade para orientar a próxima ação.",
      modules: [
        ["Crawler inteligente", "Descobre páginas, menus e fluxos sozinho."],
        ["Performance", "LCP, CLS, INP e tempo de carregamento real."],
        ["UI & UX", "Hierarquia, contraste, alvos de clique e usabilidade."],
        ["SEO", "Títulos, metadados, canonical, Open Graph, sitemap e robots."],
        [
          "Acessibilidade",
          "Labels, textos alternativos, foco e teclado (WCAG).",
        ],
        [
          "Segurança passiva",
          "HTTPS/TLS, headers, flags de cookies, CORS, registros DNS de e-mail, arquivos expostos e versões conhecidas de bibliotecas; sem payloads de ataque ou pentest.",
        ],
        [
          "Console & rede",
          "Erros de JavaScript, requisições quebradas e recursos pesados.",
        ],
        [
          "Teste Ativo Autorizado",
          "Opt-in: checagem de rate-limit, indícios de enumeração de usuário e um conjunto curado de payloads de detecção (SQLi/XSS/path traversal), com circuit breaker. Exige consentimento explícito registrado no projeto.",
        ],
        [
          "Análise de segurança via GitHub",
          "Varre um repositório conectado em busca de dependências com CVE conhecida e padrões de código inseguro, sem tocar no site em produção.",
        ],
        ["Comparação de versões", "O que foi corrigido, surgiu ou persiste."],
      ],
    },
    integrations: {
      eyebrow: "Integrações de verdade",
      title: "Conecta com as ferramentas que você já usa",
      description:
        "Nada aqui é decorativo — cada conexão abaixo existe no produto e faz exatamente o que está descrito.",
      items: [
        [
          "Google Drive",
          "Conexão só leitura, por organização. O Guardian lista suas pastas e lê um documento (Google Docs, Sheets, PDF, Excel, CSV/TXT/TSV/JSON) direto do Drive, sem precisar colar o texto manualmente — inclusive para reauditoria automática agendada.",
        ],
        [
          "GitHub",
          "Conecta um repositório (owner/repo/branch) para aplicar o plano de correção via push direto no código, ou para servir de fonte da Análise de Segurança (dependências com CVE, padrões inseguros) e da Atualização (detecta manifestos de dependências e gera plano de upgrade).",
        ],
        [
          "Sua IA de desenvolvimento",
          "A ponte universal gera um link e um token: cole no Claude Code, Cursor, Windsurf, Codex ou qualquer IA de dev — ela lê o plano de correção via curl ou MCP e marca os itens como feitos, sem precisar de chave nossa.",
        ],
        [
          "Claude, OpenAI e Gemini",
          "Cada organização cola a própria chave de API em Configurações. Usadas para interpretar achados e gerar planos de correção, arquitetura (Projetar), planos de upgrade (Atualizar) e auditorias de documentos (Guardian).",
        ],
      ],
    },
    cta: {
      eyebrow: "Acesso ao workspace",
      title: "Crie a linha de base de qualidade de um projeto",
      description:
        "Cadastre um projeto, rode uma análise não invasiva e mantenha achados, planos e histórico de execução no mesmo workspace técnico.",
      dashboard: "Abrir workspace",
      start: "Criar workspace",
    },
  },
  es: {
    eyebrow: "Gestión continua de calidad digital",
    heroBefore: "La calidad deja de ser un informe y se convierte en un",
    heroAccent: "proceso de gestión",
    heroDescription:
      "Organiza proyectos, ejecuta análisis, convierte hallazgos en planes y acompaña cada ciclo de mejora en un workspace conectado.",
    openWorkspace: "Abrir workspace",
    createWorkspace: "Crear mi workspace",
    signInPrompt: "¿Ya tienes una cuenta? Inicia sesión",
    trustLine:
      "Empieza sin tarjeta · Usa tu propia clave de IA · Conserva el control de las aprobaciones",
    cycleEyebrow: "Un ciclo conectado",
    cycleTitle: "Seis frentes, un solo workspace",
    cycleDescription:
      "Desde el primer diagnóstico hasta el seguimiento de las mejoras, cada etapa conserva el contexto del proyecto y prepara la próxima decisión — incluyendo Guardian, una capa de auditoría separada para documentos de negocio, no solo sitios web.",
    howItWorks: "Del origen al trabajo acompañado",
    howItWorksDescription:
      "El flujo principal conecta tres resultados reales: un diagnóstico o plan, un checklist en Aplicación y el seguimiento de la ejecución.",
    steps: [
      {
        n: "01",
        title: "Elige el origen",
        desc: "Ejecuta un análisis del sitio, genera un blueprint de producto o revisa un manifiesto de dependencias.",
      },
      {
        n: "02",
        title: "Revisa el resultado",
        desc: "Comprueba hallazgos, evidencias, riesgos, quality gates o elementos de actualización antes de actuar.",
      },
      {
        n: "03",
        title: "Envía a Aplicación",
        desc: "Convierte el resultado seleccionado en un checklist priorizado con contexto e instrucciones.",
      },
      {
        n: "04",
        title: "Ejecuta y acompaña",
        desc: "Trabaja manualmente, con el puente universal o MCP, o con un adapter configurado; después acompaña estados y reanálisis.",
      },
    ],
    application: {
      eyebrow: "Aplicación",
      title: "Del hallazgo a la tarea de trabajo",
      description:
        "Por ejemplo: un análisis encuentra un título ausente, contraste deficiente y una solicitud rota. Aplicación convierte esos hallazgos en un checklist priorizado, con evidencia e instrucciones. Tu equipo o herramienta de desarrollo realiza el cambio; MuriOps registra el trabajo y su estado, sin editar ni fusionar código por sí solo.",
      badges: [
        "Documento único",
        "Paquete para IA de desarrollo",
        "Checklist en vivo",
      ],
      planStatus: "Plan de aplicación · 2 de 3 aplicados",
      checklist: [
        "Añadir meta description",
        "Corregir el contraste del botón principal",
        "Revisar Content-Security-Policy",
      ],
    },
    coverage: {
      eyebrow: "Profundidad del diagnóstico",
      title: "Qué cubre el análisis",
      description:
        "Diez disciplinas trabajan juntas entre el Análisis QA estándar y el Análisis de Seguridad. Cada hallazgo incluye contexto, evidencia y prioridad para orientar la próxima acción.",
      modules: [
        [
          "Crawler inteligente",
          "Descubre páginas, menús y flujos automáticamente.",
        ],
        ["Rendimiento", "LCP, CLS, INP y tiempo real de carga."],
        ["UI & UX", "Jerarquía, contraste, objetivos de clic y usabilidad."],
        ["SEO", "Títulos, metadatos, canonical, Open Graph, sitemap y robots."],
        [
          "Accesibilidad",
          "Etiquetas, alternativas, foco y navegación por teclado (WCAG).",
        ],
        [
          "Seguridad pasiva",
          "HTTPS/TLS, headers, flags de cookies, CORS, registros DNS de correo, archivos expuestos y versiones conocidas de bibliotecas; sin payloads de ataque ni pentest.",
        ],
        [
          "Consola y red",
          "Errores de JavaScript, solicitudes fallidas y recursos pesados.",
        ],
        [
          "Prueba activa autorizada",
          "Opt-in: verificación de rate-limit, señales de enumeración de usuarios y un conjunto curado de payloads de detección (SQLi/XSS/path traversal), con circuit breaker. Requiere consentimiento explícito registrado en el proyecto.",
        ],
        [
          "Análisis de seguridad vía GitHub",
          "Escanea un repositorio conectado en busca de dependencias con CVE conocida y patrones de código inseguro, sin tocar el sitio en producción.",
        ],
        ["Comparación de versiones", "Qué se corrigió, apareció o permanece."],
      ],
    },
    integrations: {
      eyebrow: "Integraciones reales",
      title: "Conecta con las herramientas que ya usas",
      description:
        "Nada aquí es decorativo — cada conexión de abajo existe en el producto y hace exactamente lo que se describe.",
      items: [
        [
          "Google Drive",
          "Conexión de solo lectura por organización. Guardian lista tus carpetas y lee un documento (Google Docs, Sheets, PDF, Excel, CSV/TXT/TSV/JSON) directo desde Drive, sin necesidad de pegar el texto manualmente — incluida la reauditoría automática programada.",
        ],
        [
          "GitHub",
          "Conecta un repositorio (owner/repo/branch) para aplicar el plan de remediación mediante push directo, o para usarlo como fuente del Análisis de Seguridad (dependencias con CVE, patrones inseguros) y de Actualización (detecta manifiestos de dependencias y genera un plan de actualización).",
        ],
        [
          "Tu IA de desarrollo",
          "El puente universal genera un enlace y un token: pégalo en Claude Code, Cursor, Windsurf, Codex o cualquier IA de desarrollo — lee el plan de remediación vía curl o MCP y marca los elementos como hechos, sin necesitar una clave nuestra.",
        ],
        [
          "Claude, OpenAI y Gemini",
          "Cada organización pega su propia clave de API en Configuración. Se usan para interpretar hallazgos y generar planes de remediación, arquitectura (Blueprint), planes de actualización (Actualizar) y auditorías de documentos (Guardian).",
        ],
      ],
    },
    cta: {
      eyebrow: "Acceso al workspace",
      title: "Crea la línea base de calidad de un proyecto",
      description:
        "Registra un proyecto, ejecuta un análisis no invasivo y mantén hallazgos, planes e historial de ejecución en un mismo workspace técnico.",
      dashboard: "Abrir workspace",
      start: "Crear workspace",
    },
  },
} satisfies Record<Locale, unknown>;

export const FEATURE_COPY = {
  en: {
    outcomeEyebrow: "What you get from this stage",
    understandFlow: "Understand the workflow",
    tabsAria: "MuriOps workflows",
    workspace: "Main workspace",
    sideNav: [
      "Overview",
      "Projects",
      "Analyses",
      "Plan",
      "Applications",
      "Orchestrations",
      "Updates",
      "Guardian",
    ],
    features: [
      {
        key: "analisar",
        label: "Analyses",
        eyebrow: "Diagnosis",
        heading: "Find problems with evidence, not assumptions",
        description:
          "Standard QA Analysis crawls pages and checks UI/UX, performance, SEO, accessibility, console and network behavior. The separate Security Analysis performs passive TLS, DNS, HTTP-header, CORS and exposure checks without attack payloads or penetration testing.",
        outcomes: [
          "Score by dimension",
          "Evidence per finding",
          "Risk filters",
        ],
        route: "Analyses / Report",
      },
      {
        key: "projetar",
        label: "Plan",
        eyebrow: "Planning",
        heading: "Build quality into the project before implementation",
        description:
          "Describe the product and generate a technical foundation with architecture, testing strategy, risks, quality gates and roadmap.",
        outcomes: ["Architecture and stack", "Risk matrix", "Testing strategy"],
        route: "Design / Blueprint",
      },
      {
        key: "aplicar",
        label: "Applications",
        eyebrow: "Execution",
        heading: "Turn recommendations into traceable work",
        description:
          "Analyses, blueprints and upgrades become contextual, prioritized checklists for human execution or your development tool.",
        outcomes: [
          "Prioritized checklist",
          "PDF and universal bridge",
          "Live progress",
        ],
        route: "Applications / Plan",
      },
      {
        key: "automatizar",
        label: "Orchestrations",
        eyebrow: "Orchestration",
        heading: "Repeat the cycle with checkpoints and clear criteria",
        description:
          "Orchestration organizes analyze, evaluate, plan, apply and reanalyze. In the current mode, you control checkpoints and approvals.",
        outcomes: [
          "Quality gates",
          "History by iteration",
          "Controlled resume",
        ],
        route: "Orchestrations / Run",
      },
      {
        key: "guardian",
        label: "Guardian",
        eyebrow: "Business QA",
        heading: "Audit business documents, not just websites",
        description:
          "Paste a spreadsheet export, contract or form — or pick a file straight from a connected Google Drive folder — define optional business rules in plain language, and AI flags inconsistencies and risks with severity, evidence and a suggested fix. Requires a connected AI key.",
        outcomes: [
          "Risk severity per finding",
          "Google Drive file picker",
          "Status tracking per finding",
        ],
        route: "Guardian / Audit",
      },
      {
        key: "acompanhar",
        label: "Overview",
        eyebrow: "Management",
        heading: "See where to act without losing project context",
        description:
          "The workspace brings together scores, recent analyses, applications and projects requiring attention to guide the team's next decision.",
        outcomes: [
          "Consolidated view",
          "Priority projects",
          "Clear next action",
        ],
        route: "Workspace / Overview",
      },
    ],
  },
  pt: {
    outcomeEyebrow: "O que você leva desta etapa",
    understandFlow: "Entender o fluxo",
    tabsAria: "Frentes do MuriOps",
    workspace: "Workspace principal",
    sideNav: [
      "Visão geral",
      "Projetos",
      "Análises",
      "Projetar",
      "Aplicações",
      "Orquestrações",
      "Atualizações",
      "Guardian",
    ],
    features: [
      {
        key: "analisar",
        label: "Análises",
        eyebrow: "Diagnóstico",
        heading: "Encontre problemas com evidências, não com suposições",
        description:
          "A Análise QA padrão percorre páginas e verifica UI/UX, performance, SEO, acessibilidade, console e rede. A Análise de Segurança, executada separadamente, faz checagens passivas de TLS, DNS, headers HTTP, CORS e exposições, sem payloads de ataque ou pentest.",
        outcomes: [
          "Score por dimensão",
          "Evidências por achado",
          "Filtros por risco",
        ],
        route: "Análises / Relatório",
      },
      {
        key: "projetar",
        label: "Projetar",
        eyebrow: "Planejamento",
        heading: "Leve qualidade para o projeto antes da implementação",
        description:
          "Descreva o produto e gere uma base técnica com arquitetura, estratégia de testes, riscos, quality gates e roadmap.",
        outcomes: [
          "Arquitetura e stack",
          "Matriz de riscos",
          "Estratégia de testes",
        ],
        route: "Projetar / Blueprint",
      },
      {
        key: "aplicar",
        label: "Aplicações",
        eyebrow: "Execução",
        heading: "Converta recomendações em trabalho rastreável",
        description:
          "Análises, blueprints e upgrades viram checklists com contexto, prioridade e instruções para execução humana ou assistida.",
        outcomes: [
          "Checklist priorizado",
          "PDF e ponte universal",
          "Progresso ao vivo",
        ],
        route: "Aplicações / Plano",
      },
      {
        key: "automatizar",
        label: "Orquestrações",
        eyebrow: "Orquestração",
        heading: "Repita o ciclo com checkpoints e critérios claros",
        description:
          "A Orquestração organiza analisar, avaliar, gerar plano, aplicar e reanalisar. No modo atual, você controla checkpoints e aprovações.",
        outcomes: [
          "Quality gates",
          "Histórico por iteração",
          "Retomada controlada",
        ],
        route: "Orquestrações / Execução",
      },
      {
        key: "guardian",
        label: "Guardian",
        eyebrow: "QA operacional",
        heading: "Audite documentos de negócio, não só sites",
        description:
          "Cole uma planilha exportada, contrato ou formulário — ou escolha um arquivo direto de uma pasta do Google Drive conectada — defina regras de negócio opcionais em linguagem natural, e a IA aponta inconsistências e riscos com severidade, evidência e correção sugerida. Exige chave de IA conectada.",
        outcomes: [
          "Severidade por achado",
          "Seletor de arquivo do Google Drive",
          "Status por achado",
        ],
        route: "Guardian / Auditoria",
      },
      {
        key: "acompanhar",
        label: "Visão geral",
        eyebrow: "Gestão",
        heading: "Veja onde agir sem perder o contexto dos projetos",
        description:
          "O workspace reúne scores, análises recentes, aplicações e projetos que exigem atenção para orientar a próxima decisão.",
        outcomes: [
          "Visão consolidada",
          "Projetos prioritários",
          "Próxima ação clara",
        ],
        route: "Workspace / Visão geral",
      },
    ],
  },
  es: {
    outcomeEyebrow: "Qué obtienes en esta etapa",
    understandFlow: "Entender el flujo",
    tabsAria: "Frentes de MuriOps",
    workspace: "Workspace principal",
    sideNav: [
      "Vista general",
      "Proyectos",
      "Análisis",
      "Planificar",
      "Aplicaciones",
      "Orquestaciones",
      "Actualizaciones",
      "Guardian",
    ],
    features: [
      {
        key: "analisar",
        label: "Análisis",
        eyebrow: "Diagnóstico",
        heading: "Encuentra problemas con evidencia, no con suposiciones",
        description:
          "El Análisis QA estándar recorre páginas y revisa UI/UX, rendimiento, SEO, accesibilidad, consola y red. El Análisis de Seguridad, ejecutado por separado, realiza comprobaciones pasivas de TLS, DNS, headers HTTP, CORS y exposiciones, sin payloads de ataque ni pentest.",
        outcomes: [
          "Puntuación por dimensión",
          "Evidencia por hallazgo",
          "Filtros por riesgo",
        ],
        route: "Análisis / Informe",
      },
      {
        key: "projetar",
        label: "Diseñar",
        eyebrow: "Planificación",
        heading: "Integra la calidad antes de la implementación",
        description:
          "Describe el producto y genera una base técnica con arquitectura, estrategia de pruebas, riesgos, quality gates y roadmap.",
        outcomes: [
          "Arquitectura y stack",
          "Matriz de riesgos",
          "Estrategia de pruebas",
        ],
        route: "Diseñar / Blueprint",
      },
      {
        key: "aplicar",
        label: "Aplicaciones",
        eyebrow: "Ejecución",
        heading: "Convierte recomendaciones en trabajo rastreable",
        description:
          "Análisis, blueprints y upgrades se convierten en checklists con contexto, prioridad e instrucciones para ejecución humana o asistida.",
        outcomes: [
          "Checklist priorizado",
          "PDF y puente universal",
          "Progreso en vivo",
        ],
        route: "Aplicaciones / Plan",
      },
      {
        key: "automatizar",
        label: "Orquestaciones",
        eyebrow: "Orquestación",
        heading: "Repite el ciclo con checkpoints y criterios claros",
        description:
          "La Orquestación organiza analizar, evaluar, planificar, aplicar y volver a analizar. En el modo actual, controlas checkpoints y aprobaciones.",
        outcomes: [
          "Quality gates",
          "Historial por iteración",
          "Reanudación controlada",
        ],
        route: "Orquestaciones / Ejecución",
      },
      {
        key: "guardian",
        label: "Guardian",
        eyebrow: "QA operativo",
        heading: "Audita documentos de negocio, no solo sitios web",
        description:
          "Pega una hoja de cálculo exportada, contrato o formulario — o elige un archivo directo de una carpeta de Google Drive conectada — define reglas de negocio opcionales en lenguaje natural, y la IA señala inconsistencias y riesgos con severidad, evidencia y corrección sugerida. Requiere una clave de IA conectada.",
        outcomes: [
          "Severidad por hallazgo",
          "Selector de archivos de Google Drive",
          "Estado por hallazgo",
        ],
        route: "Guardian / Auditoría",
      },
      {
        key: "acompanhar",
        label: "Vista general",
        eyebrow: "Gestión",
        heading: "Descubre dónde actuar sin perder el contexto",
        description:
          "El workspace reúne puntuaciones, análisis recientes, aplicaciones y proyectos que requieren atención para orientar la próxima decisión.",
        outcomes: [
          "Vista consolidada",
          "Proyectos prioritarios",
          "Próxima acción clara",
        ],
        route: "Workspace / Vista general",
      },
    ],
  },
} satisfies Record<Locale, unknown>;

export const PREVIEW_COPY = {
  en: {
    analisar: {
      title: "Standard QA analysis",
      badge: "Completed",
      metric: "92",
      metricLabel: "overall score",
      rows: [
        ["UI/UX", "88", "3 findings"],
        ["Accessibility", "94", "1 finding"],
        ["Performance", "91", "2 findings"],
      ],
    },
    projetar: {
      title: "Product blueprint",
      badge: "AI generated",
      metric: "6",
      metricLabel: "quality gates",
      rows: [
        ["Architecture", "Defined", "Next.js + Fastify"],
        ["Testing strategy", "Ready", "4 layers"],
        ["Risks", "Prioritized", "8 mapped"],
      ],
    },
    aplicar: {
      title: "Application plan",
      badge: "In progress",
      metric: "68%",
      metricLabel: "completed",
      rows: [
        ["Fix CTA contrast", "Done", "High"],
        ["Reduce initial JavaScript", "In progress", "High"],
        ["Review heading hierarchy", "Pending", "Medium"],
      ],
    },
    automatizar: {
      title: "Orchestration cycle",
      badge: "Iteration 02",
      metric: "4/5",
      metricLabel: "stages",
      rows: [
        ["Analyze", "Completed", "92 points"],
        ["Evaluate gates", "Completed", "6 approved"],
        ["Reanalyze", "Waiting", "Next stage"],
      ],
    },
    guardian: {
      title: "Business audit",
      badge: "Needs review",
      metric: "3",
      metricLabel: "open findings",
      rows: [
        ["Expense category formula error", "High", "#ERROR! in every row"],
        ["Duplicate invoice number", "Medium", "Rows 12 and 47"],
        ["Missing renewal date", "Medium", "Vendor contract, clause 4"],
      ],
    },
    acompanhar: {
      title: "Workspace health",
      badge: "Updated now",
      metric: "87",
      metricLabel: "overall average",
      rows: [
        ["Main store", "Healthy", "94 points"],
        ["Customer portal", "Attention", "72 points"],
        ["Documentation", "Healthy", "91 points"],
      ],
    },
  },
  pt: {
    analisar: {
      title: "Análise QA padrão",
      badge: "Concluída",
      metric: "92",
      metricLabel: "score geral",
      rows: [
        ["UI/UX", "88", "3 achados"],
        ["Acessibilidade", "94", "1 achado"],
        ["Performance", "91", "2 achados"],
      ],
    },
    projetar: {
      title: "Blueprint do produto",
      badge: "Gerado pela IA",
      metric: "6",
      metricLabel: "quality gates",
      rows: [
        ["Arquitetura", "Definida", "Next.js + Fastify"],
        ["Estratégia de testes", "Pronta", "4 camadas"],
        ["Riscos", "Priorizados", "8 mapeados"],
      ],
    },
    aplicar: {
      title: "Plano de aplicação",
      badge: "Em progresso",
      metric: "68%",
      metricLabel: "concluído",
      rows: [
        ["Corrigir contraste do CTA", "Feito", "Alta"],
        ["Reduzir JavaScript inicial", "Em curso", "Alta"],
        ["Revisar hierarquia de títulos", "Pendente", "Média"],
      ],
    },
    automatizar: {
      title: "Ciclo de orquestração",
      badge: "Iteração 02",
      metric: "4/5",
      metricLabel: "etapas",
      rows: [
        ["Analisar", "Concluído", "92 pontos"],
        ["Avaliar gates", "Concluído", "6 aprovados"],
        ["Reanalisar", "Aguardando", "Próxima etapa"],
      ],
    },
    guardian: {
      title: "Auditoria de negócio",
      badge: "Precisa de revisão",
      metric: "3",
      metricLabel: "achados abertos",
      rows: [
        ["Erro de fórmula na categoria de despesa", "Alto", "#ERROR! em todas as linhas"],
        ["Número de nota fiscal duplicado", "Médio", "Linhas 12 e 47"],
        ["Data de renovação ausente", "Médio", "Contrato de fornecedor, cláusula 4"],
      ],
    },
    acompanhar: {
      title: "Saúde do workspace",
      badge: "Atualizado agora",
      metric: "87",
      metricLabel: "média geral",
      rows: [
        ["Loja principal", "Saudável", "94 pontos"],
        ["Portal de clientes", "Atenção", "72 pontos"],
        ["Documentação", "Saudável", "91 pontos"],
      ],
    },
  },
  es: {
    analisar: {
      title: "Análisis QA estándar",
      badge: "Completado",
      metric: "92",
      metricLabel: "puntuación general",
      rows: [
        ["UI/UX", "88", "3 hallazgos"],
        ["Accesibilidad", "94", "1 hallazgo"],
        ["Rendimiento", "91", "2 hallazgos"],
      ],
    },
    projetar: {
      title: "Blueprint del producto",
      badge: "Generado por IA",
      metric: "6",
      metricLabel: "quality gates",
      rows: [
        ["Arquitectura", "Definida", "Next.js + Fastify"],
        ["Estrategia de pruebas", "Lista", "4 capas"],
        ["Riesgos", "Priorizados", "8 mapeados"],
      ],
    },
    aplicar: {
      title: "Plan de aplicación",
      badge: "En progreso",
      metric: "68%",
      metricLabel: "completado",
      rows: [
        ["Corregir contraste del CTA", "Hecho", "Alta"],
        ["Reducir JavaScript inicial", "En curso", "Alta"],
        ["Revisar jerarquía de títulos", "Pendiente", "Media"],
      ],
    },
    automatizar: {
      title: "Ciclo de orquestación",
      badge: "Iteración 02",
      metric: "4/5",
      metricLabel: "etapas",
      rows: [
        ["Analizar", "Completado", "92 puntos"],
        ["Evaluar gates", "Completado", "6 aprobados"],
        ["Volver a analizar", "En espera", "Próxima etapa"],
      ],
    },
    guardian: {
      title: "Auditoría de negocio",
      badge: "Necesita revisión",
      metric: "3",
      metricLabel: "hallazgos abiertos",
      rows: [
        ["Error de fórmula en categoría de gasto", "Alto", "#ERROR! en todas las filas"],
        ["Número de factura duplicado", "Medio", "Filas 12 y 47"],
        ["Falta fecha de renovación", "Medio", "Contrato de proveedor, cláusula 4"],
      ],
    },
    acompanhar: {
      title: "Salud del workspace",
      badge: "Actualizado ahora",
      metric: "87",
      metricLabel: "promedio general",
      rows: [
        ["Tienda principal", "Saludable", "94 puntos"],
        ["Portal de clientes", "Atención", "72 puntos"],
        ["Documentación", "Saludable", "91 puntos"],
      ],
    },
  },
} satisfies Record<Locale, unknown>;

export const AUTH_COPY = {
  en: {
    benefits: [
      "Centralize projects, analyses and applications",
      "Track the quality cycle from end to end",
      "Use your own AI key, protected by encryption",
    ],
    category: "Digital quality management",
    pitchTitle: "One workspace to analyze, plan and apply improvements.",
    pitchDescription:
      "Organize quality work as a continuous process with context, history and integrations in one place.",
    help: "Need help?",
    login: {
      title: "Sign in to your workspace",
      description: "Access your projects, analyses and application plans.",
      divider: "or continue with email",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "Your password",
      submitting: "Signing in…",
      submit: "Sign in",
      noAccount: "Don't have an account yet?",
      create: "Create account",
      error: "Unable to sign in.",
      googleError: "Unable to sign in with Google",
    },
    register: {
      title: "Create your workspace",
      description:
        "Start organizing projects and tracking quality in one place.",
      pendingBefore: "After signing up, you can add",
      pendingAfter: "as a project.",
      divider: "or sign up with email",
      name: "Your name",
      namePlaceholder: "What should we call you?",
      email: "Email",
      emailPlaceholder: "you@company.com",
      password: "Password",
      passwordPlaceholder: "At least 8 characters",
      passwordHelp: "Use a unique password with at least 8 characters.",
      submitting: "Creating account…",
      submit: "Create account",
      termsBefore: "By creating an account, you agree to the",
      terms: "Terms of use",
      termsJoin: "and the",
      privacy: "Privacy Policy",
      haveAccount: "Already have an account?",
      signIn: "Sign in",
      preparing: "Preparing sign-up…",
      error: "Unable to create your account.",
      humanCheckLabel: "Security check",
      humanCheckInputLabel: "Type the numbers shown above",
      humanCheckPlaceholder: "6-digit code",
      humanCheckRefresh: "refreshes in",
      humanCheckError: "Couldn't load the code — check your connection.",
    },
  },
  pt: {
    benefits: [
      "Centralize projetos, análises e aplicações",
      "Acompanhe o ciclo de qualidade de ponta a ponta",
      "Use sua própria chave de IA, protegida por criptografia",
    ],
    category: "Gestão de qualidade digital",
    pitchTitle: "Um workspace para analisar, planejar e aplicar melhorias.",
    pitchDescription:
      "Organize o trabalho de qualidade como um processo contínuo, com contexto, histórico e integrações no mesmo lugar.",
    help: "Precisa de ajuda?",
    login: {
      title: "Entre no seu workspace",
      description: "Acesse seus projetos, análises e planos de aplicação.",
      divider: "ou continue com e-mail",
      email: "E-mail",
      emailPlaceholder: "voce@empresa.com",
      password: "Senha",
      passwordPlaceholder: "Sua senha",
      submitting: "Entrando…",
      submit: "Entrar",
      noAccount: "Ainda não tem uma conta?",
      create: "Criar conta",
      error: "Não foi possível entrar.",
      googleError: "Falha ao entrar com Google",
    },
    register: {
      title: "Crie seu workspace",
      description:
        "Comece organizando seus projetos e acompanhando a qualidade em um único lugar.",
      pendingBefore: "Depois do cadastro, você poderá adicionar",
      pendingAfter: "como projeto.",
      divider: "ou cadastre-se com e-mail",
      name: "Seu nome",
      namePlaceholder: "Como devemos chamar você?",
      email: "E-mail",
      emailPlaceholder: "voce@empresa.com",
      password: "Senha",
      passwordPlaceholder: "Mínimo de 8 caracteres",
      passwordHelp: "Use uma senha exclusiva, com pelo menos 8 caracteres.",
      submitting: "Criando conta…",
      submit: "Criar conta",
      termsBefore: "Ao criar uma conta, você concorda com os",
      terms: "Termos de uso",
      termsJoin: "e a",
      privacy: "Política de privacidade",
      haveAccount: "Já possui uma conta?",
      signIn: "Entrar",
      preparing: "Preparando cadastro…",
      error: "Não foi possível criar sua conta.",
      humanCheckLabel: "Verificação de segurança",
      humanCheckInputLabel: "Digite os números que você vê acima",
      humanCheckPlaceholder: "Código de 6 dígitos",
      humanCheckRefresh: "atualiza em",
      humanCheckError: "Não foi possível carregar o código — confira sua conexão.",
    },
  },
  es: {
    benefits: [
      "Centraliza proyectos, análisis y aplicaciones",
      "Acompaña el ciclo de calidad de principio a fin",
      "Usa tu propia clave de IA, protegida con cifrado",
    ],
    category: "Gestión de calidad digital",
    pitchTitle: "Un workspace para analizar, planificar y aplicar mejoras.",
    pitchDescription:
      "Organiza el trabajo de calidad como un proceso continuo, con contexto, historial e integraciones en un solo lugar.",
    help: "¿Necesitas ayuda?",
    login: {
      title: "Entra en tu workspace",
      description: "Accede a tus proyectos, análisis y planes de aplicación.",
      divider: "o continúa con email",
      email: "Email",
      emailPlaceholder: "tu@empresa.com",
      password: "Contraseña",
      passwordPlaceholder: "Tu contraseña",
      submitting: "Iniciando sesión…",
      submit: "Iniciar sesión",
      noAccount: "¿Aún no tienes una cuenta?",
      create: "Crear cuenta",
      error: "No fue posible iniciar sesión.",
      googleError: "No fue posible iniciar sesión con Google",
    },
    register: {
      title: "Crea tu workspace",
      description:
        "Empieza a organizar proyectos y acompañar la calidad en un solo lugar.",
      pendingBefore: "Después del registro, podrás añadir",
      pendingAfter: "como proyecto.",
      divider: "o regístrate con email",
      name: "Tu nombre",
      namePlaceholder: "¿Cómo debemos llamarte?",
      email: "Email",
      emailPlaceholder: "tu@empresa.com",
      password: "Contraseña",
      passwordPlaceholder: "Mínimo 8 caracteres",
      passwordHelp: "Usa una contraseña única de al menos 8 caracteres.",
      submitting: "Creando cuenta…",
      submit: "Crear cuenta",
      termsBefore: "Al crear una cuenta, aceptas los",
      terms: "Términos de uso",
      termsJoin: "y la",
      privacy: "Política de privacidad",
      haveAccount: "¿Ya tienes una cuenta?",
      signIn: "Iniciar sesión",
      preparing: "Preparando registro…",
      error: "No fue posible crear tu cuenta.",
      humanCheckLabel: "Verificación de seguridad",
      humanCheckInputLabel: "Escribe los números que ves arriba",
      humanCheckPlaceholder: "Código de 6 dígitos",
      humanCheckRefresh: "se actualiza en",
      humanCheckError: "No se pudo cargar el código — revisa tu conexión.",
    },
  },
} satisfies Record<Locale, unknown>;

export const DOCS_SHELL_COPY = {
  en: {
    overview: "Overview",
    guide: "User guide",
    features: "Features",
    integrations: "Integrations",
    firstSteps: "Getting started",
    docs: "Documentation",
    navAria: "Documentation",
  },
  pt: {
    overview: "Visão geral",
    guide: "Guia de uso",
    features: "Funcionalidades",
    integrations: "Integrações",
    firstSteps: "Primeiros passos",
    docs: "Documentação",
    navAria: "Documentação",
  },
  es: {
    overview: "Vista general",
    guide: "Guía de uso",
    features: "Funciones",
    integrations: "Integraciones",
    firstSteps: "Primeros pasos",
    docs: "Documentación",
    navAria: "Documentación",
  },
} satisfies Record<Locale, unknown>;

export const LEGAL_SHELL_COPY = {
  en: { legal: "Legal", updated: "Updated July 28, 2026" },
  pt: { legal: "Legal", updated: "Atualizado em 28 de julho de 2026" },
  es: { legal: "Legal", updated: "Actualizado el 28 de julio de 2026" },
} satisfies Record<Locale, unknown>;
