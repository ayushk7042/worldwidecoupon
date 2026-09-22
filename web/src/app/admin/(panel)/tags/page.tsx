"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { DataTable, Pager, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData, useDebounced } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Toggle } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { tags as tagsApi } from "@/lib/endpoints";
import { formatCount, timeAgo } from "@/lib/format";
import { readToken } from "@/lib/session";
import type { Tag } from "@/lib/types";

export default function AdminTagsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Tag | "new" | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  const debouncedSearch = useDebounced(search);
  const query = useMemo(
    () => ({ page, limit: 30, ...(debouncedSearch ? { search: debouncedSearch } : {}) }),
    [page, debouncedSearch]
  );

  const list = useAdminData((token) => tagsApi.list(query, { token }), [query]);
  const { busy, run } = useAction();

  const columns: Column<Tag>[] = [
    {
      key: "name",
      header: "Tag",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.color ? (
            <span className="size-3 rounded-full" style={{ backgroundColor: row.color }} />
          ) : null}
          <button
            type="button"
            onClick={() => setEditing(row)}
            className="font-semibold hover:text-brand-600"
          >
            {row.name}
          </button>
          {row.featured ? (
            <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              Featured
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      width: "14rem",
      render: (row) => (
        <Link href={`/tag/${row.slug}`} target="_blank" className="text-xs text-faint hover:text-brand-600">
          /tag/{row.slug}
        </Link>
      ),
    },
    {
      key: "count",
      header: "Offers",
      width: "6rem",
      render: (row) => <span className="text-xs tabular-nums text-body">{formatCount(row.couponCount)}</span>,
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
          <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tags"
        subtitle={list.data ? `${formatCount(list.data.pagination.total)} tags` : undefined}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() => tagsApi.refreshCounts(readToken("admin")), {
                  success: "Counts recalculated",
                  onDone: list.reload,
                })
              }
            >
              Recount
            </Button>
            <Button onClick={() => setEditing("new")}>New tag</Button>
          </div>
        }
      />

      <Input
        placeholder="Search tags…"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        className="mb-4 max-w-sm"
      />

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.loading}
        empty={<p className="text-sm text-body">No tags yet — they are created automatically when you tag an offer.</p>}
      />

      <Pager page={page} pages={list.data?.pagination.pages ?? 1} onChange={setPage} />

      <TagModal
        open={editing !== null}
        tag={editing === "new" ? undefined : (editing ?? undefined)}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await list.reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={busy}
        title={`Delete ${deleting?.name ?? "this tag"}?`}
        body="Offers keep their other tags. This cannot be undone."
        onConfirm={() => {
          if (!deleting) return;
          void run(() => tagsApi.remove(deleting._id, readToken("admin")), {
            success: "Tag deleted",
            onDone: async () => {
              setDeleting(null);
              await list.reload();
            },
          });
        }}
      />
    </>
  );
}

function TagModal({
  open,
  tag,
  onClose,
  onSaved,
}: {
  open: boolean;
  tag?: Tag;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { busy, run } = useAction();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [featured, setFeatured] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(tag?.name ?? "");
    setSlug(tag?.slug ?? "");
    setDescription(tag?.description ?? "");
    setColor(tag?.color ?? "");
    setFeatured(tag?.featured ?? false);
  }, [open, tag]);

  const save = () => {
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      color: color.trim() || undefined,
      featured,
    };

    void run(
      () =>
        tag
          ? tagsApi.update(tag._id, payload, readToken("admin"))
          : tagsApi.create(payload, readToken("admin")),
      { success: tag ? "Tag saved" : "Tag created", onDone: onSaved }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tag ? `Edit ${tag.name}` : "New tag"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
        <Input
          label="Slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="Generated from the name"
        />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <Input label="Colour" value={color} onChange={(event) => setColor(event.target.value)} placeholder="#0ea5e9" />
        <Toggle checked={featured} onChange={setFeatured} label="Featured" hint="Featured tags surface in the site navigation." />
      </div>
    </Modal>
  );
}
