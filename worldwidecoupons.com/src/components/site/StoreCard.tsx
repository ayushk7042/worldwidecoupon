import { BadgeCheck } from "lucide-react";
import { CategoryIcon } from "@/components/ui/icons";
import Link from "next/link";
import { classNames, formatCount } from "@/lib/format";
import type { Store } from "@/lib/types";
import { Badge, StoreLogo } from "@/components/ui/primitives";

export function StoreCard({
  store,
  variant = "grid",
}: {
  store: Store;
  variant?: "grid" | "rail" | "row";
}) {
  const href = `/store/${store.slug}`;

  if (variant === "rail") {
    return (
      <Link
        href={href}
        className="surface group flex w-40 shrink-0 snap-start flex-col items-center gap-2.5 rounded-2xl border border-[var(--border-subtle)] p-4 text-center shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
      >
        <StoreLogo name={store.name} logo={store.logo} size={56} />
        <span className="line-clamp-1 text-sm font-semibold transition group-hover:text-brand-600">
          {store.name}
        </span>
        <span className="text-xs text-faint">{store.activeCouponCount} offers</span>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:surface-sunken"
      >
        <StoreLogo name={store.name} logo={store.logo} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{store.name}</span>
          {store.bestOffer ? (
            <span className="block truncate text-xs text-faint">{store.bestOffer}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs font-semibold text-faint tabular-nums">
          {store.activeCouponCount}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="surface group flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start justify-between gap-3">
        <StoreLogo name={store.name} logo={store.logo} size={52} />
        {store.exclusive ? <Badge tone="accent">Exclusive</Badge> : null}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold transition group-hover:text-brand-600">
          {store.name}
        </h3>
        {store.bestOffer ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-body">{store.bestOffer}</p>
        ) : store.tagline ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-body">{store.tagline}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
        <span className="font-semibold text-brand-600">
          {formatCount(store.activeCouponCount)} offers
        </span>
        {store.codeCount > 0 ? <span>· {store.codeCount} codes</span> : null}
        {store.verified ? (
          <span className="inline-flex items-center gap-1 text-success-600">
            · <BadgeCheck aria-hidden className="size-3" /> Verified
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function CategoryTile({
  name,
  slug,
  icon,
  count,
  className,
}: {
  name: string;
  slug: string;
  icon?: string;
  count?: number;
  className?: string;
}) {
  return (
    <Link
      href={`/category/${slug}`}
      className={classNames(
        "surface group flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[var(--shadow-lift)]",
        className
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl transition group-hover:scale-110 dark:bg-brand-950/60">
        <CategoryIcon name={name} className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold transition group-hover:text-brand-600">
          {name}
        </span>
        {count !== undefined ? (
          <span className="block text-xs text-faint">{formatCount(count)} offers</span>
        ) : null}
      </span>
    </Link>
  );
}
