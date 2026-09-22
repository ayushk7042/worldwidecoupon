"use client";

import { useEffect, useRef, useState } from "react";
import { ads } from "@/lib/endpoints";
import { classNames } from "@/lib/format";
import type { AdPosition, Advertisement } from "@/lib/types";

/**
 * One ad placement.
 *
 * Fetches on the client on purpose: the ad that should show depends on the
 * viewer's device, and an ad baked into a cached server-rendered page would
 * be the same for everyone and would inflate impressions on every CDN hit.
 *
 * Renders nothing at all when the slot is unsold, so an empty placement never
 * leaves a grey box behind.
 */

const deviceOf = (): "mobile" | "tablet" | "desktop" => {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

export interface AdSlotProps {
  position: AdPosition;
  /** Narrows targeting so a category page can show a category-specific ad. */
  category?: string;
  store?: string;
  className?: string;
  /** Height reserved while loading, to stop the page jumping. */
  minHeight?: number;
  label?: boolean;
}

export function AdSlot({
  position,
  category,
  store,
  className,
  minHeight = 0,
  label = true,
}: AdSlotProps) {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [settled, setSettled] = useState(false);
  const scriptHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    ads
      .serve({ position, device: deviceOf(), category, store })
      .then((result) => {
        if (!cancelled) setAd(result);
      })
      .catch(() => {
        // An ad that fails to load is not worth surfacing to a shopper.
      })
      .finally(() => {
        if (!cancelled) setSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [position, category, store]);

  /**
   * Script ads carry their own `<script>` tags, which React will not run when
   * they arrive through `dangerouslySetInnerHTML`. Rebuilding each node makes
   * the browser treat it as a fresh script and execute it.
   */
  useEffect(() => {
    const host = scriptHost.current;
    if (!host || ad?.type !== "script" || !ad.scriptCode) return;

    host.innerHTML = ad.scriptCode;

    host.querySelectorAll("script").forEach((original) => {
      const replacement = document.createElement("script");
      Array.from(original.attributes).forEach((attribute) => {
        replacement.setAttribute(attribute.name, attribute.value);
      });
      replacement.text = original.text;
      original.replaceWith(replacement);
    });
  }, [ad]);

  const onClick = () => {
    if (!ad) return;
    void ads.trackClick(ad._id).catch(() => undefined);
  };

  if (!settled && minHeight > 0) {
    return <div className={classNames("skeleton", className)} style={{ minHeight }} />;
  }

  if (!ad) return null;

  const frame = classNames(
    "relative overflow-hidden rounded-2xl border border-[var(--border-subtle)]",
    className
  );

  if (ad.type === "script") {
    return (
      <div className={frame}>
        {label ? <AdLabel /> : null}
        <div ref={scriptHost} />
      </div>
    );
  }

  const image = ad.image?.url;
  if (!image) return null;

  const banner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image}
      alt={ad.image?.alt ?? ad.name}
      width={ad.image?.width}
      height={ad.image?.height}
      loading="lazy"
      decoding="async"
      className="w-full object-cover"
    />
  );

  if (!ad.targetUrl) {
    return (
      <div className={frame}>
        {label ? <AdLabel /> : null}
        {banner}
      </div>
    );
  }

  return (
    <a
      href={ad.targetUrl}
      onClick={onClick}
      target={ad.openInNewTab ? "_blank" : undefined}
      rel="nofollow sponsored noopener noreferrer"
      className={classNames(frame, "block transition hover:opacity-95")}
    >
      {label ? <AdLabel /> : null}
      {banner}
    </a>
  );
}

/** Disclosure. Paid placements have to be identifiable as paid. */
function AdLabel() {
  return (
    <span className="absolute right-2 top-2 z-10 rounded bg-ink-950/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
      Ad
    </span>
  );
}

/**
 * Sticks to the bottom of the viewport on phones only.
 * Dismissible, because an undismissable sticky ad is the fastest way to get
 * a shopper to close the tab.
 */
export function StickyMobileAd() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden">
      <div className="relative">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss ad"
          className="absolute -top-7 right-2 z-10 rounded-full bg-ink-950/70 px-2 py-1 text-xs font-semibold text-white"
        >
          ✕
        </button>
        <AdSlot position="mobile-sticky-bottom" className="rounded-none border-x-0 border-b-0" label={false} />
      </div>
    </div>
  );
}
