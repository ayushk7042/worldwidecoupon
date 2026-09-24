import { ArrowRight, Crown, Flame, Search, ShieldCheck, Sparkles, Store as StoreIcon, Ticket, Truck } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { DirectoryFinder } from "@/components/site/DirectoryFinder";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryIcon } from "@/components/ui/icons";
import { EmptyState, Pagination, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { categoryColor, classNames, formatCount, splitBadge } from "@/lib/format";
import type { Category, Pagination as PageInfo, Store } from "@/lib/types";

export const revalidate = 600;

const PER_PAGE = 36;

export const metadata: Metadata = {
  title: "All stores A–Z",
  description:
    "Every brand we list, from A to Z. Pick a store to see its live coupon codes and deals.",
  alternates: { canonical: "/stores" },
};

const LETTERS = ["#", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

const SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "offers", label: "Most offers" },
  { value: "name", label: "A–Z" },
  { value: "newest", label: "Newest" },
];

type SearchParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function StoresPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const letter = one(params.letter);
  const category = one(params.category);
  const search = one(params.search);
  const sort = one(params.sort) ?? "popular";
  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);

  const showDirectory = !letter && !category && !search;
  const showTop = showDirectory && page === 1 && sort === "popular";

  const empty = {
    items: [] as Store[],
    pagination: { page: 1, limit: PER_PAGE, total: 0, pages: 1, hasMore: false } as PageInfo,
  };

  const [result, letters, categories, directory, top] = await Promise.all([
    apiPaged<Store>("/stores", {
      query: { page, limit: PER_PAGE, letter, category, search, sort, withOffers: true },
      revalidate: 600,
    }).catch(() => empty),
    apiSafe<Record<string, number>>("/stores/letters", {}, { revalidate: 3600 }),
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    showDirectory
      ? apiSafe<Record<string, Store[]>>("/stores/directory", {}, { revalidate: 3600 })
      : Promise.resolve({} as Record<string, Store[]>),
    showTop
      ? apiPaged<Store>("/stores", { query: { limit: 8, sort: "offers", withOffers: true }, revalidate: 1800 })
          .then((r) => r.items)
          .catch(() => [] as Store[])
      : Promise.resolve([] as Store[]),
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

  const totalLetters = Object.values(letters).reduce((sum, value) => sum + value, 0);
  const anyFilter = Boolean(letter || category || search);

  const facts = [
    { Icon: StoreIcon, value: `${formatCount(result.pagination.total)} brands`, body: "with live offers" },
    { Icon: Ticket, value: "Codes & deals", body: "opened before listing" },
    { Icon: Truck, value: "Free shipping", body: "flagged on each offer" },
    { Icon: ShieldCheck, value: "No sign-up", body: "to copy a code" },
  ];

  return (
    <div className="pb-4">
      <div className="shell pt-6">
        {/* ================= header ================= */}
        <section className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-8 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
          <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-600/20" />
          <span aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-accent-300/30 blur-3xl dark:bg-accent-600/10" />

          {/* a fan of real store logos on the right */}
          {top.length ? (
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-8 hidden w-[30rem] items-center lg:flex">
              <div className="grid w-full grid-cols-4 gap-3 [transform:rotate(-6deg)]">
                {top.slice(0, 8).map((store, index) => (
                  <span
                    key={store._id}
                    className={classNames(
                      "flex aspect-square items-center justify-center rounded-2xl border border-white/80 bg-white p-2 shadow-[var(--shadow-lift)]",
                      index % 2 ? "translate-y-4" : "-translate-y-2"
                    )}
                  >
                    <StoreLogo name={store.name} logo={store.logo} size={64} rounded="rounded-xl" className="border-0" />
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative lg:max-w-[52%]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-body">
              <Link href="/" className="transition hover:text-brand-600">Home</Link>
              <span aria-hidden>/</span>
              <span className="font-semibold text-[var(--text-primary)]">Stores</span>
            </nav>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              {anyFilter ? headline : (
                <>
                  Every store <span className="text-brand-600">we list</span>
                </>
              )}
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-body sm:text-[15px]">
              Find your favourite brand, jump to its live coupon codes and deals, or discover new stores worth shopping at.
            </p>

            <form action="/stores" className="mt-5 flex max-w-lg items-center gap-2">
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <label className="relative flex-1">
                <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  type="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder="Search a store — Amazon, Nike, Etsy…"
                  aria-label="Search stores"
                  className="h-12 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] pl-11 pr-4 text-sm shadow-[var(--shadow-card)] focus:border-brand-500 focus:outline-none"
                />
              </label>
              <button type="submit" className="h-12 rounded-full bg-brand-gradient px-6 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110">
                Search
              </button>
            </form>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-6">
              {facts.map((fact) => (
                <span key={fact.value} className="flex items-center gap-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                    <fact.Icon aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold">{fact.value}</span>
                    <span className="block text-[11px] text-faint">{fact.body}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ================= A–Z jump bar ================= */}
        <div className="sticky top-[8.4rem] z-20 mt-4">
          <div className="surface flex items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--border-subtle)] p-1.5 shadow-[var(--shadow-card)] no-scrollbar">
            <Link
              href={hrefWith({ letter: undefined })}
              className={classNames(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold transition",
                !letter ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]" : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50"
              )}
            >
              All <span className="ml-1 opacity-70">{formatCount(totalLetters)}</span>
            </Link>
            <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-[var(--border-subtle)]" />
            {LETTERS.map((item) => {
              const count = letters[item] ?? 0;
              return count ? (
                <Link
                  key={item}
                  href={hrefWith({ letter: letter === item ? undefined : item })}
                  title={`${count} stores`}
                  className={classNames(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition",
                    letter === item ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]" : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50"
                  )}
                >
                  {item}
                </Link>
              ) : (
                <span key={item} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-faint/40">
                  {item}
                </span>
              );
            })}
          </div>
        </div>

        {/* ================= category chips + sort ================= */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            <Link
              href={hrefWith({ category: undefined })}
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                !category ? "border-brand-600 bg-brand-600 text-white shadow-[var(--shadow-glow)]" : "border-[var(--border-subtle)] text-body hover:border-brand-300 hover:text-brand-600"
              )}
            >
              All categories
            </Link>
            {categories.slice(0, 14).map((item) => {
              const tint = categoryColor(item);
              const on = category === item.slug;
              return (
                <Link
                  key={item._id}
                  href={hrefWith({ category: on ? undefined : item.slug })}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-px"
                  style={
                    on
                      ? { backgroundColor: tint, borderColor: tint, color: "#fff" }
                      : { borderColor: `${tint}40`, backgroundColor: `color-mix(in srgb, ${tint} 8%, var(--surface))` }
                  }
                >
                  <CategoryIcon name={item.name} className="size-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] p-1">
            {SORTS.map((option) => (
              <Link
                key={option.value}
                href={hrefWith({ sort: option.value === "popular" ? undefined : option.value })}
                className={classNames(
                  "rounded-full px-3 py-1.5 text-xs font-bold transition",
                  sort === option.value ? "bg-brand-600 text-white" : "text-body hover:text-brand-700"
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>

        <AdSlot position="category-top" className="mt-5" />

        {/* ================= top stores ================= */}
        {showTop && top.length ? (
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-warn-50 text-warn-600 dark:bg-warn-500/10">
                <Crown aria-hidden className="size-[18px]" />
              </span>
              <h2 className="font-display text-xl font-extrabold">Stores with the most going on</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {top.slice(0, 4).map((store, index) => {
                const best = store.bestOffer ? splitBadge(store.bestOffer) : null;
                return (
                  <Link
                    key={store._id}
                    href={`/store/${store.slug}`}
                    className="group relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-[var(--surface)] to-brand-100/60 p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] dark:border-brand-700/40 dark:from-brand-900/40 dark:to-brand-900/20"
                  >
                    <span className="absolute right-4 top-3 font-display text-5xl font-extrabold leading-none text-brand-600/10">
                      {index + 1}
                    </span>
                    <span className="flex size-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-2 shadow-[var(--shadow-card)] transition-transform duration-300 group-hover:scale-105">
                      <StoreLogo name={store.name} logo={store.logo} size={52} rounded="rounded-xl" className="border-0" />
                    </span>
                    <span className="mt-3 block truncate text-base font-extrabold">{store.name}</span>
                    <span className="block text-xs font-semibold text-faint">{formatCount(store.activeCouponCount)} live offers</span>
                    {best ? (
                      <span className="mt-3 flex items-baseline gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-faint">Up to</span>
                        <span className="font-display text-2xl font-extrabold text-brand-600">{best.lead}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-600">{best.tail || "off"}</span>
                      </span>
                    ) : null}
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600">
                      See offers
                      <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ================= the grid ================= */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
              <Sparkles aria-hidden className="size-[18px]" />
            </span>
            <h2 className="font-display text-xl font-extrabold">{anyFilter ? headline : "Browse all stores"}</h2>
            <span className="rounded-full bg-[var(--surface-sunken)] px-2.5 py-0.5 text-xs font-bold text-faint">
              {formatCount(result.pagination.total)}
            </span>
            {anyFilter ? (
              <Link href="/stores" className="ml-auto text-xs font-bold text-brand-600 hover:underline">
                Clear filters
              </Link>
            ) : null}
          </div>

          {result.items.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(showTop && top.length ? result.items.slice(4) : result.items).map((store) => {
                const codes = store.codeCount ?? 0;
                const deals = store.dealCount ?? 0;
                return (
                  <Link
                    key={store._id}
                    href={`/store/${store.slug}`}
                    className="surface group flex items-center gap-3.5 rounded-2xl border border-[var(--border-subtle)] p-3.5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
                  >
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 transition-transform duration-200 group-hover:scale-105">
                      <StoreLogo name={store.name} logo={store.logo} size={52} rounded="rounded-xl" className="border-0" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                        {store.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-faint">
                        <span>{formatCount(store.activeCouponCount)} offers</span>
                        {codes ? (
                          <span className="flex items-center gap-0.5 text-brand-600">
                            <Ticket aria-hidden className="size-3" />
                            {codes} codes
                          </span>
                        ) : deals ? (
                          <span>{deals} deals</span>
                        ) : null}
                      </span>
                      {store.bestOffer ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-extrabold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                          <Flame aria-hidden className="size-3" />
                          Up to {store.bestOffer}
                        </span>
                      ) : null}
                    </span>

                    <ArrowRight aria-hidden className="size-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No stores here"
              body="Nothing matches that filter. Try another letter, or clear the filters."
              action={<ButtonLink href="/stores">Show all stores</ButtonLink>}
            />
          )}

          <Pagination page={result.pagination.page} pages={result.pagination.pages} hrefFor={(next) => hrefWith({ page: String(next) })} />
        </section>

        {/* ================= the full index ================= */}
        {showDirectory && Object.keys(directory).length ? (
          <section className="mt-12 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  <Ticket aria-hidden className="size-4" />
                  Index
                </p>
                <h2 className="mt-1 font-display text-2xl font-extrabold">Every store, A to Z</h2>
              </div>
              <Link href="/coupons" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                Browse all offers
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <DirectoryFinder
              groups={Object.fromEntries(
                Object.entries(directory).map(([initial, group]) => [
                  initial,
                  group.map((item) => ({ id: item._id, name: item.name, slug: item.slug, count: item.activeCouponCount })),
                ])
              )}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
