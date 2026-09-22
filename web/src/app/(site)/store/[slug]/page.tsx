import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { FollowStoreButton } from "@/components/site/SaveButton";
import { StoreCard } from "@/components/site/StoreCard";
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
import { formatCount } from "@/lib/format";
import { JsonLd, breadcrumbSchema, faqSchema, storeSchema } from "@/lib/schema";
import type { Category, Store, StoreDetail } from "@/lib/types";

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

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await loadStore(slug);

  if (!store) notFound();

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
        className="border-b border-[var(--border-subtle)]"
        style={{
          background: store.brandColor
            ? `linear-gradient(180deg, ${store.brandColor}22, transparent)`
            : undefined,
        }}
      >
        <div className="shell py-8">
          <Breadcrumbs trail={trail} />

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <StoreLogo name={store.name} logo={store.logo} size={92} rounded="rounded-2xl" className="shadow-[var(--shadow-card)]" />

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {store.verified ? <Badge tone="success">✓ Verified partner</Badge> : null}
                {store.exclusive ? <Badge tone="accent">Exclusive codes</Badge> : null}
                {store.trending ? <Badge tone="warn">🔥 Trending</Badge> : null}
              </div>

              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {store.name} Coupons & Promo Codes
              </h1>

              {store.tagline || store.description ? (
                <p className="mt-2 max-w-2xl text-sm text-body sm:text-base">
                  {store.tagline || store.description}
                </p>
              ) : null}

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <StoreStat label="Live offers" value={formatCount(store.stats.total)} />
                <StoreStat label="Promo codes" value={formatCount(store.stats.codes)} />
                <StoreStat label="Deals" value={formatCount(store.stats.deals)} />
                {store.bestOffer ? <StoreStat label="Best offer" value={store.bestOffer} /> : null}
              </dl>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:w-52">
              <ButtonLink href={`${apiBase()}/stores/${store._id}/go`} external size="lg">
                Visit {store.name}
              </ButtonLink>
              <FollowStoreButton storeId={store._id} storeName={store.name} />
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

                {codes.length ? (
                  <div className="mb-8">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-faint">
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {codes.length}
                      </span>
                      Promo codes
                    </h3>
                    <div className="space-y-3">
                      {codes.map((coupon, index) => (
                        <div key={coupon._id}>
                          <CouponCard coupon={coupon} showStore={false} />
                          {index === 2 ? (
                            <AdSlot position="store-inline" className="mt-3" store={store._id} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {deals.length ? (
                  <div className="mb-8">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-faint">
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
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
                icon="🏷️"
                title={`No live ${store.name} offers right now`}
                body="We check this store regularly. Follow it and we will let you know the moment something lands."
                action={<ButtonLink href="/stores">Browse other stores</ButtonLink>}
              />
            )}

            {store.howToRedeem?.length ? (
              <Card className="mb-6">
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
              <Card className="mb-6">
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
                        {category.icon ? `${category.icon} ` : ""}
                        {category.name}
                      </Link>
                    ))}
                </div>
              </Card>
            ) : null}

            {similar.length ? (
              <Card>
                <h3 className="mb-2 text-sm font-bold">Similar stores</h3>
                <div className="-mx-2">
                  {similar
                    .filter((item) => item._id !== store._id)
                    .slice(0, 6)
                    .map((item) => (
                      <StoreCard key={item._id} store={item} variant="row" />
                    ))}
                </div>
              </Card>
            ) : null}
          </aside>
        </div>

        <AdSlot position="store-bottom" className="mt-10" store={store._id} />
      </div>
    </>
  );
}

function StoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
