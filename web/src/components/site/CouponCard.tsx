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
 * `variant` changes density, not information: a rail card is narrow and
 * fixed-width, a list card is wide and shows the description, a compact card
 * strips everything but the essentials for a sidebar.
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
  const lines = descriptionLines(coupon.description, variant === "list" ? 3 : 1);

  const href = `/coupon/${coupon.slug}`;

  if (variant === "rail") {
    return (
      <article className="surface group flex w-[19rem] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
        <div className="flex items-start justify-between gap-3">
          {store ? (
            <Link href={`/store/${store.slug}`} className="flex items-center gap-2.5">
              <StoreLogo name={store.name} logo={store.logo} size={40} />
              <span className="text-sm font-semibold">{store.name}</span>
            </Link>
          ) : (
            <span />
          )}
          <DiscountBadge coupon={coupon} />
        </div>

        <Link href={href} className="flex-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug transition group-hover:text-brand-600">
            {coupon.title}
          </h3>
        </Link>

        <div className="flex items-center justify-between gap-2">
          <MetaRow coupon={coupon} expiry={expiry} urgent={urgent} compact />
          <RevealButton coupon={coupon} size="sm" />
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-3 last:border-0">
        {store ? <StoreLogo name={store.name} logo={store.logo} size={36} /> : null}
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

  return (
    <article
      className={classNames(
        "surface group relative flex gap-4 rounded-2xl border p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-lift)] sm:gap-5",
        urgent ? "border-warn-500/40" : "border-[var(--border-subtle)]",
        coupon.isExpired && "opacity-65"
      )}
    >
      {/* The badge column doubles as the torn-stub edge of a paper voucher. */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <DiscountBadge coupon={coupon} large />
        {showStore && store ? (
          <Link href={`/store/${store.slug}`} aria-label={store.name}>
            <StoreLogo name={store.name} logo={store.logo} size={48} />
          </Link>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={coupon.hasCode ? "brand" : "accent"}>
            {COUPON_TYPE_LABELS[coupon.type]}
          </Badge>
          {coupon.exclusive ? <Badge tone="accent">Exclusive</Badge> : null}
          {coupon.verified ? <Badge tone="success">✓ Verified</Badge> : null}
          {coupon.trending ? <Badge tone="warn">🔥 Trending</Badge> : null}
        </div>

        <h3 className="text-base font-semibold leading-snug sm:text-[17px]">
          <Link href={href} className="transition hover:text-brand-600">
            {coupon.title}
          </Link>
        </h3>

        {showStore && store ? (
          <p className="mt-0.5 text-sm text-faint">
            at{" "}
            <Link href={`/store/${store.slug}`} className="font-medium text-body hover:text-brand-600">
              {store.name}
            </Link>
          </p>
        ) : null}

        {lines.length ? (
          <ul className="mt-2.5 space-y-1">
            {lines.map((line, index) => (
              <li key={index} className="flex gap-2 text-sm text-body">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-400" />
                <span className="line-clamp-1">{line}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3">
          <MetaRow coupon={coupon} expiry={expiry} urgent={urgent} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
        <RevealButton coupon={coupon} />
        {!hideSave ? <SaveButton couponId={coupon._id} /> : null}
      </div>
    </article>
  );
}

function DiscountBadge({ coupon, large }: { coupon: CouponView; large?: boolean }) {
  const isPercent = coupon.discountType === "percent";

  return (
    <span
      className={classNames(
        "inline-flex items-center justify-center rounded-xl text-center font-bold leading-tight",
        large ? "min-h-14 w-16 px-1.5 py-2 text-[13px]" : "px-2.5 py-1 text-xs",
        isPercent
          ? "bg-brand-gradient text-white"
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
  compact,
}: {
  coupon: CouponView;
  expiry: string | null;
  urgent: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={classNames(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
        compact ? "text-faint" : "text-faint"
      )}
    >
      {coupon.uses > 0 ? <span>Used {formatCount(coupon.uses)}×</span> : null}

      {coupon.successRate !== null ? (
        <span className="font-semibold text-success-600">{coupon.successRate}% worked</span>
      ) : null}

      {expiry ? (
        <span className={classNames("font-semibold", urgent && "text-warn-600")}>
          {urgent ? "⏳ " : ""}
          {expiry}
        </span>
      ) : (
        <span>No expiry</span>
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
