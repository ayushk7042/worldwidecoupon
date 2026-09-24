"use client";

import { CheckCircle2, ChevronDown, Clock3, Copy, FileText, ListChecks, Tag, Ticket, Truck, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  classNames,
  descriptionLines,
  expiryLabel,
  formatCount,
  isUrgent,
  splitBadge,
  storeOf,
} from "@/lib/format";
import type { CouponView } from "@/lib/types";
import { StoreLogo } from "@/components/ui/primitives";
import { RevealButton } from "./RevealButton";
import { SaveButton } from "./SaveButton";

function tabFor(coupon: CouponView): { label: string; className: string } {
  if (coupon.featured || coupon.editorsPick) {
    return { label: "Best deal", className: "bg-brand-600 text-white" };
  }
  return {
    label: coupon.hasCode ? "Promo code" : "Deal",
    className: "bg-brand-100 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300",
  };
}

/**
 * A row on a store's own page: the store's logo, then the offer (tab, title,
 * one line of description, facts), the amount tile, and the actions — the
 * code button with "View details" directly under it. Details open as a full
 * width panel beneath the row rather than squeezing into the text column.
 */
export function StoreOfferRow({
  coupon,
  showStore = false,
}: {
  coupon: CouponView;
  /** On a category page the store is not the page, so its name leads the row. */
  showStore?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const store = storeOf(coupon);
  const expiry = expiryLabel(coupon);
  const lines = descriptionLines(coupon.description, 8);
  const tab = tabFor(coupon);
  const discount = splitBadge(coupon.badge);
  const upTo = coupon.discountType === "percent" || coupon.discountType === "fixed";
  const numeric = /\d/.test(discount.lead);
  const summary = lines[0] ?? "";

  return (
    <article
      className={classNames(
        "@container relative overflow-hidden rounded-2xl border border-brand-200/60 bg-gradient-to-r from-brand-50/90 via-brand-50/30 to-[var(--surface)] shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:shadow-[var(--shadow-lift)] dark:border-brand-700/30 dark:from-brand-900/40 dark:via-brand-900/10",
        coupon.isExpired && "opacity-65"
      )}
    >
      {showStore && tab.label === "Best deal" ? (
        <span className="absolute left-0 top-0 z-10 rounded-br-xl bg-brand-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
          Best deal
        </span>
      ) : null}

      <div className="grid gap-x-5 gap-y-4 p-4 @2xl:grid-cols-[auto_minmax(0,1fr)_auto] @2xl:items-center @3xl:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        {store ? (
          <Link
            href={`/store/${store.slug}`}
            aria-label={`${store.name} offers`}
            className={classNames(
              "flex shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-2 shadow-[var(--shadow-card)]",
              showStore ? "size-24" : "size-20"
            )}
          >
            <StoreLogo name={store.name} logo={store.logo} size={showStore ? 78 : 64} rounded="rounded-xl" className="border-0" />
          </Link>
        ) : null}

        <div className="min-w-0">
          {showStore && store ? (
            <Link href={`/store/${store.slug}`} className="text-xs font-bold text-brand-700 hover:underline dark:text-brand-300">
              {store.name}
            </Link>
          ) : (
            <span
              className={classNames(
                "inline-block rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                tab.className
              )}
            >
              {tab.label}
            </span>
          )}

          <h3 className="mt-1.5 break-words text-[15px] font-bold leading-snug @2xl:text-base">
            <Link href={`/coupon/${coupon.slug}`} className="transition hover:text-brand-700 dark:hover:text-brand-300">
              {coupon.title}
            </Link>
          </h3>

          {summary ? <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-body">{summary}</p> : null}

          <p className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] font-medium text-faint">
            {coupon.verified ? (
              <span className="flex items-center gap-1 font-semibold text-success-600 dark:text-success-500">
                <CheckCircle2 aria-hidden className="size-3.5" />
                Verified
              </span>
            ) : null}
            <span className={classNames("flex items-center gap-1", isUrgent(coupon) && "font-semibold text-danger-600")}>
              <Clock3 aria-hidden className="size-3.5" />
              {expiry ?? "No expiry"}
            </span>
            {coupon.type === "freeshipping" ? (
              <span className="flex items-center gap-1">
                <Truck aria-hidden className="size-3.5" />
                Free shipping
              </span>
            ) : coupon.uses > 0 ? (
              <span className="flex items-center gap-1">
                <Users aria-hidden className="size-3.5" />
                {formatCount(coupon.uses)} used
              </span>
            ) : coupon.exclusive ? (
              <span className="flex items-center gap-1">
                <Zap aria-hidden className="size-3.5" />
                Exclusive
              </span>
            ) : null}
          </p>
        </div>

        <div className="hidden min-w-[6.5rem] flex-col items-center justify-center text-center @3xl:flex">
          {numeric ? (
            <>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
                {upTo ? "Up to" : "Save"}
              </span>
              <span className="bg-gradient-to-b from-brand-500 to-brand-700 bg-clip-text font-display text-[2rem] font-extrabold leading-none text-transparent drop-shadow-sm dark:from-brand-300 dark:to-brand-500">
                {discount.lead}
              </span>
              <span className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
                {discount.tail || "Off"}
              </span>
            </>
          ) : (
            <>
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                {coupon.hasCode ? <Ticket aria-hidden className="size-5" /> : <Tag aria-hidden className="size-5" />}
              </span>
              <span className="mt-1.5 text-sm font-extrabold leading-tight text-brand-700 dark:text-brand-300">
                {coupon.hasCode ? "Promo code" : "Special deal"}
              </span>
              <span className="text-[10px] font-medium leading-tight text-faint">
                {coupon.hasCode ? "use at checkout" : "no code needed"}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-2 @2xl:col-start-3 @2xl:w-[15.5rem] @3xl:col-start-4">
          <div className="flex items-center">
            <RevealButton
              coupon={coupon}
              full
              label={coupon.hasCode ? "Get code" : "Get deal"}
              className={classNames("!rounded-full", coupon.hasCode && "!rounded-r-none")}
            />
            {coupon.hasCode ? (
              <span
                aria-hidden
                className="flex h-11 w-24 shrink-0 items-center justify-center gap-2 rounded-r-full border-2 border-l-0 border-dashed border-brand-400/70 bg-brand-50 pl-2 pr-3.5 dark:border-brand-600/60 dark:bg-brand-950/50"
              >
                <span className="font-mono text-xs font-extrabold tracking-[0.2em] text-brand-700 dark:text-brand-300">
                  ••••
                </span>
                <Copy className="size-4 shrink-0 text-brand-600" />
              </span>
            ) : null}
          </div>

          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 transition hover:text-brand-700"
            >
              {open ? "Hide details" : "View details"}
              <ChevronDown aria-hidden className={classNames("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
            <span className="absolute right-0 top-1/2 -translate-y-1/2">
              <SaveButton couponId={coupon._id} />
            </span>
          </div>
        </div>

      </div>

      {open ? (
        <div className="border-t border-dashed border-brand-300/70 bg-[var(--surface)]/70 px-4 py-4 dark:border-brand-700/50">
          <div className={classNames("grid gap-5", coupon.terms && "@2xl:grid-cols-2")}>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-faint">
                <ListChecks aria-hidden className="size-4 text-brand-600" />
                Key points
              </p>
              {lines.length ? (
                <ul className="space-y-2">
                  {lines.map((line, index) => (
                    <li key={index} className="flex gap-2 text-[13px] leading-relaxed text-body">
                      <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      <span className="break-words">{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-body">No extra points for this offer.</p>
              )}
            </div>

            {coupon.terms ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-faint">
                  <FileText aria-hidden className="size-4 text-brand-600" />
                  Terms
                </p>
                <div className="prose-offer text-[12px]" dangerouslySetInnerHTML={{ __html: coupon.terms }} />
              </div>
            ) : null}
          </div>

          <Link
            href={`/coupon/${coupon.slug}`}
            className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline"
          >
            Open the full offer →
          </Link>
        </div>
      ) : null}
    </article>
  );
}
