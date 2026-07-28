import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://muriops.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/docs", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/docs/guia", priority: 0.8, changeFrequency: "monthly" as const },
    {
      path: "/docs/funcionalidades",
      priority: 0.7,
      changeFrequency: "weekly" as const,
    },
    {
      path: "/docs/integracoes",
      priority: 0.7,
      changeFrequency: "monthly" as const,
    },
    { path: "/termos", priority: 0.3, changeFrequency: "yearly" as const },
    {
      path: "/privacidade",
      priority: 0.3,
      changeFrequency: "yearly" as const,
    },
  ];

  return pages.map((page) => ({
    url: `${siteUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
