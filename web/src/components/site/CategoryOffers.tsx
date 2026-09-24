"use client";

import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Crown, Flame, LayoutGrid, Truck, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/ui/icons";
import { StoreLogo } from "@/components/ui/primitives";
import { categoryColor, classNames, expiryLabel, formatCount, isUrgent, splitBadge, storeOf, tileColour } from "@/lib/format";
import type { Category, CouponView } from "@/lib/types";
import { RevealButton } from "./RevealButton";
import { SaveButton } from "./SaveButton";

export interface CategoryGroup {
  category: Pick<Category, "_id" | "name" | "slug" | "activeCouponCount" | "banner" | "color">;
  coupons: CouponView[];
}

function colorForCategory(category: Pick<Category, "name" | "color">): string {
  return categoryColor(category);
}

/**
 * Category name first, its offers underneath.
 *
 * The old grid of tiles told a shopper what we file things under; this shows
 * what is actually inside. The strip of categories scrolls, and the offers
 * swap in place rather than sending anyone to a new page.
 */
export function CategoryOffers({ groups }: { groups: CategoryGroup[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const count = groups.length;

  /* The header cycles through every category on its own, the same way the
     hero banners do — paused while a shopper's pointer is over it, or the
     tab is in the background, so it never fights with someone reading it. */
  useEffect(() => {
    if (paused || count < 2) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setInterval(() => setActive((value) => (value + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [paused, count]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!groups.length) return null;

  const current = groups[Math.min(active, groups.length - 1)]!;
  const topCoupons = current.coupons.slice(0, 2);
  const categoryTint = colorForCategory(current.category);

  const nudge = (direction: 1 | -1) => {
    strip.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  /* Drag to scroll: a trackpad can swipe the strip, a mouse could not. */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !strip.current) return;
    drag.current = { x: event.clientX, left: strip.current.scrollLeft, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !strip.current) return;
    const delta = event.clientX - drag.current.x;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    strip.current.scrollLeft = drag.current.left - delta;
  };

  const endDrag = () => {
    // A drag that moved should not also pick the chip under the cursor.
    const moved = drag.current?.moved ?? false;
    drag.current = null;
    return moved;
  };

  return (
    <section className="shell pt-12">
      {/* A bolder version of the eyebrow-plus-title pattern the rest of
          the site opens sections with — a filled pill instead of a bare
          line, and a larger title, so this reads as clearly as the
          banner and the offer card beside it do. */}
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white"
        style={{ backgroundColor: categoryTint }}
      >
        <CategoryIcon name={current.category.name} className="size-3.5" />
        Category
      </span>
      <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
        <span style={{ color: categoryTint }}>{current.category.name}</span> offers
      </h2>

      {/*
       * The banner cycles through every category on its own (paused on
       * hover, or while the tab is hidden) — its two best offers change
       * right along with it, since both come from the same `current`.
       *
       * The banner is the same 15:5 (3:1) ratio the admin panel asks
       * editors to upload at, so `object-cover` shows it with no crop and
       * no gap (box and source are the same shape).
       *
       * The text/button version is only a fallback for a category with no
       * banner uploaded yet, so the header is never blank.
       */}
      <div
        className="mt-4 rounded-[1.75rem] border p-3 sm:p-4"
        style={{
          borderColor: `${categoryTint}40`,
          backgroundColor: `color-mix(in srgb, ${categoryTint} 9%, var(--surface))`,
          backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${categoryTint} 12%, transparent), transparent 55%)`,
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_23rem]">
          {current.category.banner?.url ? (
            <Link
              href={`/category/${current.category.slug}`}
              className="group/banner relative block aspect-[15/5] w-full overflow-hidden rounded-2xl ring-1 ring-inset ring-black/5 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
              style={{ boxShadow: `0 18px 40px -22px ${categoryTint}` }}
            >
              {/* Editor-uploaded creative — a plain img, like every other brand asset. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.category.banner.url}
                alt={current.category.banner.alt ?? `${current.category.name} offers`}
                className="h-full w-full object-cover object-top transition-transform duration-700 group-hover/banner:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
              {/* A soft wash from the category colour at the left/bottom edge, so
                  the artwork's own pale background melts into the frame. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${categoryTint} 10%, transparent), transparent 22%), linear-gradient(0deg, color-mix(in srgb, ${categoryTint} 14%, transparent), transparent 24%)`,
                }}
              />
              <span
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold text-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover/banner:-translate-y-0.5"
                style={{ backgroundColor: categoryTint }}
              >
                Shop {current.category.name}
                <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover/banner:translate-x-0.5" />
              </span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-aurora p-5">
              <p className="text-sm text-body">
                {formatCount(current.category.activeCouponCount)} live offers in this aisle — pick
                another below.
              </p>

              <Link
                href={`/category/${current.category.slug}`}
                className="group mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
              >
                All {current.category.name}
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}

          {/* ---- the hot deals of this category ---- */}
          {topCoupons.length ? (
            <div className="relative flex flex-col overflow-hidden rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] ring-1 ring-inset" style={{ ["--tw-ring-color" as string]: `${categoryTint}33` }}>
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-25 blur-2xl"
                style={{ backgroundColor: categoryTint }}
              />
              <div className="relative flex items-center gap-2">
                <span
                  className="flex size-7 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: categoryTint }}
                >
                  <Flame aria-hidden className="size-3.5" />
                </span>
                <span className="text-sm font-extrabold">Hot {current.category.name} deals</span>
                <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ backgroundColor: categoryTint }}>
                  Sale
                </span>
              </div>

              <div className="relative mt-3 flex flex-1 flex-col gap-2.5">
                {topCoupons.map((coupon, index) => {
                  const store = storeOf(coupon);
                  const discount = splitBadge(coupon.badge);
                  const expiry = expiryLabel(coupon);
                  const numeric = /\d/.test(discount.lead);

                  return (
                    <Link
                      key={coupon._id}
                      href={`/coupon/${coupon.slug}`}
                      className="group/offer relative flex flex-1 items-center gap-3 rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                      style={{
                        borderColor: `${categoryTint}30`,
                        backgroundImage: `linear-gradient(100deg, color-mix(in srgb, ${categoryTint} ${index === 0 ? 12 : 7}%, var(--surface)), var(--surface) 70%)`,
                      }}
                    >
                      {index === 0 ? (
                        <span
                          className="absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white"
                          style={{ backgroundColor: categoryTint }}
                        >
                          Best deal
                        </span>
                      ) : null}

                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white p-1">
                        <StoreLogo
                          name={store?.name ?? coupon.title}
                          logo={store?.logo}
                          size={38}
                          rounded="rounded-lg"
                          className="border-0"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-body">
                          {store?.name ?? current.category.name}
                        </span>
                        <span className="line-clamp-2 text-[13px] font-bold leading-snug">
                          {coupon.title}
                        </span>
                        <span className="mt-1 flex items-center gap-2.5 text-[10px] font-semibold text-faint">
                          {coupon.verified ? (
                            <span className="flex items-center gap-1" style={{ color: categoryTint }}>
                              <CheckCircle2 aria-hidden className="size-3" />
                              Verified
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1">
                            <Clock3 aria-hidden className="size-3" />
                            {expiry ?? "No expiry"}
                          </span>
                        </span>
                      </span>

                      <span className="flex shrink-0 flex-col items-center text-center leading-none">
                        {numeric ? (
                          <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-faint">Up to</span>
                        ) : null}
                        <span className="font-display text-[1.7rem] font-extrabold" style={{ color: categoryTint }}>
                          {discount.lead}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: categoryTint }}>
                          {numeric ? discount.tail || "Off" : ""}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              <Link
                href={`/category/${current.category.slug}`}
                className="relative mt-3 flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-bold text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:brightness-110"
                style={{ backgroundColor: categoryTint }}
              >
                All {formatCount(current.category.activeCouponCount)} {current.category.name} offers
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {/* ---- the sliding strip of categories — labelled and boxed on its
          own, so it reads as "these are the categories" rather than a
          loose row of thumbnails floating under the banner. ---- */}
      <div className="mb-3 mt-5 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-[var(--shadow-card)]"
          style={{ backgroundColor: categoryTint }}
        >
          <LayoutGrid aria-hidden className="size-3.5" />
          Browse other categories
        </span>
        <span aria-hidden className="h-px min-w-8 flex-1" style={{ backgroundColor: `${categoryTint}55` }} />
        <span className="text-xs font-semibold text-faint">Tap a category to see its offers</span>
      </div>
      <div
        className="surface flex items-center gap-2 rounded-3xl border-2 p-3 shadow-[var(--shadow-card)]"
        style={{ borderColor: `${categoryTint}66`, backgroundImage: `linear-gradient(135deg, ${categoryTint}14, transparent 60%)` }}
      >
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => nudge(-1)}
          className="hidden size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] transition hover:border-brand-300 hover:text-brand-600 lg:flex"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>

        <div
          ref={strip}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="no-scrollbar flex min-w-0 flex-1 cursor-grab gap-2 overflow-x-auto scroll-smooth py-1 active:cursor-grabbing"
        >
          {groups.map((group, index) =>
            group.category.banner?.url ? (
              /* Image only, no label — the banner has to carry the name on
                 its own. Sized to the same 12:5 ratio as the big banner, so
                 nothing gets stretched or cropped oddly at this scale. A
                 colour-matched ring plus a small check badge marks the
                 active one, since there is no text to bold or underline. */
              <button
                key={group.category._id}
                type="button"
                aria-label={group.category.name}
                aria-pressed={index === active}
                onClick={() => {
                  if (drag.current?.moved) return;
                  setActive(index);
                }}
                className={classNames(
                  "relative aspect-[12/5] h-14 shrink-0 select-none overflow-hidden rounded-xl ring-offset-2 ring-offset-[var(--surface)] transition-all duration-200",
                  index === active
                    ? "ring-[3px]"
                    : "opacity-75 ring-0 hover:-translate-y-px hover:opacity-100"
                )}
                style={index === active ? { boxShadow: `0 0 0 3px ${colorForCategory(group.category)}` } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={group.category.banner.url}
                  alt={group.category.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {index === active ? (
                  <span
                    aria-hidden
                    className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-white shadow-[var(--shadow-card)]"
                    style={{ backgroundColor: colorForCategory(group.category) }}
                  >
                    <CheckCircle2 aria-hidden className="size-3" />
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                key={group.category._id}
                type="button"
                onClick={() => {
                  if (drag.current?.moved) return;
                  setActive(index);
                }}
                aria-pressed={index === active}
                className={classNames(
                  "flex shrink-0 select-none items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-all duration-200",
                  index === active
                    ? "border-transparent bg-brand-gradient text-white shadow-[var(--shadow-glow)]"
                    : "surface border-[var(--border-subtle)] text-body hover:-translate-y-px hover:border-brand-300 hover:text-brand-600"
                )}
              >
                <CategoryIcon name={group.category.name} className="size-4" />
                {group.category.name}
                <span
                  className={classNames(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                    index === active ? "bg-white/20" : "bg-[var(--surface-sunken)] text-faint"
                  )}
                >
                  {formatCount(group.category.activeCouponCount)}
                </span>
              </button>
            )
          )}
        </div>

        <button
          type="button"
          aria-label="More categories"
          onClick={() => nudge(1)}
          className="surface hidden size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition hover:border-brand-300 hover:text-brand-600 lg:flex"
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </div>

      {/* ---- six offers from the chosen category ---- */}
      <div
        key={current.category._id}
        className="mt-4 grid animate-[rise_0.3s_ease-out] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {current.coupons.slice(0, 6).map((coupon, index) => (
          <CompactOffer key={coupon._id} coupon={coupon} featured={index === 0} />
        ))}
      </div>
    </section>
  );
}

/**
 * The category rail's coupon tile — the small sibling of the homepage's big
 * "best offer" card, same idea: the image is not boxed. It sits on the
 * card's own surface at the right, shown whole (its box is the same 20:9
 * shape the admin asks images to be, so nothing is cropped) and feathered
 * into the text with a mask, so the photo's own background becomes the
 * card's background there.
 *
 * With no image uploaded, the store's mark stands in on a soft tint —
 * never a stock photo for a product the offer may not cover.
 */
export function CompactOffer({ coupon, featured = false }: { coupon: CouponView; featured?: boolean }) {
  const store = storeOf(coupon);
  const expiry = expiryLabel(coupon);
  const discount = splitBadge(coupon.badge);
  const urgent = isUrgent(coupon);
  const fade = "var(--feather-compact)";

  return (
    <article
      className={classNames(
        "group relative flex overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
        featured
          ? "border-accent-200/70 bg-gradient-to-r from-accent-100/70 to-[var(--surface)] hover:border-accent-300 dark:border-accent-600/40 dark:from-accent-600/20 dark:to-[var(--surface)]"
          : "surface border-[var(--border-subtle)] hover:border-brand-300"
      )}
    >
      <div className="relative z-10 flex w-[60%] min-w-0 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StoreLogo name={store?.name ?? coupon.title} logo={store?.logo} size={32} rounded="rounded-lg" className="border-0" />
          <span className="truncate text-sm font-bold text-body">{store?.name ?? "Featured"}</span>
          {featured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              <Crown aria-hidden className="size-3" />
              Most popular
            </span>
          ) : null}
        </div>

        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-2 shrink-0 text-[15px] font-bold leading-snug text-[var(--text-primary)] transition hover:text-brand-700 dark:hover:text-brand-300"
        >
          {coupon.title}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-faint">
          {coupon.verified ? (
            <span className="flex items-center gap-1 text-success-600 dark:text-success-500">
              <CheckCircle2 aria-hidden className="size-3.5" />
              Verified
            </span>
          ) : null}
          <span className="flex items-center gap-1">
            <Clock3 aria-hidden className="size-3.5" />
            {expiry ?? "No expiry"}
          </span>
          {urgent ? (
            <span className="flex items-center gap-1 text-danger-600 dark:text-danger-500">
              <Zap aria-hidden className="size-3.5" />
              Limited time
            </span>
          ) : coupon.type === "freeshipping" ? (
            <span className="flex items-center gap-1">
              <Truck aria-hidden className="size-3.5" />
              Free shipping
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <RevealButton coupon={coupon} size="md" pill label={coupon.hasCode ? "Get code" : "Get deal"} />
        </div>
      </div>

      {/* Discount tag in the corner the image leaves free. */}
      <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-gradient px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-[var(--shadow-glow)]">
        {discount.tail ? `${discount.lead} ${discount.tail}` : discount.lead}
      </span>

      {/* 20:9 like every uploaded image, so it shows whole; fades out on its
          left and top edges into the card, so there's no box to see. */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 aspect-[20/9] w-[64%]"
        style={{
          maskImage: fade,
          WebkitMaskImage: fade,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      >
        {coupon.image?.url ? (
          // Editor-uploaded creative — a plain img, like every other brand asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coupon.image.url}
            alt={coupon.image.alt ?? coupon.title}
            className="absolute inset-0 h-full w-full object-cover saturate-[1.15] contrast-[1.05]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 to-accent-100/50 dark:from-brand-950/40 dark:to-brand-900/20">
            <StoreLogo name={store?.name ?? coupon.title} logo={store?.logo} size={48} rounded="rounded-xl" />
          </div>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   TODAY'S BEST OFFERS — MAIN + SIDE

   One hand-picked coupon shown big, its own real image and a reddish
   (accent) card to set it apart, next to four smaller store-logo-only
   cards. Both used only by the homepage's "Today's best offers" grid.
========================================================= */

/**
 * The big pick. Its image is not boxed: it sits straight on the card's own
 * reddish background, shown in full (`object-contain`, never cropped) and
 * feathered into the text side with a mask, so a transparent product cut-out
 * — the best thing to upload — looks like part of the card.
 */
export function BestOfferMain({ coupon }: { coupon: CouponView }) {
  const store = storeOf(coupon);
  const discount = splitBadge(coupon.badge);
  const expiry = expiryLabel(coupon);
  const fade = "var(--feather-main)";

  return (
    <article className="relative isolate flex flex-col overflow-hidden rounded-3xl border border-accent-200/70 bg-gradient-to-br from-accent-100 via-accent-50 to-accent-100/60 shadow-[var(--shadow-card)] sm:min-h-[320px] dark:border-accent-600/25 dark:from-accent-600/15 dark:via-[var(--surface)] dark:to-accent-600/10">
      <div className="relative z-10 flex flex-1 flex-col justify-center gap-3 p-6 sm:w-[52%] sm:flex-none sm:p-7">
        <div className="flex items-center gap-3">
          <StoreLogo
            name={store?.name ?? coupon.title}
            logo={store?.logo}
            size={52}
            rounded="rounded-2xl"
            className="border-2 border-white shadow-[var(--shadow-card)]"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-accent-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
                {coupon.hasCode ? "Code" : "Deal"}
              </span>
              {coupon.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
                  <CheckCircle2 aria-hidden className="size-3" />
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm font-bold text-body">{store?.name ?? "Featured"}</p>
          </div>
        </div>

        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-3 font-display text-xl font-extrabold leading-snug text-[var(--text-primary)] transition hover:text-accent-600 dark:hover:text-accent-400 sm:text-2xl"
        >
          {coupon.title}
        </Link>

        {coupon.description ? (
          <p className="line-clamp-3 text-sm text-body">{coupon.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {discount.tail ? (
            <span className="font-display text-lg font-extrabold leading-none text-accent-600 dark:text-accent-400">
              {discount.lead} {discount.tail}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-xs font-semibold text-faint">
            <Clock3 aria-hidden className="size-3.5" />
            {expiry ?? "No expiry"}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3">
          <RevealButton coupon={coupon} size="lg" pill label={coupon.hasCode ? "Get code" : "Get deal"} />
          <span className="flex size-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <SaveButton couponId={coupon._id} />
          </span>
        </div>
      </div>

      <div
        className="relative min-h-[260px] sm:absolute sm:inset-y-0 sm:right-0 sm:min-h-0 sm:w-[56%]"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {coupon.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coupon.image.url}
            alt={coupon.image.alt ?? coupon.title}
            className="absolute inset-0 h-full w-full object-contain object-center p-1 saturate-[1.15] contrast-[1.05] drop-shadow-[0_18px_28px_rgba(212,63,63,0.25)]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-8">
            <StoreLogo name={store?.name ?? coupon.title} logo={store?.logo} size={104} rounded="rounded-2xl" />
          </div>
        )}
      </div>
    </article>
  );
}

/** One of the four small picks beside the big one — store logo only, no
 *  product photo, so it reads as a fast, scannable list next to the hero
 *  pick rather than four more images competing with it. */
export function BestOfferSide({ coupon }: { coupon: CouponView }) {
  const store = storeOf(coupon);
  const discount = splitBadge(coupon.badge);
  const expiry = expiryLabel(coupon);
  const urgent = isUrgent(coupon);

  return (
    <article className="surface flex flex-col gap-2 rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StoreLogo name={store?.name ?? coupon.title} logo={store?.logo} size={32} rounded="rounded-lg" className="border-0" />
          <span className="truncate text-sm font-bold text-body">{store?.name ?? "Featured"}</span>
        </div>
        <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-extrabold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
          {discount.lead} {discount.tail}
        </span>
      </div>

      <Link
        href={`/coupon/${coupon.slug}`}
        className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)] transition hover:text-brand-700 dark:hover:text-brand-300"
      >
        {coupon.title}
      </Link>

      {coupon.description ? <p className="line-clamp-2 text-xs text-faint">{coupon.description}</p> : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <RevealButton coupon={coupon} size="sm" pill label={coupon.hasCode ? "Get code" : "Get deal"} />
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-faint">
          {urgent ? (
            <Zap aria-hidden className="size-3.5 text-danger-600 dark:text-danger-500" />
          ) : (
            <Clock3 aria-hidden className="size-3.5" />
          )}
          {expiry ?? "No expiry"}
        </span>
      </div>
    </article>
  );
}
