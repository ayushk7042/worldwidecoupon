import Link from "next/link";
import type { ReactNode } from "react";
import { BrandImage } from "@/components/site/BrandImage";
import { classNames, initials, tileColour } from "@/lib/format";
import type { ImageRef } from "@/lib/types";

/* =========================================================
   BADGE
========================================================= */

type BadgeTone = "brand" | "success" | "warn" | "danger" | "neutral" | "accent";

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:ring-brand-800",
  accent: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:ring-purple-800",
  success: "bg-success-50 text-success-700 ring-success-500/25 dark:bg-success-700/15 dark:text-success-500",
  warn: "bg-warn-50 text-warn-600 ring-warn-500/25 dark:bg-warn-500/10 dark:text-warn-500",
  danger: "bg-danger-50 text-danger-600 ring-danger-500/25 dark:bg-danger-500/10 dark:text-danger-500",
  neutral: "surface-sunken text-[var(--text-secondary)] ring-[var(--border-subtle)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        BADGE_TONES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* =========================================================
   CARD
========================================================= */

export function Card({
  children,
  className,
  padded = true,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={classNames(
        "surface rounded-2xl border border-[var(--border-subtle)] shadow-[var(--shadow-card)]",
        padded && "p-5",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-body">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* =========================================================
   STORE LOGO

   Falls back to a coloured initials tile rather than a broken-image icon —
   about a third of imported stores have no usable artwork yet.
========================================================= */

export function StoreLogo({
  name,
  logo,
  size = 56,
  rounded = "rounded-xl",
  className,
}: {
  name: string;
  logo?: ImageRef | string | null;
  size?: number;
  rounded?: string;
  className?: string;
}) {
  const url = typeof logo === "string" ? logo : logo?.url;

  return (
    <span
      className={classNames(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border-subtle)] bg-white",
        rounded,
        className
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        // Third-party brand CDNs 404 often, so the tile is the fallback rather
        // than a broken-image icon.
        <BrandImage
          src={url}
          alt={`${name} logo`}
          size={size}
          fallback={<InitialsTile name={name} size={size} />}
        />
      ) : (
        <InitialsTile name={name} size={size} />
      )}
    </span>
  );
}

function InitialsTile({ name, size }: { name: string; size: number }) {
  return (
    <span
      className="flex size-full items-center justify-center font-bold text-white"
      style={{ backgroundColor: tileColour(name), fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
}

/* =========================================================
   STATES
========================================================= */

export function EmptyState({
  icon = "🔍",
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-14 text-center">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {body ? <p className="mt-2 max-w-sm text-sm text-body">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={classNames("skeleton", className)} />;
}

export function CouponCardSkeleton() {
  return (
    <div className="surface flex gap-4 rounded-2xl border border-[var(--border-subtle)] p-5">
      <Skeleton className="size-14 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-11 w-28 rounded-xl" />
    </div>
  );
}

/* =========================================================
   PAGINATION
========================================================= */

/** Shows first, last, current and neighbours; `null` renders an ellipsis. */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const output: (number | null)[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) output.push(null);
    output.push(page);
  });

  return output;
}

export function Pagination({
  page,
  pages,
  hrefFor,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
}) {
  if (pages <= 1) return null;

  const cell =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition";

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={classNames(cell, "surface border border-[var(--border-subtle)] hover:border-brand-300")}>
          ← Prev
        </Link>
      ) : null}

      {pageWindow(page, pages).map((value, index) =>
        value === null ? (
          <span key={`gap-${index}`} className="px-1 text-faint">
            …
          </span>
        ) : value === page ? (
          <span key={value} aria-current="page" className={classNames(cell, "bg-brand-gradient text-white")}>
            {value}
          </span>
        ) : (
          <Link
            key={value}
            href={hrefFor(value)}
            className={classNames(cell, "surface border border-[var(--border-subtle)] hover:border-brand-300")}
          >
            {value}
          </Link>
        )
      )}

      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={classNames(cell, "surface border border-[var(--border-subtle)] hover:border-brand-300")}>
          Next →
        </Link>
      ) : null}
    </nav>
  );
}

/* =========================================================
   MISC
========================================================= */

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-faint">
      {trail.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden>/</span> : null}
          {crumb.href ? (
            <Link href={crumb.href} className="transition hover:text-brand-600">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-[var(--text-secondary)]">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {hint ? (
        <span className={classNames("text-xs", tone === "danger" ? "text-danger-600" : "text-faint")}>
          {hint}
        </span>
      ) : null}
    </Card>
  );
}

/** Horizontally scrollable rail — the standard shape for every homepage row. */
export function Rail({ children }: { children: ReactNode }) {
  return (
    // The vertical padding is what stops a card's hover lift being clipped by
    // the horizontal scroll container.
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-1">
      {children}
    </div>
  );
}
