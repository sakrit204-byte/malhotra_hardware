import type { MetadataRoute } from "next";

import {
  listPublishedProductSlugs,
  listVisibleCategorySlugs,
} from "@/server/repositories/catalogue";

/**
 * Sitemap built from the database, so a product published by an administrator
 * appears in search engines without anyone editing a file. Regenerated hourly
 * rather than pinned at build time, so a product published this afternoon is
 * listed without waiting for a deploy.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";

  const [products, categories] = await Promise.all([
    listPublishedProductSlugs(),
    listVisibleCategorySlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/inquiry`, changeFrequency: "monthly", priority: 0.6 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: `${base}/products?category=${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
