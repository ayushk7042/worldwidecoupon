"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { classNames } from "@/lib/format";
import type { HomepageBanner } from "@/lib/types";

const INTERVAL = 5000;

/**
 * The compact banner carousel that opens the homepage.
 *
 * The artwork carries the message, so a slide is an image first and text only
 * when no image was uploaded. Autoplay stops while the pointer is over it,
 * while it is off-screen, and for anyone who asked for reduced motion.
 */
export function HeroBanners({
  banners,
  aside,
  bare,
  height = "default",
  tone = "light",
  frameClassName,
}: {
  banners: HomepageBanner[];
  /** Sits beside the carousel on large screens — the hero ad slot. */
  aside?: ReactNode;
  /** Renders just the carousel, for callers that supply their own section. */
  bare?: boolean;
  height?: "default" | "tall" | "ratio";
  /** `dark` drops the card chrome, for the carousel sitting inside the hero. */
  tone?: "light" | "dark";
  /** Extra classes for the frame, so a caller can restyle the card. */
  frameClassName?: string;
}) {
  const slides = banners.filter((banner) => banner.image?.url || banner.title);

  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const paused = hover || hidden || userPaused;
  const container = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number | null>(null);

  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (paused || count < 2) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setInterval(() => setIndex((value) => (value + 1) % count), INTERVAL);
    return () => clearInterval(timer);
  }, [paused, count]);

  // A carousel spinning in a background tab is wasted work.
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!count) return null;

  const frame = (
      <div
        ref={container}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocusCapture={() => setHover(true)}
        onBlurCapture={() => setHover(false)}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX ?? null;
          touchStart.current = null;
          if (start === null || end === null) return;
          if (Math.abs(end - start) < 40) return;
          go(end < start ? index + 1 : index - 1);
        }}
        className={classNames(
          "group relative w-full min-w-0 overflow-hidden rounded-2xl",
          tone === "dark"
            ? "bg-white/5 ring-1 ring-inset ring-white/15 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]"
            : "border border-[var(--border-subtle)] bg-[var(--surface-sunken)] shadow-[var(--shadow-card)]",
          frameClassName
        )}
      >
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((banner, position) => (
            <Slide
              key={`${banner.image?.url ?? banner.title ?? "slide"}-${position}`}
              banner={banner}
              hidden={position !== index}
              active={position === index}
              height={height}
            />
          ))}
        </div>

        {count > 1 ? (
          <>
            <Arrow side="left" onClick={() => go(index - 1)} />
            <Arrow side="right" onClick={() => go(index + 1)} />

            {/* counter, top right */}
            <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-2 rounded-full bg-ink-950/45 px-3 py-1 text-[11px] font-bold tracking-wider text-white backdrop-blur sm:flex">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span className="h-px w-4 bg-white/50" />
              <span className="text-white/60">{String(count).padStart(2, "0")}</span>
            </div>

            {/* progress bars: the running one fills over the slide's time */}
            <div className="absolute bottom-3 right-4 flex items-center justify-end gap-2 sm:right-5">
              {slides.map((_, position) => (
                <button
                  key={position}
                  type="button"
                  aria-label={`Go to slide ${position + 1}`}
                  aria-current={position === index}
                  onClick={() => go(position)}
                  className="group/bar relative h-1.5 w-8 overflow-hidden rounded-full bg-white/60 backdrop-blur transition-all hover:h-2 sm:w-12"
                >
                  <span
                    className={classNames(
                      "absolute inset-0 origin-left rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]",
                      position < index && "scale-x-100",
                      position > index && "scale-x-0"
                    )}
                    style={
                      position === index
                        ? {
                            animation: `hero-progress ${INTERVAL}ms linear forwards`,
                            animationPlayState: paused ? "paused" : "running",
                          }
                        : undefined
                    }
                  />
                </button>
              ))}

              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
                className="ml-1 flex size-7 items-center justify-center rounded-full bg-ink-950/45 text-white backdrop-blur transition hover:bg-ink-950/65"
              >
                {userPaused ? <Play aria-hidden className="size-3 fill-current" /> : <Pause aria-hidden className="size-3 fill-current" />}
              </button>
            </div>
          </>
        ) : null}
      </div>

  );

  if (bare) return frame;

  return (
    <section aria-label="Featured offers" aria-roledescription="carousel" className="shell pt-4 sm:pt-6">
      <div
        className={classNames(
          "grid gap-4",
          aside ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : undefined
        )}
      >
        {frame}
        {aside ? <div className="hidden lg:block">{aside}</div> : null}
      </div>
    </section>
  );
}

function Slide({
  banner,
  hidden,
  active,
  height,
}: {
  banner: HomepageBanner;
  hidden: boolean;
  active: boolean;
  height: "default" | "tall" | "ratio";
}) {
  const desktop = banner.image?.url;
  const mobile = banner.mobileImage?.url ?? desktop;

  const body = (
    <div
      className="relative flex h-full w-full items-center overflow-hidden"
      style={banner.background ? { background: banner.background } : undefined}
    >
      {desktop ? (
        <picture className="block h-full w-full">
          <source media="(min-width: 640px)" srcSet={desktop} />
          {/* Brand artwork from a CDN or the public folder, so a plain <img>. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mobile}
            alt={banner.image?.alt ?? banner.title ?? ""}
            className={classNames(
              "h-full w-full object-cover",
              active && "motion-safe:animate-[hero-zoom_7s_ease-out_forwards]"
            )}
            loading="eager"
            decoding="async"
          />
        </picture>
      ) : (
        <div className="bg-peach-gradient flex h-full w-full flex-col justify-center gap-2 px-6 sm:px-12">
          <h2 className="font-display text-xl font-extrabold text-ink-800 sm:text-3xl">
            {banner.title}
          </h2>
          {banner.subtitle ? (
            <p className="max-w-lg text-sm text-ink-600 sm:text-base">{banner.subtitle}</p>
          ) : null}
          {banner.ctaLabel ? (
            <span className="mt-1 inline-flex w-fit items-center rounded-full bg-brand-gradient px-5 py-2 text-sm font-bold text-white">
              {banner.ctaLabel}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={classNames(
        "w-full shrink-0",
        // `ratio` matches the shipped artwork exactly (2:1 mobile, 3:1 above),
        // so nothing is ever cropped out of a banner.
        height === "ratio"
          ? "aspect-[2/1] sm:aspect-[3/1]"
          : height === "tall"
            ? "h-[170px] sm:h-[220px] lg:h-[290px]"
            : "h-[150px] sm:h-[190px] lg:h-[230px]"
      )}
      aria-hidden={hidden}
      // A hidden slide must not be reachable by keyboard behind the visible one.
      {...(hidden ? { inert: true } : {})}
    >
      {banner.link ? (
        banner.link.startsWith("http") ? (
          <a href={banner.link} target="_blank" rel="noopener noreferrer sponsored" className="block h-full">
            {body}
          </a>
        ) : (
          <Link href={banner.link} className="block h-full">
            {body}
          </Link>
        )
      ) : (
        body
      )}
    </div>
  );
}

function Arrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      className={classNames(
        "absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full",
        "bg-white/90 text-ink-800 shadow-[var(--shadow-lift)] ring-1 ring-ink-900/5 backdrop-blur transition-all duration-200",
        "opacity-0 hover:scale-105 hover:bg-white group-hover:opacity-100 focus-visible:opacity-100 sm:flex",
        side === "left" ? "left-3" : "right-3"
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-5">
        <path d={side === "left" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/** Shipped artwork, used until an editor uploads real banners. */
export const DEFAULT_BANNERS: HomepageBanner[] = [
  {
    image: { url: "/banners/coupon-store-deals.svg", alt: "Real savings, not stale codes" },
    mobileImage: { url: "/banners/coupon-store-deals-mobile.svg", alt: "" },
    title: "Real savings, not stale codes",
    link: "/coupons",
    order: 0,
    active: true,
  },
  {
    image: { url: "/banners/exclusive-codes.svg", alt: "Codes you will not find anywhere else" },
    mobileImage: { url: "/banners/exclusive-codes-mobile.svg", alt: "" },
    title: "Exclusive codes",
    link: "/coupons?exclusive=true",
    order: 1,
    active: true,
  },
  {
    image: { url: "/banners/free-shipping.svg", alt: "Delivery on us, no minimum spend" },
    mobileImage: { url: "/banners/free-shipping-mobile.svg", alt: "" },
    title: "Delivery on us",
    link: "/coupons?type=freeshipping",
    order: 2,
    active: true,
  },
];
