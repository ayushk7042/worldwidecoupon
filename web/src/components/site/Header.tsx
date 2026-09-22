"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { classNames } from "@/lib/format";
import type { Category } from "@/lib/types";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";
import { useShopper } from "./ShopperProvider";

const PRIMARY_LINKS = [
  { href: "/coupons", label: "All offers" },
  { href: "/stores", label: "Stores" },
  { href: "/categories", label: "Categories" },
  { href: "/coupons?withCode=true", label: "Promo codes" },
];

export function Header({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const { shopper } = useShopper();

  // A navigation with the drawer open would leave it hanging over the new page.
  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
  }, [pathname]);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0] ?? href);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="WorldwideCoupons home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-lg font-black text-white shadow-[var(--shadow-glow)]">
            W
          </span>
          <span className="hidden text-[17px] font-extrabold tracking-tight sm:block">
            Worldwide<span className="text-brand-gradient">Coupons</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={classNames(
                "rounded-lg px-3 py-2 text-sm font-semibold transition",
                active(link.href)
                  ? "text-brand-600"
                  : "text-[var(--text-secondary)] hover:surface-sunken hover:text-[var(--text-primary)]"
              )}
            >
              {link.label}
            </Link>
          ))}

          {categories.length ? (
            <div
              className="relative"
              onMouseEnter={() => setCatsOpen(true)}
              onMouseLeave={() => setCatsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCatsOpen((open) => !open)}
                aria-expanded={catsOpen}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:surface-sunken hover:text-[var(--text-primary)]"
              >
                Browse
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" />
                </svg>
              </button>

              {catsOpen ? (
                <div className="surface absolute left-0 top-full w-[34rem] animate-[pop_0.15s_ease-out] rounded-2xl border border-[var(--border-subtle)] p-3 shadow-[var(--shadow-lift)]">
                  <div className="grid grid-cols-2 gap-1">
                    {categories.slice(0, 14).map((category) => (
                      <Link
                        key={category._id}
                        href={`/category/${category.slug}`}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition hover:surface-sunken"
                      >
                        <span className="text-lg">{category.icon ?? "🏷️"}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {category.name}
                        </span>
                        <span className="shrink-0 text-xs text-faint tabular-nums">
                          {category.activeCouponCount}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/categories"
                    className="mt-2 block rounded-xl px-3 py-2 text-sm font-semibold text-brand-600 transition hover:surface-sunken"
                  >
                    All categories →
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>

        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <ThemeToggle />

          {shopper ? (
            <Link
              href="/account"
              className="hidden h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] pl-1 pr-3 text-sm font-semibold transition hover:border-brand-300 sm:inline-flex"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                {shopper.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-24 truncate">{shopper.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <Link
              href="/account/login"
              className="hidden h-10 items-center rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 sm:inline-flex"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-subtle)] lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] px-4 py-2.5 md:hidden">
        <SearchBox />
      </div>

      {menuOpen ? (
        <div className="surface max-h-[70vh] overflow-y-auto border-t border-[var(--border-subtle)] px-4 py-3 lg:hidden">
          <nav className="grid gap-1">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:surface-sunken"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={shopper ? "/account" : "/account/login"}
              className="rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:surface-sunken"
            >
              {shopper ? "My account" : "Sign in"}
            </Link>
          </nav>

          {categories.length ? (
            <>
              <p className="mt-4 px-3 text-xs font-bold uppercase tracking-wider text-faint">
                Categories
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-1">
                {categories.slice(0, 12).map((category) => (
                  <Link
                    key={category._id}
                    href={`/category/${category.slug}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:surface-sunken"
                  >
                    <span>{category.icon ?? "🏷️"}</span>
                    <span className="truncate">{category.name}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
