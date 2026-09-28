"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ads } from "@/lib/endpoints";
import { classNames } from "@/lib/format";
import type { AdPosition, Advertisement } from "@/lib/types";

const INTERVAL = 4500;

const deviceOf = (): "mobile" | "tablet" | "desktop" => {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export interface AdCarouselProps {
  position: AdPosition;
  category?: string;
  store?: string;
  className?: string;
  /** Height reserved while loading, to stop the page jumping. */
  minHeight?: number;
  label?: boolean;
}

/**
 * A slot that slides through several image ads instead of showing one static
 * creative — the same "Ad" disclosure and empty-slot behaviour as `AdSlot`,
 * just for a position sold to more than one advertiser at once.
 *
 * Image ads only: a script ad (AdSense, GAM, custom HTML) has no artwork to
 * slide, so it stays on the single-ad `AdSlot` instead.
 */
export function AdCarousel({
  position,
  category,
  store,
  className,
  minHeight = 0,
  label = true,
}: AdCarouselProps) {
  const [items, setItems] = useState<Advertisement[]>([]);
  const [settled, setSettled] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    ads
      .serveList({ position, device: deviceOf(), category, store, limit: 8 })
      .then((result) => {
        if (!cancelled) setItems(result.filter((ad) => ad.type === "image" && ad.image?.url));
      })
      .catch(() => {
        // An ad row that fails to load is not worth surfacing to a shopper.
      })
      .finally(() => {
        if (!cancelled) setSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [position, category, store]);

  const count = items.length;

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
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = setInterval(() => setIndex((value) => (value + 1) % count), INTERVAL);
    return () => clearInterval(timer);
  }, [paused, count]);

  const onClick = (ad: Advertisement) => {
    void ads.trackClick(ad._id).catch(() => undefined);
  };

  if (!settled && minHeight > 0) {
    return <div className={classNames("skeleton", className)} style={{ minHeight }} />;
  }

  if (!count) return null;

  return (
    <div
      className={classNames(
        "group relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]",
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX ?? null;
        touchStart.current = null;
        if (start === null || end === null || Math.abs(end - start) < 30) return;
        go(end < start ? index + 1 : index - 1);
      }}
    >
      {label ? (
        <span className="absolute right-2 top-2 z-10 rounded bg-ink-950/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
          Ad
        </span>
      ) : null}

      <div
        className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((ad, position_) => (
          <a
            key={ad._id}
            href={ad.targetUrl || undefined}
            onClick={() => onClick(ad)}
            target={ad.openInNewTab ? "_blank" : undefined}
            rel="nofollow sponsored noopener noreferrer"
            className="block w-full shrink-0"
            aria-hidden={position_ !== index}
            tabIndex={position_ === index ? undefined : -1}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.image!.url}
              alt={ad.image?.alt ?? ad.name}
              loading={position_ === 0 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </a>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous ad"
            className="absolute left-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-800 opacity-0 shadow-[var(--shadow-card)] transition-all duration-200 hover:bg-white group-hover:opacity-100 sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-4">
              <path d="m14 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next ad"
            className="absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-800 opacity-0 shadow-[var(--shadow-card)] transition-all duration-200 hover:bg-white group-hover:opacity-100 sm:flex"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="size-4">
              <path d="m10 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {items.map((ad, position_) => (
              <button
                key={ad._id}
                type="button"
                aria-label={`Go to ad ${position_ + 1}`}
                aria-current={position_ === index}
                onClick={() => go(position_)}
                className={classNames(
                  "h-1.5 rounded-full backdrop-blur transition-all duration-300",
                  position_ === index ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/85"
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
