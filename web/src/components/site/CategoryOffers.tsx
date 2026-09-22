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

  if (!groups.length) return null;

  const current = groups[Math.min(active, groups.length - 1)]!;

  const nudge = (direction: 1 | -1) => {
    strip.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
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
      <div className="relative">
        <button
          type="button"
          aria-label="Previous categories"
          onClick={() => nudge(-1)}
          className="surface absolute -left-3 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition hover:border-brand-300 hover:text-brand-600 lg:flex"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>

        <div
          ref={strip}
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto scroll-smooth px-1 py-1"
        >
          {groups.map((group, index) => (
            <button
              key={group.category._id}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              className={classNames(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-all duration-200",
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
          className="surface absolute -right-3 top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition hover:border-brand-300 hover:text-brand-600 lg:flex"
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

/** A small, loud card: logo, saving, one line of title, one button. */
function CompactOffer({ coupon }: { coupon: CouponView }) {
  const store = storeOf(coupon);

  return (
    <article className="surface group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] p-3 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
      <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-1.5">
        <StoreLogo
          name={store?.name ?? "Store"}
          logo={store?.logo}
          size={54}
          rounded="rounded-xl"
          className="border-0"
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <span className="truncate text-[11px] font-bold text-faint">
            {store?.name ?? "Featured"}
          </span>
          <span className="ml-auto shrink-0 rounded-lg bg-brand-gradient px-2 py-0.5 text-[11px] font-extrabold text-white">
            {coupon.badge}
          </span>
        </span>

        <Link
          href={`/coupon/${coupon.slug}`}
          className="line-clamp-2 text-[13px] font-semibold leading-snug transition group-hover:text-brand-700 dark:group-hover:text-brand-300"
        >
          {coupon.title}
        </Link>

        <RevealButton
          coupon={coupon}
          size="sm"
          full
          label={coupon.hasCode ? "Copy code" : "Get deal"}
        />
      </div>
    </article>
  );
}
