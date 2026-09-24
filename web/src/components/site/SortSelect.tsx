"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

/** "Sort by [Best match ▾]" — a native select, so it works everywhere. */
export function SortSelect({
  value,
  options,
}: {
  value: string;
  /** Each option already carries the URL that selecting it should go to. */
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-body">
      <span className="hidden sm:inline">Sort by</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => {
            const chosen = options.find((option) => option.value === event.target.value);
            if (chosen) router.push(chosen.href);
          }}
          className="h-10 cursor-pointer appearance-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] py-2 pl-3.5 pr-9 text-sm font-semibold text-[var(--text-primary)] focus:border-brand-500 focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      </span>
    </label>
  );
}
