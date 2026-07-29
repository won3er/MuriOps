export const LOCALES = ["en", "pt", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "muriops-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
};

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  pt: "pt-BR",
  es: "es",
};

export const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  en: "en_US",
  pt: "pt_BR",
  es: "es_ES",
};

const PUBLIC_PATHS = [
  "/",
  "/docs",
  "/docs/guia",
  "/docs/funcionalidades",
  "/docs/integracoes",
  "/termos",
  "/privacidade",
  "/login",
  "/register",
] as const;

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : null;
}

export function stripLocale(pathname: string): string {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname || "/";

  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
  return stripped || "/";
}

export function isPublicPath(pathname: string): boolean {
  const cleanPath = stripLocale(pathname);
  return PUBLIC_PATHS.some(
    (path) =>
      cleanPath === path ||
      (path === "/docs" && cleanPath.startsWith("/docs/")),
  );
}

export function localizedPath(locale: Locale, href: string): string {
  if (
    href.startsWith("http") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  ) {
    return href;
  }

  const [pathname, suffix = ""] = href.split(/(?=[?#])/u, 2);
  if (!isPublicPath(pathname)) return href;

  const cleanPath = stripLocale(pathname);
  if (locale === DEFAULT_LOCALE) {
    return `${cleanPath}${suffix}`;
  }
  return `/${locale}${cleanPath === "/" ? "" : cleanPath}${suffix}`;
}

export const SEO_COPY: Record<
  Locale,
  { title: string; description: string; shortDescription: string }
> = {
  en: {
    title: "MuriOps (Muri Ops) — Continuous Website Quality Management",
    description:
      "MuriOps connects website QA findings across UX, performance, SEO, accessibility, console/network behavior and passive security configuration checks to prioritized, trackable work.",
    shortDescription:
      "Continuous quality management for digital products, from diagnosis to implementation.",
  },
  pt: {
    title: "MuriOps (Muri Ops) — Gestão contínua de qualidade digital",
    description:
      "O MuriOps conecta achados de QA em UX, performance, SEO, acessibilidade, console/rede e verificações passivas de configuração de segurança a trabalho priorizado e rastreável.",
    shortDescription:
      "Gestão contínua de qualidade para produtos digitais, do diagnóstico à aplicação.",
  },
  es: {
    title: "MuriOps (Muri Ops) — Gestión continua de calidad digital",
    description:
      "MuriOps conecta hallazgos de QA en UX, rendimiento, SEO, accesibilidad, consola/red y verificaciones pasivas de configuración de seguridad con trabajo priorizado y rastreable.",
    shortDescription:
      "Gestión continua de calidad para productos digitales, del diagnóstico a la aplicación.",
  },
};

export const PUBLIC_COPY = {
  en: {
    skip: "Skip to content",
    navAria: "Public navigation",
    mobileNavAria: "Mobile public navigation",
    homeAria: "MuriOps — home",
    guide: "Guide",
    features: "Features",
    integrations: "Integrations",
    signIn: "Sign in",
    openWorkspace: "Open workspace",
    openApp: "Open app",
    createAccount: "Create account",
    closeMenu: "Close menu",
    openMenu: "Open menu",
    language: "Language",
    footer: {
      product: "Product",
      resources: "Resources",
      legal: "Legal",
      guide: "User guide",
      features: "Features",
      integrations: "Integrations",
      docs: "Documentation",
      signIn: "Sign in",
      createAccount: "Create account",
      terms: "Terms of use",
      privacy: "Privacy",
      contact: "Contact",
      tagline:
        "Continuous quality management for digital products, from diagnosis to implementation.",
      closing: "Quality is a continuous process.",
    },
  },
  pt: {
    skip: "Pular para o conteúdo",
    navAria: "Navegação pública",
    mobileNavAria: "Navegação pública móvel",
    homeAria: "MuriOps — página inicial",
    guide: "Guia",
    features: "Funcionalidades",
    integrations: "Integrações",
    signIn: "Entrar",
    openWorkspace: "Abrir workspace",
    openApp: "Abrir app",
    createAccount: "Criar conta",
    closeMenu: "Fechar menu",
    openMenu: "Abrir menu",
    language: "Idioma",
    footer: {
      product: "Produto",
      resources: "Recursos",
      legal: "Legal",
      guide: "Guia de uso",
      features: "Funcionalidades",
      integrations: "Integrações",
      docs: "Documentação",
      signIn: "Entrar",
      createAccount: "Criar conta",
      terms: "Termos de uso",
      privacy: "Privacidade",
      contact: "Contato",
      tagline:
        "Gestão contínua de qualidade para produtos digitais, do diagnóstico à aplicação.",
      closing: "Qualidade é um processo contínuo.",
    },
  },
  es: {
    skip: "Saltar al contenido",
    navAria: "Navegación pública",
    mobileNavAria: "Navegación pública móvil",
    homeAria: "MuriOps — inicio",
    guide: "Guía",
    features: "Funciones",
    integrations: "Integraciones",
    signIn: "Iniciar sesión",
    openWorkspace: "Abrir workspace",
    openApp: "Abrir app",
    createAccount: "Crear cuenta",
    closeMenu: "Cerrar menú",
    openMenu: "Abrir menú",
    language: "Idioma",
    footer: {
      product: "Producto",
      resources: "Recursos",
      legal: "Legal",
      guide: "Guía de uso",
      features: "Funciones",
      integrations: "Integraciones",
      docs: "Documentación",
      signIn: "Iniciar sesión",
      createAccount: "Crear cuenta",
      terms: "Términos de uso",
      privacy: "Privacidad",
      contact: "Contacto",
      tagline:
        "Gestión continua de calidad para productos digitales, del diagnóstico a la aplicación.",
      closing: "La calidad es un proceso continuo.",
    },
  },
} as const;
