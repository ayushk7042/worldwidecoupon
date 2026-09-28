import type { MetadataRoute } from "next";
import { apiSafe } from "@/lib/api";
import type { Category, CouponView, Store } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://worldwidecoupons.com";

export const revalidate = 3600;

/**
 * Store and category pages are the ones that rank, so they carry the higher
 * priority. Coupon pages are capped at 1,000 — beyond that a single sitemap
 * file gets unwieldy and the long tail is reachable through its store anyway.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, categories, coupons] = await Promise.all([
    apiSafe<Store[]>("/stores", [], {
      query: { limit: 200, sort: "offers", status: "active" },
      revalidate: 3600,
    }),
    apiSafe<Category[]>("/categories", [], { query: { limit: 200 }, revalidate: 3600 }),
    apiSafe<CouponView[]>("/coupons", [], {
      query: { limit: 100, sort: "newest" },
      revalidate: 3600,
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/coupons`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/stores`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.4 },
  ];

  return [
    ...staticPages,
    ...stores.map((store) => ({
      url: `${SITE_URL}/store/${store.slug}`,
      lastModified: store.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...categories.map((category) => ({
      url: `${SITE_URL}/category/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...coupons.map((coupon) => ({
      url: `${SITE_URL}/coupon/${coupon.slug}`,
      lastModified: coupon.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
