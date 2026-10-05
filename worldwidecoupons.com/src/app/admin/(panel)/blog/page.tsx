"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { BlogSheetImport } from "@/components/admin/BlogSheetImport";
import { BulkBar, DataTable, Pager, StatusPill, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData, useDebounced } from "@/components/admin/hooks";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/form";
import { blog as blogApi } from "@/lib/endpoints";
import { formatCount, timeAgo } from "@/lib/format";
import type { Blog, BlogQuery } from "@/lib/types";

const PER_PAGE = 25;

export default function AdminBlogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogQuery["status"]>("all");
  const [sort, setSort] = useState<BlogQuery["sort"]>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounced(search);

  const query = useMemo<BlogQuery>(
    () => ({
      page,
      limit: PER_PAGE,
      status,
      sort,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [page, status, sort, debouncedSearch]
  );

  const list = useAdminData((token) => blogApi.list(query, { token }), [query]);
  const { busy, run } = useAction();

  const ids = [...selected];

  const columns: Column<Blog>[] = [
    {
      key: "title",
      header: "Post",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.image.url} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)] text-sm">
              📝
            </span>
          )}
          <div className="min-w-0">
            <Link href={`/admin/blog/${row._id}`} className="block truncate font-semibold hover:text-brand-600">
              {row.title}
            </Link>
            <span className="truncate text-xs text-faint">/blog/{row.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: "store",
      header: "Store",
      width: "8rem",
      render: (row) => (
        <span className="truncate text-xs text-body">
          {typeof row.store === "object" && row.store ? row.store.name : "—"}
        </span>
      ),
    },
    {
      key: "views",
      header: "Views",
      width: "6rem",
      render: (row) => <span className="text-xs tabular-nums text-faint">{formatCount(row.views)}</span>,
    },
    {
      key: "featured",
      header: "Featured",
      width: "6rem",
      render: (row) =>
        row.featured ? (
          <span className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-faint">
            Featured
          </span>
        ) : null,
    },
    {
      key: "status",
      header: "Status",
      width: "7rem",
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
      width: "6rem",
      className: "text-right",
      render: (row) => (
        <ButtonLink size="sm" variant="secondary" href={`/admin/blog/${row._id}`}>
          Edit
        </ButtonLink>
      ),
    },
  ];

  const pages = list.data?.pagination.pages ?? 1;

  return (
    <>
      <PageHeader
        title="Blog"
        subtitle={list.data ? `${formatCount(list.data.pagination.total)} posts` : undefined}
        action={<ButtonLink href="/admin/blog/new">New post</ButtonLink>}
      />

      <BlogSheetImport onImported={() => void list.reload()} />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Search posts…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <Select
          value={status ?? "all"}
          onChange={(event) => {
            setStatus(event.target.value as BlogQuery["status"]);
            setPage(1);
          }}
          options={[
            { value: "all", label: "Any status" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
            { value: "archived", label: "Archived" },
          ]}
        />

        <Select
          value={sort ?? "newest"}
          onChange={(event) => setSort(event.target.value as BlogQuery["sort"])}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
            { value: "popular", label: "Most viewed" },
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
        empty={<p className="text-sm text-body">No posts match these filters.</p>}
      />

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        {(["published", "draft", "archived"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(() => blogApi.bulkStatus(ids, value), {
                success: `Moved ${ids.length} to ${value}`,
                onDone: async () => {
                  setSelected(new Set());
                  await list.reload();
                  void fetch("/api/revalidate-blog", { method: "POST" }).catch(() => undefined);
                },
              })
            }
          >
            Mark {value}
          </Button>
        ))}
        <Button
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={() =>
            void run(() => blogApi.bulkDelete(ids), {
              success: `Deleted ${ids.length} post(s)`,
              onDone: async () => {
                setSelected(new Set());
                await list.reload();
                void fetch("/api/revalidate-blog", { method: "POST" }).catch(() => undefined);
              },
            })
          }
        >
          Delete
        </Button>
      </BulkBar>

      <Pager page={page} pages={pages} onChange={setPage} />
    </>
  );
}
