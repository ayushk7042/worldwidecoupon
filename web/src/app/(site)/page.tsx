import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { AdCarousel } from "@/components/ads/AdCarousel";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Copy,
  Crown,
  Flame,
  LayoutGrid,
  LockOpen,
  Percent,
  PiggyBank,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store as StoreIcon,
  Tag,
  Ticket,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { CouponCard } from "@/components/site/CouponCard";
import { RevealButton } from "@/components/site/RevealButton";
import { BestOfferMain, BestOfferSide, CategoryOffers } from "@/components/site/CategoryOffers";
import { PromoCodes } from "@/components/site/PromoCodes";
import { TrendingNow } from "@/components/site/TrendingNow";
import { DEFAULT_BANNERS, HeroBanners } from "@/components/site/HeroBanners";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, Rail, SectionHeading, StoreLogo } from "@/components/ui/primitives";
import { apiPaged, apiSafe } from "@/lib/api";
import {
  COUPON_TYPE_LABELS,
  classNames,
  descriptionLines,
  expiryLabel,
  formatCount,
  splitBadge,
  storeOf,
  timeAgo,
} from "@/lib/format";
import type { Category, CouponFeed, CouponView, HomepagePayload, Store } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = {
  // Absolute, so the tab reads as the brand rather than the page's headline.
  title: { absolute: "WorldwideCoupons — verified coupon codes & deals" },
  description:
    "Every code on WorldwideCoupons is checked before it goes live. Copy, click through, and pay less at the brands you already shop with.",
  alternates: { canonical: "/" },
};

const EMPTY: HomepagePayload = {
  announcement: null,
  hero: { heading: null, subheading: null, image: null, coupon: null },
  banners: [],
  featured: [],
  bestOffers: { main: null, side: [] },
  trending: [],
  promoCodes: [],
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
    apiSafe<HomepagePayload>("/homepage", EMPTY, { revalidate: 300, tags: ["homepage"] }),
    apiSafe<CouponFeed>("/coupons/feed", EMPTY_FEED, { revalidate: 300, tags: ["homepage"] }),
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

  /*
   * The category strip shows real offers, so each aisle needs its own six.
   * Every featured category gets a place in the strip — no cap here, so a
   * category an editor picked never silently drops off the rail.
   */
  /*
   * An editor's "Featured offers" picks (Admin → Homepage → Featured
   * offers) win a seat in their own category's rail — filtered by category
   * there specifically so a pick shows up here, not just in "Today's best
   * offers". They come first; the auto-ranked "best" coupons fill in
   * whatever seats are left.
   */
  const featuredByCategory = new Map<string, CouponView[]>();
  for (const coupon of data.featured) {
    for (const entry of coupon.categories ?? []) {
      const categoryId = typeof entry === "string" ? entry : entry?._id;
      if (!categoryId) continue;
      const list = featuredByCategory.get(categoryId) ?? [];
      list.push(coupon);
      featuredByCategory.set(categoryId, list);
    }
  }

  const categoryGroups = (
    await Promise.all(
      [...data.categories]
        .sort((a, b) => b.activeCouponCount - a.activeCouponCount)
        .map((category) =>
          apiPaged<CouponView>("/coupons", {
            query: { category: category.slug, limit: 6, sort: "best" },
            revalidate: 600,
          })
            .then((result) => {
              const curated = featuredByCategory.get(category._id) ?? [];
              const seen = new Set(curated.map((coupon) => coupon._id));
              const filler = result.items.filter((coupon) => !seen.has(coupon._id));
              return { category, coupons: [...curated, ...filler].slice(0, 6) };
            })
            .catch(() => ({ category, coupons: [] as CouponView[] }))
        )
    )
  ).filter((group) => group.coupons.length >= 3);

  const totalOffers = data.categories.reduce(
    (sum, category) => sum + (category.activeCouponCount ?? 0),
    0
  );

  if (!data.featured.length && !data.newest.length && !data.stores.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <EmptyState
          icon={<Wrench aria-hidden className="size-7" strokeWidth={1.7} />}
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

      <CategoryOffers groups={categoryGroups} />

      <TopBrands stores={data.stores} storeCount={storeCount} />

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
          <TodaysBestOffersHeader topPick={data.featured[0]!} />

          {data.bestOffers.main ? (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
              <BestOfferMain coupon={data.bestOffers.main} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {data.bestOffers.side.map((coupon) => (
                  <BestOfferSide key={coupon._id} coupon={coupon} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="shell">
        <AdSlot position="home-infeed" className="mt-12" />
      </div>

      {data.stores.length ? (
        <section className="shell pt-14">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3">
              <Star aria-hidden className="mt-1 size-6 shrink-0 text-brand-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                  Reader favourites
                </p>
                <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
                  Stores people are saving at
                </h2>
                <p className="mt-1 text-sm text-body">
                  The shops our readers open most often this week.
                </p>
              </div>
            </div>
            <Link
              href="/stores"
              className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
            >
              All stores
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {data.stores.slice(0, 16).map((store) => (
              <BrandCard key={store._id} store={store} />
            ))}
          </div>

          <SavingsPromises />
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

      <TrendingNow coupons={data.trending.length ? data.trending : feed.trending.slice(0, 6)} />

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

      <PromoCodes coupons={data.promoCodes.length ? data.promoCodes : feed.codes.slice(0, 10)} />

      {data.sections.map((section) =>
        section.category && section.coupons.length ? (
          <section key={section.category._id} className="shell pt-14">
            <SectionHeading
              eyebrow="Category"
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

      <HowItWorks />

      <div className="shell">
        <AdSlot position="home-bottom" className="mt-14" />
      </div>
    </>
  );
}

/* =========================================================
   TODAY'S BEST OFFERS — HEADER

   A pill, a two-tone headline, three trust chips, and a decorative panel
   on the right — icons and real numbers rather than stock product photos,
   since there is no licensed artwork of our own to drop in there.
========================================================= */

function TodaysBestOffersHeader({ topPick }: { topPick: CouponView }) {
  const discount = splitBadge(topPick.badge);

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-brand-200/60 bg-brand-50 p-6 dark:border-brand-700/40 dark:bg-brand-900/35 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_32rem] lg:items-center xl:grid-cols-[1fr_36rem]">
        <div className="min-w-0">
          <span className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-gradient px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[var(--shadow-glow)]">
            <Star aria-hidden className="size-3.5 fill-current" />
            Handpicked for you
          </span>

          <h2 className="mt-2.5 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
            Today&#39;s <span className="text-brand-600">Best Offers</span>
          </h2>
          <p className="mt-1 max-w-lg text-sm text-body">
            Curated, verified and handpicked deals from top brands — just for you.
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <Percent aria-hidden className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">{discount.lead} OFF</span>
                <span className="block text-xs text-faint">Today&#39;s top deal</span>
              </span>
            </span>

            <span className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-success-700/15 dark:text-success-500">
                <ShieldCheck aria-hidden className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">Verified coupons</span>
                <span className="block text-xs text-faint">100% working</span>
              </span>
            </span>

            <span className="flex items-center gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-warn-50 text-warn-600 dark:bg-warn-500/10 dark:text-warn-500">
                <Zap aria-hidden className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight">Limited time</span>
                <span className="block text-xs text-faint">Don&#39;t miss out</span>
              </span>
            </span>
          </div>

          <Link
            href="/coupons"
            className="group mt-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
          >
            See all offers
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Fixed-width side column (32rem, 36rem at xl) with the box locked
            to the graphic's own 1180×348 ratio — that width was picked to
            land close to the tightened text column's height, so there's
            no real gap to center away, and the matching ratio means
            object-cover has nothing to crop at any size. */}
        <div
          className="relative hidden aspect-[1180/348] w-full overflow-hidden rounded-2xl lg:block"
          style={{ maskImage: "var(--feather-header)", WebkitMaskImage: "var(--feather-header)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/banners/todays-best-offers-graphic.png"
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
          {/* The source graphic fades to near-white along all four of its
              own edges — one gradient per edge, feathered in to the card's
              exact background color, so every border blends in instead of
              showing a whitish seam. */}
          <div
            className="pointer-events-none absolute inset-0 dark:hidden"
            style={{
              backgroundImage: [
                "linear-gradient(to bottom, var(--color-brand-50) 0%, transparent 16%)",
                "linear-gradient(to top, var(--color-brand-50) 0%, transparent 16%)",
                "linear-gradient(to right, var(--color-brand-50) 0%, transparent 10%)",
                "linear-gradient(to left, var(--color-brand-50) 0%, transparent 10%)",
              ].join(", "),
            }}
          />
        </div>
      </div>
    </div>
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
    Icon: Ticket,
    tint: "#1f9059",
  },
  {
    key: "shipping" as const,
    href: "/coupons?type=freeshipping",
    label: "Free delivery",
    hint: "Postage on us",
    Icon: Truck,
    tint: "#f05f5f",
  },
  {
    key: "exclusive" as const,
    href: "/coupons?exclusive=true",
    label: "Exclusives",
    hint: "Only on this site",
    Icon: Star,
    tint: "#8b5cf6",
  },
  {
    key: "expiring" as const,
    href: "/coupons?expiringSoon=true",
    label: "Ending soon",
    hint: "Before they go",
    Icon: Clock3,
    tint: "#e8a010",
  },
];

const HERO_PROMISES = [
  { Icon: BadgeCheck, title: "Hand-checked", body: "An editor opens every offer" },
  { Icon: Clock3, title: "Real expiry dates", body: "No invented countdowns" },
  { Icon: LockOpen, title: "No account needed", body: "Codes are one click away" },
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
  const pickDiscount = topPick ? splitBadge(topPick.badge) : null;
  const pickNumeric = pickDiscount ? /\d/.test(pickDiscount.lead) : false;

  return (
    <section className="bg-aurora relative overflow-hidden border-b border-[var(--border-subtle)]">
      {/* slow-drifting colour, behind everything */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 size-[28rem] rounded-full bg-brand-300/40 blur-3xl motion-safe:animate-[hero-float_16s_ease-in-out_infinite] dark:bg-brand-600/20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 size-[26rem] rounded-full bg-accent-300/40 blur-3xl motion-safe:animate-[hero-float_20s_ease-in-out_infinite_reverse] dark:bg-accent-600/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle,rgba(31,144,89,0.18)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(180deg,#000,transparent_75%)] dark:opacity-30"
      />

      <div className="shell relative py-6 lg:py-9">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
          <div className="relative flex min-w-0 flex-col justify-between gap-4">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-[2.4rem] bg-gradient-to-r from-brand-400/25 via-accent-400/20 to-brand-300/25 blur-2xl"
            />

            <HeroBanners
              banners={banners.length ? banners : DEFAULT_BANNERS}
              height="ratio"
              bare
              frameClassName="relative rounded-[1.9rem] border-0 bg-transparent shadow-[0_40px_80px_-32px_rgba(15,23,42,0.7)] ring-1 ring-white/60 dark:ring-white/15"
            />

            {/* ---- four shortcuts, each with its own colour and a live count ---- */}
            <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                  style={{
                    borderColor: `color-mix(in srgb, ${link.tint} 28%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${link.tint} 9%, var(--surface))`,
                    backgroundImage: `linear-gradient(140deg, color-mix(in srgb, ${link.tint} 20%, transparent), transparent 65%)`,
                  }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 group-hover:motion-safe:animate-[shine_0.9s_ease-out]"
                  />
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_-8px_var(--tint)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                    style={{ backgroundColor: link.tint, ["--tint" as string]: link.tint }}
                  >
                    <link.Icon aria-hidden className="size-5" strokeWidth={2} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold leading-tight">{link.label}</span>
                    <span className="block truncate text-[11px] font-medium leading-tight text-faint">
                      {counts[link.key] ? (
                        <>
                          <strong className="font-extrabold" style={{ color: link.tint }}>
                            {formatCount(counts[link.key])}
                          </strong>{" "}
                          live
                        </>
                      ) : (
                        link.hint
                      )}
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            {/* ---- three promises in one strip ---- */}
            <div className="surface relative grid grid-cols-1 items-center divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {HERO_PROMISES.map((promise) => (
                <div key={promise.title} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200/70 text-brand-700 shadow-inner ring-1 ring-brand-200/70 dark:from-brand-950 dark:to-brand-900/60 dark:text-brand-300 dark:ring-brand-800">
                    <promise.Icon aria-hidden className="size-6" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold">{promise.title}</span>
                    <span className="block text-xs text-faint">{promise.body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            {topPick ? (
              <div className="gradient-ring hover-lift group relative flex flex-1 rounded-[1.7rem] shadow-[var(--shadow-glow)] transition-shadow duration-300 hover:shadow-[var(--shadow-glow-strong)]">
                <article className="surface relative flex flex-1 flex-col overflow-hidden rounded-[1.65rem]">
                  {/* header: deep green, a big discount, a shimmer */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-5 pb-4 pt-4 text-white">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-[shine_5.5s_ease-in-out_infinite]"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-2xl"
                    />
                    <div className="relative flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] backdrop-blur">
                        <Sparkles aria-hidden className="size-3.5" />
                        <span className="size-1.5 animate-pulse rounded-full bg-white" />
                        Pick of the day
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
                        {topPick.hasCode ? "Code" : "Deal"}
                      </span>
                    </div>

                    <div className="relative mt-3 flex items-end gap-3">
                      {pickNumeric && pickDiscount ? (
                        <span className="flex flex-col leading-none">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/75">Save up to</span>
                          <span className="font-display text-[2.6rem] font-extrabold leading-[1.02] drop-shadow-sm">
                            {pickDiscount.lead}
                          </span>
                        </span>
                      ) : (
                        <span className="font-display text-2xl font-extrabold leading-tight drop-shadow-sm">
                          {topPick.hasCode ? "Promo code" : "Special deal"}
                        </span>
                      )}
                      {pickNumeric && pickDiscount?.tail ? (
                        <span className="pb-1 font-display text-lg font-extrabold uppercase tracking-wider text-white/90">
                          {pickDiscount.tail}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-4 pb-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-[var(--shadow-card)]">
                        <StoreLogo
                          name={store?.name ?? "Store"}
                          logo={store?.logo}
                          size={44}
                          rounded="rounded-xl"
                          className="border-0"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-xs font-bold text-faint">
                          {store?.verified ? <BadgeCheck aria-hidden className="size-3.5 shrink-0 text-brand-600" /> : null}
                          {store?.name ?? "Featured"} · {COUPON_TYPE_LABELS[topPick.type]}
                        </p>
                        <Link
                          href={`/coupon/${topPick.slug}`}
                          className="line-clamp-2 text-base font-extrabold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
                        >
                          {topPick.title}
                        </Link>
                      </div>
                    </div>

                    {points.length ? (
                      <ul className="space-y-1.5">
                        {points.slice(0, 1).map((line, index) => (
                          <li key={index} className="flex gap-2 text-xs leading-relaxed text-body">
                            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                            <span className="line-clamp-1">{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="flex flex-wrap gap-1.5">
                      {topPick.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-[11px] font-bold text-success-700 dark:bg-success-700/15 dark:text-success-500">
                          <BadgeCheck aria-hidden className="size-3" />
                          Verified
                        </span>
                      ) : null}
                      {topPick.exclusive ? (
                        <span className="rounded-full bg-accent-300 px-2.5 py-1 text-[11px] font-bold text-accent-600 dark:bg-accent-600/20 dark:text-accent-400">
                          Exclusive
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full surface-sunken px-2.5 py-1 text-[11px] font-bold text-body">
                        <Clock3 aria-hidden className="size-3" />
                        {expiry ?? "No expiry"}
                      </span>
                      {topPick.successRate !== null ? (
                        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                          {topPick.successRate}% worked
                        </span>
                      ) : null}
                    </div>

                    <div className="pt-1">
                      <Link
                        href={`/coupon/${topPick.slug}`}
                        className="relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-gradient text-sm font-extrabold text-white shadow-[var(--shadow-glow)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-glow-strong)]"
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-transparent via-white/35 to-transparent motion-safe:animate-[shine_4.5s_ease-in-out_infinite]"
                        />
                        {topPick.hasCode ? "Reveal the code" : "Get the deal"}
                        <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>

                    </div>
                  </div>

                  {runnersUp.length ? (
                    <div className="flex flex-1 flex-col border-t border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)]/50 p-3">
                      <p className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-faint">
                        Also worth a look
                      </p>

                      <ul className="flex flex-1 flex-col justify-around">
                        {runnersUp.map((coupon) => {
                          const couponStore = storeOf(coupon);

                          return (
                            <li key={coupon._id}>
                              <Link
                                href={`/coupon/${coupon.slug}`}
                                className="group/r flex items-center gap-2.5 rounded-2xl px-1.5 py-2 transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/50"
                              >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-white p-0.5">
                                  <StoreLogo
                                    name={couponStore?.name ?? "Store"}
                                    logo={couponStore?.logo}
                                    size={30}
                                    rounded="rounded-md"
                                    className="border-0"
                                  />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-bold">{coupon.title}</span>
                                  <span className="block truncate text-[11px] text-faint">
                                    {couponStore?.name ?? "Featured"}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-brand-100 px-2 py-1 text-[11px] font-extrabold text-brand-700 transition group-hover/r:bg-brand-600 group-hover/r:text-white dark:bg-brand-950/70 dark:text-brand-300">
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
              </div>
            ) : null}

            <AdCarousel position="home-hero" className="h-40" minHeight={0} />
          </aside>
        </div>
      </div>
    </section>
  );
}

function BrandCard({ store }: { store: Store }) {
  return (
    <Link href={`/store/${store.slug}`} className="group flex flex-col items-center gap-2 text-center">
      {/* Just the store: a big white square, no box around it. */}
      <span className="relative flex size-[7.25rem] items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-[var(--shadow-card)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-brand-400 group-hover:shadow-[var(--shadow-lift)] group-hover:ring-4 group-hover:ring-brand-500/15">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-brand-100/70 to-transparent opacity-0 group-hover:opacity-100 group-hover:motion-safe:animate-[shine_0.9s_ease-out]"
        />
        <span className="relative flex size-full items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <StoreLogo name={store.name} logo={store.logo} size={104} rounded="rounded-2xl" className="border-0" />
        </span>
      </span>

      <span className="w-full min-w-0">
        <span className="block truncate text-[13px] font-extrabold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
          {store.name}
        </span>
        <span className="block text-[11px] font-semibold text-faint">{formatCount(store.activeCouponCount)} offers</span>
      </span>
    </Link>
  );
}

/** The four promises under the stores grid, ending on a hand-lettered sign-off. */
function SavingsPromises() {
  const items = [
    { icon: <Truck aria-hidden className="size-5" />, title: "Free Shipping", body: "On top brands & categories", circle: "bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" },
    { icon: <ShieldCheck aria-hidden className="size-5" />, title: "Verified Coupons", body: "100% working & tested", circle: "bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" },
    { icon: <Zap aria-hidden className="size-5" />, title: "Exclusive Deals", body: "Only on our platform", circle: "bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" },
    { icon: <Clock3 aria-hidden className="size-5" />, title: "Always Updated", body: "New offers every day", circle: "bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" },
  ];

  return (
    <div className="mt-5 grid gap-x-4 gap-y-4 rounded-3xl border border-brand-200/60 bg-brand-50 p-5 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto] lg:items-center dark:border-brand-700/40 dark:bg-brand-900/35">
      {items.map((item) => (
        <div key={item.title} className="flex items-center gap-3 lg:border-r lg:border-brand-200/70 lg:last:border-r-0 dark:lg:border-brand-900/60">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${item.circle}`}>
            {item.icon}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{item.title}</span>
            <span className="block text-xs text-faint">{item.body}</span>
          </span>
        </div>
      ))}

      <p className="hidden -rotate-6 font-display text-xl font-extrabold italic leading-tight text-brand-700 lg:block dark:text-brand-300">
        Shop Smart,
        <br />
        Save More
      </p>
    </div>
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
      <div className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] py-5 shadow-[var(--shadow-card)]">
        <div className="mb-3.5 flex items-center gap-3 px-5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-faint">
            <Flame aria-hidden className="size-4.5 text-accent-500" />
            Trending brands
          </span>

          <Link
            href="/stores"
            className="ml-auto text-sm font-bold text-brand-600 transition hover:underline"
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

          <div className="marquee-track gap-3">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy === 1}>
                {lane.map((item) => (
                  <Link
                    key={`${copy}-${item._id}`}
                    href={`/store/${item.slug}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="group flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] py-2.5 pl-2.5 pr-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)] dark:hover:bg-brand-950/40"
                  >
                    <StoreLogo name={item.name} logo={item.logo} size={60} rounded="rounded-2xl" />
                    <span className="min-w-0">
                      <span className="block max-w-44 truncate text-sm font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                        {item.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-faint">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                          {formatCount(item.activeCouponCount)} offers
                        </span>
                        {item.bestOffer ? (
                          <span className="whitespace-nowrap">{item.bestOffer}</span>
                        ) : null}
                      </span>
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
   TOP BRANDS

   A right-to-left marquee of logos, the same mechanic as Trending Brands —
   a shopper recognises the names before they read a single offer.
========================================================= */

function TopBrands({
  stores,
  storeCount,
}: {
  stores: HomepagePayload["stores"];
  storeCount: number;
}) {
  if (!stores.length) return null;

  const lane = stores.slice(0, 16);

  return (
    <section className="shell pt-12">
      <div className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] py-5 shadow-[var(--shadow-card)]">
        <div className="mb-1 flex flex-wrap items-center gap-3 px-5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-faint">
            <Crown aria-hidden className="size-4.5 text-brand-600" />
            Top brands
          </span>

          <Link
            href="/stores"
            className="ml-auto text-sm font-bold text-brand-600 transition hover:underline"
          >
            All brands →
          </Link>
        </div>

        <p className="mb-3.5 px-5 font-display text-lg font-extrabold">
          Names you already shop with
        </p>

        {/*
         * No overflow control here on purpose: per the CSS overflow spec, an
         * element can't have one axis `hidden` and the other `visible` — the
         * visible one is forced to computed `auto`, which still clips. A
         * hover lift on a tile flush against that boundary then gets its top
         * edge cut off. The outer card's own `overflow-hidden` already clips
         * the marquee horizontally, with enough padding above/below that a
         * tile's hover lift never reaches its edge.
         */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/80 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[var(--surface)] via-[var(--surface)]/80 to-transparent"
          />

          <div className="marquee-track gap-3 px-5">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy === 1}>
                {lane.map((store) => (
                  <Link
                    key={`${copy}-${store._id}`}
                    href={`/store/${store.slug}`}
                    tabIndex={copy === 1 ? -1 : undefined}
                    className="group flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] py-2 pl-2 pr-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-card)] dark:hover:bg-brand-950/40"
                  >
                    <StoreLogo name={store.name} logo={store.logo} size={52} rounded="rounded-lg" />
                    <span className="min-w-0">
                      <span className="block max-w-32 truncate text-sm font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                        {store.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-faint">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                          {formatCount(store.activeCouponCount)} offers
                        </span>
                        {store.bestOffer ? (
                          <span className="whitespace-nowrap">{store.bestOffer}</span>
                        ) : null}
                      </span>
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
      Icon: Tag,
      href: "/coupons",
    },
    {
      value: formatCount(storeCount),
      label: "Stores listed",
      note: "New brands added every week",
      Icon: StoreIcon,
      href: "/stores",
    },
    {
      value: formatCount(codeCount),
      label: "Promo codes",
      note: "Copy, paste, pay less at checkout",
      Icon: Ticket,
      href: "/coupons?withCode=true",
    },
    {
      value: formatCount(categoryCount),
      label: "Categories",
      note: "From electronics to travel",
      Icon: LayoutGrid,
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
              <stat.Icon
                aria-hidden
                className="pointer-events-none absolute -right-5 -top-6 size-28 text-brand-500 opacity-[0.07] transition-transform duration-500 group-hover:scale-110"
                strokeWidth={1.2}
              />

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

/* =========================================================
   HOW IT WORKS

   The three steps, then the one thing a shopper can do next. It replaces the
   old wall of promises, which repeated what the hero already said.
========================================================= */

const STEPS = [
  {
    Icon: Search,
    title: "Find a deal",
    body: "Browse top offers from your favourite stores.",
  },
  {
    Icon: Copy,
    title: "Copy the code",
    body: "Grab the promo code with one click.",
  },
  {
    Icon: PiggyBank,
    title: "Shop & save",
    body: "Use it at checkout and enjoy the discount.",
  },
];

function HowItWorks() {
  return (
    <section className="shell pt-14">
      <div className="relative overflow-hidden rounded-3xl border border-brand-200/60 bg-gradient-to-br from-brand-50 via-brand-50 to-brand-100/70 p-6 sm:p-8 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
        <div className="grid items-center gap-8 lg:grid-cols-[18rem_1fr_15rem]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
              <Percent aria-hidden className="size-3.5" />
              Simple &amp; easy
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-3xl">
              How a coupon here actually works
            </h2>
            <p className="mt-2 text-sm text-body">
              Find a deal. Copy the code. Save at checkout. It&#39;s that simple!
            </p>
          </div>

          <ol className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {STEPS.map((step, index) => (
              <Fragment key={step.title}>
                <li className="flex items-center gap-3">
                  <span className="relative flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 shadow-[var(--shadow-card)] dark:bg-brand-950/70 dark:text-brand-300">
                    <step.Icon aria-hidden className="size-7" strokeWidth={1.9} />
                    <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-[11px] font-extrabold text-white dark:border-[var(--surface)]">
                      {index + 1}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{step.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-body">{step.body}</span>
                  </span>
                </li>
                {index < STEPS.length - 1 ? (
                  <ArrowRight aria-hidden className="hidden size-5 text-brand-500 sm:block" />
                ) : null}
              </Fragment>
            ))}
          </ol>

          {/* A "save more" ticket, drawn here in CSS. */}
          <div aria-hidden className="relative hidden h-32 lg:block">
            <div className="absolute inset-x-2 top-3 rotate-[-8deg] rounded-2xl bg-brand-gradient px-5 py-4 text-center shadow-[var(--shadow-glow-strong)]">
              <span className="pointer-events-none absolute inset-1.5 rounded-xl border border-dashed border-white/40" />
              <p className="font-display text-2xl font-extrabold leading-none text-white">SAVE</p>
              <p className="mt-1 font-display text-2xl font-extrabold leading-none text-white">MORE</p>
            </div>
            <span className="absolute bottom-1 right-4 flex size-11 items-center justify-center rounded-full border-2 border-white bg-warn-500 text-white shadow-[var(--shadow-card)]">
              <Percent className="size-5" strokeWidth={2.4} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
