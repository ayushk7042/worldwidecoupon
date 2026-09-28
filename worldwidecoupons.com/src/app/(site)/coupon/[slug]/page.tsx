import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BadgeCheck,
  ChevronDown,
  Clock,
  Copy,
  Globe2,
  Headphones,
  Mail,
  Percent,
  Search as SearchIcon,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store as StoreIcon,
  Tag,
  Ticket,
  Truck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { FilterGroup, FilterLink } from "@/components/site/FilterParts";
import { StoreSignup } from "@/components/site/NewsletterBar";
import { oneOf, withParams, type OfferParams } from "@/components/site/OfferFilters";
import { RevealButton } from "@/components/site/RevealButton";
import { FollowStoreButton } from "@/components/site/SaveButton";
import { SortSelect } from "@/components/site/SortSelect";
import { StoreOfferRow } from "@/components/site/StoreOfferRow";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Pagination, StoreLogo } from "@/components/ui/primitives";
import { api, apiPaged, apiSafe } from "@/lib/api";
import {
  brandThemeVars,
  categoryColor,
  classNames,
  descriptionLines,
  expiryLabel,
  formatCount,
  splitBadge,
  storeOf,
  timeAgo,
} from "@/lib/format";
import { JsonLd, breadcrumbSchema, couponSchema } from "@/lib/schema";
import type { Category, CouponView } from "@/lib/types";

export const revalidate = 300;

async function loadCoupon(slug: string): Promise<CouponView | null> {
  try {
    return await api<CouponView>(`/coupons/${encodeURIComponent(slug)}`, { revalidate: 300, tags: ["homepage"] });
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

const PER_PAGE = 8;

const PRICE_RANGES = [
  { value: "under100", label: "Under $100", test: (n: number) => n < 100 },
  { value: "100-300", label: "$100 – $300", test: (n: number) => n >= 100 && n < 300 },
  { value: "300-500", label: "$300 – $500", test: (n: number) => n >= 300 && n < 500 },
  { value: "500plus", label: "$500+", test: (n: number) => n >= 500 },
] as const;

const SORTS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest first" },
  { value: "expiring", label: "Ending soonest" },
  { value: "popular", label: "Most used" },
  { value: "discount", label: "Biggest saving" },
];

export default async function CouponPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<OfferParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const coupon = await loadCoupon(slug);

  if (!coupon) notFound();

  const store = storeOf(coupon);

  const base = `/coupon/${coupon.slug}`;
  const show = oneOf(query.show);
  const offer = oneOf(query.offer);
  const price = oneOf(query.price);
  const sort = oneOf(query.sort) ?? "best";
  const expiringSoon = oneOf(query.expiringSoon);
  const exclusive = oneOf(query.exclusive);
  const top = oneOf(query.top);
  const page = Math.max(1, Number(oneOf(query.page) ?? 1) || 1);
  const href = (patch: Record<string, string | undefined>) => withParams(base, query, patch);

  const withCode =
    show === "codes" ? true : show === "deals" ? false : offer === "code" ? true : offer === "nocode" ? false : undefined;
  const type = ["freeshipping", "bogo", "cashback", "giftcard"].includes(offer ?? "") ? offer : undefined;

  const emptyList = [] as CouponView[];
  const [siblings, similar] = await Promise.all([
    store
      ? apiSafe<CouponView[]>("/coupons", emptyList, {
          query: {
            store: store.slug,
            limit: 100,
            sort,
            ...(withCode !== undefined ? { withCode } : {}),
            ...(type ? { type } : {}),
            ...(expiringSoon === "true" ? { expiringSoon: true } : {}),
            ...(exclusive === "true" ? { exclusive: true } : {}),
          },
          revalidate: 300,
        })
      : Promise.resolve(emptyList),
    store
      ? apiSafe<CouponView[]>("/coupons", emptyList, {
          query: { store: store.slug, limit: 6, sort: "discount" },
          revalidate: 600,
        })
      : Promise.resolve(emptyList),
  ]);

  const range = PRICE_RANGES.find((item) => item.value === price);
  const matching = siblings.filter((item) => {
    if (range && !(item.discountType === "fixed" && item.discountValue !== undefined && range.test(item.discountValue))) {
      return false;
    }
    if (top === "true" && !(item.successRate !== null && item.successRate >= 80)) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(matching.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = matching.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const anyFilter = Boolean(show || offer || price || expiringSoon || exclusive || top);

  const expiry = expiryLabel(coupon);
  const lines = descriptionLines(coupon.description, 10);
  const discount = splitBadge(coupon.badge);
  const numeric = /\d/.test(discount.lead);
  const upTo = coupon.discountType === "percent" || coupon.discountType === "fixed";

  /* The offer's colour: its store's brand colour, else its first category's. */
  const firstCategory = (coupon.categories ?? []).find(
    (entry): entry is Category => typeof entry === "object" && entry !== null
  );
  const tint = store?.brandColor || (firstCategory ? categoryColor(firstCategory) : "#1f9059");

  const trail = [
    { label: "Home", href: "/" },
    { label: "Stores", href: "/stores" },
    ...(store ? [{ label: store.name, href: `/store/${store.slug}` }] : []),
    { label: coupon.title },
  ];

  const chips = [
    { Icon: Percent, title: numeric ? `${upTo ? "Up to " : ""}${coupon.badge}` : coupon.badge, body: "On selected items" },
    { Icon: Truck, title: coupon.type === "freeshipping" ? "Free shipping" : "Free shipping", body: "On most orders" },
    { Icon: ShieldCheck, title: coupon.verified ? "Verified deal" : "Checked deal", body: "100% working" },
    { Icon: Clock, title: expiry ?? "Limited time", body: expiry ? "Offer ends" : "Don't miss out" },
  ];

  const promises = [
    { Icon: Percent, title: "Verified coupons", body: "100% working deals" },
    { Icon: Globe2, title: "Global brands", body: "Top stores worldwide" },
    { Icon: Zap, title: "Save big", body: numeric ? `${upTo ? "Up to " : ""}${coupon.badge.toLowerCase()}` : "Best prices" },
    { Icon: ShieldCheck, title: "Safe & secure", body: "Trusted by millions" },
  ];

  const steps = coupon.hasCode
    ? [
        { title: "Find a deal", body: "Browse offers from your favourite store." },
        { title: "Copy the code", body: "Grab the promo code with one click." },
        { title: "Shop & save", body: "Use it at checkout and enjoy the discount." },
      ]
    : [
        { title: "Find a deal", body: "Browse offers from your favourite store." },
        { title: "Open the deal", body: "The discount is already applied — no code." },
        { title: "Shop & save", body: "Check the total and enjoy the discount." },
      ];

  const wash = (pct: number) => `color-mix(in srgb, ${tint} ${pct}%, #ffffff)`;

  return (
    <div
      className="pb-2"
      style={{
        ...brandThemeVars(tint),
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${tint} 8%, transparent) 0%, color-mix(in srgb, ${tint} 4%, transparent) 50%, transparent 100%)`,
      }}
    >
      <JsonLd data={[couponSchema(coupon), breadcrumbSchema(trail)]} />

      <div className="shell pt-5">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-body">
          {trail.map((item, index) => (
            <span key={item.label} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {item.href ? (
                <Link href={item.href} className="transition hover:text-brand-600">
                  {item.label}
                </Link>
              ) : (
                <span className="line-clamp-1 font-medium text-[var(--text-primary)]">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {/* ================= header ================= */}
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section
            className="relative overflow-hidden rounded-3xl border p-5 text-ink-900 sm:p-7"
            style={{
              borderColor: wash(30),
              backgroundImage: `linear-gradient(100deg, ${wash(8)} 0%, ${wash(15)} 55%, ${wash(22)} 100%)`,
            }}
          >
            {/* The offer's own picture, at the right of the header: no box, its
                background melting into the header's colour. */}
            {coupon.image?.url ? (
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] items-end justify-end lg:flex">
                {/* Editor-uploaded creative — a plain img, like every other brand asset.
                    Mask and blend both sit on the img (a masked parent would isolate the blend);
                    no crop: it is as tall as the header at most and never wider than its column. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coupon.image.url}
                  alt={coupon.image.alt ?? coupon.title}
                  className="block h-full max-w-full object-contain object-right-bottom mix-blend-multiply brightness-[1.08] saturate-[1.1]"
                  style={{
                    aspectRatio:
                      coupon.image.width && coupon.image.height
                        ? `${coupon.image.width} / ${coupon.image.height}`
                        : undefined,
                    maskImage:
                      "linear-gradient(to right, transparent 0%, #000 26%, #000 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 16%, #000 100%)",
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, #000 26%, #000 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 16%, #000 100%)",
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in",
                  }}
                />
              </div>
            ) : numeric ? (
              <div className="pointer-events-none absolute inset-y-0 right-10 hidden w-[34%] flex-col items-center justify-center text-center lg:flex">
                <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-brand-600">{upTo ? "Up to" : "Save"}</span>
                <span className="font-display text-7xl font-extrabold leading-none text-brand-600">{discount.lead}</span>
                <span className="text-xl font-extrabold uppercase tracking-[0.2em] text-brand-600">{discount.tail || "Off"}</span>
              </div>
            ) : null}

            <div className="relative flex flex-col gap-5 sm:flex-row lg:max-w-[62%]">
              {store ? (
                <Link
                  href={`/store/${store.slug}`}
                  aria-label={`${store.name} offers`}
                  className="flex size-28 shrink-0 items-center justify-center self-start rounded-3xl border border-[var(--border-subtle)] bg-white p-3 shadow-[var(--shadow-card)]"
                >
                  <StoreLogo name={store.name} logo={store.logo} size={92} rounded="rounded-2xl" className="border-0" />
                </Link>
              ) : null}

              <div className="min-w-0">
                {store ? (
                  <>
                    {store.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
                        <BadgeCheck aria-hidden className="size-3" />
                        Verified store
                      </span>
                    ) : coupon.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
                        <BadgeCheck aria-hidden className="size-3" />
                        Verified deal
                      </span>
                    ) : null}
                    <p className="mt-1 font-display text-xl font-extrabold">{store.name}</p>
                  </>
                ) : null}

                <h1 className="mt-0.5 font-display text-2xl font-extrabold leading-tight sm:text-[1.75rem] lg:text-[2rem]">
                  {coupon.title}
                </h1>

                {lines[0] ? (
                  <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-700 sm:text-[15px]">{lines[0]}</p>
                ) : null}
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 lg:max-w-[56%] lg:flex-nowrap">
              {chips.map((chip) => (
                <span key={chip.title} className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <chip.Icon aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-ink-900">{chip.title}</span>
                    <span className="block text-[11px] text-ink-600">{chip.body}</span>
                  </span>
                </span>
              ))}
            </div>
          </section>

          {/* ---- action panel ---- */}
          <aside className="flex flex-col justify-center gap-3 rounded-3xl border border-brand-200/60 bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="rounded-2xl bg-brand-gradient px-4 py-4 text-center text-white shadow-[var(--shadow-glow)]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/85">
                {coupon.hasCode ? "Coupon code" : "Deal price"}
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold leading-none">{discount.lead}</p>
              {discount.tail ? (
                <p className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">{discount.tail}</p>
              ) : null}
            </div>

            <RevealButton coupon={coupon} size="lg" full pill label={coupon.hasCode ? "Get code" : "Get deal"} />
            {store ? (
              <FollowStoreButton storeId={store._id} storeName={store.name} />
            ) : null}
            <p className="text-center text-[11px] text-faint">
              Checked {coupon.verifiedAt ? timeAgo(coupon.verifiedAt) : timeAgo(coupon.updatedAt)}
            </p>
          </aside>
        </div>

        <AdSlot position="coupon-top" store={store?._id} className="mt-4" />

        {/* ================= promises ================= */}
        <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                <item.Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="block truncate text-xs text-faint">{item.body}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= body ================= */}
      <div className="shell py-5">
        <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] xl:grid-cols-[15.5rem_minmax(0,1fr)_18rem]">
          {/* ---- filters ---- */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <details className="group/filters" open>
              <summary className="surface mb-3 flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm font-bold shadow-[var(--shadow-card)] marker:hidden lg:hidden">
                <SlidersHorizontal aria-hidden className="size-4 text-brand-600" />
                Filter offers
                <ChevronDown aria-hidden className="ml-auto size-4 text-faint" />
              </summary>

              <div className="surface overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
                <h2 className="hidden items-center gap-2.5 px-4 py-3.5 font-display text-base font-extrabold lg:flex">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                    <SlidersHorizontal aria-hidden className="size-4" />
                  </span>
                  Filter offers
                  {anyFilter ? (
                    <Link href={base} className="ml-auto text-[11px] font-bold text-brand-600 hover:underline">
                      Clear all
                    </Link>
                  ) : null}
                </h2>

                <FilterGroup title="Offer type" clearHref={offer ? href({ offer: undefined }) : undefined}>
                  <FilterLink href={href({ offer: undefined })} active={!offer}>All offers</FilterLink>
                  <FilterLink href={href({ offer: "code" })} active={offer === "code"}>Promo codes</FilterLink>
                  <FilterLink href={href({ offer: "nocode" })} active={offer === "nocode"}>Deals</FilterLink>
                  <FilterLink href={href({ offer: "freeshipping" })} active={offer === "freeshipping"}>Free shipping</FilterLink>
                  <FilterLink href={href({ offer: "cashback" })} active={offer === "cashback"}>Cashback</FilterLink>
                  <FilterLink href={href({ offer: "giftcard" })} active={offer === "giftcard"}>Gift card</FilterLink>
                </FilterGroup>

                <FilterGroup title="Price range" clearHref={price ? href({ price: undefined }) : undefined}>
                  {PRICE_RANGES.map((item) => (
                    <FilterLink
                      key={item.value}
                      href={href({ price: price === item.value ? undefined : item.value })}
                      active={price === item.value}
                    >
                      {item.label}
                    </FilterLink>
                  ))}
                </FilterGroup>

                <FilterGroup
                  title="Highlights"
                  clearHref={
                    expiringSoon || exclusive || top
                      ? href({ expiringSoon: undefined, exclusive: undefined, top: undefined })
                      : undefined
                  }
                >
                  <FilterLink href={href({ expiringSoon: expiringSoon === "true" ? undefined : "true" })} active={expiringSoon === "true"}>
                    Ending this week
                  </FilterLink>
                  <FilterLink href={href({ exclusive: exclusive === "true" ? undefined : "true" })} active={exclusive === "true"}>
                    Exclusive to us
                  </FilterLink>
                  <FilterLink href={href({ top: top === "true" ? undefined : "true" })} active={top === "true"}>
                    Top rated
                  </FilterLink>
                </FilterGroup>
              </div>
            </details>
          </aside>

          {/* ---- offers ---- */}
          <div className="min-w-0">
            <div className="surface mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-subtle)] p-2.5 shadow-[var(--shadow-card)]">
              {[
                { value: undefined, label: "All offers", count: siblings.length },
                { value: "codes", label: "Promo codes", count: siblings.filter((item) => item.hasCode).length },
                { value: "deals", label: "Deals", count: siblings.filter((item) => !item.hasCode).length },
              ].map((tab) => (
                <Link
                  key={tab.label}
                  href={href({ show: tab.value })}
                  className={classNames(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition",
                    show === tab.value
                      ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                      : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50"
                  )}
                >
                  {tab.label}
                  <span
                    className={classNames(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                      show === tab.value ? "bg-white/25" : "bg-[var(--surface-sunken)] text-faint"
                    )}
                  >
                    {formatCount(tab.count)}
                  </span>
                </Link>
              ))}

              <div className="ml-auto">
                <SortSelect
                  value={sort}
                  options={SORTS.map((option) => ({
                    ...option,
                    href: href({ sort: option.value === "best" ? undefined : option.value }),
                  }))}
                />
              </div>
            </div>

            {visible.length ? (
              <div className="space-y-3">
                {visible.map((item) => (
                  <StoreOfferRow key={item._id} coupon={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Tag aria-hidden className="size-7" strokeWidth={1.7} />}
                title="Nothing matches those filters"
                body="Try removing a filter, or see every live offer from this store."
                action={<ButtonLink href={base}>All offers</ButtonLink>}
              />
            )}

            <Pagination
              page={current}
              pages={pages}
              hrefFor={(next) => withParams(base, query, { page: next === 1 ? undefined : String(next) })}
            />

            <AdSlot position="coupon-inline" store={store?._id} className="mt-4" />

            {/* how to use this deal */}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50 via-brand-50 to-brand-100/70 p-4 dark:border-brand-700/40 dark:from-brand-900/45 dark:via-brand-950/60 dark:to-brand-900/30">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-[var(--shadow-glow)]">
                  <Sparkles aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold">How to use this {coupon.hasCode ? "code" : "deal"}</p>
                  <p className="text-xs text-body">Follow these simple steps to save on your purchase.</p>
                </div>
              </div>
              <ol className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-3">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-xs font-bold">{step.title}</span>
                      <span className="block text-[11px] text-body">{step.body}</span>
                    </span>
                    {index < steps.length - 1 ? <ArrowRight aria-hidden className="ml-2 hidden size-4 text-brand-500 sm:block" /> : null}
                  </li>
                ))}
              </ol>
            </div>

            {coupon.terms ? (
              <details className="group surface mt-4 rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-base font-bold marker:hidden">
                  Terms &amp; conditions
                  <ChevronDown aria-hidden className="size-4 text-faint transition-transform group-open:rotate-180" />
                </summary>
                <div
                  className="prose-offer border-t border-[var(--border-subtle)] p-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: coupon.terms }}
                />
              </details>
            ) : null}
          </div>

          {/* ---- right column ---- */}
          <aside className="space-y-4 lg:col-span-2 xl:col-span-1 xl:sticky xl:top-28 xl:self-start">
            {store ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white p-1">
                    <StoreLogo name={store.name} logo={store.logo} size={40} rounded="rounded-lg" className="border-0" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-base font-extrabold">About {store.name}</p>
                    {store.bestOffer ? (
                      <p className="flex items-center gap-1 text-xs font-semibold text-faint">
                        <Star aria-hidden className="size-3.5 fill-warn-500 text-warn-500" />
                        Best right now · {store.bestOffer}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-body">
                  {store.tagline || store.description || `Every live ${store.name} coupon and deal, checked before it goes on the page.`}
                </p>
                <Link href={`/store/${store.slug}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline">
                  Visit store
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </section>
            ) : null}

            {store && similar.filter((item) => item._id !== coupon._id).length ? (
              <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="font-display text-base font-extrabold">Popular at {store.name}</h2>
                  <Link href={`/store/${store.slug}`} className="ml-auto text-xs font-bold text-brand-600 hover:underline">View all →</Link>
                </div>
                <ul>
                  {similar
                    .filter((item) => item._id !== coupon._id)
                    .slice(0, 4)
                    .map((item) => (
                      <li key={item._id}>
                        <Link
                          href={`/coupon/${item.slug}`}
                          className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
                        >
                          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white">
                            {item.image?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <StoreLogo name={store.name} logo={store.logo} size={36} rounded="rounded-md" className="border-0" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-sm font-bold">{item.title.split(/\s[–-]\s/)[0]}</span>
                            <span className="block text-[11px] text-faint">{item.badge}</span>
                          </span>
                          <ArrowRight aria-hidden className="size-4 shrink-0 text-faint" />
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}

            <StoreSignup storeName={store?.name ?? "WorldwideCoupons"} compact />

            <AdSlot position="sidebar-sticky" store={store?._id} />

            <section className="surface rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
                <AlertTriangle aria-hidden className="size-4 text-accent-500" />
                Did not work?
              </h3>
              <p className="mb-3 text-sm text-body">Tell us and we will pull it. Codes expire without warning.</p>
              <ButtonLink href={`/contact?topic=broken-coupon&coupon=${coupon._id}`} variant="secondary" size="sm" full>
                Report this offer
              </ButtonLink>
            </section>
          </aside>
        </div>
      </div>

      {/* The hero button scrolls away on a phone, so the offer keeps a button. */}
      <div className="sticky bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 px-4 py-3 shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.4)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold">{coupon.badge}</span>
            <span className="block truncate text-[11px] text-faint">{store ? store.name : "Tap to open"}</span>
          </span>
          <RevealButton coupon={coupon} size="md" pill />
        </div>
      </div>
    </div>
  );
}
