import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  LayoutGrid,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { FilterGroup, FilterLink } from "@/components/site/FilterParts";
import { StoreSignup } from "@/components/site/NewsletterBar";
import { oneOf, withParams, type OfferParams } from "@/components/site/OfferFilters";
import { StoreOfferRow } from "@/components/site/StoreOfferRow";
import { CategoryIcon } from "@/components/ui/icons";
import { FollowStoreButton } from "@/components/site/SaveButton";
import { ButtonLink } from "@/components/ui/Button";
import {
  Card,
  EmptyState,
  Pagination,
  StoreLogo,
} from "@/components/ui/primitives";
import { api, apiBase, apiSafe } from "@/lib/api";
import { classNames, formatCount, timeAgo } from "@/lib/format";
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

const PER_PAGE = 20;

const PRICE_RANGES = [
  { value: "under10", label: "Under $10", test: (n: number) => n < 10 },
  { value: "10-50", label: "$10 – $50", test: (n: number) => n >= 10 && n < 50 },
  { value: "50-100", label: "$50 – $100", test: (n: number) => n >= 50 && n < 100 },
  { value: "100plus", label: "$100+", test: (n: number) => n >= 100 },
] as const;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "best", label: "Best match" },
  { value: "expiring", label: "Ending soonest" },
  { value: "popular", label: "Most used" },
];

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

  const base = `/store/${store.slug}`;
  const show = oneOf(query.show);
  const offer = oneOf(query.offer);
  const price = oneOf(query.price);
  const sort = oneOf(query.sort) ?? "newest";
  const expiringSoon = oneOf(query.expiringSoon);
  const exclusive = oneOf(query.exclusive);
  const top = oneOf(query.top);
  const page = Math.max(1, Number(oneOf(query.page) ?? 1) || 1);

  const href = (patch: Record<string, string | undefined>) => withParams(base, query, patch);

  /* "Promo codes" / "Deals" tabs and the Offer type list both mean "needs a
     code or not", so the tab wins when both are set. */
  const withCode =
    show === "codes" ? true : show === "deals" ? false : offer === "code" ? true : offer === "nocode" ? false : undefined;
  const type = ["freeshipping", "bogo", "cashback", "giftcard"].includes(offer ?? "") ? offer : undefined;

  const [all, categories, similar] = await Promise.all([
    apiSafe<CouponView[]>("/coupons", [], {
      query: {
        store: slug,
        limit: 100,
        sort,
        ...(withCode !== undefined ? { withCode } : {}),
        ...(type ? { type } : {}),
        ...(expiringSoon === "true" ? { expiringSoon: true } : {}),
        ...(exclusive === "true" ? { exclusive: true } : {}),
      },
      revalidate: 300,
    }),
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    apiSafe<Store[]>("/stores", [], {
      query: {
        limit: 8,
        category:
          typeof store.primaryCategory === "object" && store.primaryCategory
            ? store.primaryCategory.slug
            : undefined,
        sort: "offers",
        withOffers: true,
      },
      revalidate: 3600,
    }),
  ]);

  /* Price range and "top rated" have no API switch, so they narrow the list here. */
  const range = PRICE_RANGES.find((item) => item.value === price);
  const matching = all.filter((coupon) => {
    if (range && !(coupon.discountType === "fixed" && coupon.discountValue !== undefined && range.test(coupon.discountValue))) {
      return false;
    }
    if (top === "true" && !(coupon.successRate !== null && coupon.successRate >= 80)) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(matching.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = matching.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const trail = [
    { label: "Home", href: "/" },
    { label: "Stores", href: "/stores" },
    { label: store.name },
  ];

  const tagline = store.tagline?.trim();
  const dot = tagline ? tagline.indexOf(". ") : -1;
  const lead = tagline && dot > 0 ? tagline.slice(0, dot + 1) : undefined;
  const tail = tagline && dot > 0 ? tagline.slice(dot + 2) : tagline;

  const stats = [
    { label: "Live offers", value: formatCount(store.stats.total), Icon: Tag },
    { label: "Promo codes", value: formatCount(store.stats.codes), Icon: Ticket },
    { label: "Deals", value: formatCount(store.stats.deals), Icon: Percent },
    { label: "Best offer", value: store.bestOffer ?? "—", Icon: Star },
  ];

  const anyFilter = Boolean(show || offer || price || expiringSoon || exclusive || top);

  return (
    <>
      <JsonLd data={[storeSchema(store), breadcrumbSchema(trail), faqSchema(store.faqs ?? [])]} />

      <div className="shell pt-8">
        {/* ================= header ================= */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <section className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-r from-amber-50/70 via-brand-50 to-brand-100/70 p-5 text-ink-900 sm:p-7">
            {/* The store's own artwork: starts from the middle and fills the right
                half, feathered on every edge so it has no frame. */}
            {store.banner?.url ? (
              <div className="pointer-events-none absolute bottom-0 right-0 hidden aspect-[672/196] w-[58%] lg:block">
                {/* Editor-uploaded creative — a plain img, like every other brand asset.
                    Mask and blend both on the img (a masked parent would isolate the blend). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={store.banner.url}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-contain object-right-bottom mix-blend-multiply"
                  style={{
                    maskImage: "var(--feather-store)",
                    WebkitMaskImage: "var(--feather-store)",
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in",
                  }}
                />
              </div>
            ) : null}

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center lg:min-h-[13rem] lg:max-w-[42%]">
              <span className="flex size-28 shrink-0 items-center justify-center rounded-3xl border border-[var(--border-subtle)] bg-white p-2.5 shadow-[var(--shadow-card)]">
                <StoreLogo name={store.name} logo={store.logo} size={96} rounded="rounded-2xl" className="border-0" />
              </span>

              <div className="min-w-0">
                <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold">
                  {store.name}
                  <span className="sr-only"> coupons &amp; promo codes</span>
                  {store.verified ? (
                    <BadgeCheck aria-label="Verified store" className="size-6 shrink-0 fill-brand-600 text-white" />
                  ) : null}
                </h1>
                {store.domain ? <p className="text-sm text-ink-700">{store.domain}</p> : null}

                {tagline ? (
                  <p className="mt-2 font-display text-2xl font-extrabold leading-tight">
                    {lead ? <>{lead} <span className="text-brand-600">{tail}</span></> : <span className="text-brand-600">{tail}</span>}
                  </p>
                ) : (
                  <p className="mt-2 font-display text-2xl font-extrabold leading-tight">
                    Coupons &amp; <span className="text-brand-600">promo codes</span>
                  </p>
                )}

                {store.description ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-700">{store.description}</p>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="flex flex-col justify-center gap-3 rounded-3xl border border-brand-200/60 bg-brand-50/70 p-5 dark:border-brand-700/40 dark:bg-brand-900/30">
            <ButtonLink href={`${apiBase()}/stores/${store._id}/go`} external size="lg" className="!rounded-2xl">
              Visit {store.name}
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
            <FollowStoreButton storeId={store._id} storeName={store.name} />
            <p className="text-center text-[11px] text-faint">
              Checked {store.updatedAt ? timeAgo(store.updatedAt) : "recently"}
            </p>
          </aside>
        </div>

        {/* ================= stats ================= */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="surface flex items-center gap-3.5 rounded-2xl border border-[var(--border-subtle)] px-4 py-3.5 shadow-[var(--shadow-card)]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                <stat.Icon aria-hidden className="size-6" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-body">{stat.label}</span>
                <span className="block truncate font-display text-2xl font-extrabold text-brand-600">{stat.value}</span>
              </span>
            </div>
          ))}
          <div className="surface flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] px-4 py-3.5 shadow-[var(--shadow-card)]">
            <ShieldCheck aria-hidden className="size-8 text-brand-600" strokeWidth={1.7} />
            <span>
              <span className="block text-sm font-bold">{store.verified ? "Verified Store" : "Checked offers"}</span>
              <span className="block text-xs text-faint">
                {store.verified ? "Trusted & secure" : "Opened before they go live"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ================= body: filters | offers | sidebar ================= */}
      <div className="shell py-6">
        <AdSlot position="store-top" className="mb-6" store={store._id} />

        <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)_17rem]">
          {/* ---- left: filters ---- */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <details className="group/filters" open>
              <summary className="surface mb-3 flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm font-bold shadow-[var(--shadow-card)] marker:hidden lg:hidden">
                <SlidersHorizontal aria-hidden className="size-4 text-brand-600" />
                Filter offers
                <ChevronDown aria-hidden className="ml-auto size-4 text-faint" />
              </summary>

              <div className="surface overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
                <h2 className="hidden items-center gap-2.5 px-4 py-3.5 font-display text-base font-extrabold lg:flex">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                    <SlidersHorizontal aria-hidden className="size-4" />
                  </span>
                  Filter Offers
                </h2>

                <FilterGroup
                  title="Offer Type"
                  clearHref={offer ? href({ offer: undefined }) : undefined}
                >
                  <FilterLink href={href({ offer: undefined })} active={!offer}>Everything</FilterLink>
                  <FilterLink href={href({ offer: "code" })} active={offer === "code"}>Needs a code</FilterLink>
                  <FilterLink href={href({ offer: "nocode" })} active={offer === "nocode"}>No code needed</FilterLink>
                  <FilterLink href={href({ offer: "freeshipping" })} active={offer === "freeshipping"}>Free shipping</FilterLink>
                  <FilterLink href={href({ offer: "bogo" })} active={offer === "bogo"}>Buy one get one</FilterLink>
                  <FilterLink href={href({ offer: "cashback" })} active={offer === "cashback"}>Cashback</FilterLink>
                  <FilterLink href={href({ offer: "giftcard" })} active={offer === "giftcard"}>Gift card</FilterLink>
                </FilterGroup>

                <FilterGroup
                  title="Price Range"
                  clearHref={price ? href({ price: undefined }) : undefined}
                >
                  {PRICE_RANGES.map((item) => (
                    <FilterLink
                      key={item.value}
                      href={href({ price: price === item.value ? undefined : item.value })}
                      active={price === item.value}
                    >
                      {item.label}
                    </FilterLink>
                  ))}
                </FilterGroup>

                <FilterGroup
                  title="Highlights"
                  clearHref={expiringSoon || exclusive || top ? href({ expiringSoon: undefined, exclusive: undefined, top: undefined }) : undefined}
                >
                  <FilterLink href={href({ expiringSoon: expiringSoon === "true" ? undefined : "true" })} active={expiringSoon === "true"}>
                    Ending this week
                  </FilterLink>
                  <FilterLink href={href({ exclusive: exclusive === "true" ? undefined : "true" })} active={exclusive === "true"}>
                    Exclusive to us
                  </FilterLink>
                  <FilterLink href={href({ top: top === "true" ? undefined : "true" })} active={top === "true"}>
                    Top rated
                  </FilterLink>
                </FilterGroup>
              </div>
            </details>
          </aside>

          {/* ---- middle: the offers ---- */}
          <div className="min-w-0">
            <div className="surface mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-subtle)] p-2.5 shadow-[var(--shadow-card)]">
              {[
                { value: undefined, label: "All offers", count: store.stats.total },
                { value: "codes", label: "Promo codes", count: store.stats.codes },
                { value: "deals", label: "Deals", count: store.stats.deals },
              ].map((tab) => (
                <Link
                  key={tab.label}
                  href={href({ show: tab.value })}
                  className={classNames(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition",
                    show === tab.value
                      ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                      : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50"
                  )}
                >
                  {tab.label}
                  <span
                    className={classNames(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                      show === tab.value ? "bg-white/25" : "bg-[var(--surface-sunken)] text-faint"
                    )}
                  >
                    {formatCount(tab.count)}
                  </span>
                </Link>
              ))}

              <div className="ml-auto flex flex-wrap gap-1">
                {SORTS.map((option) => (
                  <Link
                    key={option.value}
                    href={href({ sort: option.value === "newest" ? undefined : option.value })}
                    className={classNames(
                      "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
                      sort === option.value
                        ? "border-brand-600 bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                        : "border-[var(--border-subtle)] text-body hover:border-brand-300 hover:text-brand-600"
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            {visible.length ? (
              <div className="space-y-3">
                {visible.map((coupon) => (
                  <StoreOfferRow key={coupon._id} coupon={coupon} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Tag aria-hidden className="size-7" strokeWidth={1.7} />}
                title={anyFilter ? "Nothing matches those filters" : `No live ${store.name} offers right now`}
                body={
                  anyFilter
                    ? "Try removing a filter, or see every live offer from this store."
                    : "We check this store regularly. Follow it and we will let you know the moment something lands."
                }
                action={<ButtonLink href={anyFilter ? base : "/stores"}>{anyFilter ? "All offers" : "Browse other stores"}</ButtonLink>}
              />
            )}

            <Pagination page={current} pages={pages} hrefFor={(next) => withParams(base, query, { page: next === 1 ? undefined : String(next) })} />

            <AdSlot position="store-inline" className="mt-4" store={store._id} />

            <StoreSignup storeName={store.name} />

            {store.howToRedeem?.length ? (
              <Card id="how" className="mt-6 scroll-mt-28">
                <h2 className="mb-3 text-lg font-bold">How to use a {store.name} coupon</h2>
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
              <Card className="mt-6">
                <h2 className="mb-3 text-lg font-bold">About {store.name}</h2>
                <div className="prose-offer" dangerouslySetInnerHTML={{ __html: store.about }} />
              </Card>
            ) : null}

            {store.faqs?.length ? (
              <Card id="faqs" className="mt-6 scroll-mt-28">
                <h2 className="mb-4 text-lg font-bold">{store.name} FAQs</h2>
                <div className="space-y-3">
                  {store.faqs.map((faq, index) => (
                    <details key={index} className="group rounded-xl border border-[var(--border-subtle)] p-4 open:surface-sunken">
                      <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                        <span className="flex items-center justify-between gap-3">
                          {faq.question}
                          <span aria-hidden className="text-faint transition group-open:rotate-180">▾</span>
                        </span>
                      </summary>
                      <div className="prose-offer mt-3 text-sm" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                    </details>
                  ))}
                </div>
              </Card>
            ) : null}

            {store.expiredCoupons?.length ? (
              <Card className="mt-6">
                <h2 className="mb-3 text-lg font-bold">Recently expired</h2>
                <p className="mb-3 text-sm text-body">Sometimes an expired code still works. Worth thirty seconds.</p>
                <div>
                  {store.expiredCoupons.map((coupon) => (
                    <CouponCard key={coupon._id} coupon={coupon} variant="compact" />
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          {/* ---- right: categories and similar stores ---- */}
          <aside className="space-y-4 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-28 xl:self-start">
            {categories.length ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                    <LayoutGrid aria-hidden className="size-4" />
                  </span>
                  <h2 className="font-display text-base font-extrabold">Categories</h2>
                  <Link href="/categories" className="ml-auto text-xs font-bold text-brand-600 hover:underline">View all →</Link>
                </div>

                <ul>
                  {categories.slice(0, 6).map((category) => (
                    <CategoryRow key={category._id} category={category} />
                  ))}
                </ul>

                {categories.length > 6 ? (
                  <details className="group/more">
                    <ul>
                      {categories.slice(6, 16).map((category) => (
                        <CategoryRow key={category._id} category={category} />
                      ))}
                    </ul>
                    <summary className="mt-1 flex cursor-pointer list-none items-center gap-1 px-1 py-1.5 text-[13px] font-bold text-brand-600 marker:hidden group-open/more:hidden">
                      More categories
                      <ChevronDown aria-hidden className="size-3.5" />
                    </summary>
                  </details>
                ) : null}
              </section>
            ) : null}

            <AdSlot position="sidebar" store={store._id} />

            {similar.filter((item) => item._id !== store._id).length ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                    <Ticket aria-hidden className="size-4" />
                  </span>
                  <h2 className="font-display text-base font-extrabold">Similar stores</h2>
                  <Link href="/stores" className="ml-auto text-xs font-bold text-brand-600 hover:underline">View all →</Link>
                </div>
                <ul>
                  {similar
                    .filter((item) => item._id !== store._id)
                    .slice(0, 5)
                    .map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/store/${item.slug}`}
                          className="flex items-center gap-2.5 rounded-xl px-1.5 py-2 transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-white p-0.5">
                            <StoreLogo name={item.name} logo={item.logo} size={30} rounded="rounded-md" className="border-0" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{item.name}</span>
                            <span className="block text-[11px] text-faint">{formatCount(item.activeCouponCount)} offers</span>
                          </span>
                          <ArrowRight aria-hidden className="size-4 shrink-0 text-faint" />
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}

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
          </aside>
        </div>

        <AdSlot position="store-bottom" className="mt-10" store={store._id} />
      </div>
    </>
  );
}

function CategoryRow({ category }: { category: Category }) {
  return (
    <li>
      <Link
        href={`/category/${category.slug}`}
        className="flex items-center gap-2.5 rounded-xl px-1.5 py-2 text-sm transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
      >
        <CategoryIcon name={category.name} className="size-4 text-brand-600" />
        <span className="min-w-0 flex-1 truncate">{category.name}</span>
        <span className="text-xs tabular-nums text-faint">{formatCount(category.activeCouponCount)}</span>
      </Link>
    </li>
  );
}
