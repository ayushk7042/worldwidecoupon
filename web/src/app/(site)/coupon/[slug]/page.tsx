import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  Lightbulb,
  Lock,
  Route,
  Sparkles,
  Store as StoreIcon,
  Tag,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { RevealButton, VoteWidget } from "@/components/site/RevealButton";
import { FollowStoreButton, SaveButton } from "@/components/site/SaveButton";
import { TrustStrip } from "@/components/site/TrustStrip";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Breadcrumbs, Card, SectionHeading, StoreLogo } from "@/components/ui/primitives";
import { api, apiSafe } from "@/lib/api";
import {
  COUPON_TYPE_LABELS,
  descriptionLines,
  expiryLabel,
  formatCount,
  formatDate,
  splitBadge,
  storeOf,
  timeAgo,
} from "@/lib/format";
import { JsonLd, breadcrumbSchema, couponSchema } from "@/lib/schema";
import type { CouponView, Store } from "@/lib/types";

export const revalidate = 300;

async function loadCoupon(slug: string): Promise<CouponView | null> {
  try {
    return await api<CouponView>(`/coupons/${encodeURIComponent(slug)}`, { revalidate: 300 });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const coupon = await loadCoupon(slug);

  if (!coupon) return { title: "Offer not found" };

  const store = storeOf(coupon);
  const title = coupon.metaTitle || `${coupon.title}${store ? ` — ${store.name}` : ""}`;

  return {
    title,
    description:
      coupon.metaDescription ||
      descriptionLines(coupon.description, 1)[0] ||
      `${coupon.badge} at ${store?.name ?? "this store"}. Verified before it went live.`,
    alternates: { canonical: `/coupon/${coupon.slug}` },
    robots: coupon.isExpired ? { index: false, follow: true } : undefined,
  };
}

export default async function CouponPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const coupon = await loadCoupon(slug);

  if (!coupon) notFound();

  const store = storeOf(coupon);
  const related = await apiSafe<CouponView[]>(
    `/coupons/${encodeURIComponent(slug)}/related`,
    [],
    { revalidate: 600 }
  );

  const categorySlug =
    store && typeof store.primaryCategory === "object" && store.primaryCategory
      ? store.primaryCategory.slug
      : undefined;

  const similarStores = store
    ? await apiSafe<Store[]>(
        "/stores",
        [],
        { query: { limit: 8, category: categorySlug, sort: "offers", withOffers: true }, revalidate: 3600 }
      ).then((list) => list.filter((item) => item._id !== store._id).slice(0, 4))
    : [];

  const expiry = expiryLabel(coupon);
  const lines = descriptionLines(coupon.description, 10);
  const discount = splitBadge(coupon.badge);
  const isNew = Date.now() - new Date(coupon.createdAt).getTime() < 7 * 86_400_000;

  const trail = [
    { label: "Home", href: "/" },
    ...(store ? [{ label: store.name, href: `/store/${store.slug}` }] : []),
    { label: coupon.title },
  ];

  const facts = [
    coupon.uses > 0
      ? { icon: <Users aria-hidden className="size-4" />, label: `${formatCount(coupon.uses)} used it` }
      : null,
    coupon.successRate !== null
      ? { icon: <TrendingUp aria-hidden className="size-4" />, label: `${coupon.successRate}% worked` }
      : null,
    coupon.verifiedAt
      ? { icon: <CheckCircle2 aria-hidden className="size-4" />, label: `Checked ${formatDate(coupon.verifiedAt)}` }
      : null,
    { icon: <Clock aria-hidden className="size-4" />, label: `Added ${timeAgo(coupon.createdAt)}` },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[];

  const steps = coupon.hasCode
    ? [
        { title: "Copy the code", body: "One click copies it and opens the store in a new tab." },
        { title: "Fill your basket", body: "Shop as you normally would on the store site." },
        { title: "Paste at checkout", body: "Drop it into the promo or voucher box." },
        { title: "Check the total", body: "Make sure the price dropped before you pay." },
      ]
    : [
        { title: "Open the deal", body: "The discount sits behind the link — no code needed." },
        { title: "Shop as normal", body: "Prices are already reduced on the landing page." },
        { title: "Check the total", body: "Make sure the price dropped before you pay." },
      ];

  return (
    <>
      <JsonLd data={[couponSchema(coupon), breadcrumbSchema(trail)]} />

      {/* =========================================================
          HERO — the shop, the offer, an image and the button
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)] bg-aurora">
        <div className="shell pb-6 pt-4">
          <Breadcrumbs trail={trail} />

          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-center">
            <div className="min-w-0">
              {store ? (
                <Link
                  href={`/store/${store.slug}`}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] py-2 pl-2 pr-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-brand-300"
                >
                  <StoreLogo name={store.name} logo={store.logo} size={44} rounded="rounded-xl" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-bold transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">
                      {store.verified ? (
                        <BadgeCheck aria-hidden className="size-3.5 shrink-0 text-success-600" />
                      ) : null}
                      <span className="truncate">{store.name}</span>
                    </span>
                    <span className="block text-xs font-semibold text-faint">
                      {formatCount(store.activeCouponCount)} live offers
                    </span>
                  </span>
                </Link>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Badge
                  tone={coupon.hasCode ? "brand" : "accent"}
                  icon={coupon.hasCode ? <Ticket aria-hidden className="size-3" /> : <Tag aria-hidden className="size-3" />}
                >
                  {COUPON_TYPE_LABELS[coupon.type]}
                </Badge>
                {coupon.verified ? (
                  <Badge tone="success" icon={<BadgeCheck aria-hidden className="size-3" />}>
                    Verified
                  </Badge>
                ) : null}
                {coupon.exclusive ? (
                  <Badge tone="accent" icon={<Sparkles aria-hidden className="size-3" />}>
                    Exclusive
                  </Badge>
                ) : null}
                {isNew && !coupon.isExpired ? <Badge tone="brand">New</Badge> : null}
                {expiry && !coupon.isExpired ? (
                  <Badge tone="warn" icon={<CalendarClock aria-hidden className="size-3" />}>
                    {expiry}
                  </Badge>
                ) : null}
                {coupon.isExpired ? (
                  <Badge tone="danger" icon={<AlertTriangle aria-hidden className="size-3" />}>
                    Expired
                  </Badge>
                ) : null}
              </div>

              <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[2.1rem]">
                {coupon.title}
              </h1>

              {lines[0] ? (
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-body sm:text-base">
                  {lines[0]}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-faint">
                {facts.map((fact) => (
                  <span key={fact.label} className="inline-flex items-center gap-1.5">
                    {fact.icon}
                    {fact.label}
                  </span>
                ))}
              </div>

              <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                <VoteWidget couponId={coupon._id} successRate={null} />
              </div>
            </div>

            {/* ---- the action panel, styled as a voucher ---- */}
            <div className="surface relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] shadow-[var(--shadow-lift)]">
              <div className="relative bg-brand-gradient px-5 pb-5 pt-4 text-center text-white">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{
                    backgroundImage:
                      "radial-gradient(18rem 10rem at 15% -30%, rgba(255,255,255,0.4), transparent 70%)",
                  }}
                />
                <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                  {coupon.hasCode ? "Coupon code" : "Deal price"}
                </p>
                <p className="relative mt-1 font-display text-4xl font-extrabold leading-none">
                  {discount.lead}
                </p>
                {discount.tail ? (
                  <p className="relative mt-1 text-sm font-bold uppercase tracking-[0.2em] text-white/85">
                    {discount.tail}
                  </p>
                ) : null}
              </div>

              {/* The notch and dashed rule that make it read as a torn voucher. */}
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute -left-2.5 -top-2.5 size-5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)]"
                />
                <span
                  aria-hidden
                  className="absolute -right-2.5 -top-2.5 size-5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-sunken)]"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-5 top-0 border-t-2 border-dashed border-[var(--border-subtle)]"
                />
              </div>

              <div className="space-y-2.5 px-5 pb-4 pt-5">
                <RevealButton coupon={coupon} size="lg" full />

                <div className="flex items-center justify-center gap-2">
                  <SaveButton couponId={coupon._id} label />
                </div>

                <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-faint">
                  <Lock aria-hidden className="size-3.5" />
                  No sign-up needed
                </p>
              </div>
            </div>
          </div>

          <AdSlot position="coupon-top" store={store?._id} className="mt-6" />
        </div>
      </section>

      {/* =========================================================
          TRUST STRIP — the same five promises on every offer page
      ========================================================= */}
      <section className="shell py-5">
        <TrustStrip />
      </section>

      <div className="shell pb-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-4">
            {/* ---- follow the store, so the next drop finds them ---- */}
            {store ? (
              <Card className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warn-50 text-warn-600 dark:bg-warn-500/10 dark:text-warn-500">
                    <Lightbulb aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Be the first to know</p>
                    <p className="truncate text-xs text-faint">
                      Get exclusive deals, new offers and updates from {store.name}.
                    </p>
                  </div>
                </div>
                <FollowStoreButton storeId={store._id} storeName={store.name} />
              </Card>
            ) : null}

            {lines.length > 1 ? (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Tag aria-hidden className="size-4.5 text-brand-600" />
                  What you get
                </h2>
                <ul className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  {lines.slice(1).map((line, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success-600" />
                      <span className="font-semibold text-body">{line}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {/* ---- how to use, as a numbered run of cards ---- */}
            <Card className="border-warn-500/20 bg-warn-50/40 dark:border-warn-500/15 dark:bg-warn-500/5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-warn-500/15 text-warn-600 dark:text-warn-400">
                    <Route aria-hidden className="size-4.5" />
                  </span>
                  How to use this {coupon.hasCode ? "code" : "deal"}
                </h2>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-warn-500" />
              </div>
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-2xl border border-[var(--border-subtle)] surface p-4"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-extrabold text-white">
                      {index + 1}
                    </span>
                    <p className="mt-2.5 text-sm font-bold">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-body">{step.body}</p>
                  </li>
                ))}
              </ol>
            </Card>

            <AdSlot position="coupon-inline" store={store?._id} />

            {coupon.terms ? (
              <Card padded={false}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-lg font-bold">
                    Terms &amp; conditions
                    <span className="text-xs font-semibold text-brand-600 group-open:hidden">Show</span>
                    <span className="hidden text-xs font-semibold text-brand-600 group-open:inline">Hide</span>
                  </summary>
                  <div
                    className="prose-offer border-t border-[var(--border-subtle)] p-5 text-sm"
                    dangerouslySetInnerHTML={{ __html: coupon.terms }}
                  />
                </details>
              </Card>
            ) : null}

            {similarStores.length ? (
              <section className="pt-1">
                <SectionHeading
                  title="Similar deals you might like"
                  action={
                    categorySlug ? (
                      <Link
                        href={`/category/${categorySlug}`}
                        className="text-sm font-semibold text-brand-600 hover:underline"
                      >
                        View all →
                      </Link>
                    ) : null
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {similarStores.map((item) => (
                    <Link
                      key={item._id}
                      href={`/store/${item.slug}`}
                      className="group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-card)]"
                    >
                      <StoreLogo name={item.name} logo={item.logo} size={40} rounded="rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{item.name}</span>
                        <span className="block truncate text-xs font-semibold text-brand-600">
                          {item.bestOffer || item.averageDiscount || `${formatCount(item.activeCouponCount)} offers`}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* =========================================================
              SIDEBAR
          ========================================================= */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {store ? (
              <Card padded={false} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-brand-50 to-accent-100/60 px-4 py-3.5 dark:from-brand-950/70 dark:to-brand-900/40">
                  <StoreLogo name={store.name} logo={store.logo} size={48} rounded="rounded-2xl" />
                  <div className="min-w-0">
                    <Link
                      href={`/store/${store.slug}`}
                      className="block truncate font-display text-base font-extrabold transition hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      {store.name}
                    </Link>
                    {store.bestOffer ? (
                      <p className="truncate text-xs font-semibold text-faint">
                        Best right now · {store.bestOffer}
                      </p>
                    ) : null}
                  </div>
                </div>

                <dl className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] text-center">
                  {[
                    { label: "Offers", value: store.activeCouponCount },
                    { label: "Codes", value: store.codeCount },
                    { label: "Deals", value: store.dealCount },
                  ].map((stat) => (
                    <div key={stat.label} className="px-2 py-3">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                        {stat.label}
                      </dt>
                      <dd className="font-display text-lg font-extrabold text-brand-600">
                        {formatCount(stat.value ?? 0)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {related.length ? (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {related.slice(0, 3).map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/coupon/${item.slug}`}
                          className="flex items-center gap-2.5 px-4 py-2.5 transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-xs font-semibold leading-snug">
                              {item.title}
                            </span>
                          </span>
                          <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-extrabold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                            {item.badge}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="p-3">
                  <ButtonLink href={`/store/${store.slug}`} variant="secondary" full>
                    <StoreIcon aria-hidden className="size-4" />
                    All {store.name} offers
                  </ButtonLink>
                </div>
              </Card>
            ) : null}

            <AdSlot position="sidebar-sticky" store={store?._id} />

            <Card>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <AlertTriangle aria-hidden className="size-4 text-accent-500" />
                Did not work?
              </h3>
              <p className="mb-3 text-sm text-body">
                Tell us and we will pull it. Codes expire without warning and we
                would rather hear it from you.
              </p>
              <ButtonLink
                href={`/contact?topic=broken-coupon&coupon=${coupon._id}`}
                variant="secondary"
                size="sm"
                full
              >
                Report this offer
              </ButtonLink>
            </Card>

            <Card className="bg-gradient-to-br from-brand-50 to-accent-100/40 dark:from-brand-950/40 dark:to-brand-900/20">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
                <Headphones aria-hidden className="size-4 text-brand-600" />
                Need help?
              </h3>
              <p className="mb-3 text-sm text-body">
                Our support team is here for you, day and night.
              </p>
              <ButtonLink href="/contact" variant="secondary" size="sm" full>
                Contact support
              </ButtonLink>
            </Card>
          </aside>
        </div>
      </div>

      {/* The hero button scrolls away on a phone, so the offer keeps a button. */}
      <div className="sticky bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.4)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold">{coupon.badge}</span>
            <span className="block truncate text-[11px] text-faint">
              {store ? store.name : "Tap to open"}
            </span>
          </span>
          <RevealButton coupon={coupon} size="md" />
        </div>
      </div>
    </>
  );
}
