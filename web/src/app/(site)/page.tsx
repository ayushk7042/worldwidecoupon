import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { DEFAULT_BANNERS, HeroBanners } from "@/components/site/HeroBanners";
import { StoreCard } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, Rail, SectionHeading, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import { classNames, formatCount, storeOf } from "@/lib/format";
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
  const [data, feed, offerCount, storeCount, codeCount, categoryCount] = await Promise.all([
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

      <HomeHero banners={data.banners} topPick={data.hero.coupon} />

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
    href: "/coupons?withCode=true",
    label: "Promo codes",
    hint: "Copy and paste",
    icon: "🎟️",
    className: "from-brand-100 to-brand-50 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    href: "/coupons?type=freeshipping",
    label: "Free shipping",
    hint: "No delivery fee",
    icon: "🚚",
    className: "from-accent-100 to-accent-50 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    href: "/coupons?exclusive=true",
    label: "Exclusives",
    hint: "Only on this site",
    icon: "⭐",
    className: "from-accent-300 to-accent-100 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    href: "/coupons?expiringSoon=true",
    label: "Ending soon",
    hint: "Before they go",
    icon: "⏳",
    className: "from-brand-200 to-brand-50 dark:from-brand-950 dark:to-brand-900/40",
  },
];

function HomeHero({
  banners,
  topPick,
}: {
  banners: HomepagePayload["banners"];
  topPick: CouponView | null;
}) {
  const store = topPick ? storeOf(topPick) : null;

  return (
    <section className="bg-aurora relative overflow-hidden border-b border-[var(--border-subtle)]">
      <div className="shell relative py-6 lg:py-8">
        {/* The banner runs the full width: it is the loudest thing on the page
            and nothing should be competing with it for the eye. */}
        <div className="relative">
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
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))]">
          {topPick ? (
            <article className="surface hover-lift group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-2 bg-brand-gradient px-4 py-2 text-white">
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
                    size={44}
                    rounded="rounded-2xl"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-faint">
                      {store?.name ?? "Featured"} · {topPick.hasCode ? "Promo code" : "Deal"}
                    </p>
                    <Link
                      href={`/coupon/${topPick.slug}`}
                      className="line-clamp-2 text-[15px] font-semibold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      {topPick.title}
                    </Link>
                  </div>
                </div>

                <Link
                  href={`/coupon/${topPick.slug}`}
                  className="mt-auto inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-brand-gradient text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-glow-strong)]"
                >
                  {topPick.hasCode ? "Reveal the code" : "Get the deal"}
                  <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </div>
            </article>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "group relative flex min-w-0 flex-col justify-between gap-2 overflow-hidden rounded-3xl bg-gradient-to-br p-3.5 ring-1 ring-inset ring-ink-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] dark:ring-white/10",
                  link.className
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--surface)]/85 text-lg shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:scale-110">
                  {link.icon}
                </span>

                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold leading-tight">
                    {link.label}
                  </span>
                  <span className="block truncate text-[11px] text-faint">{link.hint}</span>
                </span>

                <span
                  aria-hidden
                  className="absolute right-3 top-3 text-sm text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   TRENDING BRANDS

   Its own band so the chips have room to lift on hover instead of being
   clipped by the frame above them.
========================================================= */

function TrendingBrands({ stores }: { stores: HomepagePayload["stores"] }) {
  if (!stores.length) return null;

  return (
    <section className="shell pt-6">
      <div className="surface rounded-3xl border border-[var(--border-subtle)] px-4 py-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <span className="hidden shrink-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-faint sm:flex">
            <span aria-hidden className="text-sm">
              🔥
            </span>
            Trending
          </span>

          <div className="no-scrollbar -my-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2">
            {stores.slice(0, 16).map((item) => (
              <Link
                key={item._id}
                href={`/store/${item.slug}`}
                className="group flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] py-1 pl-1 pr-3.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-[var(--shadow-card)] dark:hover:text-brand-300"
              >
                <StoreLogo name={item.name} logo={item.logo} size={26} rounded="rounded-full" />
                <span className="max-w-32 truncate">{item.name}</span>
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                  {formatCount(item.activeCouponCount)}
                </span>
              </Link>
            ))}

            <Link
              href="/stores"
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:underline"
            >
              All stores →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CATEGORY RAIL
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
      <div className="mb-5 flex items-end justify-between gap-3">
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

      {/* The vertical padding leaves room for the hover lift, so the circles
          are never clipped by the scroll container. */}
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-1">
        {categories.slice(0, 14).map((category, index) => (
          <Link
            key={category._id}
            href={`/category/${category.slug}`}
            className="group flex w-[6.75rem] shrink-0 flex-col items-center gap-3 text-center sm:w-28"
          >
            <span
              className={classNames(
                "relative flex size-[4.75rem] items-center justify-center rounded-3xl text-2xl ring-1 ring-inset transition-all duration-300 group-hover:-translate-y-1.5 group-hover:rounded-[1.6rem] group-hover:shadow-[var(--shadow-lift)] sm:size-20",
                index % 3 === 0
                  ? "bg-gradient-to-br from-brand-100 to-brand-50 ring-brand-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
                  : index % 3 === 1
                    ? "bg-gradient-to-br from-accent-100 to-accent-50 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
                    : "bg-gradient-to-br from-accent-300 to-accent-100 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
              )}
            >
              <span className="transition-transform duration-300 group-hover:scale-110">
                {category.icon ?? "🏷️"}
              </span>
            </span>

            <span className="w-full min-w-0">
              <span className="block w-full truncate text-[13px] font-bold transition-colors group-hover:text-brand-600">
                {category.name}
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold text-faint">
                {formatCount(category.activeCouponCount)} offers
              </span>
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
    { value: formatCount(offerCount), label: "Live offers", note: "checked by hand", icon: "🏷️" },
    { value: formatCount(storeCount), label: "Stores listed", note: "and growing weekly", icon: "🏬" },
    { value: formatCount(codeCount), label: "Promo codes", note: "ready to copy", icon: "🎟️" },
    { value: formatCount(categoryCount), label: "Categories", note: "to browse", icon: "🗂️" },
  ];

  return (
    <section className="shell pt-12">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="surface hover-lift group relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)]"
          >
            {/* A quiet brand wash in the corner, brighter on hover. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-brand-100 opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-brand-900/50"
            />

            <span className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 text-xl ring-1 ring-inset ring-brand-200/60 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800">
              {stat.icon}
            </span>

            <p className="relative mt-3 font-display text-3xl font-extrabold leading-none text-brand-gradient">
              {stat.value}
            </p>
            <p className="relative mt-1.5 text-sm font-bold">{stat.label}</p>
            <p className="relative text-xs text-faint">{stat.note}</p>
          </div>
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
