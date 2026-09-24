"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/ui/icons";
import { classNames, formatCount } from "@/lib/format";

export interface BrowserCategory {
  id: string;
  name: string;
  slug: string;
  offers: number;
  stores: number;
  tint: string;
  description?: string;
  children: string[];
}

type SortKey = "offers" | "stores" | "name";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "offers", label: "Most offers" },
  { id: "stores", label: "Most stores" },
  { id: "name", label: "A–Z" },
];

/**
 * Every category as a coloured card, filtered and re-sorted in the browser —
 * so finding one takes a keystroke, not a page load. Each card wears its own
 * category colour and shows how big the aisle is next to the biggest one.
 */
export function CategoryBrowser({ categories }: { categories: BrowserCategory[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("offers");

  const max = Math.max(1, ...categories.map((item) => item.offers));

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = categories.filter(
      (item) =>
        !needle ||
        item.name.toLowerCase().includes(needle) ||
        item.children.some((child) => child.toLowerCase().includes(needle))
    );
    return [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "stores" ? b.stores - a.stores : b.offers - a.offers
    );
  }, [categories, query, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1 sm:max-w-md">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a category — Beauty, Travel, Electronics…"
            aria-label="Find a category"
            className="h-12 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] pl-11 pr-10 text-sm shadow-[var(--shadow-card)] focus:border-brand-500 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear"
              className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-faint hover:bg-[var(--surface-sunken)]"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </label>

        <div className="ml-auto flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] p-1">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSort(option.id)}
              className={classNames(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition",
                sort === option.id ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]" : "text-body hover:text-brand-700"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold text-faint">
        {query ? `${shown.length} of ${categories.length} categories` : `${categories.length} categories`}
      </p>

      {shown.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              style={{
                borderColor: `color-mix(in srgb, ${category.tint} 28%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${category.tint} 7%, var(--surface))`,
                backgroundImage: `linear-gradient(140deg, color-mix(in srgb, ${category.tint} 16%, transparent), transparent 60%)`,
              }}
            >
              <span className="flex items-start gap-3">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_20px_-8px_var(--tint)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
                  style={{ backgroundColor: category.tint, ["--tint" as string]: category.tint }}
                >
                  <CategoryIcon name={category.name} className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold">{category.name}</span>
                  <span className="block text-[11px] font-semibold text-faint">
                    {formatCount(category.stores)} stores
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 -translate-x-1 text-faint opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>

              <span className="flex items-end justify-between gap-2">
                <span className="font-display text-3xl font-extrabold leading-none" style={{ color: category.tint }}>
                  {formatCount(category.offers)}
                  <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-faint">offers</span>
                </span>
              </span>

              <span className="h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <span
                  className="block h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, Math.round((category.offers / max) * 100))}%`, backgroundColor: category.tint }}
                />
              </span>

              {category.description ? (
                <span className="line-clamp-2 text-xs leading-snug text-body">{category.description}</span>
              ) : null}

              {category.children.length ? (
                <span className="flex flex-wrap gap-1">
                  {category.children.slice(0, 3).map((child) => (
                    <span key={child} className="rounded-full bg-[var(--surface)]/80 px-2 py-0.5 text-[10px] font-semibold text-body">
                      {child}
                    </span>
                  ))}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-8 text-center text-sm text-body">
          No category matches “{query}”. Try another word, or{" "}
          <Link href="/coupons" className="font-bold text-brand-600 hover:underline">
            browse all offers
          </Link>
          .
        </p>
      )}
    </div>
  );
}
