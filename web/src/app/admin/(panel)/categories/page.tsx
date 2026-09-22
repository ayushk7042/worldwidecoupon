"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { StatusPill } from "@/components/admin/DataTable";
import { FormSection, ImagePicker } from "@/components/admin/fields";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/primitives";
import { categories as categoriesApi } from "@/lib/endpoints";
import { formatCount } from "@/lib/format";
import { readToken } from "@/lib/session";
import type { Category, ImageRef } from "@/lib/types";

export default function AdminCategoriesPage() {
  const list = useAdminData((token) => categoriesApi.list({ status: "all", limit: 500, includeHidden: true }, { token }));
  const { busy, run } = useAction();

  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [order, setOrder] = useState<Category[]>([]);

  useEffect(() => {
    if (list.data) setOrder(list.data);
  }, [list.data]);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [row] = next.splice(index, 1);
    if (row) next.splice(target, 0, row);
    setOrder(next);
  };

  const saveOrder = () =>
    void run(
      () =>
        categoriesApi.reorder(
          order.map((item, index) => ({ id: item._id, order: index })),
          readToken("admin")
        ),
      { success: "Order saved", onDone: list.reload }
    );

  const dirtyOrder =
    Boolean(list.data) && order.some((item, index) => list.data?.[index]?._id !== item._id);

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle={list.data ? `${list.data.length} categories` : undefined}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() => categoriesApi.refreshCounts(readToken("admin")), {
                  success: "Counts recalculated",
                  onDone: list.reload,
                })
              }
            >
              Recount
            </Button>
            <Button onClick={() => setEditing("new")}>New category</Button>
          </div>
        }
      />

      {dirtyOrder ? (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-50 px-4 py-3 text-sm dark:bg-brand-950/40">
          <span className="font-semibold">Order changed.</span>
          <Button size="sm" loading={busy} onClick={saveOrder}>
            Save order
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOrder(list.data ?? [])}>
            Reset
          </Button>
        </div>
      ) : null}

      {list.loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="surface divide-y divide-[var(--border-subtle)] overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          {order.map((category, index) => (
            <div key={category._id} className="flex flex-wrap items-center gap-3 p-4">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: category.color ? `${category.color}20` : "var(--surface-sunken)" }}
              >
                {category.icon ?? "🗂"}
              </span>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  className="block truncate text-left font-semibold hover:text-brand-600"
                >
                  {category.name}
                </button>
                <span className="text-xs text-faint">
                  /{category.slug} · {formatCount(category.activeCouponCount)} live offers ·{" "}
                  {formatCount(category.storeCount)} stores
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {category.featured ? <Tag label="Featured" /> : null}
                {category.showOnHome ? <Tag label="Home" /> : null}
                {category.showInMenu ? <Tag label="Menu" /> : null}
                {category.hidden ? <Tag label="Hidden" /> : null}
                <StatusPill status={category.status} />
              </div>

              <div className="flex gap-1">
                <IconButton label="Move up" onClick={() => move(index, -1)}>
                  ↑
                </IconButton>
                <IconButton label="Move down" onClick={() => move(index, 1)}>
                  ↓
                </IconButton>
                <Link
                  href={`/admin/coupons?category=${category._id}`}
                  className="inline-flex h-9 items-center rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-semibold transition hover:surface-sunken"
                >
                  Offers
                </Link>
                <Button size="sm" variant="secondary" onClick={() => setEditing(category)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(category)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        open={editing !== null}
        category={editing === "new" ? undefined : (editing ?? undefined)}
        parents={list.data ?? []}
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
        title={`Delete ${deleting?.name ?? "this category"}?`}
        body="Offers and stores keep working; they simply lose this category. This cannot be undone."
        onConfirm={() => {
          if (!deleting) return;
          void run(() => categoriesApi.remove(deleting._id, readToken("admin")), {
            success: "Category deleted",
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

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-faint">
      {label}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-sm transition hover:surface-sunken"
    >
      {children}
    </button>
  );
}

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  shortLabel: string;
  color: string;
  parent: string;
  order: string;
  priority: string;
  featured: boolean;
  showOnHome: boolean;
  showInMenu: boolean;
  showInFooter: boolean;
  hidden: boolean;
  status: string;
  image: ImageRef | null;
  banner: ImageRef | null;
  metaTitle: string;
  metaDescription: string;
}

const BLANK: CategoryFormState = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  shortLabel: "",
  color: "",
  parent: "",
  order: "0",
  priority: "0",
  featured: false,
  showOnHome: true,
  showInMenu: true,
  showInFooter: false,
  hidden: false,
  status: "active",
  image: null,
  banner: null,
  metaTitle: "",
  metaDescription: "",
};

function CategoryModal({
  open,
  category,
  parents,
  onClose,
  onSaved,
}: {
  open: boolean;
  category?: Category;
  parents: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { busy, run } = useAction();
  const [form, setForm] = useState<CategoryFormState>(BLANK);

  useEffect(() => {
    if (!open) return;
    setForm(
      category
        ? {
            ...BLANK,
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
            icon: category.icon ?? "",
            shortLabel: category.shortLabel ?? "",
            color: category.color ?? "",
            parent: typeof category.parent === "string" ? category.parent : "",
            order: String(category.order ?? 0),
            priority: String(category.priority ?? 0),
            featured: category.featured,
            showOnHome: category.showOnHome,
            showInMenu: category.showInMenu,
            showInFooter: category.showInFooter,
            hidden: category.hidden,
            status: category.status,
            image: category.image ?? null,
            banner: category.banner ?? null,
            metaTitle: category.metaTitle ?? "",
            metaDescription: category.metaDescription ?? "",
          }
        : BLANK
    );
  }, [open, category]);

  const set = <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const payload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || undefined,
    icon: form.icon.trim() || undefined,
    shortLabel: form.shortLabel.trim() || undefined,
    color: form.color.trim() || undefined,
    parent: form.parent || null,
    order: Number(form.order || 0),
    priority: Number(form.priority || 0),
    featured: form.featured,
    showOnHome: form.showOnHome,
    showInMenu: form.showInMenu,
    showInFooter: form.showInFooter,
    hidden: form.hidden,
    status: form.status,
    image: form.image,
    banner: form.banner,
    metaTitle: form.metaTitle.trim() || undefined,
    metaDescription: form.metaDescription.trim() || undefined,
  });

  const save = () =>
    void run(
      () =>
        category
          ? categoriesApi.update(category._id, payload(), readToken("admin"))
          : categoriesApi.create(payload(), readToken("admin")),
      { success: category ? "Category saved" : "Category created", onDone: onSaved }
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={category ? `Edit ${category.name}` : "New category"}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" required value={form.name} onChange={(event) => set("name", event.target.value)} />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="Generated from the name"
          />
        </div>

        <Textarea
          label="Description"
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Icon"
            value={form.icon}
            onChange={(event) => set("icon", event.target.value)}
            placeholder="👗"
            hint="A single emoji."
          />
          <Input
            label="Short label"
            value={form.shortLabel}
            onChange={(event) => set("shortLabel", event.target.value)}
            placeholder="Fashion"
          />
          <Input
            label="Colour"
            value={form.color}
            onChange={(event) => set("color", event.target.value)}
            placeholder="#ec4899"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Parent"
            value={form.parent}
            onChange={(event) => set("parent", event.target.value)}
            options={[
              { value: "", label: "Top level" },
              ...parents
                .filter((item) => item._id !== category?._id)
                .map((item) => ({ value: item._id, label: item.name })),
            ]}
          />
          <Input label="Order" type="number" value={form.order} onChange={(event) => set("order", event.target.value)} />
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
            options={[
              { value: "active", label: "active" },
              { value: "inactive", label: "inactive" },
            ]}
          />
        </div>

        <FormSection title="Where it appears">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={form.featured} onChange={(value) => set("featured", value)} label="Featured" />
            <Toggle checked={form.showOnHome} onChange={(value) => set("showOnHome", value)} label="Show on the homepage" />
            <Toggle checked={form.showInMenu} onChange={(value) => set("showInMenu", value)} label="Show in the menu" />
            <Toggle checked={form.showInFooter} onChange={(value) => set("showInFooter", value)} label="Show in the footer" />
            <Toggle checked={form.hidden} onChange={(value) => set("hidden", value)} label="Hide everywhere" />
          </div>
        </FormSection>

        <ImagePicker label="Tile image" value={form.image} onChange={(value) => set("image", value)} />
        <ImagePicker label="Banner" value={form.banner} onChange={(value) => set("banner", value)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Meta title"
            value={form.metaTitle}
            onChange={(event) => set("metaTitle", event.target.value)}
          />
          <Input
            label="Meta description"
            value={form.metaDescription}
            onChange={(event) => set("metaDescription", event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
