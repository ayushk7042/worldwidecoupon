import { ArrowRight, Search, Store as StoreIcon, Ticket } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/icons";
import { Breadcrumbs, EmptyState, Pagination, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { classNames, formatCount } from "@/lib/format";
import type { Category, Pagination as PageInfo, Store } from "@/lib/types";

export const revalidate = 600;

const PER_PAGE = 48;

export const metadata: Metadata = {
  title: "All stores A–Z",
  description:
    "Every brand we list, from A to Z. Pick a store to see its live coupon codes and deals.",
  alternates: { canonical: "/stores" },
};

const LETTERS = ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

type SearchParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const letter = one(params.letter);
  const category = one(params.category);
  const search = one(params.search);
  const sort = one(params.sort) ?? "popular";
  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);

  // The full index is only worth fetching on the unfiltered page, where it is
  // the crawlable A–Z every coupon site is expected to have.
  const showDirectory = !letter && !category && !search;

  const [result, letters, categories, directory] = await Promise.all([
    apiPaged<Store>("/stores", {
      query: { page, limit: PER_PAGE, letter, category, search, sort, withOffers: true },
      revalidate: 600,
    }).catch(() => ({
      items: [] as Store[],
      pagination: { page: 1, limit: PER_PAGE, total: 0, pages: 1, hasMore: false } as PageInfo,
    })),
    apiSafe<Record<string, number>>("/stores/letters", {}, { revalidate: 3600 }),
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    showDirectory
      ? apiSafe<Record<string, Store[]>>("/stores/directory", {}, { revalidate: 3600 })
      : Promise.resolve({} as Record<string, Store[]>),
  ]);

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = one(value);
      if (single && key !== "page") next.set(key, single);
    }
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    return query ? `/stores?${query}` : "/stores";
  };

  const activeCategory = categories.find((item) => item.slug === category);
  const headline = search
    ? `Stores matching “${search}”`
    : activeCategory
      ? `${activeCategory.name} stores`
      : letter
        ? `Stores starting with ${letter}`
        : "Every store we list";

  return (
    <div className="shell py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Stores" }]} />

      {/* ---- header ---- */}
      <section className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-accent-100 opacity-70 blur-3xl dark:bg-brand-900/40"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              <StoreIcon aria-hidden className="size-4" />
              Directory
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold sm:text-3xl">{headline}</h1>
            <p className="mt-1.5 text-sm text-body">
              <strong className="text-[var(--text-primary)]">
                {formatCount(result.pagination.total)}
              </strong>{" "}
              brands with live offers right now.
            </p>
          </div>

          <form action="/stores" className="flex w-full max-w-sm items-center gap-2">
            <label className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="search"
                name="search"
                defaultValue={search ?? ""}
                placeholder="Find a store…"
                aria-label="Search stores"
                className="h-11 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] pl-11 pr-4 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
              />
            </label>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-full bg-brand-gradient px-5 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110"
            >
              Search
            </button>
          </form>
        </div>

        {/* ---- initials ---- */}
        <nav aria-label="Filter by initial" className="relative mt-5 flex flex-wrap gap-1.5 border-t border-[var(--border-subtle)] pt-4">
          <Link
            href={hrefWith({ letter: undefined })}
            className={classNames(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition",
              !letter
                ? "bg-brand-gradient text-white shadow-[var(--shadow-glow)]"
                : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/60"
            )}
          >
            All
          </Link>

          {LETTERS.map((value) => {
            const count = letters[value] ?? 0;

            return count === 0 ? (
              <span
                key={value}
                aria-disabled
                className="inline-flex h-8 min-w-8 cursor-not-allowed items-center justify-center rounded-lg px-2 text-xs font-bold text-faint opacity-40"
              >
                {value}
              </span>
            ) : (
              <Link
                key={value}
                href={hrefWith({ letter: value })}
                title={`${count} stores`}
                className={classNames(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold transition",
                  letter === value
                    ? "bg-brand-gradient text-white shadow-[var(--shadow-glow)]"
                    : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/60"
                )}
              >
                {value}
              </Link>
            );
          })}
        </nav>
      </section>

      {/* ---- categories and sort ---- */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={hrefWith({ category: undefined })}
          className={classNames(
            "rounded-full border px-3.5 py-2 text-xs font-bold transition",
            !category
              ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
              : "border-[var(--border-subtle)] text-body hover:border-brand-300"
          )}
        >
          All categories
        </Link>

        {categories.slice(0, 10).map((item) => (
          <Link
            key={item._id}
            href={hrefWith({ category: item.slug })}
            className={classNames(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition",
              category === item.slug
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                : "border-[var(--border-subtle)] text-body hover:border-brand-300"
            )}
          >
            <CategoryIcon name={item.name} className="size-3.5" />
            {item.name}
          </Link>
        ))}

        <div className="ml-auto flex gap-1.5">
          {(
            [
              { value: "popular", label: "Popular" },
              { value: "offers", label: "Most offers" },
              { value: "name", label: "A–Z" },
            ] as const
          ).map((option) => (
            <Link
              key={option.value}
              href={hrefWith({ sort: option.value === "popular" ? undefined : option.value })}
              className={classNames(
                "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                sort === option.value
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  : "border-[var(--border-subtle)] text-body hover:border-brand-300"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <AdSlot position="category-top" className="mt-5" />

      {/* ---- the grid ---- */}
      {result.items.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {result.items.map((store) => (
            <Link
              key={store._id}
              href={`/store/${store.slug}`}
              className="surface group flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-3 py-3.5 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-[4.5rem] items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 transition-transform duration-200 group-hover:scale-105">
                <StoreLogo name={store.name} logo={store.logo} size={62} rounded="rounded-xl" className="border-0" />
              </span>

              <span className="w-full min-w-0">
                <span className="block truncate text-[13px] font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                  {store.name}
                </span>
                <span className="block text-[11px] font-semibold text-faint">
                  {formatCount(store.activeCouponCount)} offers
                  {store.bestOffer ? ` · ${store.bestOffer}` : ""}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No stores here"
          body="Nothing matches that filter. Try another letter, or clear the filters."
          action={<ButtonLink href="/stores">Show all stores</ButtonLink>}
        />
      )}

      <Pagination
        page={result.pagination.page}
        pages={result.pagination.pages}
        hrefFor={(next) => hrefWith({ page: String(next) })}
      />

      {/* ---- the full index, for people and for crawlers ---- */}
      {showDirectory && Object.keys(directory).length ? (
        <section className="mt-12 border-t border-[var(--border-subtle)] pt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                <Ticket aria-hidden className="size-4" />
                Index
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold">Every store, A to Z</h2>
            </div>

            <Link
              href="/coupons"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600"
            >
              Browse all offers
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
            {Object.entries(directory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([initial, group]) => (
                <div key={initial} className="mb-6 break-inside-avoid">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-brand-600">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-brand-50 text-xs dark:bg-brand-950/60">
                      {initial}
                    </span>
                    <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                  </h3>

                  <ul className="space-y-1">
                    {group.map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/store/${item.slug}`}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm text-body transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50 dark:hover:text-brand-300"
                        >
                          <span className="truncate">{item.name}</span>
                          {item.activeCouponCount ? (
                            <span className="shrink-0 text-[11px] text-faint tabular-nums">
                              {item.activeCouponCount}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
