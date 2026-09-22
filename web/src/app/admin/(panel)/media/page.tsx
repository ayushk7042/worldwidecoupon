"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { Pager } from "@/components/admin/DataTable";
import { useAction, useAdminData, useDebounced } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { media as mediaApi } from "@/lib/endpoints";
import { classNames, formatCount } from "@/lib/format";
import { readToken } from "@/lib/session";
import type { Media } from "@/lib/types";

const FOLDERS = ["general", "stores", "categories", "coupons", "ads", "homepage"];

export default function AdminMediaPage() {
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<Media | null>(null);
  const [deleting, setDeleting] = useState<Media | null>(null);
  const [registering, setRegistering] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { busy, run } = useAction();

  const debouncedSearch = useDebounced(search);
  const query = useMemo(
    () => ({
      page,
      limit: 48,
      ...(folder ? { folder } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [page, folder, debouncedSearch]
  );

  const list = useAdminData((token) => mediaApi.list(query, token), [query]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      await mediaApi.upload(files, folder || "general", readToken("admin"));
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
      await list.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <PageHeader
        title="Media library"
        subtitle={list.data ? `${formatCount(list.data.pagination.total)} files` : undefined}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRegistering(true)}>
              Add by URL
            </Button>
            <Button loading={uploading} onClick={() => input.current?.click()}>
              Upload
            </Button>
          </div>
        }
      />

      <input
        ref={input}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={(event) => void upload(event.target.files)}
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Search files…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={folder}
          onChange={(event) => {
            setFolder(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Every folder" },
            ...FOLDERS.map((value) => ({ value, label: value })),
          ]}
        />
      </div>

      {list.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      ) : list.data?.items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {list.data.items.map((item) => (
            <figure
              key={item._id}
              className="surface group overflow-hidden rounded-xl border border-[var(--border-subtle)]"
            >
              <button
                type="button"
                onClick={() => setEditing(item)}
                className="block w-full bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbnailUrl ?? item.secureUrl ?? item.url}
                  alt={item.alt ?? item.name}
                  className="aspect-square w-full object-contain p-2"
                />
              </button>

              <figcaption className="border-t border-[var(--border-subtle)] px-2 py-1.5">
                <p className="truncate text-[11px] font-semibold">{item.name}</p>
                <p className="flex items-center gap-1 text-[10px] text-faint">
                  <span className="truncate">{item.folder}</span>
                  {item.usageCount ? <span>· used {item.usageCount}×</span> : null}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div
          className={classNames(
            "surface rounded-2xl border border-dashed border-[var(--border-strong)] p-14 text-center"
          )}
        >
          <p className="text-sm text-body">Nothing here yet — upload an image to get started.</p>
        </div>
      )}

      <Pager page={page} pages={list.data?.pagination.pages ?? 1} onChange={setPage} />

      <MediaDetails
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await list.reload();
        }}
        onDelete={(item) => {
          setEditing(null);
          setDeleting(item);
        }}
      />

      <RegisterByUrl
        open={registering}
        folder={folder || "general"}
        onClose={() => setRegistering(false)}
        onSaved={async () => {
          setRegistering(false);
          await list.reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={busy}
        title={`Delete ${deleting?.name ?? "this file"}?`}
        body="Anything still pointing at this file will show a broken image. This cannot be undone."
        onConfirm={() => {
          if (!deleting) return;
          void run(() => mediaApi.remove(deleting._id, readToken("admin")), {
            success: "File deleted",
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

function MediaDetails({
  item,
  onClose,
  onSaved,
  onDelete,
}: {
  item: Media | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onDelete: (item: Media) => void;
}) {
  const { busy, run } = useAction();
  const toast = useToast();

  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [credit, setCredit] = useState("");

  useEffect(() => {
    setAlt(item?.alt ?? "");
    setCaption(item?.caption ?? "");
    setTitle(item?.title ?? "");
    setCredit(item?.credit ?? "");
  }, [item]);

  if (!item) return null;

  const url = item.secureUrl ?? item.url;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={item.name}
      description={`${item.folder} · ${item.width ?? "?"}×${item.height ?? "?"} · ${
        item.bytes ? `${Math.round(item.bytes / 1024)} KB` : "unknown size"
      }`}
      footer={
        <>
          <Button variant="ghost" onClick={() => onDelete(item)}>
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button
            loading={busy}
            onClick={() =>
              void run(
                () => mediaApi.update(item._id, { alt, caption, title, credit }, readToken("admin")),
                { success: "Details saved", onDone: onSaved }
              )
            }
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={item.alt ?? item.name} className="mx-auto max-h-64 object-contain" />
        </div>

        <div className="flex gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(url);
              toast.success("URL copied");
            }}
          >
            Copy
          </Button>
        </div>

        <Input label="Alt text" value={alt} onChange={(event) => setAlt(event.target.value)} hint="Describe the image for screen readers." />
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea label="Caption" value={caption} onChange={(event) => setCaption(event.target.value)} />
        <Input label="Credit" value={credit} onChange={(event) => setCredit(event.target.value)} />
      </div>
    </Modal>
  );
}

function RegisterByUrl({
  open,
  folder,
  onClose,
  onSaved,
}: {
  open: boolean;
  folder: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { busy, run } = useAction();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    if (!open) return;
    setUrl("");
    setName("");
    setAlt("");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add an image by URL"
      description="For artwork already hosted elsewhere — brand logos, network banners."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={() =>
              void run(
                () =>
                  mediaApi.register(
                    { url: url.trim(), name: name.trim() || undefined, alt: alt.trim() || undefined, folder },
                    readToken("admin")
                  ),
                { success: "Image added", onDone: onSaved }
              )
            }
          >
            Add
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Image URL" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Taken from the URL if blank" />
        <Input label="Alt text" value={alt} onChange={(event) => setAlt(event.target.value)} />
      </div>
    </Modal>
  );
}
