"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { search as searchApi } from "@/lib/endpoints";
import { classNames } from "@/lib/format";
import type { Suggestion } from "@/lib/types";

/**
 * Header search with typeahead.
 *
 * Debounced at 180 ms and aborts the previous request, so typing quickly
 * leaves one in-flight call rather than one per keystroke arriving out of
 * order and flashing stale results.
 */
export function SearchBox({
  size = "md",
  placeholder = "Search 190+ stores…",
  autoFocus,
  withButton,
}: {
  size?: "md" | "lg";
  placeholder?: string;
  autoFocus?: boolean;
  /** Adds a submit button inside the field — used in the header. */
  withButton?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const router = useRouter();
  const wrapper = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      setItems([]);
      return;
    }

    const timer = setTimeout(() => {
      controller.current?.abort();
      controller.current = new AbortController();

      searchApi
        .suggest(query, { signal: controller.current.signal })
        .then((results) => {
          setItems(results);
          setOpen(true);
          setHighlight(-1);
        })
        .catch(() => {
          /* aborted or offline — leave the last good list in place */
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [term]);

  // Clicking anywhere else should close the dropdown.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const submit = (value: string) => {
    const query = value.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") return setOpen(false);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(current + 1, items.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, -1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const picked = items[highlight];
      if (picked) {
        setOpen(false);
        router.push(`/store/${picked.slug}`);
      } else {
        submit(term);
      }
    }
  };

  const tall = size === "lg";

  return (
    <div ref={wrapper} className="relative w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(term);
        }}
      >
        <div className="relative">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={classNames(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]",
              tall ? "size-5" : "size-4"
            )}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>

          <input
            type="search"
            value={term}
            autoFocus={autoFocus}
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => items.length && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Search stores and coupons"
            aria-expanded={open}
            aria-autocomplete="list"
            className={classNames(
              "w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10",
              tall ? "h-14 pl-12 text-base shadow-[var(--shadow-lift)]" : "h-11 pl-11 text-sm",
              withButton ? (tall ? "pr-32" : "pr-24") : "pr-4"
            )}
          />

          {withButton ? (
            <button
              type="submit"
              className={classNames(
                "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-brand-gradient font-bold text-white transition hover:brightness-110",
                tall ? "h-11 px-6 text-sm" : "h-8 px-4 text-[13px]"
              )}
            >
              Search
            </button>
          ) : null}
        </div>
      </form>

      {open && items.length > 0 ? (
        <ul
          role="listbox"
          className="surface absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] p-1.5 shadow-[var(--shadow-lift)]"
        >
          {items.map((item, index) => (
            <li key={item.slug}>
              <Link
                href={`/store/${item.slug}`}
                onClick={() => setOpen(false)}
                role="option"
                aria-selected={index === highlight}
                className={classNames(
                  "flex items-center gap-3 rounded-xl px-3 py-2 transition",
                  index === highlight ? "surface-sunken" : "hover:surface-sunken"
                )}
              >
                {item.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.logo}
                    alt=""
                    className="size-8 rounded-lg border border-[var(--border-subtle)] bg-white object-contain p-1"
                  />
                ) : (
                  <span className="size-8 rounded-lg surface-sunken" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.label}</span>
                <span className="shrink-0 text-xs text-faint">{item.offers} offers</span>
              </Link>
            </li>
          ))}

          <li>
            <button
              type="button"
              onClick={() => submit(term)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-brand-600 transition hover:surface-sunken"
            >
              See all results for “{term.trim()}” →
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
