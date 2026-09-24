import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  MousePointerClick,
  PiggyBank,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Ticket,
  X,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { FilterGroup, FilterLink } from "@/components/site/FilterParts";
import { OfferRow } from "@/components/site/OfferRow";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/icons";
import {
  EmptyState,
  Pagination,
  StoreLogo,
} from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { COUPON_SORT_LABELS, COUPON_TYPE_LABELS, classNames, formatCount } from "@/lib/format";
import type { Category, CouponView, Pagination as PageInfo, Store } from "@/lib/types";

export const revalidate = 180;

const PER_PAGE = 24;

export const metadata: Metadata = {
  title: "All coupon codes & deals",
  description:
    "Every live offer on WorldwideCoupons, filterable by store, category, type and expiry. Checked before it goes on the page.",
  alternates: { canonical: "/coupons" },
};

type SearchParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Rebuilds the current URL with one parameter changed, resetting the page. */
function hrefWith(params: SearchParams, patch: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const single = one(value);
    if (single && key !== "page") search.set(key, single);
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === "") search.delete(key);
    else search.set(key, value);
  }

  const query = search.toString();
  return query ? `/coupons?${query}` : "/coupons";
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);
  const sort = one(params.sort) ?? "best";
  const type = one(params.type);
  const store = one(params.store);
  const category = one(params.category);
  const search = one(params.search);
  const withCode = one(params.withCode);
  const expiringSoon = one(params.expiringSoon);
  const exclusive = one(params.exclusive);

  const query = {
    page,
    limit: PER_PAGE,
    sort,
    type,
    store,
    category,
    search,
    withCode,
    expiringSoon,
    exclusive,
  };

  const [feed, categories, stores, fallback] = await Promise.all([
    apiPaged<CouponView>("/coupons", { query, revalidate: 180 }).catch(() => ({
      items: [] as CouponView[],
      pagination: { page: 1, limit: PER_PAGE, total: 0, pages: 1, hasMore: false } as PageInfo,
    })),
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    apiPaged<Store>("/stores", {
      query: { limit: 12, sort: "offers", withOffers: true },
      revalidate: 3600,
    })
      .then((result) => result.items)
      .catch(() => [] as Store[]),
    // Some filters legitimately match nothing — most imported offers carry no
    // end date, so "ending this week" is often empty. Rather than a dead page,
    // the biggest live discounts are offered instead.
    apiPaged<CouponView>("/coupons", { query: { limit: 8, sort: "discount" }, revalidate: 600 })
      .then((result) => result.items)
      .catch(() => [] as CouponView[]),
  ]);

  /* Every active filter, so they can be shown — and removed — as chips. */
  const chips: { label: string; href: string }[] = [];
  if (search) chips.push({ label: `“${search}”`, href: hrefWith(params, { search: undefined }) });
  if (withCode === "true") chips.push({ label: "Needs a code", href: hrefWith(params, { withCode: undefined }) });
  if (withCode === "false") chips.push({ label: "No code needed", href: hrefWith(params, { withCode: undefined }) });
  if (type) {
    chips.push({
      label: COUPON_TYPE_LABELS[type as keyof typeof COUPON_TYPE_LABELS] ?? type,
      href: hrefWith(params, { type: undefined }),
    });
  }
  if (category) {
    const match = categories.find((item) => item.slug === category);
    chips.push({ label: match?.name ?? category, href: hrefWith(params, { category: undefined }) });
  }
  if (store) {
    const match = stores.find((item) => item.slug === store || item._id === store);
    chips.push({ label: match?.name ?? store, href: hrefWith(params, { store: undefined }) });
  }
  if (expiringSoon === "true") {
    chips.push({ label: "Ending this week", href: hrefWith(params, { expiringSoon: undefined }) });
  }
  if (exclusive === "true") {
    chips.push({ label: "Exclusive to us", href: hrefWith(params, { exclusive: undefined }) });
  }

  const activeCategory = categories.find((item) => item.slug === category);
  const activeStore = stores.find((item) => item.slug === store || item._id === store);

  const headline = withCode === "true"
    ? "Promo codes you can copy"
    : type === "freeshipping"
      ? "Free delivery offers"
      : exclusive === "true"
        ? "Exclusive codes"
        : expiringSoon === "true"
          ? "Offers ending this week"
          : search
            ? `Results for “${search}”`
            : activeCategory
              ? `${activeCategory.name} coupons & deals`
              : activeStore
                ? `${activeStore.name} coupons & deals`
                : "All Coupon Codes & Deals";

  const start = feed.items.length ? (page - 1) * PER_PAGE + 1 : 0;

  return (
    <div className="shell py-8">
      {/* ---- header: breadcrumb, two-tone title, four promises, and the
          artwork on the right ---- */}
      <section className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-7 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
        <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_38rem]">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-body">
              <Link href="/" className="transition hover:text-brand-600">Home</Link>
              <span aria-hidden>/</span>
              <span className="font-medium text-[var(--text-primary)]">All offers</span>
            </nav>

            <div className="mt-3 flex items-start gap-4">
              <span className="mt-1 hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-glow)] sm:flex">
                <Ticket aria-hidden className="size-7" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                  {headline.includes(" ") ? (
                    <>
                      {headline.slice(0, headline.lastIndexOf(" "))}{" "}
                      <span className="text-brand-600">{headline.slice(headline.lastIndexOf(" ") + 1)}</span>
                    </>
                  ) : (
                    headline
                  )}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-body">
                  <strong className="text-[var(--text-primary)]">{formatCount(feed.pagination.total)}</strong>{" "}
                  live offers{chips.length ? " matching your filters" : " across every store"}. Grab the best
                  discounts, promo codes, and exclusive deals — all in one place.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6">
              {(
                [
                  { Icon: ShieldCheck, title: "Verified Codes", body: "100% Working" },
                  { Icon: MousePointerClick, title: "Easy to Use", body: "Copy & Apply" },
                  { Icon: CalendarCheck, title: "Updated Daily", body: "Latest Offers" },
                  { Icon: PiggyBank, title: "Save Big", body: "Shop Smarter" },
                ] as const
              ).map((point) => (
                <span key={point.title} className="flex items-center gap-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                    <point.Icon aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">{point.title}</span>
                    <span className="block text-[11px] text-faint">{point.body}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* The site's own artwork, feathered into the panel so it has no edge. */}
          <div className="relative hidden items-center justify-center gap-3 lg:flex">
            <div className="relative aspect-[480/214] w-[25rem] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/banners/all-offers-graphic.png"
                alt=""
                aria-hidden
                className="h-full w-full object-cover mix-blend-multiply"
                style={{
                  maskImage: "var(--feather-promo)",
                  WebkitMaskImage: "var(--feather-promo)",
                  maskComposite: "intersect",
                  WebkitMaskComposite: "source-in",
                }}
              />
            </div>

            <div className="flex flex-col items-start gap-3">
              <p className="-rotate-6 font-display text-lg font-bold italic leading-tight text-ink-700 dark:text-ink-200">
                More Savings
                <br />
                More Smiles
              </p>
              <Link
                href="/stores"
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600"
              >
                Browse Stores
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {chips.length ? (
          <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-brand-200/60 pt-4 dark:border-brand-700/40">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              <Filter aria-hidden className="size-3.5" />
              Filters
            </span>

            {chips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-brand-700 shadow-[var(--shadow-card)] transition hover:bg-brand-100 dark:text-brand-300"
              >
                {chip.label}
                <X aria-hidden className="size-3" />
              </Link>
            ))}

            <Link href="/coupons" className="ml-auto text-xs font-bold text-faint transition hover:text-brand-600">
              Clear all
            </Link>
          </div>
        ) : null}
      </section>

      <AdSlot position="category-top" className="mt-6" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* ---- filters ---- */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <details className="group/filters lg:open" open>
            <summary className="surface mb-3 flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm font-bold shadow-[var(--shadow-card)] marker:hidden lg:hidden">
              <Filter aria-hidden className="size-4 text-brand-600" />
              Filter offers
              {chips.length ? (
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                  {chips.length}
                </span>
              ) : null}
              <ArrowRight
                aria-hidden
                className="ml-auto size-4 rotate-90 text-faint transition-transform group-open/filters:-rotate-90"
              />
            </summary>

            <div className="surface overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
              <h2 className="hidden items-center gap-2.5 px-4 py-3.5 font-display text-base font-extrabold lg:flex">
                <span className="flex size-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                  <SlidersHorizontal aria-hidden className="size-4" />
                </span>
                Filter Offers
              </h2>
          <FilterGroup
            title="Offer type"
            clearHref={type || withCode ? hrefWith(params, { type: undefined, withCode: undefined }) : undefined}
          >
            <FilterLink href={hrefWith(params, { type: undefined, withCode: undefined })} active={!type && !withCode}>
              Everything
            </FilterLink>
            <FilterLink href={hrefWith(params, { withCode: "true", type: undefined })} active={withCode === "true"}>
              Needs a code
            </FilterLink>
            <FilterLink href={hrefWith(params, { withCode: "false", type: undefined })} active={withCode === "false"}>
              No code needed
            </FilterLink>
            {(["freeshipping", "bogo", "cashback", "giftcard"] as const).map((value) => (
              <FilterLink
                key={value}
                href={hrefWith(params, { type: value, withCode: undefined })}
                active={type === value}
              >
                {COUPON_TYPE_LABELS[value]}
              </FilterLink>
            ))}
          </FilterGroup>

          <FilterGroup
            title="Highlights"
            clearHref={
              expiringSoon || exclusive
                ? hrefWith(params, { expiringSoon: undefined, exclusive: undefined })
                : undefined
            }
          >
            <FilterLink href={hrefWith(params, { expiringSoon: "true" })} active={expiringSoon === "true"}>
              <Clock3 aria-hidden className="mr-1.5 inline size-3.5" />
              Ending this week
            </FilterLink>
            <FilterLink href={hrefWith(params, { exclusive: "true" })} active={exclusive === "true"}>
              <Star aria-hidden className="mr-1.5 inline size-3.5" />
              Exclusive to us
            </FilterLink>
          </FilterGroup>

          {categories.length ? (
            <FilterGroup
              title="Category"
              clearHref={category ? hrefWith(params, { category: undefined }) : undefined}
            >
              <FilterLink href={hrefWith(params, { category: undefined })} active={!category}>
                All categories
              </FilterLink>
              <div className="max-h-72 overflow-y-auto pr-1">
                {categories.map((item) => (
                  <FilterLink
                    key={item._id}
                    href={hrefWith(params, { category: item.slug })}
                    active={category === item.slug}
                    count={item.activeCouponCount}
                  >
                    <CategoryIcon name={item.name} className="mr-1.5 inline size-3.5" />
                    {item.name}
                  </FilterLink>
                ))}
              </div>
              <Link
                href="/categories"
                className="mt-1 inline-flex items-center gap-1 px-2.5 py-2 text-[13px] font-bold text-brand-600 hover:underline"
              >
                View all categories
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </FilterGroup>
          ) : null}

          {stores.length ? (
            <FilterGroup
              collapsed
              title="Store"
              clearHref={store ? hrefWith(params, { store: undefined }) : undefined}
            >
              {stores.slice(0, 10).map((item) => (
                <FilterLink
                  key={item._id}
                  href={hrefWith(params, { store: item.slug })}
                  active={store === item.slug}
                  count={item.activeCouponCount}
                >
                  <StoreLogo
                    name={item.name}
                    logo={item.logo}
                    size={18}
                    rounded="rounded"
                    className="mr-1.5 inline-block align-[-4px] border-0"
                  />
                  {item.name}
                </FilterLink>
              ))}
            </FilterGroup>
          ) : null}

            </div>

            <div className="mt-3">
              <AdSlot position="sidebar" />
            </div>
          </details>
        </aside>

        {/* ---- results ---- */}
        <div>
          <div className="surface mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-sm text-body">
              Showing{" "}
              <strong className="text-[var(--text-primary)]">
                {start}–{(page - 1) * PER_PAGE + feed.items.length}
              </strong>{" "}
              of {formatCount(feed.pagination.total)} offers
            </p>

            <div className="flex flex-wrap gap-2">
              {Object.entries(COUPON_SORT_LABELS).map(([value, label]) => (
                <Link
                  key={value}
                  href={hrefWith(params, { sort: value === "best" ? undefined : value })}
                  className={classNames(
                    "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all hover:-translate-y-px",
                    sort === value
                      ? "border-brand-600 bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                      : "border-[var(--border-subtle)] text-body hover:border-brand-300 hover:text-brand-600"
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {feed.items.length ? (
            <>
              {/* Two columns from `xl`, so a wide screen is not one thin ribbon
                  of cards with empty space either side. */}
              <div className="space-y-3">
                {feed.items.slice(0, 6).map((coupon) => (
                  <OfferRow key={coupon._id} coupon={coupon} />
                ))}
              </div>

              <AdSlot position="category-infeed" className="my-3" />

              <div className="space-y-3">
                {feed.items.slice(6).map((coupon) => (
                  <OfferRow key={coupon._id} coupon={coupon} />
                ))}
              </div>
            </>
          ) : (
            <>
              <EmptyState
                title={
                  exclusive === "true"
                    ? "No exclusive codes live right now"
                    : expiringSoon === "true"
                      ? "Nothing is about to expire"
                      : "No offers match that"
                }
                body={
                  exclusive === "true"
                    ? "Exclusives come and go — we negotiate them one store at a time. Here is what is saving people the most today."
                    : expiringSoon === "true"
                      ? "Every live offer either runs on with no end date or has more than a week left. Here are the biggest discounts instead."
                      : "Try removing a filter, or browse everything we have live right now."
                }
                action={<ButtonLink href="/coupons">Show all offers</ButtonLink>}
              />

              {fallback.length ? (
                <section className="mt-8">
                  <h2 className="mb-3 font-display text-lg font-extrabold">
                    Biggest savings on the site
                  </h2>
                  <div className="space-y-3">
                    {fallback.map((coupon) => (
                      <OfferRow key={coupon._id} coupon={coupon} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}

          <Pagination
            page={feed.pagination.page}
            pages={feed.pagination.pages}
            hrefFor={(next) => hrefWith(params, { page: String(next) })}
          />
        </div>
      </div>

      {/* ---- a way onwards, rather than a dead end ---- */}
      {categories.length ? (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold">Keep browsing</h2>
            <Link
              href="/categories"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600"
            >
              All categories
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 12).map((item) => (
              <Link
                key={item._id}
                href={`/category/${item.slug}`}
                className="surface group flex items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] px-3 py-2.5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  <CategoryIcon name={item.name} className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold">{item.name}</span>
                  <span className="block text-[11px] text-faint">
                    {formatCount(item.activeCouponCount)} offers
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
