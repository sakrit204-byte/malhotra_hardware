import type { MetadataRoute } from "next";

/**
 * Search engines are welcome in the catalogue and nowhere else. The manager and
 * admin platforms, customer accounts and inquiry pages are private, and the
 * uploads directory holds files that belong to individual inquiries.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/manager", "/account", "/inquiry/", "/api/", "/style"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
