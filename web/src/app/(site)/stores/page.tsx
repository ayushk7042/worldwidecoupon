import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { StoreCard } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import {
  Breadcrumbs,
  EmptyState,
  Pagination,
  SectionHeading,
} from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { classNames, formatCount } from "@/lib/format";
import type { Category, Pagination as PageInfo, Store } from "@/lib/types";

export const revalidate = 600;

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
      query: { page, limit: 48, letter, category, search, sort, withOffers: true },
      revalidate: 600,
    }).catch(() => ({
      items: [] as Store[],
      pagination: { page: 1, limit: 48, total: 0, pages: 1, hasMore: false } as PageInfo,
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

  return (
    <div className="shell py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Stores" }]} />

      <SectionHeading
        eyebrow="Directory"
        title="All stores A–Z"
        subtitle={`${formatCount(result.pagination.total)} brands with live offers right now.`}
        action={
          letter || category || search ? (
            <ButtonLink href="/stores" variant="secondary" size="sm">
              Clear
            </ButtonLink>
          ) : null
        }
      />

      <nav aria-label="Filter by initial" className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href={hrefWith({ letter: undefined })}
          className={classNames(
            "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-bold transition",
            !letter
              ? "border-brand-600 bg-brand-gradient text-white"
              : "border-[var(--border-subtle)] hover:border-brand-300"
          )}
        >
          All
        </Link>

        {LETTERS.map((value) => {
          const count = letters[value] ?? 0;
          const disabled = count === 0;

          return disabled ? (
            <span
              key={value}
              aria-disabled
              className="inline-flex h-9 min-w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[var(--border-subtle)] px-2 text-sm font-bold text-faint opacity-40"
            >
              {value}
            </span>
          ) : (
            <Link
              key={value}
              href={hrefWith({ letter: value })}
              title={`${count} stores`}
              className={classNames(
                "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-bold transition",
                letter === value
                  ? "border-brand-600 bg-brand-gradient text-white"
                  : "border-[var(--border-subtle)] hover:border-brand-300"
              )}
            >
              {value}
            </Link>
          );
        })}
      </nav>

      {categories.length ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={hrefWith({ category: undefined })}
            className={classNames(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
              !category
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                : "border-[var(--border-subtle)] text-body hover:border-brand-300"
            )}
          >
            All categories
          </Link>
          {categories.slice(0, 12).map((item) => (
            <Link
              key={item._id}
              href={hrefWith({ category: item.slug })}
              className={classNames(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                category === item.slug
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                  : "border-[var(--border-subtle)] text-body hover:border-brand-300"
              )}
            >
              {item.icon ? `${item.icon} ` : ""}
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}

      <AdSlot position="category-top" className="mb-6" />

      {result.items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((store) => (
            <StoreCard key={store._id} store={store} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No stores here"
          body="Nothing matches that filter. Try another letter or clear the filters."
          action={<ButtonLink href="/stores">Show all stores</ButtonLink>}
        />
      )}

      <Pagination
        page={result.pagination.page}
        pages={result.pagination.pages}
        hrefFor={(next) => hrefWith({ page: String(next) })}
      />

      {showDirectory && Object.keys(directory).length ? (
        <section className="mt-14 border-t border-[var(--border-subtle)] pt-10">
          <SectionHeading
            eyebrow="Index"
            title="Every store, A to Z"
            subtitle="The complete list, including brands whose offers are between campaigns."
          />

          <div className="space-y-6">
            {Object.entries(directory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([initial, group]) => (
                <div key={initial} id={`letter-${initial}`}>
                  <h3 className="mb-2 text-sm font-extrabold text-brand-600">{initial}</h3>
                  <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                    {group.map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/store/${item.slug}`}
                          className="text-sm text-body transition hover:text-brand-600"
                        >
                          {item.name}
                          {item.activeCouponCount ? (
                            <span className="text-faint"> ({item.activeCouponCount})</span>
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
