"use client";

import { type ReactNode } from "react";
import { classNames } from "@/lib/format";
import { Checkbox } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/primitives";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Applied to both the header cell and every body cell in the column. */
  className?: string;
  width?: string;
}

/**
 * The one table every admin list uses.
 *
 * Selection is optional and lifted to the caller, because the bulk actions
 * that act on it differ per resource.
 */
export function DataTable<T extends { _id: string }>({
  rows,
  columns,
  loading,
  empty,
  selectable,
  selected,
  onSelect,
}: {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelect?: (next: Set<string>) => void;
}) {
  const allSelected = Boolean(rows.length && selected && rows.every((row) => selected.has(row._id)));

  const toggleAll = (checked: boolean) => {
    if (!onSelect) return;
    onSelect(checked ? new Set(rows.map((row) => row._id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    if (!onSelect || !selected) return;
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelect(next);
  };

  if (loading) {
    return (
      <div className="surface space-y-px overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 p-4">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="surface rounded-2xl border border-dashed border-[var(--border-strong)] p-14 text-center">
        {empty ?? <p className="text-sm text-body">Nothing here yet.</p>}
      </div>
    );
  }

  return (
    <div className="surface overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
      <table className="w-full min-w-[45rem] text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] surface-sunken text-left">
            {selectable ? (
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelected} onChange={toggleAll} />
              </th>
            ) : null}

            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={classNames(
                  "px-4 py-3 text-xs font-bold uppercase tracking-wide text-faint",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={row._id}
              className={classNames(
                "border-b border-[var(--border-subtle)] transition last:border-0",
                selected?.has(row._id) ? "bg-brand-50/60 dark:bg-brand-950/30" : "hover:surface-sunken"
              )}
            >
              {selectable ? (
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected?.has(row._id) ?? false}
                    onChange={(checked) => toggleOne(row._id, checked)}
                  />
                </td>
              ) : null}

              {columns.map((column) => (
                <td key={column.key} className={classNames("px-4 py-3", column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Page switcher for the admin lists, which hold their page in React state. */
export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (next: number) => void;
}) {
  if (pages <= 1) return null;

  const button =
    "h-9 rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-semibold transition " +
    "hover:border-brand-300 disabled:opacity-40 disabled:pointer-events-none";

  return (
    <nav aria-label="Pagination" className="mt-5 flex items-center justify-center gap-2">
      <button type="button" className={button} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Previous
      </button>
      <span className="px-2 text-sm text-faint tabular-nums">
        Page {page} of {pages}
      </span>
      <button type="button" className={button} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}

/** The bar that slides in once rows are selected. */
export function BulkBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (!count) return null;

  return (
    <div className="sticky bottom-4 z-30 mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lift)]">
      <span className="text-sm font-semibold">
        {count} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-sm font-semibold text-faint transition hover:text-[var(--text-primary)]"
      >
        Clear
      </button>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tones: Record<string, string> = {
    active: "bg-success-50 text-success-700 dark:bg-success-700/15 dark:text-success-500",
    expired: "bg-danger-50 text-danger-600 dark:bg-danger-500/10",
    draft: "bg-warn-50 text-warn-600 dark:bg-warn-500/10",
    archived: "surface-sunken text-faint",
    inactive: "surface-sunken text-faint",
    paused: "bg-warn-50 text-warn-600 dark:bg-warn-500/10",
    new: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
    replied: "bg-success-50 text-success-700 dark:bg-success-700/15 dark:text-success-500",
    closed: "surface-sunken text-faint",
    spam: "bg-danger-50 text-danger-600 dark:bg-danger-500/10",
    completed: "bg-success-50 text-success-700 dark:bg-success-700/15 dark:text-success-500",
    importing: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
    failed: "bg-danger-50 text-danger-600 dark:bg-danger-500/10",
    rolled_back: "surface-sunken text-faint",
    validated: "bg-warn-50 text-warn-600 dark:bg-warn-500/10",
  };

  return (
    <span
      className={classNames(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[status] ?? "surface-sunken text-faint"
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
