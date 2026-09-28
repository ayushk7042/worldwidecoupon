import { BadgeCheck, ChevronDown, Clock3, ExternalLink, TrendingUp, Users } from "lucide-react";
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

/**
 * The unit the whole site is built from.
 *
 * Laid out the way a shopper scans a voucher: what it saves on the left, what
 * it is in the middle, and the button on the right — with the proof (checked,
 * how often it worked, how many took it) sitting directly above that button.
 */

/** The coloured strip above a card, when an offer has earned one. */
function ribbonFor(coupon: CouponView): { label: string; className: string } | null {
  if (coupon.exclusive) {
    return { label: "Exclusive", className: "bg-accent-500 text-white" };
  }
  if (coupon.trending) {
    return { label: "Trending now", className: "bg-warn-500 text-white" };
  }
  if (isUrgent(coupon)) {
    return { label: "Ending soon", className: "bg-danger-500 text-white" };
  }
  if (coupon.featured || coupon.editorsPick) {
    return { label: "Recommended", className: "bg-brand-gradient text-white" };
  }
  return null;
}

export function CouponCard({
  coupon,
  variant = "list",
  showStore = true,
  hideSave = false,
}: {
  coupon: CouponView;
  variant?: "list" | "rail" | "compact";
  showStore?: boolean;
  hideSave?: boolean;
}) {
  const store = storeOf(coupon);
  const expiry = expiryLabel(coupon);
  const lines = descriptionLines(coupon.description, 4);
  const ribbon = ribbonFor(coupon);
  const urgent = isUrgent(coupon);

  /* Anything added in the last week is worth calling out. */
  const isNew = Date.now() - new Date(coupon.createdAt).getTime() < 7 * 86_400_000;

  const href = `/coupon/${coupon.slug}`;

  /* ---------------- compact: a row inside a sidebar ---------------- */
  if (variant === "compact") {
    return (
      <article className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-3 last:border-0">
        {store ? <StoreLogo name={store.name} logo={store.logo} size={36} rounded="rounded-xl" /> : null}

        <Link href={href} className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold transition hover:text-brand-600">
            {coupon.title}
          </p>
          <p className="text-xs text-faint">
            {coupon.badge} · {COUPON_TYPE_LABELS[coupon.type]}
          </p>
        </Link>

        <RevealButton coupon={coupon} size="sm" />
      </article>
    );
  }

  /* ---------------- rail: fixed width, horizontal scrollers ---------------- */
  if (variant === "rail") {
    return (
      <article className="surface group relative flex w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
        {ribbon ? (
          <p className={classNames("px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]", ribbon.className)}>
            {ribbon.label}
          </p>
        ) : null}

        <div className="flex items-center gap-3 border-b border-dashed border-[var(--border-strong)] px-4 py-3">
          {store ? (
            <StoreLogo name={store.name} logo={store.logo} size={38} rounded="rounded-xl" />
          ) : null}

          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-faint">
              {COUPON_TYPE_LABELS[coupon.type]}
            </span>
            <span className="block font-display text-lg font-extrabold leading-none text-brand-600">
              {coupon.badge}
            </span>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <Link href={href} className="flex-1">
            <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug transition group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {coupon.title}
            </h3>
          </Link>

          <ProofRow coupon={coupon} expiry={expiry} />
          <RevealButton coupon={coupon} size="sm" full />
        </div>
      </article>
    );
  }

  /* ---------------- list: the default ---------------- */
  const ctaLabel = coupon.hasCode
    ? `Unlock ${coupon.badge} code`
    : `Save ${coupon.badge} now`;

  return (
    <article
      className={classNames(
        "@container surface overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200",
        "hover:border-brand-300 hover:shadow-[var(--shadow-lift)]",
        coupon.isExpired && "opacity-65"
      )}
    >
      {ribbon ? (
        <p
          className={classNames(
            "px-4 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em]",
            ribbon.className
          )}
        >
          {ribbon.label}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 p-4 @2xl:flex-row @2xl:items-center @2xl:gap-5 @2xl:p-5">
        {/* ---- what it saves ---- */}
        <div className="flex shrink-0 items-center gap-3 @2xl:w-[7.5rem] @2xl:flex-col @2xl:items-center @2xl:justify-center @2xl:gap-0 @2xl:self-stretch @2xl:border-r @2xl:border-dashed @2xl:border-[var(--border-strong)] @2xl:pr-5 @2xl:text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
            {coupon.discountType === "percent" || coupon.discountType === "fixed"
              ? "Up to"
              : COUPON_TYPE_LABELS[coupon.type]}
          </span>
          <span className="font-display text-2xl font-extrabold leading-none text-brand-600 @2xl:text-[1.9rem]">
            {coupon.badge.replace(/\s*off$/i, "")}
          </span>
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600 @2xl:block">
            Off
          </span>
        </div>

        {/* ---- what it is ---- */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug break-words @2xl:text-[17px]">
            <Link href={href} className="transition hover:text-brand-700 dark:hover:text-brand-300">
              {coupon.title}
            </Link>
          </h3>

          {/* The three facts a shopper judges an offer on, each with a tone of
              its own so none of them reads as decoration. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isNew ? (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                New
              </span>
            ) : null}

            {coupon.exclusive ? (
              <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                Exclusive
              </span>
            ) : null}

            <span
              className={classNames(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                urgent
                  ? "bg-danger-500 text-white"
                  : expiry
                    ? "bg-warn-50 text-warn-600 dark:bg-warn-500/15"
                    : "surface-sunken text-faint"
              )}
            >
              <Clock3 aria-hidden className="size-3" />
              {expiry ?? "No expiry"}
            </span>

            {coupon.uses > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full surface-sunken px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-faint">
                <Users aria-hidden className="size-3" />
                {formatCount(coupon.uses)} used
              </span>
            ) : null}
          </div>

          {lines.length || coupon.terms ? (
            <details className="group/details mt-2">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-bold text-brand-600 marker:hidden">
                Show details
                <ChevronDown
                  aria-hidden
                  className="size-3.5 transition-transform group-open/details:rotate-180"
                />
              </summary>

              <ul className="mt-2 space-y-1">
                {lines.map((line, index) => (
                  <li key={index} className="flex gap-2 text-[13px] leading-relaxed text-body">
                    <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {coupon.terms ? (
                <div
                  className="prose-offer mt-2 text-[12px]"
                  dangerouslySetInnerHTML={{ __html: coupon.terms }}
                />
              ) : null}
            </details>
          ) : null}
        </div>

        {/* ---- the action ---- */}
        <div className="flex shrink-0 flex-col gap-2 @2xl:w-[17.5rem] @2xl:items-end">
          <span className="flex items-center gap-3 text-[11px] font-semibold">
            {coupon.verified ? (
              <span className="flex items-center gap-1 text-success-600">
                <BadgeCheck aria-hidden className="size-3.5" />
                Verified
              </span>
            ) : null}
            {coupon.successRate !== null ? (
              <span className="flex items-center gap-1 text-brand-600">
                <TrendingUp aria-hidden className="size-3.5" />
                {coupon.successRate}% success
              </span>
            ) : null}
          </span>

          <span className="flex w-full items-center gap-2">
            {!hideSave ? <SaveButton couponId={coupon._id} /> : null}

            <span className="relative flex min-w-0 flex-1 items-center">
              <RevealButton coupon={coupon} full label={ctaLabel} />

              {coupon.hasCode ? (
                /* The stub of the voucher, torn off behind the button. */
                <span
                  aria-hidden
                  className="pointer-events-none -ml-5 hidden h-11 items-center rounded-r-xl border-2 border-l-0 border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)] pl-6 pr-2.5 font-mono text-[11px] font-bold tracking-[0.2em] text-faint @2xl:flex"
                >
                  ••
                </span>
              ) : null}
            </span>
          </span>
        </div>
      </div>

      {/* ---- whose offer it is ---- */}
      {showStore && store ? (
        <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 px-4 py-2.5">
          <Link
            href={`/store/${store.slug}`}
            className="flex items-center gap-2.5 transition hover:opacity-90"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-white p-1">
              <StoreLogo name={store.name} logo={store.logo} size={28} rounded="rounded" className="border-0" />
            </span>
            <span className="text-[13px] font-bold">{store.name}</span>
          </Link>

          <Link
            href={`/store/${store.slug}`}
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-brand-600 transition hover:underline"
          >
            View all {store.name} offers
            <ExternalLink aria-hidden className="size-3.5" />
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function ProofRow({
  coupon,
  expiry,
  className,
}: {
  coupon: CouponView;
  expiry: string | null;
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-faint",
        className
      )}
    >
      {coupon.verified ? (
        <span className="flex items-center gap-1 text-success-600">
          <BadgeCheck aria-hidden className="size-3.5" />
          Verified
        </span>
      ) : null}

      {coupon.successRate !== null ? (
        <span className="flex items-center gap-1 text-brand-600">
          <TrendingUp aria-hidden className="size-3.5" />
          {coupon.successRate}% success
        </span>
      ) : null}

      {coupon.uses > 0 ? (
        <span className="flex items-center gap-1">
          <Users aria-hidden className="size-3.5" />
          {formatCount(coupon.uses)} used
        </span>
      ) : (
        <span>{expiry ?? "No expiry"}</span>
      )}
    </div>
  );
}

export function CouponList({
  items,
  showStore = true,
}: {
  items: CouponView[];
  showStore?: boolean;
}) {
  return (
    <div className="space-y-3">
      {items.map((coupon) => (
        <CouponCard key={coupon._id} coupon={coupon} showStore={showStore} />
      ))}
    </div>
  );
}
