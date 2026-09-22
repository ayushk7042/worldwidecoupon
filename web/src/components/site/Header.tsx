"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Flame,
  LayoutGrid,
  Menu,
  Star,
  Store,
  Tag,
  Ticket,
  Truck,
  User,
  X,
} from "lucide-react";
import { CategoryIcon } from "@/components/ui/icons";
import { classNames } from "@/lib/format";
import type { Category } from "@/lib/types";
import { Logo } from "./Logo";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";
import { useShopper } from "./ShopperProvider";

/** The strip under the search bar — the paths shoppers actually use. */
const PRIMARY_LINKS = [
  { href: "/coupons", label: "All offers", Icon: Tag },
  { href: "/coupons?withCode=true", label: "Promo codes", Icon: Ticket },
  { href: "/stores", label: "Stores", Icon: Store },
  { href: "/coupons?type=freeshipping", label: "Free delivery", Icon: Truck },
  { href: "/coupons?exclusive=true", label: "Exclusives", Icon: Star },
  { href: "/coupons?expiringSoon=true", label: "Ending soon", Icon: Clock3 },
];

export function Header({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { shopper } = useShopper();

  // The bar tightens and gains a shadow once the page moves, so it reads as
  // floating above the content rather than welded to the top of it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A navigation with the drawer open would leave it hanging over the new page.
  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
  }, [pathname]);

  const active = (href: string) => {
    const [path, query] = href.split("?");
    if (!path || query) return false;
    return path === "/" ? pathname === "/" : pathname.startsWith(path);
  };

  return (
    <header
      className={classNames(
        "sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-xl transition-shadow duration-300",
        scrolled
          ? "shadow-[0_10px_30px_-18px_rgba(31,41,55,0.45)] dark:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]"
          : "shadow-[0_1px_0_0_var(--border-subtle)]"
      )}
    >
      {/* ---- row one: brand, search, account ---- */}
      <div
        className={classNames(
          "shell flex items-center gap-4 transition-[height] duration-300 sm:gap-6",
          scrolled ? "h-16 sm:h-[68px]" : "h-16 sm:h-[78px]"
        )}
      >
        <Logo height={scrolled ? 34 : 40} priority className="transition-all duration-300" />

        <div className="ml-auto hidden max-w-2xl flex-1 md:block">
          <SearchBox withButton placeholder="Search a store or a brand — Amazon, Nike, Etsy…" />
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:border-brand-300 hover:text-brand-600" />

          {shopper ? (
            <Link
              href="/account"
              className="hidden h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] pl-1 pr-3.5 text-sm font-semibold transition hover:border-brand-400 hover:text-brand-700 sm:inline-flex"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                {shopper.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-24 truncate">{shopper.name.split(" ")[0]}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/account/login"
                className="hidden h-10 items-center rounded-full px-3.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-brand-600 lg:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/account/register"
                className="hidden h-10 items-center rounded-full bg-brand-gradient px-5 text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-strong)] hover:brightness-110 sm:inline-flex"
              >
                Join free
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-subtle)] lg:hidden"
          >
            {menuOpen ? (
              <X aria-hidden className="size-5" />
            ) : (
              <Menu aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* ---- row two: the category strip ---- */}
      <div className="hidden border-t border-[var(--border-subtle)] bg-brand-50/60 dark:bg-brand-950/25 lg:block">
        <div className="shell flex h-12 items-center gap-1">
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
                className={classNames(
                  "mr-3 flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition",
                  catsOpen
                    ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                    : "bg-brand-gradient text-white hover:brightness-110"
                )}
              >
                <LayoutGrid aria-hidden className="size-4" strokeWidth={2.2} />
                Categories
              </button>

              {catsOpen ? (
                <div className="surface absolute left-0 top-full z-50 mt-1 w-[48rem] animate-[pop_0.16s_ease-out] rounded-3xl border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-lift)]">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-faint">
                      Shop by category
                    </span>
                    <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {categories.slice(0, 16).map((category) => (
                      <Link
                        key={category._id}
                        href={`/category/${category.slug}`}
                        className="group/cat flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-all duration-200 hover:-translate-y-px hover:bg-brand-50 hover:shadow-[var(--shadow-card)] dark:hover:bg-brand-950/50"
                      >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-accent-100 text-brand-700 transition-transform duration-200 group-hover/cat:scale-110 dark:bg-brand-950/70 dark:text-brand-300">
                          <CategoryIcon name={category.name} className="size-4.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {category.name}
                        </span>
                        <span className="shrink-0 text-xs text-faint tabular-nums">
                          {category.activeCouponCount}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 p-3 dark:bg-brand-950/40">
                    <span className="text-sm font-semibold text-body">
                      Looking for something specific?
                    </span>
                    <Link
                      href="/categories"
                      className="ml-auto inline-flex h-9 items-center gap-1 rounded-full bg-brand-gradient px-4 text-sm font-bold text-white transition hover:brightness-110"
                    >
                      Browse every category
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto no-scrollbar">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "group/link relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
                  active(link.href)
                    ? "bg-[var(--surface)] text-brand-700 shadow-[var(--shadow-card)] dark:text-brand-300"
                    : "text-[var(--text-secondary)] hover:-translate-y-px hover:bg-[var(--surface)] hover:text-brand-700 hover:shadow-[var(--shadow-card)] dark:hover:text-brand-300"
                )}
              >
                <link.Icon
                  aria-hidden
                  className="size-4 transition-transform duration-200 group-hover/link:scale-110"
                  strokeWidth={2}
                />
                {link.label}
                <span
                  aria-hidden
                  className={classNames(
                    "absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-brand-gradient transition-transform duration-300",
                    active(link.href) ? "scale-x-100" : "scale-x-0 group-hover/link:scale-x-100"
                  )}
                />
              </Link>
            ))}
          </nav>

          <Link
            href="/coupons?sort=discount"
            className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent-300 px-4 text-sm font-bold text-accent-600 transition hover:brightness-95 dark:bg-accent-600/20 dark:text-accent-400"
          >
            <Flame aria-hidden className="size-4" strokeWidth={2.2} />
            Biggest savings today
          </Link>
        </div>
      </div>

      {/* ---- mobile search ---- */}
      <div className="border-t border-[var(--border-subtle)] px-4 py-2.5 md:hidden">
        <SearchBox withButton />
      </div>

      {menuOpen ? (
        <div className="surface max-h-[75vh] overflow-y-auto border-t border-[var(--border-subtle)] px-4 py-3 lg:hidden">
          <nav className="grid gap-1">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
              >
                <link.Icon aria-hidden className="size-4" strokeWidth={2} />
                {link.label}
              </Link>
            ))}
            <Link
              href={shopper ? "/account" : "/account/login"}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
            >
              <User aria-hidden className="size-4" strokeWidth={2} />
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
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-brand-50 dark:hover:bg-brand-950/50"
                  >
                    <CategoryIcon name={category.name} className="size-4 text-brand-600" />
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
