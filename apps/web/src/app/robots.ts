import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://muriops.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Área logada não deve ser indexada — não é conteúdo público.
        disallow: [
          "/dashboard",
          "/projects",
          "/analyses",
          "/blueprints",
          "/aplicacao",
          "/atualizar",
          "/orquestracao",
          "/settings",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
