import { ArrowRight, Flame, LayoutGrid, ShieldCheck, Store as StoreIcon, Tag, Ticket } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CategoryBrowser, type BrowserCategory } from "@/components/site/CategoryBrowser";
import { CategoryIcon } from "@/components/ui/icons";
import { EmptyState, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { categoryColor, categoryHeaderArt, formatCount } from "@/lib/format";
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
    apiSafe<Category[]>("/categories", [], { query: { shape: "tree", limit: 200 }, revalidate: 3600 }),
    apiPaged<Store>("/stores", { query: { limit: 10, sort: "offers", withOffers: true }, revalidate: 3600 })
      .then((result) => result.items)
      .catch(() => [] as Store[]),
  ]);

  const ranked = [...categories].sort((a, b) => b.activeCouponCount - a.activeCouponCount);
  const total = categories.reduce((sum, item) => sum + item.activeCouponCount, 0);
  const storeTotal = categories.reduce((sum, item) => sum + item.storeCount, 0);
  const featured = ranked.slice(0, 3);

  const browser: BrowserCategory[] = categories.map((item) => ({
    id: item._id,
    name: item.name,
    slug: item.slug,
    offers: item.activeCouponCount,
    stores: item.storeCount,
    tint: categoryColor(item),
    description: item.description,
    children: (item.children ?? []).map((child) => child.name),
  }));

  const facts = [
    { Icon: Tag, value: `${formatCount(total)} offers`, body: "live right now" },
    { Icon: LayoutGrid, value: `${categories.length} aisles`, body: "to browse" },
    { Icon: StoreIcon, value: `${formatCount(storeTotal)} store listings`, body: "across them" },
    { Icon: ShieldCheck, value: "Hand-checked", body: "before listing" },
  ];

  return (
    <div className="pb-4">
      <div className="shell pt-6">
        {/* ================= header ================= */}
        <section className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-8 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
          <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-600/20" />
          <span aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-accent-300/30 blur-3xl dark:bg-accent-600/10" />

          {/* a scatter of the aisles themselves */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-8 hidden w-[28rem] items-center lg:flex">
            <div className="grid w-full grid-cols-4 gap-3 [transform:rotate(-5deg)]">
              {ranked.slice(0, 8).map((item, index) => (
                <span
                  key={item._id}
                  className="flex aspect-square items-center justify-center rounded-2xl text-white shadow-[var(--shadow-lift)]"
                  style={{
                    backgroundColor: categoryColor(item),
                    transform: `translateY(${index % 2 ? 16 : -8}px)`,
                  }}
                >
                  <CategoryIcon name={item.name} className="size-9" />
                </span>
              ))}
            </div>
          </div>

          <div className="relative lg:max-w-[52%]">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-body">
              <Link href="/" className="transition hover:text-brand-600">Home</Link>
              <span aria-hidden>/</span>
              <span className="font-semibold text-[var(--text-primary)]">Categories</span>
            </nav>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              Every category <span className="text-brand-600">we cover</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-body sm:text-[15px]">
              Pick an aisle to see the live coupon codes and deals inside it — or search for exactly what you&#39;re shopping for.
            </p>

            <Link
              href="/coupons"
              className="group mt-5 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              Browse all offers
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

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

        <AdSlot position="category-top" className="mt-5" />

        {categories.length ? (
          <>
            {/* ================= the three biggest aisles ================= */}
            <section className="mt-6">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-warn-50 text-warn-600 dark:bg-warn-500/10">
                  <Flame aria-hidden className="size-[18px]" />
                </span>
                <h2 className="font-display text-xl font-extrabold">Busiest aisles right now</h2>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {featured.map((item, index) => {
                  const tint = categoryColor(item);
                  const art = categoryHeaderArt(item);
                  return (
                    <Link
                      key={item._id}
                      href={`/category/${item.slug}`}
                      className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                      style={{
                        borderColor: `color-mix(in srgb, ${tint} 35%, #fff)`,
                        backgroundImage: `linear-gradient(120deg, color-mix(in srgb, ${tint} 10%, #fff), color-mix(in srgb, ${tint} 22%, #fff))`,
                      }}
                    >
                      {art ? (
                        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex w-[62%] items-end">
                          {/* Editor-uploaded creative — a plain img, like every other brand asset. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={art.url}
                            alt=""
                            className="h-full w-full object-cover object-left mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            style={{
                              maskImage: "linear-gradient(to right, transparent 0%, #000 34%, #000 100%), linear-gradient(to bottom, transparent 0%, #000 14%, #000 100%)",
                              WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 34%, #000 100%), linear-gradient(to bottom, transparent 0%, #000 14%, #000 100%)",
                              maskComposite: "intersect",
                              WebkitMaskComposite: "source-in",
                            }}
                          />
                        </span>
                      ) : (
                        <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-4 opacity-20" style={{ color: tint }}>
                          <CategoryIcon name={item.name} className="size-40" strokeWidth={1.3} />
                        </span>
                      )}

                      <span className="relative flex items-center gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white"
                          style={{ backgroundColor: tint }}
                        >
                          #{index + 1} aisle
                        </span>
                      </span>

                      <span className="relative">
                        <span className="flex items-center gap-3">
                          <span className="flex size-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-card)]" style={{ backgroundColor: tint }}>
                            <CategoryIcon name={item.name} className="size-6" />
                          </span>
                          <span className="font-display text-2xl font-extrabold text-ink-900">{item.name}</span>
                        </span>
                        <span className="mt-2 block text-sm font-semibold text-ink-700">
                          {formatCount(item.activeCouponCount)} live offers · {formatCount(item.storeCount)} stores
                        </span>
                        <span
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-[var(--shadow-card)]"
                          style={{ backgroundColor: tint }}
                        >
                          See {item.name} offers
                          <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ================= all categories, searchable ================= */}
            <section className="mt-8">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                  <LayoutGrid aria-hidden className="size-[18px]" />
                </span>
                <h2 className="font-display text-xl font-extrabold">All categories</h2>
              </div>
              <CategoryBrowser categories={browser} />
            </section>

            {/* ================= stores ================= */}
            {stores.length ? (
              <section className="mt-10 rounded-3xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-5 sm:p-6 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-[var(--shadow-glow)]">
                    <Ticket aria-hidden className="size-[18px]" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-extrabold">Prefer to start from a brand?</h2>
                    <p className="text-xs text-body">The stores with the most offers live right now.</p>
                  </div>
                  <Link href="/stores" className="ml-auto inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline">
                    All stores
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {stores.slice(0, 10).map((store) => (
                    <Link
                      key={store._id}
                      href={`/store/${store.slug}`}
                      className="group flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/80 p-2.5 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] dark:border-white/10 dark:bg-white/5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white p-0.5">
                        <StoreLogo name={store.name} logo={store.logo} size={34} rounded="rounded-lg" className="border-0" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold">{store.name}</span>
                        <span className="block text-[10px] font-semibold text-faint">{formatCount(store.activeCouponCount)} offers</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <EmptyState title="No categories yet" body="Once coupons are imported, categories appear here." />
        )}
      </div>
    </div>
  );
}
