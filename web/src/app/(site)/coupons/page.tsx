import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { ButtonLink } from "@/components/ui/Button";
import {
  Breadcrumbs,
  Card,
  CouponCardSkeleton,
  EmptyState,
  Pagination,
  SectionHeading,
} from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { COUPON_SORT_LABELS, COUPON_TYPE_LABELS, classNames, formatCount } from "@/lib/format";
import type { Category, CouponView, Pagination as PageInfo } from "@/lib/types";
import { Suspense } from "react";

export const revalidate = 180;

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
    limit: 20,
    sort,
    type,
    store,
    category,
    search,
    withCode,
    expiringSoon,
    exclusive,
  };

  const [feed, categories] = await Promise.all([
    apiPaged<CouponView>("/coupons", { query, revalidate: 180 }).catch(() => ({
      items: [] as CouponView[],
      pagination: { page: 1, limit: 20, total: 0, pages: 1, hasMore: false } as PageInfo,
    })),
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
  ]);

  const activeFilters = [type, store, category, search, withCode, expiringSoon, exclusive].filter(
    Boolean
  ).length;

  return (
    <div className="shell py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "All offers" }]} />

      <SectionHeading
        eyebrow="Offers"
        title={search ? `Results for “${search}”` : "All coupon codes & deals"}
        subtitle={`${formatCount(feed.pagination.total)} live offers${
          activeFilters ? " matching your filters" : " across every store we list"
        }`}
        action={
          activeFilters ? (
            <ButtonLink href="/coupons" variant="secondary" size="sm">
              Clear filters
            </ButtonLink>
          ) : null
        }
      />

      <AdSlot position="category-top" className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
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
              ⏳ Ending this week
            </FilterLink>
            <FilterLink href={hrefWith(params, { exclusive: "true" })} active={exclusive === "true"}>
              ⭐ Exclusive to us
            </FilterLink>
          </FilterGroup>

          {categories.length ? (
            <FilterGroup title="Category">
              <FilterLink href={hrefWith(params, { category: undefined })} active={!category}>
                All categories
              </FilterLink>
              {categories.slice(0, 14).map((item) => (
                <FilterLink
                  key={item._id}
                  href={hrefWith(params, { category: item.slug })}
                  active={category === item.slug}
                  count={item.activeCouponCount}
                >
                  {item.icon ? `${item.icon} ` : ""}
                  {item.name}
                </FilterLink>
              ))}
            </FilterGroup>
          ) : null}

          <AdSlot position="sidebar" />
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-faint">
              Showing{" "}
              <strong className="text-[var(--text-primary)]">
                {feed.items.length ? (page - 1) * 20 + 1 : 0}–
                {(page - 1) * 20 + feed.items.length}
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

          <Suspense fallback={<ListSkeleton />}>
            {feed.items.length ? (
              <div className="space-y-3">
                {feed.items.map((coupon, index) => (
                  <div key={coupon._id}>
                    <CouponCard coupon={coupon} />
                    {/* One in-feed ad, low enough that it is not the first thing seen. */}
                    {index === 4 ? <AdSlot position="category-infeed" className="mt-3" /> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No offers match that"
                body="Try removing a filter, or browse everything we have live right now."
                action={<ButtonLink href="/coupons">Show all offers</ButtonLink>}
              />
            )}
          </Suspense>

          <Pagination
            page={feed.pagination.page}
            pages={feed.pagination.pages}
            hrefFor={(next) => hrefWith(params, { page: String(next) })}
          />
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <h3 className="border-b border-[var(--border-subtle)] px-4 py-3 text-sm font-bold">{title}</h3>
      <div className="p-2">{children}</div>
    </Card>
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
        "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition",
        active
          ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
          : "text-body hover:surface-sunken"
      )}
    >
      <span className="truncate">{children}</span>
      {count !== undefined ? (
        <span className="shrink-0 text-xs text-faint tabular-nums">{count}</span>
      ) : null}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <CouponCardSkeleton key={index} />
      ))}
    </div>
  );
}
