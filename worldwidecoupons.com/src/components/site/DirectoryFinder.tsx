"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCount } from "@/lib/format";

interface Entry {
  id: string;
  name: string;
  slug: string;
  count: number;
}

/**
 * The A–Z index, filtered as you type — no page load, and it still renders as
 * plain links (so crawlers and slow connections get the full list).
 */
export function DirectoryFinder({ groups }: { groups: Record<string, Entry[]> }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const shown = useMemo(() => {
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([initial, items]) => [
        initial,
        needle ? items.filter((item) => item.name.toLowerCase().includes(needle)) : items,
      ] as const)
      .filter(([, items]) => items.length);
  }, [groups, needle]);

  const total = shown.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1 sm:max-w-sm">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to filter the list…"
            aria-label="Filter the store list"
            className="h-11 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] pl-10 pr-10 text-sm focus:border-brand-500 focus:outline-none"
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
        <span className="text-xs font-semibold text-faint">
          {needle ? `${formatCount(total)} match` + (total === 1 ? "" : "es") : `${formatCount(total)} stores`}
        </span>
      </div>

      {shown.length ? (
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
          {shown.map(([initial, items]) => (
            <div key={initial} id={`letter-${initial}`} className="mb-6 break-inside-avoid scroll-mt-32">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-brand-600">
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-100 text-xs dark:bg-brand-950/60">
                  {initial}
                </span>
                <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                <span className="text-[10px] font-bold text-faint">{items.length}</span>
              </h3>

              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/store/${item.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm text-body transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/50 dark:hover:text-brand-300"
                    >
                      <span className="truncate">{item.name}</span>
                      {item.count ? (
                        <span className="shrink-0 rounded-full bg-[var(--surface-sunken)] px-1.5 text-[10px] font-bold tabular-nums text-faint">
                          {item.count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-[var(--surface-sunken)] px-4 py-6 text-center text-sm text-body">
          No store matches “{query}”. Try fewer letters.
        </p>
      )}
    </div>
  );
}
