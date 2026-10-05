import { BookOpen, Heart, Newspaper, Percent } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { BlogCard, BlogSidebarList } from "@/components/site/BlogCard";
import { BlogNewsletter } from "@/components/site/BlogNewsletter";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Pagination } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { classNames } from "@/lib/format";
import { JsonLd, breadcrumbSchema } from "@/lib/schema";
import type { Blog, Category } from "@/lib/types";

const HERO_PILLS = [
  { label: "Expert Tips", sub: "& Guides", Icon: BookOpen, tint: "#1f9059" },
  { label: "Real Deals", sub: "& Trends", Icon: Percent, tint: "#2f7dd8" },
  { label: "Shop Smarter", sub: "Save More", Icon: Heart, tint: "#e0558a" },
];

export const revalidate = 300;

const PER_PAGE = 12;

export const metadata: Metadata = {
  title: "Blog — shopping guides, store deep-dives & saving tips",
  description:
    "Hand-written guides to the stores and deals on WorldwideCoupons — how to stack a code, what is actually worth buying, and where the real savings are.",
  alternates: { canonical: "/blog" },
};

type SearchParams = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const category = one(params.category);
  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);

  const [result, categories, recent] = await Promise.all([
    apiPaged<Blog>("/blog", {
      query: { page, limit: PER_PAGE, category, sort: "newest" },
      revalidate: 300,
    }).catch(() => ({ items: [] as Blog[], pagination: { page: 1, limit: PER_PAGE, total: 0, pages: 1, hasMore: false } })),
    apiSafe<Category[]>("/categories/menu", [], { revalidate: 3600 }),
    apiSafe<Blog[]>("/blog", [], { query: { limit: 5, sort: "newest" }, revalidate: 300 }).then((r) =>
      Array.isArray(r) ? r : []
    ),
  ]);

  const trail = [{ label: "Home", href: "/" }, { label: "Blog" }];

  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />

      <div className="shell pt-8">
        <section className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-brand-100/60 to-brand-50 dark:border-brand-700/40 dark:from-brand-900/35 dark:via-brand-800/25 dark:to-brand-900/35">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-brand-300/40 blur-3xl dark:bg-brand-600/20" />

          <div className="relative mx-auto max-w-2xl p-6 text-center sm:p-9">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 shadow-sm backdrop-blur dark:bg-ink-900/40 dark:text-brand-300">
              <Newspaper aria-hidden className="size-3.5" />
              The blog
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              Shopping guides <span className="text-brand-600">worth your time</span>
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-body sm:text-[15px]">
              How to actually use a code, which stores are worth following, and what is worth
              buying right now — written by people who read the fine print so you don&apos;t have to.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {HERO_PILLS.map((pill) => (
                <span key={pill.label} className="flex items-center gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: pill.tint }}
                  >
                    <pill.Icon aria-hidden className="size-4" />
                  </span>
                  <span className="text-left text-[13px] font-bold leading-tight">
                    {pill.label}
                    <br />
                    <span className="font-semibold text-faint">{pill.sub}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {categories.length ? (
          <div className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto pb-1">
            <CategoryChip href="/blog" label="All posts" active={!category} />
            {categories.slice(0, 12).map((item) => (
              <CategoryChip
                key={item._id}
                href={`/blog?category=${item.slug}`}
                label={item.name}
                active={category === item.slug}
              />
            ))}
          </div>
        ) : null}

        <AdSlot position="blog-top" className="mt-6" />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {result.items.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.items.map((post) => (
                  <BlogCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Newspaper aria-hidden className="size-7" strokeWidth={1.7} />}
                title="Nothing published yet"
                body="Check back soon — the first posts are on their way."
                action={<ButtonLink href="/coupons">Browse offers instead</ButtonLink>}
              />
            )}

            <Pagination
              page={result.pagination.page}
              pages={result.pagination.pages}
              hrefFor={(next) =>
                `/blog?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  ...(next !== 1 ? { page: String(next) } : {}),
                }).toString()}`
              }
            />
          </div>

          <aside className="space-y-4">
            <AdSlot position="blog-sidebar" label />
            <BlogSidebarList title="Recent posts" posts={recent} />
            <BlogNewsletter />
          </aside>
        </div>
      </div>
    </>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={classNames(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-[var(--shadow-glow)]"
          : "border-[var(--border-subtle)] text-body hover:border-brand-300 hover:text-brand-600"
      )}
    >
      {label}
    </Link>
  );
}
