import { ArrowRight, BadgeCheck, Flame, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import {
  OfferFilters,
  oneOf,
  type OfferParams,
} from "@/components/site/OfferFilters";
import { CategoryIcon } from "@/components/ui/icons";
import { FollowStoreButton } from "@/components/site/SaveButton";
import { ButtonLink } from "@/components/ui/Button";
import {
  Badge,
  Breadcrumbs,
  Card,
  EmptyState,
  SectionHeading,
  StoreLogo,
} from "@/components/ui/primitives";
import { api, apiBase, apiSafe } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/format";
import { JsonLd, breadcrumbSchema, faqSchema, storeSchema } from "@/lib/schema";
import type { Category, CouponView, Store, StoreDetail } from "@/lib/types";

export const revalidate = 300;

async function loadStore(slug: string): Promise<StoreDetail | null> {
  try {
    return await api<StoreDetail>(`/stores/${encodeURIComponent(slug)}`, {
      revalidate: 300,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadStore(slug);

  if (!store) return { title: "Store not found" };

  const year = new Date().getFullYear();
  const title =
    store.metaTitle || `${store.name} Coupons & Promo Codes — ${store.stats.total} live offers`;

  return {
    title,
    description:
      store.metaDescription ||
      `${store.stats.total} verified ${store.name} coupon codes and deals for ${year}. ${
        store.bestOffer ? `Top offer: ${store.bestOffer}.` : ""
      } Checked before they go live.`,
    alternates: { canonical: `/store/${store.slug}` },
    openGraph: {
      title,
      type: "website",
      url: `/store/${store.slug}`,
      images: store.logo?.url ? [{ url: store.logo.url }] : undefined,
    },
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<OfferParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const store = await loadStore(slug);

  if (!store) notFound();

  const show = oneOf(query.show);
  const sort = oneOf(query.sort) ?? "best";
  const filtering = Boolean(show) || sort !== "best";

  /* Only fetch a filtered list when the URL asks for one; the store payload
     already carries the default view. */
  const filtered = filtering
    ? await apiSafe<CouponView[]>("/coupons", [], {
        query: {
          store: slug,
          limit: 48,
          sort,
          ...(show === "codes" ? { withCode: true } : {}),
          ...(show === "deals" ? { withCode: false } : {}),
        },
        revalidate: 300,
      })
    : [];

  const categorySlug =
    typeof store.primaryCategory === "object" && store.primaryCategory
      ? store.primaryCategory.slug
      : undefined;

  const similar = await apiSafe<Store[]>("/stores", [], {
    query: { limit: 8, category: categorySlug, sort: "offers", withOffers: true },
    revalidate: 3600,
  });

  const trail = [
    { label: "Home", href: "/" },
    { label: "Stores", href: "/stores" },
    { label: store.name },
  ];

  const codes = store.coupons.filter((coupon) => coupon.hasCode);
  const deals = store.coupons.filter((coupon) => !coupon.hasCode);

  return (
    <>
      <JsonLd
        data={[storeSchema(store), breadcrumbSchema(trail), faqSchema(store.faqs ?? [])]}
      />

      {/* A tinted band behind the header keeps brand identity without needing
          a hero image we do not have for most stores. */}
      <div
        className="border-b border-[var(--border-subtle)] bg-aurora"
        style={{
          background: store.brandColor
            ? `linear-gradient(180deg, ${store.brandColor}1f, transparent)`
            : undefined,
        }}
      >
        <div className="shell py-8">
          <Breadcrumbs trail={trail} />

          <div className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-brand-100 opacity-60 blur-3xl dark:bg-brand-900/40"
            />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start">
              <span className="flex size-24 shrink-0 items-center justify-center rounded-3xl border border-[var(--border-subtle)] bg-white p-2 shadow-[var(--shadow-card)]">
                <StoreLogo name={store.name} logo={store.logo} size={84} rounded="rounded-2xl" className="border-0" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {store.verified ? (
                    <Badge tone="success">
                      <BadgeCheck aria-hidden className="mr-1 inline size-3" />
                      Verified partner
                    </Badge>
                  ) : null}
                  {store.exclusive ? <Badge tone="accent">Exclusive codes</Badge> : null}
                  {store.trending ? (
                    <Badge tone="warn">
                      <Flame aria-hidden className="mr-1 inline size-3" />
                      Trending
                    </Badge>
                  ) : null}
                  {store.domain ? (
                    <span className="text-xs font-semibold text-faint">{store.domain}</span>
                  ) : null}
                </div>

                <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
                  {store.name} coupons & promo codes
                </h1>

                {store.tagline || store.description ? (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body">
                    {store.tagline || store.description}
                  </p>
                ) : null}

                <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { label: "Live offers", value: formatCount(store.stats.total) },
                    { label: "Promo codes", value: formatCount(store.stats.codes) },
                    { label: "Deals", value: formatCount(store.stats.deals) },
                    { label: "Best offer", value: store.bestOffer ?? "—" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2.5"
                    >
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
                        {stat.label}
                      </dt>
                      <dd className="mt-0.5 truncate font-display text-lg font-extrabold text-brand-gradient">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex shrink-0 flex-col gap-2 lg:w-56">
                <ButtonLink href={`${apiBase()}/stores/${store._id}/go`} external size="lg">
                  Visit {store.name}
                </ButtonLink>
                <FollowStoreButton storeId={store._id} storeName={store.name} />

                <p className="text-center text-[11px] text-faint">
                  Checked {store.updatedAt ? timeAgo(store.updatedAt) : "recently"}
                </p>
              </div>
            </div>

            {/* Jump links, so a long page is still one click deep. */}
            <div className="relative mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
              {[
                codes.length ? { href: "#codes", label: `${codes.length} promo codes` } : null,
                deals.length ? { href: "#deals", label: `${deals.length} deals` } : null,
                store.howToRedeem?.length ? { href: "#how", label: "How to redeem" } : null,
                store.faqs?.length ? { href: "#faqs", label: "FAQs" } : null,
              ]
                .filter(Boolean)
                .map((link) => (
                  <a
                    key={link!.href}
                    href={link!.href}
                    className="rounded-full border border-[var(--border-subtle)] px-3.5 py-1.5 text-xs font-bold text-body transition hover:border-brand-300 hover:text-brand-600"
                  >
                    {link!.label}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="shell py-8">
        <AdSlot position="store-top" className="mb-6" store={store._id} />

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            {store.coupons.length ? (
              <>
                <SectionHeading
                  title={`${store.stats.total} ${store.name} offers`}
                  subtitle="Sorted with the most likely to work first."
                />

                <OfferFilters
                  base={`/store/${store.slug}`}
                  params={query}
                  counts={{
                    all: store.stats.total,
                    codes: store.stats.codes,
                    deals: store.stats.deals,
                  }}
                />

                {filtering ? (
                  <div className="mb-8">
                    {filtered.length ? (
                      <div className="space-y-3">
                        {filtered.map((coupon) => (
                          <CouponCard key={coupon._id} coupon={coupon} showStore={false} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={<Tag aria-hidden className="size-7" strokeWidth={1.7} />}
                        title="Nothing matches that filter"
                        body="Try another view, or see every live offer from this store."
                        action={<ButtonLink href={`/store/${store.slug}`}>All offers</ButtonLink>}
                      />
                    )}
                  </div>
                ) : null}

                {!filtering && codes.length ? (
                  <div id="codes" className="mb-8 scroll-mt-28">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-faint">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {codes.length}
                      </span>
                      Promo codes
                    </h3>
                    <div className="space-y-3">
                      {codes.map((coupon) => (
                        <CouponCard key={coupon._id} coupon={coupon} showStore={false} />
                      ))}
                    </div>

                    <AdSlot position="store-inline" className="mt-3" store={store._id} />
                  </div>
                ) : null}

                {!filtering && deals.length ? (
                  <div id="deals" className="mb-8 scroll-mt-28">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-faint">
                      <span className="rounded bg-accent-300 px-2 py-0.5 text-accent-600 dark:bg-accent-600/20 dark:text-accent-400">
                        {deals.length}
                      </span>
                      Deals — no code needed
                    </h3>
                    <div className="space-y-3">
                      {deals.map((coupon) => (
                        <CouponCard key={coupon._id} coupon={coupon} showStore={false} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={<Tag aria-hidden className="size-7" strokeWidth={1.7} />}
                title={`No live ${store.name} offers right now`}
                body="We check this store regularly. Follow it and we will let you know the moment something lands."
                action={<ButtonLink href="/stores">Browse other stores</ButtonLink>}
              />
            )}

            {store.howToRedeem?.length ? (
              <Card id="how" className="mb-6 scroll-mt-28">
                <h2 className="mb-3 text-lg font-bold">
                  How to use a {store.name} coupon
                </h2>
                <ol className="space-y-2.5">
                  {store.howToRedeem.map((step, index) => (
                    <li key={index} className="flex gap-3 text-sm text-body">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            ) : null}

            {store.about ? (
              <Card className="mb-6">
                <h2 className="mb-3 text-lg font-bold">About {store.name}</h2>
                <div
                  className="prose-offer"
                  dangerouslySetInnerHTML={{ __html: store.about }}
                />
              </Card>
            ) : null}

            {store.faqs?.length ? (
              <Card id="faqs" className="mb-6 scroll-mt-28">
                <h2 className="mb-4 text-lg font-bold">{store.name} FAQs</h2>
                <div className="space-y-3">
                  {store.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group rounded-xl border border-[var(--border-subtle)] p-4 open:surface-sunken"
                    >
                      <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                        <span className="flex items-center justify-between gap-3">
                          {faq.question}
                          <span aria-hidden className="text-faint transition group-open:rotate-180">
                            ▾
                          </span>
                        </span>
                      </summary>
                      <div
                        className="prose-offer mt-3 text-sm"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                    </details>
                  ))}
                </div>
              </Card>
            ) : null}

            {store.expiredCoupons?.length ? (
              <Card>
                <h2 className="mb-3 text-lg font-bold">Recently expired</h2>
                <p className="mb-3 text-sm text-body">
                  Sometimes an expired code still works. Worth thirty seconds.
                </p>
                <div>
                  {store.expiredCoupons.map((coupon) => (
                    <CouponCard key={coupon._id} coupon={coupon} variant="compact" />
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {store.highlights?.length ? (
              <Card>
                <h3 className="mb-3 text-sm font-bold">At a glance</h3>
                <dl className="space-y-2">
                  {store.highlights.map((row, index) => (
                    <div key={index} className="flex items-baseline justify-between gap-3 text-sm">
                      <dt className="text-faint">{row.label}</dt>
                      <dd className="text-right font-semibold">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ) : null}

            <AdSlot position="sidebar" store={store._id} />

            {Array.isArray(store.categories) && store.categories.length ? (
              <Card>
                <h3 className="mb-3 text-sm font-bold">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {(store.categories as Category[])
                    .filter((category) => typeof category === "object")
                    .map((category) => (
                      <Link
                        key={category._id}
                        href={`/category/${category.slug}`}
                        className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold transition hover:border-brand-300 hover:text-brand-600"
                      >
                        <CategoryIcon name={category.name} className="mr-1.5 inline size-3.5" />
                        {category.name}
                      </Link>
                    ))}
                </div>
              </Card>
            ) : null}

            {similar.length ? (
              <Card>
                <h3 className="mb-2 text-sm font-bold">Similar stores</h3>
                <ul className="-mx-1">
                  {similar
                    .filter((item) => item._id !== store._id)
                    .slice(0, 6)
                    .map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/store/${item.slug}`}
                          className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
                        >
                          <StoreLogo name={item.name} logo={item.logo} size={32} rounded="rounded-lg" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{item.name}</span>
                            <span className="block text-[11px] text-faint">
                              {formatCount(item.activeCouponCount)} offers
                            </span>
                          </span>
                          <ArrowRight aria-hidden className="size-4 shrink-0 text-faint" />
                        </Link>
                      </li>
                    ))}
                </ul>
              </Card>
            ) : null}
          </aside>
        </div>

        <AdSlot position="store-bottom" className="mt-10" store={store._id} />
      </div>
    </>
  );
}
