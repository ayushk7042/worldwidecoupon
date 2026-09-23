"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { classNames } from "@/lib/format";
import { media as mediaApi } from "@/lib/endpoints";
import { readToken } from "@/lib/session";
import { useAdminData } from "./hooks";
import type { ImageRef } from "@/lib/types";

/** Checkbox list — used wherever a record belongs to several categories. */
export function MultiSelect({
  label,
  hint,
  options,
  value,
  onChange,
  columns = 2,
}: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  columns?: number;
}) {
  const [filter, setFilter] = useState("");

  const visible = filter
    ? options.filter((option) => option.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...new Set([...value, id])] : value.filter((item) => item !== id));
  };

  return (
    <Field label={label} hint={hint}>
      {options.length > 12 ? (
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter…"
          className="mb-2 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      ) : null}

      <div
        className={classNames(
          "max-h-56 overflow-y-auto rounded-xl border border-[var(--border-subtle)] p-3",
          columns === 2 ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"
        )}
      >
        {visible.length ? (
          visible.map((option) => (
            <Checkbox
              key={option.value}
              checked={value.includes(option.value)}
              onChange={(checked) => toggle(option.value, checked)}
              label={option.label}
            />
          ))
        ) : (
          <p className="text-sm text-faint">Nothing matches.</p>
        )}
      </div>
    </Field>
  );
}

/** Free-text chips — tags on a coupon, keywords on a store. */
export function TagInput({
  label,
  hint,
  value,
  onChange,
  placeholder = "Type and press Enter",
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    if (!value.includes(text)) onChange([...value, text]);
    setDraft("");
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              className="opacity-60 transition hover:opacity-100"
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm focus:outline-none"
        />
      </div>
    </Field>
  );
}

/** An ordered list of plain strings — "how to redeem" steps, for instance. */
export function StringList({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const setAt = (index: number, text: string) => {
    const next = [...value];
    next[index] = text;
    onChange(next);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row ?? "");
    onChange(next);
  };

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="flex gap-1.5">
            <span className="mt-2.5 w-4 shrink-0 text-xs text-faint tabular-nums">{index + 1}</span>
            <input
              value={item}
              placeholder={placeholder}
              onChange={(event) => setAt(index, event.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <RowButtons
              onUp={() => move(index, -1)}
              onDown={() => move(index, 1)}
              onRemove={() => onChange(value.filter((_, position) => position !== index))}
            />
          </div>
        ))}

        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...value, ""])}>
          + Add
        </Button>
      </div>
    </Field>
  );
}

/** Pairs of fields repeated — store highlights and FAQs. */
export function PairList<T>({
  label,
  hint,
  value,
  onChange,
  fields,
  blank,
  multilineSecond,
}: {
  label: string;
  hint?: string;
  value: T[];
  onChange: (next: T[]) => void;
  fields: [{ key: keyof T & string; placeholder: string }, { key: keyof T & string; placeholder: string }];
  blank: T;
  multilineSecond?: boolean;
}) {
  const [first, second] = fields;

  const setAt = (index: number, key: string, text: string) => {
    const next = value.map((row, position) =>
      position === index ? ({ ...row, [key]: text } as T) : row
    );
    onChange(next);
  };

  /** The two edited keys always hold strings, whatever else the row carries. */
  const textAt = (row: T, key: keyof T & string): string => String(row[key] ?? "");

  const control =
    "w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-3">
        {value.map((row, index) => (
          <div key={index} className="rounded-xl border border-[var(--border-subtle)] p-3">
            <div className="flex gap-1.5">
              <input
                value={textAt(row, first.key)}
                placeholder={first.placeholder}
                onChange={(event) => setAt(index, first.key, event.target.value)}
                className={control}
              />
              <RowButtons onRemove={() => onChange(value.filter((_, position) => position !== index))} />
            </div>

            {multilineSecond ? (
              <textarea
                value={textAt(row, second.key)}
                placeholder={second.placeholder}
                onChange={(event) => setAt(index, second.key, event.target.value)}
                className={classNames(control, "mt-2 min-h-20 resize-y")}
              />
            ) : (
              <input
                value={textAt(row, second.key)}
                placeholder={second.placeholder}
                onChange={(event) => setAt(index, second.key, event.target.value)}
                className={classNames(control, "mt-2")}
              />
            )}
          </div>
        ))}

        <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...value, { ...blank }])}>
          + Add
        </Button>
      </div>
    </Field>
  );
}

function RowButtons({
  onUp,
  onDown,
  onRemove,
}: {
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
}) {
  const button =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-sm transition hover:surface-sunken";

  return (
    <div className="flex gap-1">
      {onUp ? (
        <button type="button" aria-label="Move up" onClick={onUp} className={button}>
          ↑
        </button>
      ) : null}
      {onDown ? (
        <button type="button" aria-label="Move down" onClick={onDown} className={button}>
          ↓
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Remove"
        onClick={onRemove}
        className={classNames(button, "hover:border-danger-500 hover:text-danger-600")}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Picks an image by URL or from the media library.
 *
 * Every image on the site is an `ImageRef`, so this writes the whole object
 * rather than a bare string.
 */
export function ImagePicker({
  label,
  hint,
  value,
  onChange,
  folder = "general",
}: {
  label: string;
  hint?: string;
  value: ImageRef | null | undefined;
  onChange: (next: ImageRef | null) => void;
  /** Cloudinary folder a direct upload from this field lands in. */
  folder?: string;
}) {
  const [browsing, setBrowsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const [uploaded] = await mediaApi.upload(files, folder, readToken("admin"));
      if (uploaded) {
        onChange({
          public_id: uploaded.public_id,
          url: uploaded.secureUrl ?? uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl,
          alt: uploaded.alt ?? uploaded.name,
          width: uploaded.width,
          height: uploaded.height,
        });
        toast.success("Image uploaded");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-start gap-3">
        <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white">
          {value?.url ? (
            // Third-party CDNs, so a plain <img> rather than next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt={value.alt ?? ""} className="size-full object-contain p-1" />
          ) : (
            <span className="text-2xl text-faint">🖼</span>
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={value?.url ?? ""}
            placeholder="https://…"
            onChange={(event) =>
              onChange(event.target.value ? { ...value, url: event.target.value } : null)
            }
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />

          <input
            value={value?.alt ?? ""}
            placeholder="Alt text (describe the image)"
            onChange={(event) => onChange({ ...value, alt: event.target.value })}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />

          <div className="flex gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void uploadFiles(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              loading={uploading}
              onClick={() => fileInput.current?.click()}
            >
              Upload image
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setBrowsing(true)}>
              Media library
            </Button>
            {value?.url ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <MediaBrowser
        open={browsing}
        onClose={() => setBrowsing(false)}
        folder={folder}
        onPick={(item) => {
          onChange({
            public_id: item.public_id,
            url: item.secureUrl ?? item.url,
            thumbnailUrl: item.thumbnailUrl,
            alt: item.alt ?? item.name,
            width: item.width,
            height: item.height,
          });
          setBrowsing(false);
        }}
      />
    </Field>
  );
}

export function MediaBrowser({
  open,
  onClose,
  onPick,
  folder = "general",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (item: { public_id?: string; url: string; secureUrl?: string; thumbnailUrl?: string; alt?: string; name: string; width?: number; height?: number }) => void;
  /** Cloudinary folder a direct upload from this browser lands in. */
  folder?: string;
}) {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const library = useAdminData(
    (token) => mediaApi.list({ limit: 60, ...(search ? { search } : {}) }, token),
    [search, open]
  );

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const [uploaded] = await mediaApi.upload(files, folder, readToken("admin"));
      if (uploaded) {
        toast.success("Image uploaded");
        onPick(uploaded);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Media library" size="xl">
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search the library…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => void uploadFiles(event.target.files)}
        />
        <Button
          type="button"
          size="sm"
          loading={uploading}
          onClick={() => fileInput.current?.click()}
        >
          Upload new
        </Button>
      </div>

      {library.loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      ) : library.data?.items.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {library.data.items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => onPick(item)}
              className="group overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white transition hover:border-brand-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnailUrl ?? item.secureUrl ?? item.url}
                alt={item.alt ?? item.name}
                className="aspect-square w-full object-contain p-2"
              />
              <span className="block truncate border-t border-[var(--border-subtle)] px-2 py-1 text-[11px] text-faint">
                {item.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-faint">
          Nothing in the library yet — upload from the Media page.
        </p>
      )}
    </Modal>
  );
}

/** Groups a set of fields under a heading inside an editor screen. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={classNames(
        "surface rounded-2xl border border-[var(--border-subtle)] p-5",
        className
      )}
    >
      <h2 className="text-base font-bold">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-body">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Sticky save bar at the bottom of every editor. */
export function SaveBar({
  saving,
  onSave,
  dirty,
  children,
}: {
  saving: boolean;
  onSave: () => void;
  dirty?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      {children}
      <div className="ml-auto flex items-center gap-3">
        {dirty ? <span className="text-xs text-faint">Unsaved changes</span> : null}
        <Button onClick={onSave} loading={saving}>
          Save
        </Button>
      </div>
    </div>
  );
}
