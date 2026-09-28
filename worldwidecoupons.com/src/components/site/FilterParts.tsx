import { Check, ChevronDown, Filter, Star, Tag, Ticket } from "lucide-react";
import Link from "next/link";
import { classNames, formatCount } from "@/lib/format";

export function FilterGroup({
  title,
  clearHref,
  collapsed,
  children,
}: {
  title: string;
  /** Shown when this group has something selected. */
  clearHref?: string;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  const Icon = title === "Offer type" ? Tag : title === "Highlights" ? Star : title === "Store" ? Ticket : Filter;

  return (
    <details open={!collapsed} className="group/fg border-t border-[var(--border-subtle)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold marker:hidden">
        <Icon aria-hidden className="size-4 text-brand-600" />
        {title}
        {clearHref ? (
          <Link
            href={clearHref}
            className="ml-auto mr-2 text-[11px] font-bold text-brand-600 transition hover:underline"
          >
            Clear
          </Link>
        ) : (
          <span className="ml-auto" />
        )}
        <ChevronDown
          aria-hidden
          className="size-4 text-faint transition-transform group-open/fg:rotate-180"
        />
      </summary>
      <div className="px-2 pb-2">{children}</div>
    </details>
  );
}

export function FilterLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={classNames(
        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition",
        active
          ? "bg-brand-100/80 font-semibold text-brand-700 dark:bg-brand-950/70 dark:text-brand-300"
          : "text-body hover:surface-sunken"
      )}
    >
      {/* A tick box, so the sidebar reads as a set of filters rather than a
          list of links that might go somewhere else. */}
      <span
        aria-hidden
        className={classNames(
          "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition",
          active ? "border-brand-600 bg-brand-600 text-white" : "border-[var(--border-strong)]"
        )}
      >
        {active ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>

      <span className="min-w-0 flex-1 truncate">{children}</span>

      {count !== undefined ? (
        <span className="shrink-0 text-xs text-faint tabular-nums">{formatCount(count)}</span>
      ) : null}
    </Link>
  );
}
