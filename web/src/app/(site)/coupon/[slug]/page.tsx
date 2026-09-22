import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { CouponCard } from "@/components/site/CouponCard";
import { RevealButton, VoteWidget } from "@/components/site/RevealButton";
import { SaveButton } from "@/components/site/SaveButton";
import { ButtonLink } from "@/components/ui/Button";
import {
  Badge,
  Breadcrumbs,
  Card,
  SectionHeading,
  StoreLogo,
} from "@/components/ui/primitives";
import { api, apiSafe } from "@/lib/api";
import {
  COUPON_TYPE_LABELS,
  descriptionLines,
  expiryLabel,
  formatCount,
  formatDate,
  storeOf,
  timeAgo,
} from "@/lib/format";
import { JsonLd, breadcrumbSchema, couponSchema } from "@/lib/schema";
import type { CouponView } from "@/lib/types";

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

  const expiry = expiryLabel(coupon);
  const lines = descriptionLines(coupon.description, 10);

  const trail = [
    { label: "Home", href: "/" },
    ...(store ? [{ label: store.name, href: `/store/${store.slug}` }] : []),
    { label: coupon.title },
  ];

  return (
    <>
      <JsonLd data={[couponSchema(coupon), breadcrumbSchema(trail)]} />

      <div className="shell py-8">
        <Breadcrumbs trail={trail} />

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0">
            <Card className="overflow-hidden" padded={false}>
              <div className="flex flex-col gap-5 p-6 sm:flex-row">
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <span className="flex min-h-20 w-24 items-center justify-center rounded-2xl bg-brand-gradient px-2 text-center text-base font-bold leading-tight text-white">
                    {coupon.badge}
                  </span>
                  {store ? (
                    <Link href={`/store/${store.slug}`}>
                      <StoreLogo name={store.name} logo={store.logo} size={64} />
                    </Link>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
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
                    {coupon.isExpired ? <Badge tone="danger">Expired</Badge> : null}
                  </div>

                  <h1 className="text-xl font-extrabold leading-snug sm:text-2xl">
                    {coupon.title}
                  </h1>

                  {store ? (
                    <p className="mt-1 text-sm text-body">
                      at{" "}
                      <Link href={`/store/${store.slug}`} className="font-semibold text-brand-600 hover:underline">
                        {store.name}
                      </Link>
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <RevealButton coupon={coupon} size="lg" />
                    <SaveButton couponId={coupon._id} label />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      coupon.uses > 0 ? `${formatCount(coupon.uses)} people used this` : null,
                      `Added ${timeAgo(coupon.createdAt)}`,
                      coupon.verifiedAt ? `Checked ${formatDate(coupon.verifiedAt)}` : null,
                      expiry ?? "No expiry date",
                      coupon.successRate !== null ? `${coupon.successRate}% worked` : null,
                    ]
                      .filter(Boolean)
                      .map((fact) => (
                        <span
                          key={fact as string}
                          className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-[11px] font-semibold text-body"
                        >
                          {fact}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] px-6 py-4">
                <VoteWidget couponId={coupon._id} successRate={coupon.successRate} />
              </div>
            </Card>

            {lines.length ? (
              <Card className="mt-5">
                <h2 className="mb-3 text-lg font-bold">Offer details</h2>
                <ul className="space-y-2">
                  {lines.map((line, index) => (
                    <li key={index} className="flex gap-2.5 text-sm text-body">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-400" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <AdSlot position="coupon-inline" className="mt-5" store={store?._id} />

            {coupon.terms ? (
              <Card className="mt-5">
                <h2 className="mb-2 text-lg font-bold">Terms & conditions</h2>
                <div className="prose-offer text-sm" dangerouslySetInnerHTML={{ __html: coupon.terms }} />
              </Card>
            ) : null}

            <Card className="mt-5">
              <h2 className="mb-3 text-lg font-bold">
                How to use this {coupon.hasCode ? "code" : "deal"}
              </h2>
              <ol className="space-y-2.5">
                {(coupon.hasCode
                  ? [
                      "Click “Get code” — we copy it and open the store for you.",
                      "Fill your basket as normal.",
                      "Paste the code into the promo box at checkout.",
                      "Check the total dropped before you pay.",
                    ]
                  : [
                      "Click “Get deal” — the discount is already applied behind the link.",
                      "Shop as normal; prices are reduced on the landing page.",
                      "Check the total at checkout before you pay.",
                    ]
                ).map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm text-body">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {related.length ? (
              <section className="mt-10">
                <SectionHeading
                  title={store ? `More from ${store.name}` : "You might also like"}
                  action={
                    store ? (
                      <Link href={`/store/${store.slug}`} className="text-sm font-semibold text-brand-600 hover:underline">
                        All offers →
                      </Link>
                    ) : null
                  }
                />
                <div className="grid gap-3 2xl:grid-cols-2">
                  {related.map((item) => (
                    <CouponCard key={item._id} coupon={item} showStore={!store} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {store ? (
              <Card padded={false} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-gradient-to-r from-brand-50 to-accent-100/60 px-4 py-3.5 dark:from-brand-950/70 dark:to-brand-900/40">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5">
                    <StoreLogo name={store.name} logo={store.logo} size={46} rounded="rounded-xl" className="border-0" />
                  </span>
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
                    All {store.name} offers
                  </ButtonLink>
                </div>
              </Card>
            ) : null}

            <AdSlot position="sidebar-sticky" store={store?._id} />

            <Card>
              <h3 className="mb-2 text-sm font-bold">Did not work?</h3>
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
          </aside>
        </div>
      </div>
    </>
  );
}
