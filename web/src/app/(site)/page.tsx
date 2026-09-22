import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { DEFAULT_BANNERS, HeroBanners } from "@/components/site/HeroBanners";
import { StoreCard } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, Rail, SectionHeading, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import {
  COUPON_TYPE_LABELS,
  classNames,
  descriptionLines,
  expiryLabel,
  formatCount,
  storeOf,
  timeAgo,
} from "@/lib/format";
import type { Category, CouponFeed, CouponView, HomepagePayload, Store } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Verified coupon codes & deals from 190+ stores",
  description:
    "Every code on WorldwideCoupons is checked before it goes live. Copy, click through, and pay less at the brands you already shop with.",
  alternates: { canonical: "/" },
};

const EMPTY: HomepagePayload = {
  announcement: null,
  hero: { heading: null, subheading: null, image: null, coupon: null },
  banners: [],
  featured: [],
  newest: [],
  expiring: [],
  stores: [],
  categories: [],
  sections: [],
  blocks: [],
};

const EMPTY_FEED: CouponFeed = {
  hero: null,
  featured: [],
  trending: [],
  exclusive: [],
  newest: [],
  expiring: [],
  codes: [],
  topStores: [],
};

export default async function HomePage() {
  // The curated payload drives the page; the feed adds the rails that are
  // ranked live — trending, exclusives and codes — which no editor curates.
  const [
    data,
    feed,
    offerCount,
    storeCount,
    codeCount,
    categoryCount,
    shippingCount,
    exclusiveCount,
    expiringCount,
  ] = await Promise.all([
    apiSafe<HomepagePayload>("/homepage", EMPTY, { revalidate: 300 }),
    apiSafe<CouponFeed>("/coupons/feed", EMPTY_FEED, { revalidate: 300 }),
    // One row each — all these two calls are after is the total in the envelope.
    apiPaged<CouponView>("/coupons", { query: { limit: 1 }, revalidate: 900 })
      .then((result) => result.pagination.total)
      .catch(() => 0),
    apiPaged<Store>("/stores", { query: { limit: 1 }, revalidate: 900 })
      .then((result) => result.pagination.total)
      .catch(() => 0),
    apiPaged<CouponView>("/coupons", { query: { limit: 1, withCode: true }, revalidate: 900 })
      .then((result) => result.pagination.total)
      .catch(() => 0),
    apiSafe<Category[]>("/categories", [], { query: { limit: 500 }, revalidate: 3600 })
      .then((list) => list.length)
      .catch(() => 0),
    apiPaged<CouponView>("/coupons", { query: { limit: 1, type: "freeshipping" }, revalidate: 900 })
      .then((result) => result.pagination.total)
      .catch(() => 0),
    apiPaged<CouponView>("/coupons", { query: { limit: 1, exclusive: true }, revalidate: 900 })
      .then((result) => result.pagination.total)
      .catch(() => 0),
    apiPaged<CouponView>("/coupons", { query: { limit: 1, expiringSoon: true }, revalidate: 900 })
      .then((result) => result.pagination.total)
      .catch(() => 0),
  ]);

  const totalOffers = data.categories.reduce(
    (sum, category) => sum + (category.activeCouponCount ?? 0),
    0
  );

  if (!data.featured.length && !data.newest.length && !data.stores.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <EmptyState
          icon="🛠️"
          title="Nothing to show yet"
          body="The API returned no offers. Check that the backend is running and that the coupon data has been imported."
          action={<ButtonLink href="/admin">Open the admin panel</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <>
      {data.announcement?.active && data.announcement.text ? (
        <div className="bg-brand-gradient px-4 py-2.5 text-center text-sm font-semibold text-white">
          {data.announcement.link ? (
            <Link href={data.announcement.link} className="underline-offset-2 hover:underline">
              {data.announcement.text}
            </Link>
          ) : (
            data.announcement.text
          )}
        </div>
      ) : null}

      <HomeHero
        banners={data.banners}
        topPick={data.hero.coupon}
        counts={{
          codes: codeCount,
          shipping: shippingCount,
          exclusive: exclusiveCount,
          expiring: expiringCount,
        }}
        runnersUp={(feed.trending.length ? feed.trending : data.featured)
          .filter((coupon) => coupon._id !== data.hero.coupon?._id)
          .slice(0, 3)}
      />

      <TrendingBrands stores={data.stores} />

      <CategoryRail categories={data.categories} total={categoryCount} />

      <StatBar
        offerCount={offerCount || totalOffers}
        storeCount={storeCount}
        categoryCount={categoryCount || data.categories.length}
        codeCount={codeCount}
      />

      <div className="shell">
        <AdSlot position="home-top" className="mt-8" minHeight={0} />
      </div>

      {data.featured.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Handpicked"
            title="Today's best offers"
            subtitle="Checked by our team before they went on the page."
            action={
              <Link href="/coupons" className="text-sm font-semibold text-brand-600 hover:underline">
                See all →
              </Link>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {data.featured.slice(0, 6).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="shell">
        <AdSlot position="home-infeed" className="mt-12" />
      </div>

      {data.stores.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Top brands"
            title="Stores people are saving at"
            action={
              <Link href="/stores" className="text-sm font-semibold text-brand-600 hover:underline">
                All stores →
              </Link>
            }
          />
          <Rail>
            {data.stores.map((store) => (
              <StoreCard key={store._id} store={store} variant="rail" />
            ))}
          </Rail>
        </section>
      ) : null}

      {data.expiring.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Hurry"
            title="Ending this week"
            subtitle="Real deadlines, taken straight from the offer terms."
          />
          <Rail>
            {data.expiring.map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} variant="rail" />
            ))}
          </Rail>
        </section>
      ) : null}

      {feed.trending.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Moving fast"
            title="Trending right now"
            subtitle="The offers other shoppers are using today."
          />
          <Rail>
            {feed.trending.slice(0, 16).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} variant="rail" />
            ))}
          </Rail>
        </section>
      ) : null}

      {feed.exclusive.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Only here"
            title="Exclusive codes"
            subtitle="Negotiated for this site — you will not find them on the brand's own page."
          />
          <Rail>
            {feed.exclusive.slice(0, 16).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} variant="rail" />
            ))}
          </Rail>
        </section>
      ) : null}

      <div className="shell">
        <AdSlot position="home-mid" className="mt-14" />
      </div>

      {feed.codes.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Copy and paste"
            title="Fresh promo codes"
            subtitle="Every one of these hands you a code at checkout."
            action={
              <Link
                href="/coupons?withCode=true"
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                All codes →
              </Link>
            }
          />
          <Rail>
            {feed.codes.slice(0, 16).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} variant="rail" />
            ))}
          </Rail>
        </section>
      ) : null}

      {data.sections.map((section) =>
        section.category && section.coupons.length ? (
          <section key={section.category._id} className="shell pt-14">
            <SectionHeading
              eyebrow={section.category.icon ?? undefined}
              title={section.heading || section.category.name}
              action={
                <Link
                  href={`/category/${section.category.slug}`}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  More →
                </Link>
              }
            />
            <Rail>
              {section.coupons.map((coupon) => (
                <CouponCard key={coupon._id} coupon={coupon} variant="rail" />
              ))}
            </Rail>
          </section>
        ) : null
      )}

      {data.newest.length ? (
        <section className="shell pt-14">
          <SectionHeading
            eyebrow="Fresh"
            title="Just added"
            action={
              <Link
                href="/coupons?sort=newest"
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                See all new →
              </Link>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {data.newest.slice(0, 8).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} />
            ))}
          </div>
        </section>
      ) : null}

      {data.blocks.length ? (
        <section className="shell pt-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.blocks.map((block) => (
              <Card key={block.title} hover className="flex flex-col gap-2">
                {block.image?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.image.url}
                    alt={block.image.alt ?? block.title}
                    className="mb-2 h-36 w-full rounded-xl object-cover"
                  />
                ) : null}
                <h3 className="font-bold">{block.title}</h3>
                {block.subtitle ? <p className="text-sm text-body">{block.subtitle}</p> : null}
                {block.link ? (
                  <Link href={block.link} className="mt-1 text-sm font-semibold text-brand-600 hover:underline">
                    Learn more →
                  </Link>
                ) : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <TrustStrip />

      <div className="shell">
        <AdSlot position="home-bottom" className="mt-14" />
      </div>
    </>
  );
}

/* =========================================================
   HERO

   Deliberately plain: a sliding banner an editor controls, the pick of the
   day, and four shortcuts. Everything else waits below the fold.
========================================================= */

const QUICK_LINKS = [
  {
    key: "codes" as const,
    href: "/coupons?withCode=true",
    label: "Promo codes",
    hint: "Copy and paste",
    icon: "🎟️",
    className: "from-brand-100 to-brand-50 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    key: "shipping" as const,
    href: "/coupons?type=freeshipping",
    label: "Free shipping",
    hint: "No delivery fee",
    icon: "🚚",
    className: "from-accent-100 to-accent-50 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    key: "exclusive" as const,
    href: "/coupons?exclusive=true",
    label: "Exclusives",
    hint: "Only on this site",
    icon: "⭐",
    className: "from-accent-300 to-accent-100 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    key: "expiring" as const,
    href: "/coupons?expiringSoon=true",
    label: "Ending soon",
    hint: "Before they go",
    icon: "⏳",
    className: "from-brand-200 to-brand-50 dark:from-brand-950 dark:to-brand-900/40",
  },
];

const HERO_PROMISES = [
  { icon: "✅", title: "Hand-checked", body: "An editor opens every offer" },
  { icon: "⏱️", title: "Real expiry dates", body: "No invented countdowns" },
  { icon: "🔓", title: "No account needed", body: "Codes are one click away" },
];

type QuickCounts = Record<"codes" | "shipping" | "exclusive" | "expiring", number>;

function HomeHero({
  banners,
  topPick,
  counts,
  runnersUp,
}: {
  banners: HomepagePayload["banners"];
  topPick: CouponView | null;
  counts: QuickCounts;
  /** Fills the rest of the card, so the column never ends in white space. */
  runnersUp: CouponView[];
}) {
  const store = topPick ? storeOf(topPick) : null;
  const points = topPick ? descriptionLines(topPick.description, 2) : [];
  const expiry = topPick ? expiryLabel(topPick) : null;

  return (
    <section className="bg-aurora relative overflow-hidden border-b border-[var(--border-subtle)]">
      <div className="shell relative py-6 lg:py-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="relative flex min-w-0 flex-col gap-3">
            {/* A blurred colour wash behind the frame lifts the artwork off
                the page instead of sitting it in a plain box. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-[2.4rem] bg-gradient-to-r from-brand-400/25 via-accent-400/20 to-brand-300/25 blur-2xl"
            />

            <HeroBanners
              banners={banners.length ? banners : DEFAULT_BANNERS}
              height="ratio"
              bare
              frameClassName="relative rounded-[1.75rem] border-0 bg-transparent shadow-[0_34px_70px_-30px_rgba(31,41,55,0.65)] ring-1 ring-ink-900/10 dark:ring-white/15"
            />

          <div className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "group relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br p-2.5 ring-1 ring-inset ring-ink-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] dark:ring-white/10",
                  link.className
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]/85 text-base shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:scale-110">
                  {link.icon}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold leading-tight">
                    {link.label}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-faint">
                    {counts[link.key] ? `${formatCount(counts[link.key])} live` : link.hint}
                  </span>
                </span>
              </Link>
            ))}
          </div>

            {/* Three promises, sized to finish level with the column beside it. */}
            <div className="relative grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
              {HERO_PROMISES.map((promise) => (
                <div
                  key={promise.title}
                  className="surface flex h-full items-center gap-3 rounded-2xl border border-[var(--border-subtle)] px-3.5 py-3 shadow-[var(--shadow-card)]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 text-lg ring-1 ring-inset ring-brand-200/60 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800">
                    {promise.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold">{promise.title}</span>
                    <span className="block truncate text-[11px] text-faint">{promise.body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            {topPick ? (
              <article className="surface hover-lift group relative flex flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between gap-2 bg-brand-gradient px-4 py-2.5 text-white">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
                    <span className="size-1.5 animate-pulse rounded-full bg-white" />
                    Pick of the day
                  </span>
                  <span className="font-display text-base font-extrabold">{topPick.badge}</span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <StoreLogo
                      name={store?.name ?? "Store"}
                      logo={store?.logo}
                      size={46}
                      rounded="rounded-2xl"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-faint">
                        {store?.name ?? "Featured"} · {COUPON_TYPE_LABELS[topPick.type]}
                      </p>
                      <Link
                        href={`/coupon/${topPick.slug}`}
                        className="line-clamp-2 text-[15px] font-semibold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
                      >
                        {topPick.title}
                      </Link>
                    </div>
                  </div>

                  {points.length ? (
                    <ul className="space-y-1.5">
                      {points.map((line, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-relaxed text-body">
                          <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                          <span className="line-clamp-2">{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap gap-1.5">
                    {topPick.verified ? (
                      <span className="rounded-full bg-success-50 px-2 py-1 text-[11px] font-bold text-success-700 dark:bg-success-700/15 dark:text-success-500">
                        ✓ Verified
                      </span>
                    ) : null}
                    {topPick.exclusive ? (
                      <span className="rounded-full bg-accent-300 px-2 py-1 text-[11px] font-bold text-accent-600 dark:bg-accent-600/20 dark:text-accent-400">
                        Exclusive
                      </span>
                    ) : null}
                    <span className="rounded-full surface-sunken px-2 py-1 text-[11px] font-bold text-body">
                      {expiry ?? "No expiry"}
                    </span>
                    {topPick.successRate !== null ? (
                      <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                        {topPick.successRate}% worked
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-auto space-y-2 pt-1">
                    <Link
                      href={`/coupon/${topPick.slug}`}
                      className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-gradient text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-glow-strong)]"
                    >
                      {topPick.hasCode ? "Reveal the code" : "Get the deal"}
                      <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                        →
                      </span>
                    </Link>

                    <p className="text-center text-[11px] text-faint">
                      {formatCount(topPick.views)} views
                      {topPick.uses ? ` · used ${formatCount(topPick.uses)}×` : ""} · updated{" "}
                      {timeAgo(topPick.updatedAt)}
                    </p>

                  </div>
                </div>

                {runnersUp.length ? (
                  <div className="border-t border-[var(--border-subtle)] p-3">
                    <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
                      Also worth a look
                    </p>

                    <ul>
                      {runnersUp.map((coupon) => {
                        const couponStore = storeOf(coupon);

                        return (
                          <li key={coupon._id}>
                            <Link
                              href={`/coupon/${coupon.slug}`}
                              className="flex items-center gap-2.5 rounded-2xl px-1.5 py-2 transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/50"
                            >
                              <StoreLogo
                                name={couponStore?.name ?? "Store"}
                                logo={couponStore?.logo}
                                size={28}
                                rounded="rounded-lg"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold">
                                  {coupon.title}
                                </span>
                                <span className="block truncate text-[11px] text-faint">
                                  {couponStore?.name ?? "Featured"}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] font-bold text-brand-600">
                                {coupon.badge}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   TRENDING BRANDS

   One line that slides right to left for ever. The list is rendered twice so
   the loop is seamless, and hovering stops it.
========================================================= */

function TrendingBrands({ stores }: { stores: HomepagePayload["stores"] }) {
  if (!stores.length) return null;

  const lane = stores.slice(0, 14);

  return (
    <section className="shell pt-6">
      <div className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] py-3.5 shadow-[var(--shadow-card)]">
        <div className="mb-2.5 flex items-center gap-3 px-4">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">
            <span aria-hidden className="text-sm">
              🔥
            </span>
            Trending brands
          </span>

          <Link
            href="/stores"
            className="ml-auto text-xs font-bold text-brand-600 transition hover:underline"
          >
            All stores →
          </Link>
        </div>

        <div className="relative">
          {/* The edges fade out, so chips enter and leave rather than pop. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/80 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[var(--surface)] via-[var(--surface)]/80 to-transparent"
          />

          <div className="marquee-track gap-2.5">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-2.5 pr-2.5" aria-hidden={copy === 1}>
                {lane.map((item) => (
                  <Link
                    key={`${copy}-${item._id}`}
                    href={`/store/${item.slug}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="group flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] py-1 pl-1 pr-3.5 text-xs font-semibold transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50 dark:hover:text-brand-300"
                  >
                    <StoreLogo name={item.name} logo={item.logo} size={26} rounded="rounded-full" />
                    <span className="max-w-32 truncate">{item.name}</span>
                    <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                      {formatCount(item.activeCouponCount)}
                    </span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CATEGORY GRID
========================================================= */

function CategoryRail({
  categories,
  total,
}: {
  categories: HomepagePayload["categories"];
  total: number;
}) {
  if (!categories.length) return null;

  return (
    <section className="shell pt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-px w-6 bg-brand-400" />
            Browse
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
            Shop by category
          </h2>
          <p className="mt-1 text-sm text-body">
            {formatCount(total || categories.length)} aisles, every one of them checked this week.
          </p>
        </div>

        <Link
          href="/categories"
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-body transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
        >
          All categories
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {categories.slice(0, 12).map((category, index) => (
          <Link
            key={category._id}
            href={`/category/${category.slug}`}
            className="surface group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--border-subtle)] p-3 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
          >
            {/* The tint slides in from the corner on hover. */}
            <span
              aria-hidden
              className={classNames(
                "pointer-events-none absolute -right-10 -top-10 size-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
                index % 2 ? "bg-accent-200" : "bg-brand-200"
              )}
            />

            <span
              className={classNames(
                "relative flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110",
                index % 3 === 0
                  ? "bg-gradient-to-br from-brand-100 to-brand-50 ring-brand-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
                  : index % 3 === 1
                    ? "bg-gradient-to-br from-accent-100 to-accent-50 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
                    : "bg-gradient-to-br from-accent-300 to-accent-100 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
              )}
            >
              {category.icon ?? "🏷️"}
            </span>

            <span className="relative min-w-0 flex-1">
              <span className="block truncate text-sm font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                {category.name}
              </span>
              <span className="block text-xs font-semibold text-faint">
                {formatCount(category.activeCouponCount)} offers
              </span>
            </span>

            <span
              aria-hidden
              className="relative shrink-0 text-sm text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   STAT BAR
========================================================= */

function StatBar({
  offerCount,
  storeCount,
  categoryCount,
  codeCount,
}: {
  offerCount: number;
  storeCount: number;
  categoryCount: number;
  codeCount: number;
}) {
  const stats = [
    {
      value: formatCount(offerCount),
      label: "Live offers",
      note: "Every one opened and checked by an editor",
      icon: "🏷️",
      href: "/coupons",
    },
    {
      value: formatCount(storeCount),
      label: "Stores listed",
      note: "New brands added every week",
      icon: "🏬",
      href: "/stores",
    },
    {
      value: formatCount(codeCount),
      label: "Promo codes",
      note: "Copy, paste, pay less at checkout",
      icon: "🎟️",
      href: "/coupons?withCode=true",
    },
    {
      value: formatCount(categoryCount),
      label: "Categories",
      note: "From electronics to travel",
      icon: "🗂️",
      href: "/categories",
    },
  ];

  return (
    <section className="shell pt-12">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="gradient-ring group rounded-3xl shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
          >
            <div className="surface relative h-full overflow-hidden rounded-[1.4rem] p-5">
              {/* The mark, faint, as a watermark in the corner. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-8 text-7xl opacity-[0.06] transition-transform duration-500 group-hover:scale-110"
              >
                {stat.icon}
              </span>

              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-extrabold leading-none text-brand-gradient">
                  {stat.value}
                </span>
                <span
                  aria-hidden
                  className="text-sm text-brand-500 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                >
                  →
                </span>
              </div>

              <p className="mt-2 text-sm font-bold">{stat.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-faint">{stat.note}</p>

              <span
                aria-hidden
                className="mt-3 block h-1 w-12 rounded-full bg-brand-gradient transition-all duration-300 group-hover:w-20"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustStrip() {
  const points = [
    { icon: "✓", title: "Checked, not scraped", body: "An editor opens every offer before it goes live." },
    { icon: "⏱", title: "Real expiry dates", body: "If we do not know when it ends, we say so." },
    { icon: "🔒", title: "No account needed", body: "Codes are one click away. Signing in only saves them." },
    { icon: "💬", title: "You keep us honest", body: "Vote on what worked and we act on it." },
  ];

  return (
    <section className="shell pt-16">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {points.map((point) => (
          <Card key={point.title} className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-lg dark:bg-brand-950/60">
              {point.icon}
            </span>
            <span>
              <span className="block text-sm font-bold">{point.title}</span>
              <span className="mt-0.5 block text-sm text-body">{point.body}</span>
            </span>
          </Card>
        ))}
      </div>
    </section>
  );
}
