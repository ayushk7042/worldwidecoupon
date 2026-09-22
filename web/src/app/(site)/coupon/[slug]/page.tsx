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

      <div className="mx-auto max-w-7xl px-4 py-8">
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
                    {coupon.verified ? <Badge tone="success">✓ Verified</Badge> : null}
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

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-faint">
                    {coupon.uses > 0 ? <span>Used {formatCount(coupon.uses)} times</span> : null}
                    <span>Added {timeAgo(coupon.createdAt)}</span>
                    {coupon.verifiedAt ? (
                      <span className="text-success-600">
                        Last checked {formatDate(coupon.verifiedAt)}
                      </span>
                    ) : null}
                    {expiry ? <span className="font-semibold">{expiry}</span> : <span>No expiry date</span>}
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
                <div className="space-y-3">
                  {related.map((item) => (
                    <CouponCard key={item._id} coupon={item} showStore={!store} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {store ? (
              <Card className="text-center">
                <StoreLogo name={store.name} logo={store.logo} size={72} className="mx-auto" />
                <h3 className="mt-3 font-bold">{store.name}</h3>
                {store.bestOffer ? (
                  <p className="mt-1 text-sm text-body">Best offer: {store.bestOffer}</p>
                ) : null}
                <ButtonLink href={`/store/${store.slug}`} variant="secondary" full className="mt-4">
                  All {store.name} offers
                </ButtonLink>
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
