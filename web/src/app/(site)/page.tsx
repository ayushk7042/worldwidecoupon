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

      <HomeHero banners={data.banners} topPick={data.hero.coupon} stores={data.stores} />

      <CategoryRail categories={data.categories} />

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
            {feed.trending.slice(0, 12).map((coupon) => (
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
            {feed.exclusive.slice(0, 12).map((coupon) => (
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
            {feed.codes.slice(0, 12).map((coupon) => (
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

   Deliberately plain: a sliding banner an editor controls, a card for the
   pick of the day, and four shortcuts. Everything else waits below the fold.
========================================================= */

const QUICK_LINKS = [
  { href: "/coupons?withCode=true", label: "Promo codes", icon: "🎟️", tone: "brand" },
  { href: "/coupons?type=freeshipping", label: "Free shipping", icon: "🚚", tone: "accent" },
  { href: "/coupons?exclusive=true", label: "Exclusives", icon: "⭐", tone: "brand" },
  { href: "/coupons?expiringSoon=true", label: "Ending soon", icon: "⏳", tone: "accent" },
] as const;

function HomeHero({
  banners,
  topPick,
  stores,
}: {
  banners: HomepagePayload["banners"];
  topPick: CouponView | null;
  stores: HomepagePayload["stores"];
}) {
  const store = topPick ? storeOf(topPick) : null;

  return (
    <section className="bg-aurora relative overflow-hidden border-b border-[var(--border-subtle)]">
      <div className="shell relative py-6 lg:py-9">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          {/* `self-start` keeps the frame the height of the artwork, so the
              taller side column never leaves a band under the banner. */}
          <div className="flex min-w-0 flex-col gap-3 self-start">
            <HeroBanners
              banners={banners.length ? banners : DEFAULT_BANNERS}
              height="ratio"
              bare
              frameClassName="rounded-3xl border-0 bg-transparent shadow-[0_28px_60px_-28px_rgba(31,41,55,0.5)] ring-1 ring-ink-900/5 dark:ring-white/10"
            />

            {/* Brands people actually search for, so the band earns its height. */}
            {stores.length ? (
              <div className="surface flex items-center gap-2 overflow-hidden rounded-2xl border border-[var(--border-subtle)] px-3 py-2.5 shadow-[var(--shadow-card)]">
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
                  Trending
                </span>

                <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto">
                  {stores.slice(0, 8).map((item) => (
                    <Link
                      key={item._id}
                      href={`/store/${item.slug}`}
                      className="group flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-subtle)] py-1 pl-1 pr-3 text-xs font-semibold transition-all duration-200 hover:-translate-y-px hover:border-brand-300 hover:text-brand-700 hover:shadow-[var(--shadow-card)] dark:hover:text-brand-300"
                    >
                      <StoreLogo name={item.name} logo={item.logo} size={22} rounded="rounded-full" />
                      <span className="max-w-28 truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="flex min-w-0 flex-col gap-3">
            {topPick ? (
              <div className="gradient-ring hover-lift rounded-3xl shadow-[var(--shadow-card)]">
                <Link
                  href={`/coupon/${topPick.slug}`}
                  className="surface group flex h-full flex-col gap-3 rounded-[1.4rem] p-4"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[var(--shadow-glow)]">
                      <span className="size-1.5 animate-pulse rounded-full bg-white" />
                      Pick of the day
                    </span>
                    <span className="ml-auto font-display text-lg font-extrabold text-brand-600">
                      {topPick.badge}
                    </span>
                  </span>

                  <span className="flex items-center gap-2.5">
                    <StoreLogo
                      name={store?.name ?? "Store"}
                      logo={store?.logo}
                      size={40}
                      rounded="rounded-2xl"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {store?.name ?? "Featured"}
                      </span>
                      <span className="block text-xs text-faint">
                        {topPick.hasCode ? "Promo code" : "Deal"}
                        {topPick.verified ? " · verified today" : ""}
                      </span>
                    </span>
                  </span>

                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-body transition group-hover:text-brand-700 dark:group-hover:text-brand-300">
                    {topPick.title}
                  </span>

                  <span className="mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand-50 text-sm font-bold text-brand-700 transition-all duration-200 group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-[var(--shadow-glow)] dark:bg-brand-950/60 dark:text-brand-300">
                    {topPick.hasCode ? "Get the code" : "Get the deal"}
                    <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </Link>
              </div>
            ) : null}

            <div className="surface grid grid-cols-4 gap-1 rounded-3xl border border-[var(--border-subtle)] p-2 shadow-[var(--shadow-card)]">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-center transition-colors hover:bg-brand-50 dark:hover:bg-brand-950/50"
                >
                  <span
                    className={classNames(
                      "flex size-10 items-center justify-center rounded-full text-base transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-110",
                      link.tone === "brand"
                        ? "bg-brand-100 dark:bg-brand-950/70"
                        : "bg-accent-300 dark:bg-accent-600/25"
                    )}
                  >
                    {link.icon}
                  </span>
                  <span className="w-full truncate text-[10px] font-bold leading-tight">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CATEGORY RAIL

   The row of circles straight under the banner — the fastest way into the
   catalogue, and the first colour the page shows.
========================================================= */

function CategoryRail({ categories }: { categories: HomepagePayload["categories"] }) {
  if (!categories.length) return null;

  return (
    <section className="shell pt-10">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-px w-6 bg-brand-400" />
            Browse
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
            Shop by category
          </h2>
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

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {categories.slice(0, 14).map((category, index) => (
          <Link
            key={category._id}
            href={`/category/${category.slug}`}
            className="group flex w-[6.5rem] shrink-0 flex-col items-center gap-2.5 text-center sm:w-28"
          >
            <span
              className={classNames(
                "relative flex size-[4.5rem] items-center justify-center rounded-full text-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lift)] sm:size-20",
                index % 3 === 0
                  ? "bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-950 dark:to-brand-900"
                  : index % 3 === 1
                    ? "bg-gradient-to-br from-accent-100 to-accent-200 dark:from-brand-950 dark:to-brand-900"
                    : "bg-gradient-to-br from-accent-300 to-accent-100 dark:from-brand-950 dark:to-brand-900"
              )}
            >
              <span className="transition-transform duration-300 group-hover:scale-110">
                {category.icon ?? "🏷️"}
              </span>
              <span className="absolute -bottom-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-brand-700 shadow-[var(--shadow-card)] dark:text-brand-300">
                {formatCount(category.activeCouponCount)}
              </span>
            </span>

            <span className="w-full min-w-0">
              <span className="block w-full truncate text-[13px] font-bold transition-colors group-hover:text-brand-600">
                {category.name}
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
    { value: formatCount(offerCount), label: "live offers", icon: "🏷️", note: "checked by hand" },
    { value: formatCount(storeCount), label: "stores listed", icon: "🏬", note: "and growing" },
    { value: formatCount(codeCount), label: "promo codes", icon: "🎟️", note: "ready to copy" },
    { value: formatCount(categoryCount), label: "categories", icon: "🗂️", note: "to browse" },
  ];

  return (
    <section className="shell pt-10">
      <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-[1px] shadow-[var(--shadow-glow)]">
        {/* A diagonal sheen keeps the slab from reading as flat green. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(28rem 16rem at 12% -40%, rgba(255,255,255,0.35), transparent 70%), radial-gradient(22rem 14rem at 88% 140%, rgba(255,255,255,0.22), transparent 70%)",
          }}
        />

        <div className="relative grid gap-px overflow-hidden rounded-[1.45rem] sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3.5 bg-white/[0.07] px-5 py-5 text-white backdrop-blur-sm transition-colors hover:bg-white/[0.14]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl ring-1 ring-inset ring-white/25">
                {stat.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-2xl font-extrabold leading-none">
                  {stat.value}
                </span>
                <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-white/80">
                  {stat.label}
                </span>
                <span className="block text-[11px] text-white/60">{stat.note}</span>
              </span>
            </div>
          ))}
        </div>
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
