import { BadgeCheck, Clock3, Flame, Users } from "lucide-react";
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
import { Badge, StoreLogo } from "@/components/ui/primitives";
import { RevealButton } from "./RevealButton";
import { SaveButton } from "./SaveButton";

/**
 * The unit the whole site is built from.
 *
 * Every variant follows the same reading order — who, what, why it is worth
 * a click, then the action — so a shopper never has to relearn the card when
 * they move between the homepage, a category and a store.
 */
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
  const urgent = isUrgent(coupon);
  const lines = descriptionLines(coupon.description, variant === "list" ? 2 : 1);

  const href = `/coupon/${coupon.slug}`;

  /* ---------------- compact: a row inside a sidebar or a modal ---------------- */
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

  /* ---------------- rail: fixed width, used in horizontal scrollers ---------------- */
  if (variant === "rail") {
    return (
      <article className="surface group relative flex w-[19rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/60 px-4 py-2.5">
          {store ? (
            <>
              <StoreLogo name={store.name} logo={store.logo} size={30} rounded="rounded-lg" />
              <Link
                href={`/store/${store.slug}`}
                className="min-w-0 flex-1 truncate text-xs font-bold transition hover:text-brand-600"
              >
                {store.name}
              </Link>
            </>
          ) : (
            <span className="flex-1" />
          )}

          <DiscountBadge coupon={coupon} />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <Link href={href} className="flex-1">
            <h3 className="line-clamp-3 text-[15px] font-semibold leading-snug transition group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {coupon.title}
            </h3>
          </Link>

          <RevealButton coupon={coupon} full />

          <MetaRow coupon={coupon} expiry={expiry} urgent={urgent} />
        </div>
      </article>
    );
  }

  /* ---------------- list: the default, everywhere offers are listed ---------------- */
  return (
    <article
      className={classNames(
        "surface group relative flex flex-col overflow-hidden rounded-2xl border shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]",
        urgent ? "border-warn-500/40" : "border-[var(--border-subtle)]",
        coupon.isExpired && "opacity-65"
      )}
    >
      {/* Header: who the offer is with, and what it is worth. */}
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 px-4 py-2.5">
        {showStore && store ? (
          <>
            <Link href={`/store/${store.slug}`} aria-label={store.name} className="shrink-0">
              <StoreLogo name={store.name} logo={store.logo} size={34} rounded="rounded-lg" />
            </Link>
            <Link
              href={`/store/${store.slug}`}
              className="min-w-0 truncate text-xs font-bold transition hover:text-brand-600"
            >
              {store.name}
            </Link>
          </>
        ) : (
          /* On a store page the shop is a given, so the type takes the slot
             rather than leaving the header with a lone discount chip. */
          <span className="flex min-w-0 items-center gap-1.5">
            <Badge tone={coupon.hasCode ? "brand" : "accent"}>
              {COUPON_TYPE_LABELS[coupon.type]}
            </Badge>
            {coupon.verified ? (
              <Badge tone="success">
                <BadgeCheck aria-hidden className="mr-1 inline size-3" />
                Verified
              </Badge>
            ) : null}
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {coupon.exclusive ? <Badge tone="accent">Exclusive</Badge> : null}
          {coupon.trending ? (
            <Badge tone="warn">
              <Flame aria-hidden className="mr-1 inline size-3" />
              Trending
            </Badge>
          ) : null}
          <DiscountBadge coupon={coupon} />
        </span>
      </div>

      {/* Body: the offer itself. */}
      <div className="flex flex-1 flex-col gap-2.5 px-4 py-3.5">
        {showStore ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={coupon.hasCode ? "brand" : "accent"}>
              {COUPON_TYPE_LABELS[coupon.type]}
            </Badge>
            {coupon.verified ? (
              <Badge tone="success">
                <BadgeCheck aria-hidden className="mr-1 inline size-3" />
                Verified
              </Badge>
            ) : null}
          </div>
        ) : null}

        <h3 className="text-[15px] font-semibold leading-snug break-words sm:text-base">
          <Link href={href} className="transition hover:text-brand-700 dark:hover:text-brand-300">
            {coupon.title}
          </Link>
        </h3>

        {lines.length ? (
          <ul className="space-y-1">
            {lines.map((line, index) => (
              <li key={index} className="flex gap-2 text-[13px] leading-relaxed text-body">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                <span className="line-clamp-1">{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Footer: the action, and the facts that decide whether it is worth it. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--border-strong)] px-4 py-3">
        <MetaRow coupon={coupon} expiry={expiry} urgent={urgent} />

        <span className="ml-auto flex items-center gap-2">
          {!hideSave ? <SaveButton couponId={coupon._id} /> : null}
          <RevealButton coupon={coupon} />
        </span>
      </div>
    </article>
  );
}

function DiscountBadge({ coupon }: { coupon: CouponView }) {
  const isPercent = coupon.discountType === "percent";

  return (
    <span
      className={classNames(
        "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-center text-xs font-extrabold leading-tight",
        isPercent
          ? "bg-brand-gradient text-white shadow-[var(--shadow-glow)]"
          : "bg-brand-50 text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-800"
      )}
    >
      {coupon.badge}
    </span>
  );
}

function MetaRow({
  coupon,
  expiry,
  urgent,
}: {
  coupon: CouponView;
  expiry: string | null;
  urgent: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-faint">
      <span className={classNames("flex items-center gap-1", urgent && "text-warn-600")}>
        <Clock3 aria-hidden className="size-3" />
        {expiry ?? "No expiry"}
      </span>

      {coupon.uses > 0 ? (
        <span className="flex items-center gap-1">
          <Users aria-hidden className="size-3" />
          {formatCount(coupon.uses)} used
        </span>
      ) : null}

      {coupon.successRate !== null ? (
        <span className="text-success-600">{coupon.successRate}% worked</span>
      ) : null}
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
    <div className="grid gap-3 xl:grid-cols-2">
      {items.map((coupon) => (
        <CouponCard key={coupon._id} coupon={coupon} showStore={showStore} />
      ))}
    </div>
  );
}
