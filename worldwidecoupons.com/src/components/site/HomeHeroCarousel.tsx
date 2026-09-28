"use client";

import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { StoreLogo } from "@/components/ui/primitives";
import { classNames, descriptionLines, splitBadge, storeOf } from "@/lib/format";
import type { CouponView, HomepageBanner } from "@/lib/types";

const INTERVAL = 5500;

/** Alternating washes for the slides built from real offers, not artwork. */
const TINTS = [
  "linear-gradient(120deg, var(--color-brand-100), var(--color-accent-100) 85%)",
  "linear-gradient(120deg, var(--color-accent-100), var(--color-brand-50) 85%)",
  "linear-gradient(120deg, var(--color-brand-50), var(--color-brand-200) 85%)",
];

type Slide =
  | { kind: "banner"; key: string; banner: HomepageBanner }
  | { kind: "offer"; key: string; coupon: CouponView };

/**
 * The homepage hero: a peek carousel — the next slide's edge stays visible so
 * a shopper always knows there is more to scroll to.
 *
 * An editor's uploaded banner (real campaign artwork) always wins. Without
 * one, a slide is built from a real featured offer instead of a stock photo —
 * honest about what is actually on the page.
 */
export function HomeHeroCarousel({
  banners,
  spotlight,
}: {
  banners: HomepageBanner[];
  spotlight: CouponView[];
}) {
  const slides: Slide[] = banners.length
    ? banners.map((banner, i) => ({ kind: "banner", key: `banner-${i}`, banner }))
    : spotlight.slice(0, 4).map((coupon) => ({ kind: "offer", key: coupon._id, coupon }));

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => {
    setIndex(((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setInterval(() => setIndex((value) => (value + 1) % count), INTERVAL);
    return () => clearInterval(timer);
  }, [paused, count]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!count) return null;

  const nextSlide = slides[(index + 1) % count]!;
  const nextTint =
    nextSlide.kind === "banner" && nextSlide.banner.background
      ? nextSlide.banner.background
      : TINTS[(index + 1) % TINTS.length]!;

  return (
    <div
      className="relative flex items-stretch gap-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="group relative min-w-0 flex-1 overflow-hidden rounded-[1.75rem] shadow-[0_28px_60px_-30px_rgba(31,41,55,0.55)] ring-1 ring-ink-900/10 dark:ring-white/15"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX ?? null;
          touchStart.current = null;
          if (start === null || end === null || Math.abs(end - start) < 40) return;
          go(end < start ? index + 1 : index - 1);
        }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, position) => (
            <div key={slide.key} className="h-[210px] w-full shrink-0 sm:h-[260px] lg:h-[320px]" aria-hidden={position !== index}>
              <SlideBody slide={slide} tint={TINTS[position % TINTS.length]!} />
            </div>
          ))}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-800 opacity-0 shadow-[var(--shadow-lift)] ring-1 ring-ink-900/5 backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white group-hover:opacity-100 focus-visible:opacity-100 sm:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-5">
                <path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-800 opacity-0 shadow-[var(--shadow-lift)] ring-1 ring-ink-900/5 backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white group-hover:opacity-100 focus-visible:opacity-100 sm:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-5">
                <path d="m10 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
              {slides.map((slide, position) => (
                <button
                  key={slide.key}
                  type="button"
                  aria-label={`Go to slide ${position + 1}`}
                  aria-current={position === index}
                  onClick={() => go(position)}
                  className={classNames(
                    "h-2 rounded-full backdrop-blur transition-all duration-300",
                    position === index
                      ? "w-7 bg-brand-gradient shadow-[var(--shadow-glow)]"
                      : "w-2 bg-white/70 ring-1 ring-ink-900/10 hover:w-3 hover:bg-white"
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* The next slide's edge, so a shopper always sees there is more — just
          a soft hint of its colour, not a jumble of half-cropped text. */}
      {count > 1 ? (
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next slide"
          className="relative hidden w-12 shrink-0 overflow-hidden rounded-[1.75rem] ring-1 ring-ink-900/10 transition-opacity hover:opacity-90 lg:block"
          style={{ background: nextTint }}
        >
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-2xl"
          />
          <span className="absolute inset-0 bg-gradient-to-l from-transparent to-white/50 dark:to-black/40" />
        </button>
      ) : null}
    </div>
  );
}

function SlideBody({ slide, tint, decorative }: { slide: Slide; tint: string; decorative?: boolean }) {
  if (slide.kind === "banner") {
    const banner = slide.banner;
    const desktop = banner.image?.url;
    const mobile = banner.mobileImage?.url ?? desktop;

    const body = (
      <div
        className="relative flex h-full w-full items-center overflow-hidden"
        style={{ background: banner.background || tint }}
      >
        {desktop ? (
          <picture className="block h-full w-full">
            <source media="(min-width: 640px)" srcSet={desktop} />
            {/* Editor-uploaded campaign artwork — a plain img, not a Cloudinary-only asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mobile}
              alt={banner.image?.alt ?? banner.title ?? ""}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </picture>
        ) : (
          <div className="flex h-full w-full flex-col justify-center gap-2 px-6 sm:px-12">
            {banner.title ? (
              <h2 className="font-display text-xl font-extrabold text-ink-800 sm:text-3xl">{banner.title}</h2>
            ) : null}
            {banner.subtitle ? <p className="max-w-lg text-sm text-ink-600 sm:text-base">{banner.subtitle}</p> : null}
            {banner.ctaLabel ? (
              <span className="mt-1 inline-flex w-fit items-center rounded-full bg-brand-gradient px-5 py-2 text-sm font-bold text-white">
                {banner.ctaLabel}
              </span>
            ) : null}
          </div>
        )}
      </div>
    );

    if (decorative || !banner.link) return body;

    return banner.link.startsWith("http") ? (
      <a href={banner.link} target="_blank" rel="noopener noreferrer sponsored" className="block h-full">
        {body}
      </a>
    ) : (
      <Link href={banner.link} className="block h-full">
        {body}
      </Link>
    );
  }

  const coupon = slide.coupon;
  const store = storeOf(coupon);
  const discount = splitBadge(coupon.badge);
  const line = descriptionLines(coupon.description, 1)[0];

  const inner = (
    <div className="relative flex h-full w-full items-center overflow-hidden" style={{ background: tint }}>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-56 rounded-full bg-white/30 blur-3xl dark:bg-white/10"
      />

      <div className="relative min-w-0 flex-1 px-6 py-5 sm:px-10 lg:px-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-700 shadow-sm backdrop-blur dark:bg-ink-900/40 dark:text-white">
          <Flame aria-hidden className="size-3.5 text-accent-500" />
          Top deal of the week
        </span>

        <h2 className="mt-3 font-display text-xl font-extrabold leading-tight text-ink-900 sm:text-3xl lg:text-[2.1rem] dark:text-white">
          {store?.name ?? "Featured offer"}
          <br className="hidden sm:block" />
          <span className="text-brand-700 dark:text-brand-300"> Up to {discount.lead} off</span>
        </h2>

        {line ? (
          <p className="mt-2 max-w-md truncate text-sm text-ink-600 sm:text-base dark:text-white/70">{line}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mt-5">
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-gradient px-5 text-sm font-bold text-white shadow-[var(--shadow-glow)] sm:h-11">
            Get coupon
            <ArrowRight aria-hidden className="size-4" />
          </span>
          <span className="text-sm font-bold text-ink-700 underline-offset-4 dark:text-white/85">
            View details →
          </span>
        </div>
      </div>

      <div className="relative hidden shrink-0 items-center justify-center px-8 sm:flex lg:px-12">
        <span
          aria-hidden
          className="absolute size-32 rounded-full bg-white/50 blur-2xl dark:bg-white/10"
        />
        <StoreLogo
          name={store?.name ?? coupon.title}
          logo={store?.logo}
          size={104}
          rounded="rounded-3xl"
          className="relative shadow-[var(--shadow-lift)]"
        />
        <span className="absolute -right-1 -top-3 flex size-16 rotate-6 flex-col items-center justify-center rounded-2xl bg-brand-gradient text-center text-white shadow-[var(--shadow-lift)] sm:size-20">
          <span className="text-[8px] font-bold uppercase tracking-wide text-white/80">Up to</span>
          <span className="font-display text-base font-extrabold leading-none sm:text-lg">{discount.lead}</span>
        </span>
      </div>
    </div>
  );

  if (decorative) return inner;

  return (
    <Link href={`/coupon/${coupon.slug}`} className="block h-full">
      {inner}
    </Link>
  );
}
