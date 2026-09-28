import Link from "next/link";
import { classNames, formatCount } from "@/lib/format";

export type OfferParams = Record<string, string | string[] | undefined>;

export const oneOf = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Rebuilds the current path with one parameter changed, dropping the page. */
export function withParams(
  base: string,
  params: OfferParams,
  patch: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const single = oneOf(value);
    if (single && key !== "page" && key !== "slug") search.set(key, single);
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!value) search.delete(key);
    else search.set(key, value);
  }

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

const SORTS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "discount", label: "Biggest saving" },
  { value: "popular", label: "Most used" },
];

/**
 * The filter row used on a category and on a store page.
 *
 * Every control is a link, so the state lives in the URL: it survives a
 * refresh, it can be shared, and it needs no JavaScript to work.
 */
export function OfferFilters({
  base,
  params,
  counts,
}: {
  base: string;
  params: OfferParams;
  counts: { all: number; codes: number; deals: number };
}) {
  const show = oneOf(params.show);
  const sort = oneOf(params.sort) ?? "best";

  const tabs = [
    { value: undefined, label: "All offers", count: counts.all },
    { value: "codes", label: "Promo codes", count: counts.codes },
    { value: "deals", label: "Deals", count: counts.deals },
  ];

  return (
    <div className="surface mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-3 py-2.5 shadow-[var(--shadow-card)]">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={withParams(base, params, { show: tab.value })}
          className={classNames(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold transition",
            show === tab.value
              ? "bg-brand-gradient text-white shadow-[var(--shadow-glow)]"
              : "text-body hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50"
          )}
        >
          {tab.label}
          <span
            className={classNames(
              "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
              show === tab.value ? "bg-white/20" : "bg-[var(--surface-sunken)] text-faint"
            )}
          >
            {formatCount(tab.count)}
          </span>
        </Link>
      ))}

      <div className="ml-auto flex flex-wrap gap-1.5">
        {SORTS.map((option) => (
          <Link
            key={option.value}
            href={withParams(base, params, {
              sort: option.value === "best" ? undefined : option.value,
            })}
            className={classNames(
              "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
              sort === option.value
                ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                : "border-[var(--border-subtle)] text-body hover:border-brand-300"
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
