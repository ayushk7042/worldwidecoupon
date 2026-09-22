import type { CategoryDetail, CouponView, StoreDetail } from "./types";
import { storeOf } from "./format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://worldwidecoupons.com";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "WorldwideCoupons";

const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * JSON-LD builders.
 *
 * Google shows coupon rich results from `Offer` markup, which is most of the
 * organic traffic a site like this gets, so the store and coupon pages emit it
 * from the same data the page renders rather than a hand-maintained copy.
 */

export function organisationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs("/icon.png"),
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={query}` },
      "query-input": "required name=query",
    },
  };
}

export function breadcrumbSchema(trail: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: abs(crumb.href) } : {}),
    })),
  };
}

function offerFrom(coupon: CouponView, storeName: string) {
  return {
    "@type": "Offer",
    name: coupon.title,
    description: coupon.description?.split("\n")[0] ?? coupon.title,
    url: abs(`/coupon/${coupon.slug}`),
    seller: { "@type": "Organization", name: storeName },
    ...(coupon.code ? { priceSpecification: undefined } : {}),
    ...(coupon.expiresAt && !coupon.neverExpires
      ? { validThrough: coupon.expiresAt }
      : {}),
    availability: coupon.isExpired
      ? "https://schema.org/Discontinued"
      : "https://schema.org/InStock",
  };
}

export function storeSchema(store: StoreDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    url: abs(`/store/${store.slug}`),
    ...(store.logo?.url ? { image: store.logo.url } : {}),
    ...(store.description ? { description: store.description } : {}),
    ...(store.websiteUrl ? { sameAs: [store.websiteUrl] } : {}),
    makesOffer: store.coupons.slice(0, 20).map((coupon) => offerFrom(coupon, store.name)),
  };
}

export function couponSchema(coupon: CouponView) {
  const store = storeOf(coupon);

  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: coupon.title,
    description: coupon.description?.replace(/\n/g, " ") ?? coupon.title,
    url: abs(`/coupon/${coupon.slug}`),
    category: coupon.hasCode ? "Coupon code" : "Deal",
    ...(store
      ? {
          seller: {
            "@type": "Organization",
            name: store.name,
            ...(store.websiteUrl ? { url: store.websiteUrl } : {}),
          },
        }
      : {}),
    ...(coupon.expiresAt && !coupon.neverExpires ? { validThrough: coupon.expiresAt } : {}),
    availability: coupon.isExpired
      ? "https://schema.org/Discontinued"
      : "https://schema.org/InStock",
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  if (!faqs.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        // Rich results reject markup here, so the HTML is flattened.
        text: faq.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      },
    })),
  };
}

export function itemListSchema(category: CategoryDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} coupons`,
    numberOfItems: category.coupons.length,
    itemListElement: category.coupons.slice(0, 20).map((coupon, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: abs(`/coupon/${coupon.slug}`),
      name: coupon.title,
    })),
  };
}

/** Renders one or more schema objects as a single script tag. */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const payload = Array.isArray(data) ? data.filter(Boolean) : [data].filter(Boolean);
  if (!payload.length) return null;

  return (
    <script
      type="application/ld+json"
      // Closing-tag injection is the one real risk here; escaping the slash
      // neutralises it without changing how the JSON parses.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload.length === 1 ? payload[0] : payload).replace(
          /</g,
          "\\u003c"
        ),
      }}
    />
  );
}
