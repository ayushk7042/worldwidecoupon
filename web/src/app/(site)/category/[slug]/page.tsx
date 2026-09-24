import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Crown,
  LayoutGrid,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  Store as StoreIcon,
  Tag,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { FilterGroup, FilterLink } from "@/components/site/FilterParts";
import { StoreSignup } from "@/components/site/NewsletterBar";
import { oneOf, withParams, type OfferParams } from "@/components/site/OfferFilters";
import { SortSelect } from "@/components/site/SortSelect";
import { StoreOfferRow } from "@/components/site/StoreOfferRow";
import { CategoryTile } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/icons";
import { EmptyState, Pagination, SectionHeading, StoreLogo } from "@/components/ui/primitives";
import { api, apiPaged, apiSafe } from "@/lib/api";
import { brandThemeVars, categoryColor, categoryHeaderArt, classNames, formatCount } from "@/lib/format";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/lib/schema";
import type { Category, CategoryDetail, CouponView, Pagination as PageInfo } from "@/lib/types";

export const revalidate = 300;

const PER_PAGE = 20;

const PRICE_RANGES = [
  { value: "under10", label: "Under $10", test: (n: number) => n < 10 },
  { value: "10-50", label: "$10 – $50", test: (n: number) => n >= 10 && n < 50 },
  { value: "50-100", label: "$50 – $100", test: (n: number) => n >= 50 && n < 100 },
  { value: "100plus", label: "$100+", test: (n: number) => n >= 100 },
] as const;

const SORTS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest first" },
  { value: "expiring", label: "Ending soonest" },
  { value: "popular", label: "Most used" },
  { value: "discount", label: "Biggest saving" },
];

async function loadCategory(slug: string): Promise<CategoryDetail | null> {
  try {
    return await api<CategoryDetail>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 300 });
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
  const category = await loadCategory(slug);

  if (!category) return { title: "Category not found" };

  const title =
    category.metaTitle || `${category.name} Coupons & Deals — ${category.activeCouponCount} live offers`;

  return {
    title,
    description:
      category.metaDescription ||
      category.description ||
      `${category.activeCouponCount} verified ${category.name.toLowerCase()} coupon codes and deals from ${category.storeCount} stores.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<OfferParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const category = await loadCategory(slug);

  if (!category) notFound();

  const base = `/category/${category.slug}`;
  const show = oneOf(query.show);
  const offer = oneOf(query.offer);
  const price = oneOf(query.price);
  const sort = oneOf(query.sort) ?? "best";
  const expiringSoon = oneOf(query.expiringSoon);
  const exclusive = oneOf(query.exclusive);
  const top = oneOf(query.top);
  const page = Math.max(1, Number(oneOf(query.page) ?? 1) || 1);

  const href = (patch: Record<string, string | undefined>) => withParams(base, query, patch);

  const withCode =
    show === "codes" ? true : show === "deals" ? false : offer === "code" ? true : offer === "nocode" ? false : undefined;
  const type = ["freeshipping", "bogo", "cashback", "giftcard"].includes(offer ?? "") ? offer : undefined;

  /* Price range and "top rated" have no API switch, so when either is on the
     list is fetched wider and narrowed (and paged) here. Otherwise the API
     pages it. */
  const range = PRICE_RANGES.find((item) => item.value === price);
  const narrowHere = Boolean(range) || top === "true";

  const filterQuery = {
    category: slug,
    sort,
    ...(withCode !== undefined ? { withCode } : {}),
    ...(type ? { type } : {}),
    ...(expiringSoon === "true" ? { expiringSoon: true } : {}),
    ...(exclusive === "true" ? { exclusive: true } : {}),
  };

  const emptyFeed = {
    items: [] as CouponView[],
    pagination: { page: 1, limit: PER_PAGE, total: 0, pages: 1, hasMore: false } as PageInfo,
  };

  const [siblings, feedRaw, codeCount] = await Promise.all([
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    apiPaged<CouponView>("/coupons", {
      query: narrowHere ? { ...filterQuery, limit: 100 } : { ...filterQuery, limit: PER_PAGE, page },
      revalidate: 300,
    }).catch(() => emptyFeed),
    apiPaged<CouponView>("/coupons", {
      query: { category: slug, limit: 1, withCode: true },
      revalidate: 600,
    })
      .then((result) => result.pagination.total)
      .catch(() => 0),
  ]);

  let items = feedRaw.items;
  let pagination = feedRaw.pagination;

  if (narrowHere) {
    const matching = feedRaw.items.filter((coupon) => {
      if (range && !(coupon.discountType === "fixed" && coupon.discountValue !== undefined && range.test(coupon.discountValue))) {
        return false;
      }
      if (top === "true" && !(coupon.successRate !== null && coupon.successRate >= 80)) return false;
      return true;
    });
    const pages = Math.max(1, Math.ceil(matching.length / PER_PAGE));
    const current = Math.min(page, pages);
    items = matching.slice((current - 1) * PER_PAGE, current * PER_PAGE);
    pagination = { page: current, limit: PER_PAGE, total: matching.length, pages, hasMore: current < pages };
  }

  const trail = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: category.name },
  ];

  const art = categoryHeaderArt(category);
  const tint = categoryColor(category);
  const anyFilter = Boolean(show || offer || price || expiringSoon || exclusive || top);
  const dealCount = Math.max(0, category.activeCouponCount - codeCount);

  const chips = [
    { Icon: Tag, value: `${formatCount(category.activeCouponCount)} Live Offers` },
    { Icon: StoreIcon, value: `${formatCount(category.storeCount)} Stores` },
    { Icon: ShieldCheck, value: "Verified Coupons" },
    { Icon: CalendarClock, value: "Ending Soon", href: href({ expiringSoon: "true" }) },
  ];

  return (
    <div
      className="pb-2"
      style={{
        ...brandThemeVars(tint),
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${tint} 9%, transparent) 0%, color-mix(in srgb, ${tint} 5%, transparent) 55%, transparent 100%)`,
      }}
    >
      <JsonLd data={[itemListSchema(category), breadcrumbSchema(trail)]} />

      <div className="shell pt-8">
        {/* ================= header ================= */}
        {/* The header wears the category's own colour. It stays light in dark
            mode too (like the homepage banners), so the artwork — which has a
            light background of its own — always sits on a matching surface. */}
        <section
          className="relative overflow-hidden rounded-3xl border p-5 text-ink-900 sm:p-7"
          style={{
            borderColor: `color-mix(in srgb, ${tint} 30%, #ffffff)`,
            backgroundImage: `linear-gradient(100deg, color-mix(in srgb, ${tint} 9%, #ffffff) 0%, color-mix(in srgb, ${tint} 17%, #ffffff) 55%, color-mix(in srgb, ${tint} 22%, #ffffff) 100%)`,
          }}
        >
          {art ? (
            <div
              className="pointer-events-none absolute inset-y-0 right-[19%] hidden lg:block"
              style={{ aspectRatio: art.ratio }}
            >
              {/* Editor-uploaded creative — a plain img, like every other brand asset.
                  Mask and blend are on the img itself (a masked parent would
                  isolate the blend): `multiply` melts its background into the header's. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={art.url}
                alt=""
                aria-hidden
                className="h-full w-full object-cover mix-blend-multiply"
                style={{
                  maskImage: "linear-gradient(to right, transparent 0%, #000 24%, #000 76%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 18%, #000 88%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 24%, #000 76%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 18%, #000 88%, transparent 100%)",
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                }}
              />
            </div>
          ) : null}

          <div className="relative lg:min-h-[10.5rem] lg:max-w-[50%]">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-700">
              <Link href="/" className="transition hover:opacity-70">Home</Link>
              <span aria-hidden>/</span>
              <Link href="/categories" className="transition hover:opacity-70">Categories</Link>
              <span aria-hidden>/</span>
              <span className="font-semibold text-ink-900">{category.name}</span>
            </nav>

            {category.featured ? (
              <span
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white"
                style={{ backgroundColor: tint }}
              >
                <Crown aria-hidden className="size-3" />
                Top category
              </span>
            ) : null}

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              {category.name} <span style={{ color: tint }}>Coupons &amp; Deals</span>
            </h1>

            {category.description ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-700 sm:text-[15px]">
                {category.description} Save more with exclusive coupons, promo codes and special offers.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {chips.map((chip) => {
                const inner = (
                  <>
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: tint }}
                    >
                      <chip.Icon aria-hidden className="size-[18px]" />
                    </span>
                    <span className="pr-1 text-xs font-bold text-ink-900">{chip.value}</span>
                  </>
                );
                const cls = "inline-flex items-center gap-2 rounded-full bg-white/85 py-1 pl-1 pr-3 shadow-[var(--shadow-card)]";
                return chip.href ? (
                  <Link key={chip.value} href={chip.href} className={classNames(cls, "transition hover:-translate-y-px")}>
                    {inner}
                  </Link>
                ) : (
                  <span key={chip.value} className={cls}>
                    {inner}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative mt-5 flex justify-end lg:absolute lg:right-7 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
            <Link
              href={`/stores?category=${category.slug}`}
              className="group inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:brightness-110"
              style={{ backgroundColor: tint }}
            >
              Browse All Stores
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </div>

      <div className="shell py-6">
        <AdSlot position="category-top" className="mb-6" category={category._id} />

        {category.children?.length ? (
          <section className="mb-6">
            <SectionHeading title="Narrow it down" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {category.children.map((child) => (
                <CategoryTile
                  key={child._id}
                  name={child.name}
                  slug={child.slug}
                  icon={child.icon}
                  count={child.activeCouponCount}
                />
              ))}
            </div>
          </section>
        ) : null}

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
                  {anyFilter ? (
                    <Link href={base} className="ml-auto text-[11px] font-bold text-brand-600 hover:underline">
                      Clear all
                    </Link>
                  ) : null}
                </h2>

                <FilterGroup title="Offer Type" clearHref={offer ? href({ offer: undefined }) : undefined}>
                  <FilterLink href={href({ offer: undefined })} active={!offer}>Everything</FilterLink>
                  <FilterLink href={href({ offer: "code" })} active={offer === "code"}>Needs a code</FilterLink>
                  <FilterLink href={href({ offer: "nocode" })} active={offer === "nocode"}>No code needed</FilterLink>
                  <FilterLink href={href({ offer: "freeshipping" })} active={offer === "freeshipping"}>Free shipping</FilterLink>
                  <FilterLink href={href({ offer: "bogo" })} active={offer === "bogo"}>Buy one get one</FilterLink>
                  <FilterLink href={href({ offer: "cashback" })} active={offer === "cashback"}>Cashback</FilterLink>
                  <FilterLink href={href({ offer: "giftcard" })} active={offer === "giftcard"}>Gift card</FilterLink>
                </FilterGroup>

                <FilterGroup title="Price Range" clearHref={price ? href({ price: undefined }) : undefined}>
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
                  clearHref={
                    expiringSoon || exclusive || top
                      ? href({ expiringSoon: undefined, exclusive: undefined, top: undefined })
                      : undefined
                  }
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

          {/* ---- middle: offers ---- */}
          <div className="min-w-0">
            <div className="surface mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-subtle)] p-2.5 shadow-[var(--shadow-card)]">
              {[
                { value: undefined, label: "All offers", count: category.activeCouponCount },
                { value: "codes", label: "Promo codes", count: codeCount },
                { value: "deals", label: "Deals", count: dealCount },
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

              <div className="ml-auto">
                <SortSelect
                  value={sort}
                  options={SORTS.map((option) => ({
                    ...option,
                    href: href({ sort: option.value === "best" ? undefined : option.value }),
                  }))}
                />
              </div>
            </div>

            {items.length ? (
              <div className="space-y-3">
                {items.map((coupon, index) => (
                  <div key={coupon._id}>
                    <StoreOfferRow coupon={coupon} showStore />
                    {index === 5 ? (
                      <AdSlot position="category-infeed" className="mt-3" category={category._id} />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CategoryIcon name={category.name} className="size-7" />}
                title={anyFilter ? "Nothing matches those filters" : `No live ${category.name.toLowerCase()} offers`}
                body={
                  anyFilter
                    ? "Try removing a filter, or see every live offer in this category."
                    : "Nothing here right now. Try another category or browse everything."
                }
                action={<ButtonLink href={anyFilter ? base : "/coupons"}>{anyFilter ? "All offers" : "All offers"}</ButtonLink>}
              />
            )}

            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              hrefFor={(next: number) => withParams(base, query, { page: next === 1 ? undefined : String(next) })}
            />
          </div>

          {/* ---- right: stores, signup, other categories ---- */}
          <aside className="space-y-4 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-28 xl:self-start">
            {category.stores.length ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <h2 className="mb-1 flex items-center gap-2 font-display text-base font-extrabold">
                  <Crown aria-hidden className="size-5 text-warn-500" />
                  Popular Stores in {category.name}
                </h2>
                <ul>
                  {category.stores.slice(0, 10).map((store) => (
                    <li key={store._id}>
                      <Link
                        href={`/store/${store.slug}`}
                        className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white p-0.5">
                          <StoreLogo name={store.name} logo={store.logo} size={34} rounded="rounded-lg" className="border-0" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{store.name}</span>
                          <span className="block text-[11px] text-faint">
                            {formatCount(store.activeCouponCount)} offers
                          </span>
                        </span>
                        <ArrowRight aria-hidden className="size-4 shrink-0 text-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/stores?category=${category.slug}`}
                  className="mt-1 inline-flex items-center gap-1 px-1.5 py-1.5 text-[13px] font-bold text-brand-600 hover:underline"
                >
                  View all stores
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </section>
            ) : null}

            <StoreSignup storeName={category.name.toLowerCase()} compact />

            <AdSlot position="sidebar" category={category._id} />

            {siblings.length ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <h2 className="mb-3 flex items-center gap-2 font-display text-base font-extrabold">
                  <LayoutGrid aria-hidden className="size-5 text-brand-600" />
                  Other categories
                </h2>
                <div className="flex flex-wrap gap-2">
                  {siblings
                    .filter((item) => item._id !== category._id)
                    .slice(0, 14)
                    .map((item) => (
                      <Link
                        key={item._id}
                        href={`/category/${item.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold transition hover:border-brand-300 hover:text-brand-600"
                      >
                        <CategoryIcon name={item.name} className="size-3.5" />
                        {item.name}
                      </Link>
                    ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
