import Link from "next/link";
import type { Metadata } from "next";
import { CouponCard } from "@/components/site/CouponCard";
import { SearchBox } from "@/components/site/SearchBox";
import { CategoryTile, StoreCard } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs, EmptyState, SectionHeading } from "@/components/ui/primitives";
import { apiSafe } from "@/lib/api";
import type { SearchResults } from "@/lib/types";

// Results depend entirely on the query string, so caching them site-wide
// would serve one shopper's search to the next.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search stores, coupon codes and deals.",
  robots: { index: false, follow: true },
};

const EMPTY: SearchResults = { query: "", stores: [], coupons: [], categories: [] };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  const results = q.length >= 2
    ? await apiSafe<SearchResults>("/search", EMPTY, { query: { q, limit: 12 } })
    : EMPTY;

  const empty = !results.stores.length && !results.coupons.length && !results.categories.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <h1 className="mb-5 text-2xl font-extrabold sm:text-3xl">
        {q ? <>Results for “{q}”</> : "Search"}
      </h1>

      <div className="mb-8 max-w-2xl">
        <SearchBox size="lg" autoFocus={!q} placeholder="Store, brand or offer…" />
      </div>

      {!q ? (
        <EmptyState
          title="What are you shopping for?"
          body="Type a brand name — Amazon, Etsy, Macy's — or what you are buying."
        />
      ) : empty ? (
        <EmptyState
          title={`Nothing for “${q}”`}
          body="Try a shorter search, or browse the full store directory."
          action={<ButtonLink href="/stores">Browse all stores</ButtonLink>}
        />
      ) : (
        <div className="space-y-10">
          {results.stores.length ? (
            <section>
              <SectionHeading title={`Stores (${results.stores.length})`} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.stores.map((store) => (
                  <StoreCard key={store._id} store={store} />
                ))}
              </div>
            </section>
          ) : null}

          {results.coupons.length ? (
            <section>
              <SectionHeading
                title={`Offers (${results.coupons.length})`}
                action={
                  <Link
                    href={`/coupons?search=${encodeURIComponent(q)}`}
                    className="text-sm font-semibold text-brand-600 hover:underline"
                  >
                    See all matching offers →
                  </Link>
                }
              />
              <div className="space-y-3">
                {results.coupons.map((coupon) => (
                  <CouponCard key={coupon._id} coupon={coupon} />
                ))}
              </div>
            </section>
          ) : null}

          {results.categories.length ? (
            <section>
              <SectionHeading title="Categories" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {results.categories.map((category) => (
                  <CategoryTile
                    key={category._id}
                    name={category.name}
                    slug={category.slug}
                    icon={category.icon}
                    count={category.activeCouponCount}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
