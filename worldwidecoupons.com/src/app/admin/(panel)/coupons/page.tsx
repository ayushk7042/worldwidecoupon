"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { BulkBar, DataTable, Pager, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData, useDebounced } from "@/components/admin/hooks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StoreLogo } from "@/components/ui/primitives";
import { coupons as couponsApi, categories as categoriesApi, stores as storesApi } from "@/lib/endpoints";
import { COUPON_TYPE_LABELS, formatCount, formatDate, storeOf, timeAgo } from "@/lib/format";
import { COUPON_STATUSES, COUPON_TYPES, type CouponQuery, type CouponView } from "@/lib/types";

const PER_PAGE = 25;

function CouponsScreen() {
  const params = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [type, setType] = useState("");
  const [store, setStore] = useState(params.get("store") ?? "");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<CouponQuery["sort"]>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const debouncedSearch = useDebounced(search);

  const query = useMemo<CouponQuery>(
    () => ({
      page,
      limit: PER_PAGE,
      status: status as CouponQuery["status"],
      sort,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(type ? { type: type as CouponQuery["type"] } : {}),
      ...(store ? { store } : {}),
      ...(category ? { category } : {}),
    }),
    [page, status, sort, debouncedSearch, type, store, category]
  );

  const list = useAdminData((token) => couponsApi.list(query, { token }), [query]);
  const storeOptions = useAdminData((token) => storesApi.list({ limit: 300, sort: "name", status: "all" }, { token }));
  const categoryOptions = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));

  const { busy, run } = useAction();

  const ids = [...selected];

  const afterBulk = async () => {
    setSelected(new Set());
    await list.reload();
  };

  const columns: Column<CouponView>[] = [
    {
      key: "title",
      header: "Offer",
      render: (row) => {
        const rowStore = storeOf(row);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <StoreLogo name={rowStore?.name ?? "?"} logo={rowStore?.logo} size={36} />
            <div className="min-w-0">
              <Link href={`/admin/coupons/${row._id}`} className="block truncate font-semibold hover:text-brand-600">
                {row.title}
              </Link>
              <span className="text-xs text-faint">
                {rowStore?.name ?? "No store"}
                {row.code ? ` · ${row.code}` : ""}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      width: "7rem",
      render: (row) => (
        <span className="text-xs font-semibold text-body">{COUPON_TYPE_LABELS[row.type] ?? row.type}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "9rem",
      render: (row) => (
        <select
          value={row.status}
          disabled={busy}
          aria-label={`Status of ${row.title}`}
          onChange={(event) =>
            void run(() => couponsApi.setStatus(row._id, event.target.value), {
              success: `Moved to ${event.target.value}`,
              onDone: list.reload,
            })
          }
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold capitalize focus:border-brand-500 focus:outline-none"
        >
          {COUPON_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "expiry",
      header: "Expires",
      width: "8rem",
      render: (row) => (
        <span className="text-xs text-faint">
          {row.neverExpires ? "Never" : row.expiresAt ? formatDate(row.expiresAt) : "—"}
        </span>
      ),
    },
    {
      key: "stats",
      header: "Clicks / uses",
      width: "8rem",
      render: (row) => (
        <span className="text-xs tabular-nums text-faint">
          {formatCount(row.clicks)} / {formatCount(row.uses)}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      width: "7rem",
      render: (row) => <span className="text-xs text-faint">{timeAgo(row.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "9rem",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(() => couponsApi.verify(row._id), {
                success: "Marked as verified",
                onDone: list.reload,
              })
            }
          >
            Verify
          </Button>
          <ButtonLink size="sm" variant="secondary" href={`/admin/coupons/${row._id}`}>
            Edit
          </ButtonLink>
        </div>
      ),
    },
  ];

  const pages = list.data?.pagination.pages ?? 1;

  return (
    <>
      <PageHeader
        title="Coupons & deals"
        subtitle={list.data ? `${formatCount(list.data.pagination.total)} offers` : undefined}
        action={
          <div className="flex gap-2">
            <ButtonLink variant="secondary" href="/admin/import">
              Import a sheet
            </ButtonLink>
            <ButtonLink href="/admin/coupons/new">New offer</ButtonLink>
          </div>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          placeholder="Search title or code…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="lg:col-span-2"
        />

        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "Any status" },
            ...COUPON_STATUSES.map((value) => ({ value, label: value })),
          ]}
        />

        <Select
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Any type" },
            ...COUPON_TYPES.map((value) => ({ value, label: COUPON_TYPE_LABELS[value] })),
          ]}
        />

        <Select
          value={store}
          onChange={(event) => {
            setStore(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Any store" },
            ...(storeOptions.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
          ]}
        />

        <Select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Any category" },
            ...(categoryOptions.data ?? []).map((item) => ({ value: item._id, label: item.name })),
          ]}
        />

        <Select
          value={sort ?? "newest"}
          onChange={(event) => setSort(event.target.value as CouponQuery["sort"])}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "expiring", label: "Expiring first" },
            { value: "popular", label: "Most clicked" },
            { value: "discount", label: "Biggest discount" },
            { value: "alphabetical", label: "A–Z" },
          ]}
          className="lg:col-span-1"
        />
      </div>

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.loading}
        selectable
        selected={selected}
        onSelect={setSelected}
        empty={
          <div className="space-y-3">
            <p className="text-sm text-body">No offers match these filters.</p>
            <ButtonLink href="/admin/coupons/new" size="sm">
              Add one
            </ButtonLink>
          </div>
        }
      />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        {COUPON_STATUSES.map((value) => (
          <Button
            key={value}
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() => couponsApi.bulkStatus(ids, value), {
                success: `Moved ${ids.length} to ${value}`,
                onDone: afterBulk,
              })
            }
          >
            {value}
          </Button>
        ))}
        <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </BulkBar>

      <Pager page={page} pages={pages} onChange={setPage} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={busy}
        title={`Delete ${ids.length} offers?`}
        body="This removes them from the site permanently. There is no undo."
        confirmLabel="Delete for good"
        onConfirm={() =>
          void run(() => couponsApi.bulkDelete(ids), {
            success: `Deleted ${ids.length} offers`,
            onDone: async () => {
              setConfirmDelete(false);
              await afterBulk();
            },
          })
        }
      />
    </>
  );
}

export default function AdminCouponsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <CouponsScreen />
    </Suspense>
  );
}
