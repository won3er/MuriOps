import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/lib/providers";
import {
  DEFAULT_LOCALE,
  HTML_LANG,
  OPEN_GRAPH_LOCALE,
  SEO_COPY,
  isLocale,
  type Locale,
} from "@/lib/i18n";
import { AUTH_COPY } from "@/lib/public-copy";
import { DOCS_COPY } from "@/lib/docs-copy";
import { LEGAL_COPY } from "@/lib/legal-copy";
import "./globals.css";

// Face humanista pra texto/UI — evita o Inter/Space Grotesk padrão de projeto de IA.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Face monoespaçada só pra dado técnico (score, ms, status code, seletor CSS)
// — alinha dígitos em coluna e reforça a leitura de "instrumento de análise".
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://muriops.com.br";

function requestLocale(): Locale {
  const headerLocale = headers().get("x-muriops-locale");
  if (isLocale(headerLocale)) return headerLocale;
  // A área interna ainda usa a terminologia operacional em pt-BR. As rotas
  // públicas sempre recebem o locale pelo middleware.
  return headers().get("x-muriops-public-path") ? DEFAULT_LOCALE : "pt";
}

export function generateMetadata(): Metadata {
  const locale = requestLocale();
  const seoCopy = SEO_COPY[locale];
  const publicPath = headers().get("x-muriops-public-path");
  const docsCopy = DOCS_COPY[locale];
  const authCopy = AUTH_COPY[locale];
  const legalCopy = LEGAL_COPY[locale];
  const pageCopy = (() => {
    switch (publicPath) {
      case "/docs":
        return docsCopy.overview;
      case "/docs/guia":
        return docsCopy.guide;
      case "/docs/funcionalidades":
        return docsCopy.features;
      case "/docs/integracoes":
        return docsCopy.integrations;
      case "/termos":
        return legalCopy.terms;
      case "/privacidade":
        return legalCopy.privacy;
      case "/login":
        return authCopy.login;
      case "/register":
        return authCopy.register;
      default:
        return null;
    }
  })();
  const title = pageCopy ? `${pageCopy.title} — MuriOps` : seoCopy.title;
  const description =
    pageCopy && "description" in pageCopy
      ? pageCopy.description
      : seoCopy.description;
  const localizedPath =
    locale === DEFAULT_LOCALE
      ? (publicPath ?? "")
      : `/${locale}${publicPath === "/" ? "" : (publicPath ?? "")}`;
  const canonical = publicPath ? `${siteUrl}${localizedPath}` : undefined;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s — MuriOps`,
    },
    description,
    applicationName: "MuriOps",
    authors: [{ name: "MuriOps", url: siteUrl }],
    creator: "MuriOps",
    publisher: "MuriOps",
    keywords: [
      "MuriOps",
      "Muri Ops",
      "Muri",
      "website QA",
      "website quality management",
      "UI UX audit",
      "technical SEO",
      "web accessibility",
      "website security",
    ],
    alternates: publicPath
      ? {
          canonical,
          languages: {
            en: `${siteUrl}${publicPath === "/" ? "" : publicPath}`,
            "pt-BR": `${siteUrl}/pt${publicPath === "/" ? "" : publicPath}`,
            es: `${siteUrl}/es${publicPath === "/" ? "" : publicPath}`,
            "x-default": `${siteUrl}${publicPath === "/" ? "" : publicPath}`,
          },
        }
      : undefined,
    openGraph: {
      type: "website",
      locale: OPEN_GRAPH_LOCALE[locale],
      url: canonical ?? siteUrl,
      siteName: "MuriOps",
      title,
      description,
      images: [
        {
          url: "/atlas-rat-logo-negative-512.png",
          width: 512,
          height: 512,
          alt: "MuriOps — continuous website quality management",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/atlas-rat-logo-negative-512.png"],
    },
    robots:
      publicPath === "/login" || publicPath === "/register"
        ? { index: false, follow: false }
        : { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = requestLocale();
  const seoCopy = SEO_COPY[locale];
  const publicPath = headers().get("x-muriops-public-path");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "MuriOps",
        alternateName: ["Muri Ops", "Muri"],
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/atlas-rat-logo-negative-512.png`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "MuriOps",
        alternateName: ["Muri Ops", "Muri", "muriops.com.br"],
        description: seoCopy.description,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: ["en", "pt-BR", "es"],
      },
      {
        "@type": "SoftwareApplication",
        name: "MuriOps",
        alternateName: "Muri Ops",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: seoCopy.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free account available",
        },
      },
    ],
  };

  return (
    <html
      lang={HTML_LANG[locale]}
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {publicPath === "/" && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
            }}
          />
        )}
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
