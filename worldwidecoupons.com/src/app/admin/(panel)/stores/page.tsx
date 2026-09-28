"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { BulkBar, DataTable, Pager, StatusPill, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData, useDebounced } from "@/components/admin/hooks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/form";
import { StoreLogo } from "@/components/ui/primitives";
import { categories as categoriesApi, stores as storesApi } from "@/lib/endpoints";
import { formatCount, timeAgo } from "@/lib/format";
import type { Store, StoreQuery } from "@/lib/types";

const PER_PAGE = 25;

export default function AdminStoresPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StoreQuery["status"]>("all");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<StoreQuery["sort"]>("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounced(search);

  const query = useMemo<StoreQuery>(
    () => ({
      page,
      limit: PER_PAGE,
      status,
      sort,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(category ? { category } : {}),
    }),
    [page, status, sort, debouncedSearch, category]
  );

  const list = useAdminData((token) => storesApi.list(query, { token }), [query]);
  const categoryList = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));
  const { busy, run } = useAction();

  const ids = [...selected];

  const columns: Column<Store>[] = [
    {
      key: "name",
      header: "Store",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <StoreLogo name={row.name} logo={row.logo} size={36} />
          <div className="min-w-0">
            <Link href={`/admin/stores/${row._id}`} className="block truncate font-semibold hover:text-brand-600">
              {row.name}
            </Link>
            <span className="truncate text-xs text-faint">{row.domain ?? row.websiteUrl ?? "—"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "offers",
      header: "Live offers",
      width: "8rem",
      render: (row) => (
        <span className="text-xs tabular-nums text-body">
          {formatCount(row.activeCouponCount)}
          <span className="text-faint"> ({formatCount(row.codeCount)} codes)</span>
        </span>
      ),
    },
    {
      key: "clicks",
      header: "Clicks",
      width: "6rem",
      render: (row) => <span className="text-xs tabular-nums text-faint">{formatCount(row.clicks)}</span>,
    },
    {
      key: "flags",
      header: "Flags",
      width: "9rem",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.featured ? <Flag label="Featured" /> : null}
          {row.popular ? <Flag label="Popular" /> : null}
          {row.trending ? <Flag label="Trending" /> : null}
          {row.verified ? <Flag label="Verified" /> : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "6rem",
      render: (row) => <StatusPill status={row.status} />,
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
      width: "10rem",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(() => storesApi.refresh(row._id), { success: "Counters recalculated", onDone: list.reload })
            }
          >
            Recount
          </Button>
          <ButtonLink size="sm" variant="secondary" href={`/admin/stores/${row._id}`}>
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
        title="Stores"
        subtitle={list.data ? `${formatCount(list.data.pagination.total)} stores` : undefined}
        action={<ButtonLink href="/admin/stores/new">New store</ButtonLink>}
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search stores…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          value={status ?? "all"}
          onChange={(event) => {
            setStatus(event.target.value as StoreQuery["status"]);
            setPage(1);
          }}
          options={[
            { value: "all", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
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
            ...(categoryList.data ?? []).map((item) => ({ value: item._id, label: item.name })),
          ]}
        />

        <Select
          value={sort ?? "name"}
          onChange={(event) => setSort(event.target.value as StoreQuery["sort"])}
          options={[
            { value: "name", label: "A–Z" },
            { value: "offers", label: "Most offers" },
            { value: "clicks", label: "Most clicks" },
            { value: "newest", label: "Newest" },
            { value: "priority", label: "Priority" },
          ]}
        />
      </div>

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.loading}
        selectable
        selected={selected}
        onSelect={setSelected}
        empty={<p className="text-sm text-body">No stores match these filters.</p>}
      />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        {(["active", "inactive"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() => storesApi.bulkStatus(ids, value), {
                success: `Moved ${ids.length} to ${value}`,
                onDone: async () => {
                  setSelected(new Set());
                  await list.reload();
                },
              })
            }
          >
            Mark {value}
          </Button>
        ))}
      </BulkBar>

      <Pager page={page} pages={pages} onChange={setPage} />
    </>
  );
}

function Flag({ label }: { label: string }) {
  return (
    <span className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-faint">
      {label}
    </span>
  );
}
