import type { Locale } from "@/lib/i18n";
import { PRIVACY_EMAIL } from "@/lib/privacy";

export const LEGAL_COPY = {
  en: {
    terms: {
      title: "Terms of use",
      description: "Essential terms for using MuriOps responsibly.",
      sections: [
        {
          title: "1. Authorized use",
          paragraphs: [
            "You may register and analyze only websites, stores, servers and repositories that you manage or have explicit permission to test. Do not use the service to bypass access controls, disrupt systems or test third parties without authorization.",
          ],
        },
        {
          title: "2. How the service works",
          paragraphs: [
            "MuriOps combines crawling, browser automation and technical checks to produce scores, findings and evidence. When you configure your own key, AI providers may interpret this data and generate summaries, blueprints and plans.",
            "Automated results may contain false positives, omissions or recommendations that do not fit your environment. Human review remains necessary before any production change.",
          ],
        },
        {
          title: "3. Application and integrations",
          paragraphs: [
            "Some connections write data to external systems. GitHub may create branches, checklists and pull requests. These actions depend on the credentials and permissions you provide.",
            "These records do not guarantee that a technical fix was implemented. MuriOps does not automatically merge on GitHub and should not publish drafts without a subsequent action by an authorized person.",
          ],
        },
        {
          title: "4. Credentials and security",
          paragraphs: [
            "You are responsible for providing least-privilege credentials, monitoring their use and revoking them at the source when a connection is no longer needed. Do not share credentials in fields not intended for secrets.",
          ],
        },
        {
          title: "5. Availability and responsibility",
          paragraphs: [
            "The service is provided “as is” and may experience outages, changes or limitations. Keep backups, use test environments when possible and validate every change before publication. You remain responsible for decisions based on reports and for the effects of integrations you authorize.",
            "You are also responsible for the lawfulness and accuracy of the content and personal data submitted, for obtaining required permissions, and for complying with the terms of each connected platform. Do not treat automated output as legal, security or professional advice.",
          ],
        },
        {
          title: "6. Contact",
          paragraphs: [
            `Questions about these terms can be sent to ${PRIVACY_EMAIL}.`,
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy",
      description:
        "What data is used, why it is needed and which controls are available.",
      sections: [
        {
          title: "1. Account and organization data",
          paragraphs: [
            "We store information required for authentication and workspace operation, such as name, email, Google identifier when used and organization membership. Passwords are stored as derived values, not plain text.",
            "The browser stores the authenticated session token locally. Strictly functional cookies remember the selected interface language and whether the cookie notice was acknowledged. MuriOps currently does not use advertising or behavioral analytics cookies.",
          ],
        },
        {
          title: "2. Projects and results",
          paragraphs: [
            "We store registered URLs, settings, discovered pages, scores, findings, technical evidence and generated results. This data supports history, run comparisons and remediation plans.",
            "Do not place secrets in names, descriptions or URLs. An analysis may observe content publicly exposed by the analyzed website.",
          ],
        },
        {
          title: "3. AI providers",
          paragraphs: [
            "When you configure Claude, OpenAI or Gemini, relevant parts of findings, descriptions or plans are sent to the selected provider for processing. That provider's terms and policies also apply.",
            "Without your own configured key, MuriOps does not silently use a shared key: responses fall back to deterministic mode.",
          ],
        },
        {
          title: "4. Integration credentials",
          paragraphs: [
            "AI keys and third-party integration credentials are encrypted before database storage and decrypted only for the requested operation. MuriOps-generated bridge tokens are access credentials stored for exact lookup; protect and regenerate them if exposed. Always use minimum-scope credentials and revoke third-party access at the source when disconnecting a service.",
          ],
        },
        {
          title: "5. Sharing and retention",
          paragraphs: [
            "We do not sell personal data. Data may be processed by essential hosting, database, authentication and user-selected provider services only as needed to deliver the product.",
            "Projects, analyses and blueprints can be deleted in their respective areas. An authenticated user can download an account data copy or permanently delete the account under Settings. Some records may be retained only when required by law, to exercise legal rights or to prevent fraud and abuse.",
          ],
        },
        {
          title: "6. Your data rights",
          paragraphs: [
            "Subject to applicable law, you may request confirmation of processing, access, correction, portability, anonymization, blocking or deletion of eligible data, information about sharing, and review of consent choices.",
            "Account export deliberately excludes passwords, credential material, AI keys, bridge tokens and webhook secrets. These secrets are never included in download links or query parameters.",
          ],
        },
        {
          title: "7. Contact",
          paragraphs: [
            `Privacy requests can be sent to ${PRIVACY_EMAIL}.`,
          ],
        },
      ],
    },
  },
  pt: {
    terms: {
      title: "Termos de uso",
      description:
        "As condições essenciais para utilizar o MuriOps de forma responsável.",
      sections: [
        {
          title: "1. Uso autorizado",
          paragraphs: [
            "Você deve cadastrar e analisar apenas sites, lojas, servidores e repositórios que administra ou para os quais possui autorização explícita. Não use o serviço para contornar controles de acesso, interromper sistemas ou testar terceiros sem permissão.",
          ],
        },
        {
          title: "2. Como o serviço funciona",
          paragraphs: [
            "O MuriOps combina crawler, automação de navegador e verificações técnicas para produzir scores, achados e evidências. Quando uma chave própria é configurada, provedores de IA podem interpretar esses dados e gerar resumos, blueprints e planos.",
            "Resultados automatizados podem conter falsos positivos, omissões ou recomendações inadequadas ao seu ambiente. A revisão humana continua necessária antes de qualquer alteração em produção.",
          ],
        },
        {
          title: "3. Aplicação e integrações",
          paragraphs: [
            "Algumas conexões escrevem dados em sistemas externos. GitHub pode criar branches, checklists e pull requests. Essas ações dependem das credenciais e permissões fornecidas.",
            "Esses registros não garantem que a correção técnica tenha sido implementada. O MuriOps não faz merge automático no GitHub e não deve publicar rascunhos sem uma ação posterior de uma pessoa autorizada.",
          ],
        },
        {
          title: "4. Credenciais e segurança",
          paragraphs: [
            "Você é responsável por fornecer credenciais com o menor privilégio necessário, acompanhar seu uso e revogá-las na plataforma de origem quando a conexão não for mais necessária. Não compartilhe credenciais em campos que não sejam destinados a elas.",
          ],
        },
        {
          title: "5. Disponibilidade e responsabilidade",
          paragraphs: [
            "O serviço é fornecido “como está” e pode passar por indisponibilidades, alterações ou limitações. Faça backup, use ambientes de teste quando possível e valide toda mudança antes de publicá-la. Você permanece responsável pelas decisões tomadas a partir dos relatórios e pelos efeitos das integrações que autorizar.",
            "Você também responde pela licitude e exatidão do conteúdo e dos dados pessoais enviados, pela obtenção das autorizações necessárias e pelo cumprimento dos termos de cada plataforma conectada. Não trate resultados automatizados como aconselhamento jurídico, de segurança ou profissional.",
          ],
        },
        {
          title: "6. Contato",
          paragraphs: [
            `Dúvidas sobre estes termos podem ser enviadas para ${PRIVACY_EMAIL}.`,
          ],
        },
      ],
    },
    privacy: {
      title: "Privacidade",
      description:
        "Quais dados são utilizados, por que são necessários e quais controles estão disponíveis.",
      sections: [
        {
          title: "1. Dados de conta e organização",
          paragraphs: [
            "Armazenamos informações necessárias para autenticação e operação do workspace, como nome, e-mail, identificador do Google quando usado e vínculo com a organização. Senhas são armazenadas de forma derivada, não em texto puro.",
            "O navegador armazena localmente o token da sessão autenticada. Cookies estritamente funcionais memorizam o idioma escolhido e se o aviso de cookies foi reconhecido. O MuriOps atualmente não usa cookies de publicidade nem de análise comportamental.",
          ],
        },
        {
          title: "2. Projetos e resultados",
          paragraphs: [
            "Guardamos URLs cadastradas, configurações, páginas descobertas, scores, achados, evidências técnicas e resultados gerados. Esses dados permitem apresentar histórico, comparar execuções e montar planos de remediação.",
            "Não cadastre segredos em nomes, descrições ou URLs. Uma análise pode observar conteúdo publicamente exposto pelo próprio site analisado.",
          ],
        },
        {
          title: "3. Provedores de IA",
          paragraphs: [
            "Quando você configura Claude, OpenAI ou Gemini, partes relevantes dos achados, descrições ou planos são enviadas ao provedor escolhido para processamento. O tratamento realizado por esse provedor também segue os termos e políticas dele.",
            "Sem uma chave própria configurada, o MuriOps não utiliza silenciosamente uma chave compartilhada: as respostas degradam para o modo determinístico.",
          ],
        },
        {
          title: "4. Credenciais de integrações",
          paragraphs: [
            "Chaves de IA e credenciais de integrações de terceiros são criptografadas antes do armazenamento e descriptografadas somente para a operação solicitada. Tokens de ponte gerados pelo MuriOps são credenciais de acesso armazenadas para busca exata; proteja-os e regenere-os se houver exposição. Use sempre o menor escopo necessário e revogue acessos de terceiros na origem ao desconectar um serviço.",
          ],
        },
        {
          title: "5. Compartilhamento e retenção",
          paragraphs: [
            "Não vendemos dados pessoais. Dados podem ser processados por serviços essenciais de hospedagem, banco, autenticação e provedores escolhidos por você, na medida necessária para entregar o produto.",
            "Projetos, análises e blueprints podem ser apagados nas áreas correspondentes. A pessoa autenticada pode baixar uma cópia dos dados da conta ou excluir a conta permanentemente em Configurações. Alguns registros poderão ser conservados somente quando a lei exigir, para o exercício regular de direitos ou para prevenção a fraude e abuso.",
          ],
        },
        {
          title: "6. Seus direitos sobre os dados",
          paragraphs: [
            "Nos termos da legislação aplicável, você pode solicitar confirmação do tratamento, acesso, correção, portabilidade, anonimização, bloqueio ou eliminação dos dados cabíveis, informações sobre compartilhamento e revisão das escolhas de consentimento.",
            "A exportação exclui deliberadamente senhas, credenciais, chaves de IA, tokens de ponte e segredos de webhook. Esses segredos nunca são incluídos em links de download ou parâmetros de URL.",
          ],
        },
        {
          title: "7. Contato",
          paragraphs: [
            `Solicitações de privacidade podem ser enviadas para ${PRIVACY_EMAIL}.`,
          ],
        },
      ],
    },
  },
  es: {
    terms: {
      title: "Términos de uso",
      description:
        "Condiciones esenciales para utilizar MuriOps de forma responsable.",
      sections: [
        {
          title: "1. Uso autorizado",
          paragraphs: [
            "Debes registrar y analizar solo sitios, tiendas, servidores y repositorios que administras o para los que tienes autorización explícita. No uses el servicio para eludir controles de acceso, interrumpir sistemas o probar a terceros sin permiso.",
          ],
        },
        {
          title: "2. Cómo funciona el servicio",
          paragraphs: [
            "MuriOps combina crawling, automatización del navegador y verificaciones técnicas para producir puntuaciones, hallazgos y evidencias. Al configurar tu propia clave, proveedores de IA pueden interpretar estos datos y generar resúmenes, blueprints y planes.",
            "Los resultados automatizados pueden contener falsos positivos, omisiones o recomendaciones inadecuadas para tu entorno. La revisión humana sigue siendo necesaria antes de cualquier cambio en producción.",
          ],
        },
        {
          title: "3. Aplicación e integraciones",
          paragraphs: [
            "Algunas conexiones escriben datos en sistemas externos. GitHub puede crear branches, checklists y pull requests. Estas acciones dependen de las credenciales y permisos proporcionados.",
            "Estos registros no garantizan que la corrección técnica se haya implementado. MuriOps no hace merge automático en GitHub y no debe publicar borradores sin una acción posterior de una persona autorizada.",
          ],
        },
        {
          title: "4. Credenciales y seguridad",
          paragraphs: [
            "Eres responsable de proporcionar credenciales con el menor privilegio necesario, supervisar su uso y revocarlas en el origen cuando la conexión deje de ser necesaria. No compartas credenciales en campos no destinados a secretos.",
          ],
        },
        {
          title: "5. Disponibilidad y responsabilidad",
          paragraphs: [
            "El servicio se proporciona “tal cual” y puede experimentar indisponibilidad, cambios o limitaciones. Mantén copias de seguridad, usa entornos de prueba cuando sea posible y valida cada cambio antes de publicarlo. Sigues siendo responsable de las decisiones tomadas a partir de los informes y de los efectos de las integraciones autorizadas.",
            "También eres responsable de la legalidad y exactitud del contenido y de los datos personales enviados, de obtener las autorizaciones necesarias y de cumplir los términos de cada plataforma conectada. No consideres los resultados automatizados como asesoramiento legal, de seguridad o profesional.",
          ],
        },
        {
          title: "6. Contacto",
          paragraphs: [
            `Las preguntas sobre estos términos pueden enviarse a ${PRIVACY_EMAIL}.`,
          ],
        },
      ],
    },
    privacy: {
      title: "Privacidad",
      description:
        "Qué datos se utilizan, por qué son necesarios y qué controles están disponibles.",
      sections: [
        {
          title: "1. Datos de cuenta y organización",
          paragraphs: [
            "Almacenamos información necesaria para la autenticación y operación del workspace, como nombre, email, identificador de Google cuando se usa y vínculo con la organización. Las contraseñas se almacenan como valores derivados, no en texto plano.",
            "El navegador almacena localmente el token de la sesión autenticada. Las cookies estrictamente funcionales recuerdan el idioma elegido y si se reconoció el aviso de cookies. MuriOps actualmente no utiliza cookies publicitarias ni de analítica del comportamiento.",
          ],
        },
        {
          title: "2. Proyectos y resultados",
          paragraphs: [
            "Guardamos URLs registradas, ajustes, páginas descubiertas, puntuaciones, hallazgos, evidencia técnica y resultados generados. Estos datos permiten mostrar el historial, comparar ejecuciones y crear planes de remediación.",
            "No registres secretos en nombres, descripciones o URLs. Un análisis puede observar contenido expuesto públicamente por el sitio analizado.",
          ],
        },
        {
          title: "3. Proveedores de IA",
          paragraphs: [
            "Cuando configuras Claude, OpenAI o Gemini, partes relevantes de los hallazgos, descripciones o planes se envían al proveedor seleccionado para su procesamiento. También se aplican los términos y políticas de ese proveedor.",
            "Sin una clave propia configurada, MuriOps no usa silenciosamente una clave compartida: las respuestas pasan al modo determinista.",
          ],
        },
        {
          title: "4. Credenciales de integraciones",
          paragraphs: [
            "Las claves de IA y credenciales de integraciones de terceros se cifran antes del almacenamiento y se descifran solo para la operación solicitada. Los tokens de puente generados por MuriOps son credenciales de acceso almacenadas para búsqueda exacta; protégelos y regenéralos si quedan expuestos. Usa siempre el menor alcance necesario y revoca accesos de terceros en el origen al desconectar un servicio.",
          ],
        },
        {
          title: "5. Compartición y retención",
          paragraphs: [
            "No vendemos datos personales. Los datos pueden ser procesados por servicios esenciales de alojamiento, base de datos, autenticación y proveedores elegidos por ti, solo en la medida necesaria para entregar el producto.",
            "Los proyectos, análisis y blueprints pueden eliminarse en sus áreas correspondientes. La persona autenticada puede descargar una copia de los datos de la cuenta o eliminarla permanentemente en Configuración. Algunos registros podrán conservarse solo cuando la ley lo exija, para ejercer derechos legales o prevenir fraude y abuso.",
          ],
        },
        {
          title: "6. Tus derechos sobre los datos",
          paragraphs: [
            "Sujeto a la legislación aplicable, puedes solicitar confirmación del tratamiento, acceso, corrección, portabilidad, anonimización, bloqueo o eliminación de los datos correspondientes, información sobre transferencias y revisión de las opciones de consentimiento.",
            "La exportación excluye deliberadamente contraseñas, credenciales, claves de IA, tokens de puente y secretos de webhook. Estos secretos nunca se incluyen en enlaces de descarga ni parámetros de URL.",
          ],
        },
        {
          title: "7. Contacto",
          paragraphs: [
            `Las solicitudes de privacidad pueden enviarse a ${PRIVACY_EMAIL}.`,
          ],
        },
      ],
    },
  },
} satisfies Record<Locale, unknown>;
