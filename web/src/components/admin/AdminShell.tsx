"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogoMark } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { classNames } from "@/lib/format";
import type { AdminPermission } from "@/lib/types";
import { useAdmin } from "./AdminProvider";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  permission?: AdminPermission;
  exact?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "▦", exact: true }],
  },
  {
    section: "Catalogue",
    items: [
      { href: "/admin/coupons", label: "Coupons & deals", icon: "🎟" },
      { href: "/admin/stores", label: "Stores", icon: "🏬", permission: "canManageStores" },
      { href: "/admin/categories", label: "Categories", icon: "🗂" },
      { href: "/admin/tags", label: "Tags", icon: "🏷" },
    ],
  },
  {
    section: "Site",
    items: [
      { href: "/admin/homepage", label: "Homepage", icon: "🏠" },
      { href: "/admin/ads", label: "Advertisements", icon: "📣" },
      { href: "/admin/media", label: "Media library", icon: "🖼" },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/admin/import", label: "Sheet import", icon: "📥", permission: "canImport" },
      { href: "/admin/messages", label: "Messages", icon: "✉" },
      { href: "/admin/team", label: "Team", icon: "👥", permission: "canManageUsers" },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin, logout, can } = useAdmin();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex min-h-dvh surface-muted">
      <aside
        className={classNames(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface)] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border-subtle)] px-5">
          <LogoMark size={30} title="" />
          <span className="text-sm font-extrabold tracking-tight">Admin panel</span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV.map((group) => {
            const items = group.items.filter(
              (item) => !item.permission || can(item.permission)
            );
            if (!items.length) return null;

            return (
              <div key={group.section}>
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                  {group.section}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={classNames(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                        isActive(item)
                          ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                          : "text-body hover:surface-sunken"
                      )}
                    >
                      <span aria-hidden className="w-5 text-center">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border-subtle)] p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-body transition hover:surface-sunken"
          >
            <span aria-hidden className="w-5 text-center">
              ↗
            </span>
            View the site
          </Link>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface)]/90 px-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menu"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:surface-sunken" />

            {admin ? (
              <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] py-1 pl-1 pr-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
                  {admin.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold sm:block">{admin.name}</span>
                <span className="hidden rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-faint sm:block">
                  {admin.role}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-semibold transition hover:border-danger-500 hover:text-danger-600"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/** Page header used at the top of every admin screen. */
export function PageHeader({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back ? (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-body transition hover:text-brand-600"
        >
          ← {back.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-body">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}
