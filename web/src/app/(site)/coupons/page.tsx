import { ArrowRight, Clock3, Filter, Star, Ticket, X } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/icons";
import {
  Breadcrumbs,
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
            : "All coupon codes & deals";

  const start = feed.items.length ? (page - 1) * PER_PAGE + 1 : 0;

  return (
    <div className="shell py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "All offers" }]} />

      {/* ---- header band: title, counts and the filters in force ---- */}
      <section className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-brand-100 opacity-60 blur-3xl dark:bg-brand-900/40"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              <Ticket aria-hidden className="size-4" />
              Offers
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold sm:text-3xl">{headline}</h1>
            <p className="mt-1.5 text-sm text-body">
              <strong className="text-[var(--text-primary)]">
                {formatCount(feed.pagination.total)}
              </strong>{" "}
              live offers{chips.length ? " matching your filters" : " across every store we list"}, each
              one opened and checked before it went on the page.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { href: "/coupons?withCode=true", label: "Promo codes", Icon: Ticket, on: withCode === "true" },
                { href: "/coupons?expiringSoon=true", label: "Ending soon", Icon: Clock3, on: expiringSoon === "true" },
                { href: "/coupons?exclusive=true", label: "Exclusives", Icon: Star, on: exclusive === "true" },
              ] as const
            ).map((quick) => (
              <Link
                key={quick.href}
                href={quick.href}
                className={classNames(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all hover:-translate-y-px",
                  quick.on
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                    : "border-[var(--border-subtle)] text-body hover:border-brand-300 hover:text-brand-600"
                )}
              >
                <quick.Icon aria-hidden className="size-4" />
                {quick.label}
              </Link>
            ))}
          </div>
        </div>

        {chips.length ? (
          <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              <Filter aria-hidden className="size-3.5" />
              Filters
            </span>

            {chips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300"
              >
                {chip.label}
                <X aria-hidden className="size-3" />
              </Link>
            ))}

            <Link
              href="/coupons"
              className="ml-auto text-xs font-bold text-faint transition hover:text-brand-600"
            >
              Clear all
            </Link>
          </div>
        ) : null}
      </section>

      <AdSlot position="category-top" className="mt-6" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* ---- filters ---- */}
        <aside className="space-y-3 lg:sticky lg:top-28 lg:self-start">
          <FilterGroup title="Offer type">
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

          <FilterGroup title="Highlights">
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
            <FilterGroup title="Category">
              <FilterLink href={hrefWith(params, { category: undefined })} active={!category}>
                All categories
              </FilterLink>
              {categories.slice(0, 12).map((item) => (
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
            </FilterGroup>
          ) : null}

          {stores.length ? (
            <FilterGroup title="Store">
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

          <AdSlot position="sidebar" />
        </aside>

        {/* ---- results ---- */}
        <div>
          <div className="surface mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-sm text-faint">
              Showing{" "}
              <strong className="text-[var(--text-primary)]">
                {start}–{(page - 1) * PER_PAGE + feed.items.length}
              </strong>{" "}
              of {formatCount(feed.pagination.total)}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {Object.entries(COUPON_SORT_LABELS).map(([value, label]) => (
                <Link
                  key={value}
                  href={hrefWith(params, { sort: value === "best" ? undefined : value })}
                  className={classNames(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                    sort === value
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                      : "border-[var(--border-subtle)] text-body hover:border-brand-300"
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
              <div className="grid gap-3 2xl:grid-cols-2">
                {feed.items.slice(0, 6).map((coupon) => (
                  <CouponCard key={coupon._id} coupon={coupon} />
                ))}
              </div>

              <AdSlot position="category-infeed" className="my-3" />

              <div className="grid gap-3 2xl:grid-cols-2">
                {feed.items.slice(6).map((coupon) => (
                  <CouponCard key={coupon._id} coupon={coupon} />
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
                  <div className="grid gap-3 2xl:grid-cols-2">
                    {fallback.map((coupon) => (
                      <CouponCard key={coupon._id} coupon={coupon} />
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

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
      <h2 className="border-b border-[var(--border-subtle)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
        {title}
      </h2>
      <div className="p-1.5">{children}</div>
    </section>
  );
}

function FilterLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={classNames(
        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition",
        active
          ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
          : "text-body hover:surface-sunken"
      )}
    >
      <span className="truncate">{children}</span>
      {count !== undefined ? (
        <span className="shrink-0 text-xs text-faint tabular-nums">{formatCount(count)}</span>
      ) : null}
    </Link>
  );
}
