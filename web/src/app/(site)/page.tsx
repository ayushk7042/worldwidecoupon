import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock3,
  Copy,
  Flame,
  LayoutGrid,
  LockOpen,
  PiggyBank,
  Search,
  Star,
  Store as StoreIcon,
  Tag,
  Ticket,
  Truck,
  Wrench,
} from "lucide-react";
import { CategoryIcon } from "@/components/ui/icons";
import { CouponCard } from "@/components/site/CouponCard";
import { RevealButton } from "@/components/site/RevealButton";
import { SaveButton } from "@/components/site/SaveButton";
import { DEFAULT_BANNERS, HeroBanners } from "@/components/site/HeroBanners";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Rail, SectionHeading, StoreLogo } from "@/components/ui/primitives";
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
            subtitle="Opened, tested and written up by an editor before they went on the page."
            action={
              <Link
                href="/coupons"
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
              >
                See all offers
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <SpotlightOffer coupon={data.featured[0]!} />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {data.featured.slice(1, 5).map((coupon) => (
                <MiniOffer key={coupon._id} coupon={coupon} />
              ))}
            </div>
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
            subtitle="The shops our readers open most often this week."
            action={
              <Link
                href="/stores"
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
              >
                All stores
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.stores.slice(0, 12).map((store) => (
              <BrandCard key={store._id} store={store} />
            ))}
          </div>
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
            subtitle="Ranked by how many shoppers used them in the last day."
            action={
              <Link
                href="/coupons?sort=popular"
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
              >
                See the chart
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {feed.trending.slice(0, 6).map((coupon, index) => (
              <RankedOffer key={coupon._id} coupon={coupon} rank={index + 1} />
            ))}
          </div>
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
    className: "from-brand-100 to-brand-50 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    key: "shipping" as const,
    href: "/coupons?type=freeshipping",
    label: "Free shipping",
    hint: "No delivery fee",
    Icon: Truck,
    className: "from-accent-100 to-accent-50 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    key: "exclusive" as const,
    href: "/coupons?exclusive=true",
    label: "Exclusives",
    hint: "Only on this site",
    Icon: Star,
    className: "from-accent-300 to-accent-100 dark:from-brand-950 dark:to-brand-900/40",
  },
  {
    key: "expiring" as const,
    href: "/coupons?expiringSoon=true",
    label: "Ending soon",
    hint: "Before they go",
    Icon: Clock3,
    className: "from-brand-200 to-brand-50 dark:from-brand-950 dark:to-brand-900/40",
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
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]/85 text-brand-600 shadow-[var(--shadow-card)] transition-transform duration-200 group-hover:scale-110">
                  <link.Icon aria-hidden className="size-5" strokeWidth={1.9} />
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
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700 ring-1 ring-inset ring-brand-200/60 dark:from-brand-950 dark:to-brand-900/50 dark:text-brand-300 dark:ring-brand-800">
                    <promise.Icon aria-hidden className="size-5" strokeWidth={1.9} />
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
                        <BadgeCheck aria-hidden className="mr-1 inline size-3" />
                        Verified
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
   OFFER CARDS

   Three shapes for the three feeds: one spotlight, a compact tile, and a
   ranked row. They share the brand's language but never look the same twice
   down the page.
========================================================= */

function SpotlightOffer({ coupon }: { coupon: CouponView }) {
  const store = storeOf(coupon);
  const points = descriptionLines(coupon.description, 3);

  return (
    <article className="surface group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      {/* The discount rides the top strip rather than taking a tile of its own. */}
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-brand-50 to-accent-100/70 px-5 py-3 dark:from-brand-950/70 dark:to-brand-900/40">
        <span className="rounded-full bg-brand-gradient px-3 py-1 text-xs font-extrabold text-white shadow-[var(--shadow-glow)]">
          {coupon.badge}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
          Editor&#39;s pick
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-faint">
          <Clock3 aria-hidden className="size-3.5" />
          {expiryLabel(coupon) ?? "No expiry"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-2">
            <StoreLogo
              name={store?.name ?? "Store"}
              logo={store?.logo}
              size={64}
              rounded="rounded-xl"
              className="border-0"
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={coupon.hasCode ? "brand" : "accent"}>
                {COUPON_TYPE_LABELS[coupon.type]}
              </Badge>
              {coupon.verified ? (
                <Badge tone="success">
                  <BadgeCheck aria-hidden className="mr-1 inline size-3" />
                  Verified
                </Badge>
              ) : null}
              {coupon.exclusive ? <Badge tone="accent">Exclusive</Badge> : null}
            </div>

            <h3 className="font-display text-lg font-extrabold leading-snug sm:text-xl">
              <Link
                href={`/coupon/${coupon.slug}`}
                className="transition hover:text-brand-700 dark:hover:text-brand-300"
              >
                {coupon.title}
              </Link>
            </h3>

            {store ? (
              <Link
                href={`/store/${store.slug}`}
                className="mt-1 inline-block text-sm font-semibold text-faint transition hover:text-brand-600"
              >
                at {store.name}
              </Link>
            ) : null}
          </div>
        </div>

        {points.length ? (
          <ul className="space-y-1.5">
            {points.map((line, index) => (
              <li key={index} className="flex gap-2 text-sm text-body">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-500" strokeWidth={2.4} />
                <span className="line-clamp-1">{line}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          <RevealButton coupon={coupon} size="lg" />
          <SaveButton couponId={coupon._id} />
        </div>
      </div>
    </article>
  );
}

function MiniOffer({ coupon }: { coupon: CouponView }) {
  const store = storeOf(coupon);

  return (
    <article className="surface group flex gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5">
        <StoreLogo
          name={store?.name ?? "Store"}
          logo={store?.logo}
          size={44}
          rounded="rounded-lg"
          className="border-0"
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs font-bold text-faint">
            {store?.name ?? "Featured"}
          </span>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-extrabold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
            {coupon.badge}
          </span>
        </div>

        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-2 flex-1 text-sm font-semibold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
        >
          {coupon.title}
        </Link>

        <div className="flex items-center gap-2">
          <RevealButton coupon={coupon} size="sm" />
          <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-faint">
            <Clock3 aria-hidden className="size-3" />
            {expiryLabel(coupon) ?? "No expiry"}
          </span>
        </div>
      </div>
    </article>
  );
}

function RankedOffer({ coupon, rank }: { coupon: CouponView; rank: number }) {
  const store = storeOf(coupon);

  return (
    <article className="surface group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      {/* The rank, oversized and faint, is the section's signature. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-4 -right-1 font-display text-7xl font-extrabold leading-none text-brand-100 transition-transform duration-300 group-hover:-translate-y-1 dark:text-brand-950"
      >
        {rank}
      </span>

      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-sm font-extrabold text-white shadow-[var(--shadow-glow)]">
        {rank}
      </span>

      <StoreLogo
        name={store?.name ?? "Store"}
        logo={store?.logo}
        size={38}
        rounded="rounded-xl"
        className="relative"
      />

      <div className="relative min-w-0 flex-1">
        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-2 text-sm font-semibold leading-snug transition hover:text-brand-700 dark:hover:text-brand-300"
        >
          {coupon.title}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-faint">
          {store?.name ?? "Featured"}
          {coupon.uses ? (
            <>
              <span aria-hidden>·</span>
              <Flame aria-hidden className="size-3 text-accent-500" />
              used {formatCount(coupon.uses)}×
            </>
          ) : null}
        </p>
      </div>

      <span className="relative shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-xs font-extrabold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
        {coupon.badge}
      </span>
    </article>
  );
}

function BrandCard({ store }: { store: Store }) {
  return (
    <Link
      href={`/store/${store.slug}`}
      className="surface group flex flex-col items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] p-4 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
    >
      {/* The logo is the point of this card, so it gets the room. */}
      <span className="flex size-16 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5 transition-transform duration-200 group-hover:scale-105">
        <StoreLogo name={store.name} logo={store.logo} size={52} rounded="rounded-xl" className="border-0" />
      </span>

      <span className="min-w-0 w-full">
        <span className="block truncate text-sm font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
          {store.name}
        </span>
        <span className="block text-[11px] font-semibold text-faint">
          {formatCount(store.activeCouponCount)} offers
        </span>
      </span>

      {store.bestOffer ? (
        <span className="max-w-full truncate rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
          {store.bestOffer}
        </span>
      ) : null}
    </Link>
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
            <Flame aria-hidden className="size-4 text-accent-500" />
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
                "relative flex size-12 shrink-0 items-center justify-center rounded-2xl text-brand-700 ring-1 ring-inset transition-transform duration-300 group-hover:scale-110 dark:text-brand-300",
                index % 3 === 0
                  ? "bg-gradient-to-br from-brand-100 to-brand-50 ring-brand-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
                  : index % 3 === 1
                    ? "bg-gradient-to-br from-accent-100 to-accent-50 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
                    : "bg-gradient-to-br from-accent-300 to-accent-100 ring-accent-200/70 dark:from-brand-950 dark:to-brand-900/50 dark:ring-brand-800"
              )}
            >
              <CategoryIcon name={category.name} className="size-6" />
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
    title: "Find the store",
    body: "Search a brand or open a category. Every live offer for that shop sits on one page.",
  },
  {
    Icon: Copy,
    title: "Take the code",
    body: "One click copies the code and opens the shop in a new tab, with the offer already applied.",
  },
  {
    Icon: PiggyBank,
    title: "Pay less",
    body: "Paste at checkout. If it did not work, tell us and the offer comes down the same day.",
  },
];

function HowItWorks() {
  return (
    <section className="shell pt-16">
      <div className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-20 size-72 rounded-full bg-brand-100 opacity-60 blur-3xl dark:bg-brand-900/40"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-10 size-72 rounded-full bg-accent-100 opacity-70 blur-3xl dark:bg-brand-900/30"
        />

        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_20rem] lg:gap-10">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
              <span className="h-px w-6 bg-brand-400" />
              Three steps
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
              How a coupon here actually works
            </h2>

            <ol className="mt-6 grid gap-5 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-700 ring-1 ring-inset ring-brand-200/60 dark:from-brand-950 dark:to-brand-900/50 dark:text-brand-300 dark:ring-brand-800">
                    <step.Icon aria-hidden className="size-5" strokeWidth={1.9} />
                  </span>

                  <p className="mt-3 flex items-center gap-2 text-sm font-bold">
                    <span className="font-display text-brand-500">0{index + 1}</span>
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-body">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col justify-center gap-3 rounded-3xl bg-brand-gradient p-6 text-white shadow-[var(--shadow-glow)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
              Never miss a code
            </p>
            <p className="font-display text-xl font-extrabold leading-snug">
              Save an offer and we will tell you before it expires.
            </p>
            <p className="text-sm text-white/80">
              A free account keeps your codes in one place, across every device.
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href="/account/register"
                className="inline-flex h-11 items-center gap-1.5 rounded-2xl bg-white px-5 text-sm font-bold text-brand-700 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                Create a free account
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link
                href="/coupons"
                className="inline-flex h-11 items-center rounded-2xl px-4 text-sm font-bold text-white ring-1 ring-inset ring-white/35 transition hover:bg-white/10"
              >
                Browse offers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
