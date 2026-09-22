import { ArrowRight, LayoutGrid } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CategoryIcon } from "@/components/ui/icons";
import { Breadcrumbs, EmptyState, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { classNames, formatCount } from "@/lib/format";
import type { Category, Store } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse every category",
  description:
    "Fashion, travel, electronics, food and more — pick a category to see the live coupon codes and deals inside it.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const [categories, stores] = await Promise.all([
    apiSafe<Category[]>("/categories", [], {
      query: { shape: "tree", limit: 200 },
      revalidate: 3600,
    }),
    apiPaged<Store>("/stores", { query: { limit: 12, sort: "offers", withOffers: true }, revalidate: 3600 })
      .then((result) => result.items)
      .catch(() => [] as Store[]),
  ]);

  const ranked = [...categories].sort((a, b) => b.activeCouponCount - a.activeCouponCount);
  const [lead, ...rest] = ranked;
  const total = categories.reduce((sum, item) => sum + item.activeCouponCount, 0);

  return (
    <div className="shell py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Categories" }]} />

      {/* ---- header ---- */}
      <section className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] sm:p-7">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-brand-100 opacity-60 blur-3xl dark:bg-brand-900/40"
        />

        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              <LayoutGrid aria-hidden className="size-4" />
              Browse
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold sm:text-3xl">
              Every category we cover
            </h1>
            <p className="mt-1.5 text-sm text-body">
              <strong className="text-[var(--text-primary)]">{formatCount(total)}</strong> live
              offers, sorted into {categories.length} aisles.
            </p>
          </div>

          <Link
            href="/coupons"
            className="group inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all hover:-translate-y-px hover:shadow-[var(--shadow-glow-strong)]"
          >
            Browse all offers
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <AdSlot position="category-top" className="mt-6" />

      {categories.length ? (
        <>
          {/* ---- the biggest aisle gets the wide card ---- */}
          {lead ? (
            <section className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              <Link
                href={`/category/${lead.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-brand-gradient p-6 text-white shadow-[var(--shadow-glow)] transition-all hover:-translate-y-1"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      "radial-gradient(22rem 14rem at 12% -20%, rgba(255,255,255,0.35), transparent 70%), radial-gradient(18rem 12rem at 100% 120%, rgba(255,255,255,0.22), transparent 70%)",
                  }}
                />

                <div className="relative">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                    Biggest aisle
                  </p>

                  <div className="mt-4 flex items-center gap-3.5">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-inset ring-white/30">
                      <CategoryIcon name={lead.name} className="size-7" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-2xl font-extrabold">{lead.name}</h2>
                      <p className="text-sm text-white/80">
                        {formatCount(lead.activeCouponCount)} live offers ·{" "}
                        {formatCount(lead.storeCount)} stores
                      </p>
                    </div>
                  </div>

                  {lead.description ? (
                    <p className="mt-4 line-clamp-2 max-w-lg text-sm leading-relaxed text-white/80">
                      {lead.description}
                    </p>
                  ) : null}
                </div>

                <span className="relative mt-6 inline-flex w-fit items-center gap-1.5 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700">
                  See {lead.name} offers
                  <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              {/* ---- stores worth knowing, so the row is not half empty ---- */}
              <div className="surface rounded-3xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
                  Stores with the most on
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {stores.slice(0, 6).map((store) => (
                    <Link
                      key={store._id}
                      href={`/store/${store.slug}`}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-card)]"
                    >
                      <StoreLogo
                        name={store.name}
                        logo={store.logo}
                        size={36}
                        rounded="rounded-xl"
                        className="border-0 transition-transform group-hover:scale-110"
                      />
                      <span className="w-full min-w-0">
                        <span className="block truncate text-[11px] font-bold">{store.name}</span>
                        <span className="block text-[10px] font-semibold text-faint">
                          {formatCount(store.activeCouponCount)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {/* ---- the rest, ranked ---- */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rest.map((category, index) => (
              <Link
                key={category._id}
                href={`/category/${category.slug}`}
                className="surface group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <span
                  aria-hidden
                  className={classNames(
                    "pointer-events-none absolute -right-10 -top-12 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
                    index % 2 ? "bg-accent-200" : "bg-brand-200"
                  )}
                />

                <span
                  className={classNames(
                    "relative flex size-12 items-center justify-center rounded-2xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110",
                    index % 3 === 0
                      ? "bg-gradient-to-br from-brand-100 to-brand-50 text-brand-700 ring-brand-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:text-brand-300 dark:ring-brand-800"
                      : index % 3 === 1
                        ? "bg-gradient-to-br from-accent-100 to-accent-50 text-accent-600 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:text-brand-300 dark:ring-brand-800"
                        : "bg-gradient-to-br from-accent-300 to-accent-100 text-accent-600 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:text-brand-300 dark:ring-brand-800"
                  )}
                >
                  <CategoryIcon name={category.name} className="size-6" />
                </span>

                <span className="relative min-w-0">
                  <span className="block truncate text-sm font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                    {category.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-faint">
                    {formatCount(category.activeCouponCount)} offers ·{" "}
                    {formatCount(category.storeCount)} stores
                  </span>
                </span>

                {category.children?.length ? (
                  <span className="relative mt-auto flex flex-wrap gap-1">
                    {category.children.slice(0, 2).map((child) => (
                      <span
                        key={child._id}
                        className="rounded-full bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold text-faint"
                      >
                        {child.name}
                      </span>
                    ))}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <EmptyState title="No categories yet" body="Once coupons are imported, categories appear here." />
      )}
    </div>
  );
}
