"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock3, Copy, FileText, ListChecks, Users } from "lucide-react";
import Link from "next/link";
import {
  COUPON_TYPE_LABELS,
  classNames,
  descriptionLines,
  expiryLabel,
  formatCount,
  isUrgent,
  storeOf,
} from "@/lib/format";
import type { CouponView } from "@/lib/types";
import { StoreLogo } from "@/components/ui/primitives";
import { RevealButton } from "./RevealButton";
import { SaveButton } from "./SaveButton";

/** One soft colour per offer (stable across renders) for the band behind its picture. */
const TINTS = ["#fb923c", "#f472b6", "#34d399", "#38bdf8", "#a78bfa", "#fbbf24"];

function tintFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length]!;
}

function ribbonFor(coupon: CouponView): { label: string; className: string } | null {
  if (coupon.featured || coupon.editorsPick) {
    return { label: "Top offer", className: "bg-brand-600 text-white" };
  }
  if (coupon.exclusive) return { label: "Exclusive", className: "bg-accent-500 text-white" };
  if (coupon.trending) return { label: "Trending", className: "bg-warn-500 text-white" };
  if (isUrgent(coupon)) return { label: "Ending soon", className: "bg-danger-500 text-white" };
  return null;
}

/**
 * One row of the all-offers list: the store's logo large on the left, the
 * offer's words, its own picture (no box — it fades into the row), the code
 * with its button, then the discount and a wishlist heart.
 *
 * The code itself is never in a public list (it is only revealed on click,
 * which is what records the click), so the dashed box shows a masked stub.
 */
export function OfferRow({ coupon }: { coupon: CouponView }) {
  const [open, setOpen] = useState(false);
  const store = storeOf(coupon);
  const expiry = expiryLabel(coupon);
  const ribbon = ribbonFor(coupon);
  const lines = descriptionLines(coupon.description, 6);
  const feather = "var(--feather-promo)";
  const tint = tintFor(coupon._id);
  const soft = `color-mix(in srgb, ${tint} 22%, var(--surface))`;
  const hasImage = Boolean(coupon.image?.url);

  const upTo = coupon.discountType === "percent" || coupon.discountType === "fixed";
  const chip = coupon.minimumSpend
    ? `Min. spend ${coupon.currency === "USD" ? "$" : ""}${coupon.minimumSpend}`
    : coupon.terms
      ? "Terms apply"
      : COUPON_TYPE_LABELS[coupon.type];

  return (
    <article
      className={classNames(
        "@container surface relative rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]",
        coupon.isExpired && "opacity-65"
      )}
      style={
        hasImage
          ? {
              backgroundImage: `linear-gradient(90deg, transparent 34%, ${soft} 56%, ${soft} 70%, transparent 90%)`,
            }
          : undefined
      }
    >
      {ribbon ? (
        <span
          className={classNames(
            "absolute left-0 top-0 z-10 rounded-br-xl rounded-tl-2xl px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider",
            ribbon.className
          )}
        >
          {ribbon.label}
        </span>
      ) : null}

      <div
        className={classNames(
          "flex flex-col gap-4 p-4 @3xl:flex-row @3xl:items-center @3xl:gap-5",
          ribbon && "pt-8 @3xl:pt-4"
        )}
      >
        {/* ---- the store, big ---- */}
        {store ? (
          <Link
            href={`/store/${store.slug}`}
            aria-label={`${store.name} offers`}
            className="flex size-24 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-white p-2 shadow-[var(--shadow-card)] transition hover:scale-[1.03]"
          >
            <StoreLogo name={store.name} logo={store.logo} size={76} rounded="rounded-xl" className="border-0" />
          </Link>
        ) : null}

        {/* ---- the offer ---- */}
        <div className="min-w-0 flex-1">
          {store ? <p className="text-xs font-semibold text-body">{store.name}</p> : null}

          <h3 className="mt-0.5 break-words text-[17px] font-bold leading-snug">
            <Link href={`/coupon/${coupon.slug}`} className="transition hover:text-brand-700 dark:hover:text-brand-300">
              {coupon.title}
            </Link>
          </h3>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-faint">
            <span>
              {upTo ? "Up to " : ""}
              {coupon.badge}
            </span>
            {coupon.verified ? (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1 font-semibold text-success-600 dark:text-success-500">
                  <CheckCircle2 aria-hidden className="size-3.5" />
                  Verified
                </span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span className={classNames("flex items-center gap-1", isUrgent(coupon) && "font-semibold text-danger-600")}>
              <Clock3 aria-hidden className="size-3.5" />
              {expiry ?? "No expiry"}
            </span>
            {coupon.uses > 0 ? (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <Users aria-hidden className="size-3.5" />
                  {formatCount(coupon.uses)} used
                </span>
              </>
            ) : null}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="rounded-md bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              {chip}
            </span>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 transition hover:text-brand-700"
            >
              {open ? "Hide details" : "Show details"}
              <ChevronDown aria-hidden className={classNames("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* ---- the offer's own picture: no box, faded into the row ---- */}
        {coupon.image?.url ? (
          <div
            className="pointer-events-none relative h-32 w-full shrink-0 @3xl:w-52"
            style={{
              maskImage: feather,
              WebkitMaskImage: feather,
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
            }}
          >
            {/* Editor-uploaded creative — a plain img, like every other brand asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coupon.image.url}
              alt={coupon.image.alt ?? coupon.title}
              className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (
          /* Keeps the button column in line from row to row. */
          <div aria-hidden className="hidden w-52 shrink-0 @3xl:block" />
        )}

        {/* ---- the code, then the button under it ---- */}
        <div className="flex w-full shrink-0 flex-col gap-2 @3xl:w-56">
          {coupon.hasCode ? (
            <div className="flex h-11 items-center justify-between rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/70 px-3.5 dark:border-brand-700 dark:bg-brand-950/40">
              <span className="font-mono text-sm font-bold tracking-[0.3em] text-brand-700 dark:text-brand-300">
                ••••••
              </span>
              <Copy aria-hidden className="size-4 text-brand-600" />
            </div>
          ) : null}
          <RevealButton coupon={coupon} full pill label={coupon.hasCode ? "Get code" : "Get deal"} />
        </div>

        {/* ---- discount and wishlist ---- */}
        <div className="flex shrink-0 items-center gap-3 @3xl:items-start @3xl:self-start @3xl:pt-2">
          <span className="rounded-full bg-brand-100 px-4 py-1.5 text-sm font-extrabold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300">
            {coupon.badge}
          </span>
          <SaveButton couponId={coupon._id} />
        </div>
      </div>
      {open ? (
        <div className="border-t border-dashed border-brand-300/70 bg-[var(--surface-sunken)]/50 px-4 py-4 dark:border-brand-700/50">
          <div className={classNames("grid gap-5", coupon.terms && "@3xl:grid-cols-2")}>
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

          <Link href={`/coupon/${coupon.slug}`} className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-brand-600 hover:underline">
            Open the full offer →
          </Link>
        </div>
      ) : null}
    </article>
  );
}
