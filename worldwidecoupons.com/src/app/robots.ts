import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://worldwidecoupons.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The panel and a shopper's own pages have nothing to index, and /search
      // would generate an unbounded number of thin pages.
      disallow: ["/admin", "/admin/", "/account", "/account/", "/search"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
