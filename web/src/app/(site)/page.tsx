import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { SearchBox } from "@/components/site/SearchBox";
import { CategoryTile, StoreCard } from "@/components/site/StoreCard";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Rail, SectionHeading } from "@/components/ui/primitives";
import { apiSafe } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { CouponFeed, HomepagePayload } from "@/lib/types";

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
  const [data, feed] = await Promise.all([
    apiSafe<HomepagePayload>("/homepage", EMPTY, { revalidate: 300 }),
    apiSafe<CouponFeed>("/coupons/feed", EMPTY_FEED, { revalidate: 300 }),
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

      <Hero data={data} totalOffers={totalOffers} />

      <div className="mx-auto max-w-7xl px-4">
        <AdSlot position="home-top" className="mt-8" minHeight={0} />
      </div>

      {data.categories.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-12">
          <SectionHeading
            eyebrow="Browse"
            title="Shop by category"
            action={
              <Link href="/categories" className="text-sm font-semibold text-brand-600 hover:underline">
                All categories →
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.categories.slice(0, 12).map((category) => (
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

      {data.featured.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-14">
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
          <div className="grid gap-3 lg:grid-cols-2">
            {data.featured.slice(0, 6).map((coupon) => (
              <CouponCard key={coupon._id} coupon={coupon} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-7xl px-4">
        <AdSlot position="home-infeed" className="mt-12" />
      </div>

      {data.stores.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-14">
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
        <section className="mx-auto max-w-7xl px-4 pt-14">
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
        <section className="mx-auto max-w-7xl px-4 pt-14">
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
        <section className="mx-auto max-w-7xl px-4 pt-14">
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

      <div className="mx-auto max-w-7xl px-4">
        <AdSlot position="home-mid" className="mt-14" />
      </div>

      {feed.codes.length ? (
        <section className="mx-auto max-w-7xl px-4 pt-14">
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
          <section key={section.category._id} className="mx-auto max-w-7xl px-4 pt-14">
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
        <section className="mx-auto max-w-7xl px-4 pt-14">
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
        <section className="mx-auto max-w-7xl px-4 pt-14">
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

      <div className="mx-auto max-w-7xl px-4">
        <AdSlot position="home-bottom" className="mt-14" />
      </div>
    </>
  );
}

/* =========================================================
   HERO
========================================================= */

function Hero({ data, totalOffers }: { data: HomepagePayload; totalOffers: number }) {
  const hero = data.hero.coupon;

  return (
    <section className="relative overflow-hidden bg-brand-gradient">
      {/* Two soft radial washes stop the flat gradient looking like a CSS demo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 15% -10%, rgba(255,255,255,0.28), transparent), radial-gradient(40rem 24rem at 90% 120%, rgba(255,255,255,0.18), transparent)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-20">
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ring-white/25 backdrop-blur">
            ✓ Every code checked by hand
          </span>

          <h1 className="mt-5 text-[2.1rem] font-extrabold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
            {data.hero.heading ?? (
              <>
                Stop paying
                <br />
                full price.
              </>
            )}
          </h1>

          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/85 sm:text-base">
            {data.hero.subheading ??
              `${formatCount(totalOffers)} live coupon codes and deals across 190+ stores. No sign-up, no spam, no made-up countdown timers.`}
          </p>

          <div className="mt-7 max-w-xl">
            <SearchBox size="lg" placeholder="Search a store — Amazon, Etsy, Macy's…" />
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { href: "/coupons?withCode=true", label: "Promo codes" },
              { href: "/coupons?type=freeshipping", label: "Free shipping" },
              { href: "/coupons?sort=discount", label: "Biggest savings" },
              { href: "/stores", label: "All stores" },
            ].map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur transition hover:bg-white/20"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* The hero ad slot — the most valuable placement on the site. */}
          <AdSlot position="home-hero" className="border-white/20 bg-white/10" />

          {hero ? (
            <div className="surface rounded-3xl border border-white/20 p-5 shadow-[var(--shadow-lift)]">
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="warn">⚡ Offer of the day</Badge>
              </div>
              <CouponCard coupon={hero} hideSave />
            </div>
          ) : null}
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
    <section className="mx-auto max-w-7xl px-4 pt-16">
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
