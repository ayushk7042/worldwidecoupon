"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CategoryIcon } from "@/components/ui/icons";
import { StoreLogo } from "@/components/ui/primitives";
import { classNames, formatCount, storeOf } from "@/lib/format";
import type { Category, CouponView } from "@/lib/types";
import { RevealButton } from "./RevealButton";

export interface CategoryGroup {
  category: Pick<Category, "_id" | "name" | "slug" | "activeCouponCount">;
  coupons: CouponView[];
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
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  if (!groups.length) return null;

  const current = groups[Math.min(active, groups.length - 1)]!;

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            <span className="h-px w-6 bg-brand-400" />
            Browse
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">
            {current.category.name} offers
          </h2>
          <p className="mt-1 text-sm text-body">
            {formatCount(current.category.activeCouponCount)} live offers in this aisle — pick
            another below.
          </p>
        </div>

        <Link
          href={`/category/${current.category.slug}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-px hover:border-brand-300 hover:text-brand-600 hover:shadow-[var(--shadow-card)]"
        >
          All {current.category.name}
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* ---- the sliding strip of categories ---- */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => nudge(-1)}
          className="surface hidden size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition hover:border-brand-300 hover:text-brand-600 lg:flex"
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
          {groups.map((group, index) => (
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
          ))}
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
        className="mt-4 grid animate-[rise_0.3s_ease-out] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {current.coupons.slice(0, 6).map((coupon) => (
          <CompactOffer key={coupon._id} coupon={coupon} />
        ))}
      </div>
    </section>
  );
}

/** The same grammar as the list card, folded into a tile. */
function CompactOffer({ coupon }: { coupon: CouponView }) {
  const store = storeOf(coupon);

  return (
    <article className="surface group flex overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      <span
        aria-hidden
        className={classNames(
          "w-1.5 shrink-0",
          coupon.hasCode ? "bg-brand-gradient" : "bg-accent-300 dark:bg-accent-600/40"
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-white p-1">
            <StoreLogo
              name={store?.name ?? "Store"}
              logo={store?.logo}
              size={36}
              rounded="rounded-lg"
              className="border-0"
            />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-bold text-faint">
              {store?.name ?? "Featured"}
            </span>
            <span className="block truncate font-display text-base font-extrabold leading-tight text-brand-600">
              {coupon.badge}
            </span>
          </span>
        </div>

        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-2 min-h-[2.4rem] text-[13px] font-semibold leading-snug transition group-hover:text-brand-700 dark:group-hover:text-brand-300"
        >
          {coupon.title}
        </Link>

        <div className="flex items-center gap-2 border-t border-dashed border-[var(--border-strong)] pt-2.5">
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-faint">
            {coupon.verified ? "Verified" : "Live now"}
            {coupon.uses ? ` · ${formatCount(coupon.uses)} used` : ""}
          </span>

          <RevealButton
            coupon={coupon}
            size="sm"
            label={coupon.hasCode ? "Copy code" : "Get deal"}
          />
        </div>
      </div>
    </article>
  );
}
