"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { blog as blogApi, categories as categoriesApi, stores as storesApi } from "@/lib/endpoints";
import { readToken } from "@/lib/session";
import type { Blog, ImageRef } from "@/lib/types";
import { FormSection, ImagePicker, MultiSelect, SaveBar, TagInput } from "./fields";
import { useAction, useAdminData } from "./hooks";

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  image: ImageRef | null;
  imageLink: string;
  store: string;
  categories: string[];
  tagNames: string[];
  authorName: string;
  status: string;
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
}

const EMPTY: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  image: null,
  imageLink: "",
  store: "",
  categories: [],
  tagNames: [],
  authorName: "",
  status: "draft",
  featured: false,
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
};

const idOf = (value: unknown): string =>
  typeof value === "string" ? value : ((value as { _id?: string })?._id ?? "");

function toState(post: Blog): FormState {
  return {
    ...EMPTY,
    title: post.title ?? "",
    slug: post.slug ?? "",
    excerpt: post.excerpt ?? "",
    body: post.body ?? "",
    image: post.image ?? null,
    imageLink: post.imageLink ?? "",
    store: idOf(post.store),
    categories: (post.categories ?? []).map(idOf).filter(Boolean),
    tagNames: post.tagNames ?? [],
    authorName: post.authorName ?? "",
    status: post.status,
    featured: post.featured,
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
  };
}

function toPayload(form: FormState): Record<string, unknown> {
  const text = (value: string) => value.trim() || undefined;

  return {
    title: form.title.trim(),
    slug: text(form.slug),
    excerpt: text(form.excerpt),
    body: form.body,
    image: form.image,
    imageLink: text(form.imageLink),
    store: form.store || undefined,
    categories: form.categories,
    tagNames: form.tagNames,
    authorName: text(form.authorName),
    status: form.status,
    featured: form.featured,
    metaTitle: text(form.metaTitle),
    metaDescription: text(form.metaDescription),
    canonicalUrl: text(form.canonicalUrl),
  };
}

export function BlogForm({ post }: { post?: Blog }) {
  const router = useRouter();
  const { busy, run } = useAction();

  const [form, setForm] = useState<FormState>(post ? toState(post) : EMPTY);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const storeList = useAdminData((token) => storesApi.list({ limit: 200, sort: "name" }, { token }));
  const categoryList = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  };

  const save = (status?: string) =>
    void run(
      () => {
        const payload = status ? { ...toPayload(form), status } : toPayload(form);
        return post
          ? blogApi.update(post._id, payload, readToken("admin"))
          : blogApi.create(payload, readToken("admin"));
      },
      {
        success: post ? "Post saved" : "Post created",
        onDone: (saved) => {
          setDirty(false);
          if (status) set("status", status);
          void fetch("/api/revalidate-blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: saved.slug }),
          }).catch(() => undefined);
          if (!post) router.replace(`/admin/blog/${saved._id}`);
          else router.refresh();
        },
      }
    );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <FormSection title="The post">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="10 DHGate Shopping Hacks That Actually Save You Money"
          />

          <Textarea
            label="Excerpt"
            value={form.excerpt}
            onChange={(event) => set("excerpt", event.target.value)}
            maxLength={400}
            hint={`Shown on the blog listing card and in search results. ${form.excerpt.length}/400`}
          />

          <Textarea
            label="Body"
            required
            value={form.body}
            onChange={(event) => set("body", event.target.value)}
            className="min-h-[28rem] font-mono text-[13px]"
            hint="Basic HTML — p, h2/h3, ul/ol/li, strong, em, a, img, blockquote. Rendered with full article styling on the site."
          />
        </FormSection>

        <FormSection title="Search engines">
          <Input
            label="Meta title"
            value={form.metaTitle}
            onChange={(event) => set("metaTitle", event.target.value)}
            maxLength={180}
            hint={`Falls back to the title if left blank. ${form.metaTitle.length}/180`}
          />
          <Textarea
            label="Meta description"
            value={form.metaDescription}
            onChange={(event) => set("metaDescription", event.target.value)}
            maxLength={400}
            hint={`Falls back to the excerpt if left blank. ${form.metaDescription.length}/400`}
          />
          <Input
            label="Canonical URL"
            value={form.canonicalUrl}
            onChange={(event) => set("canonicalUrl", event.target.value)}
            placeholder="Leave blank unless this post is republished from elsewhere"
          />
        </FormSection>
      </div>

      <div className="space-y-4">
        <FormSection title="Publishing">
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
            options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "archived", label: "Archived" },
            ]}
          />

          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="Generated from the title"
          />

          <Input
            label="Byline"
            value={form.authorName}
            onChange={(event) => set("authorName", event.target.value)}
            placeholder="Falls back to your admin name"
          />

          <Toggle checked={form.featured} onChange={(value) => set("featured", value)} label="Featured" />
        </FormSection>

        <FormSection title="Filing" description="Powers the sidebar and lets a shopper find this from the store page.">
          <Select
            label="About this store"
            value={form.store}
            onChange={(event) => set("store", event.target.value)}
            options={[
              { value: "", label: "Not store-specific" },
              ...(storeList.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
            ]}
          />

          <MultiSelect
            label="Categories"
            columns={1}
            value={form.categories}
            onChange={(value) => set("categories", value)}
            options={(categoryList.data ?? []).map((item) => ({ value: item._id, label: item.name }))}
          />

          <TagInput
            label="Tags"
            value={form.tagNames}
            onChange={(value) => set("tagNames", value)}
            placeholder="shopping-tips, deals, guide…"
          />
        </FormSection>

        <FormSection title="Featured image">
          <ImagePicker label="Image" value={form.image} onChange={(value) => set("image", value)} folder="blog" />
          <Input
            label="Image redirect link"
            value={form.imageLink}
            onChange={(event) => set("imageLink", event.target.value)}
            placeholder="https://store.com/deal — leave blank to open the post normally"
            hint="When set, clicking the featured image on the listing and post pages goes straight here instead of opening the post."
          />
        </FormSection>

        {post ? (
          <FormSection title="Danger zone">
            <p className="text-sm text-body">Deleting a post removes it permanently.</p>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete this post
            </Button>
          </FormSection>
        ) : null}
      </div>

      <div className="lg:col-span-3">
        <SaveBar saving={busy} dirty={dirty} onSave={() => save()}>
          <ButtonLink variant="ghost" href="/admin/blog">
            ← Back to the list
          </ButtonLink>
          {post ? (
            <ButtonLink variant="secondary" href={`/blog/${post.slug}`} target="_blank">
              View on the site
            </ButtonLink>
          ) : null}
          {form.status !== "published" ? (
            <Button variant="secondary" disabled={busy} onClick={() => save("published")}>
              Save &amp; publish
            </Button>
          ) : null}
        </SaveBar>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={busy}
        title="Delete this post?"
        body="This cannot be undone."
        confirmLabel="Delete post"
        onConfirm={() => {
          if (!post) return;
          void run(() => blogApi.remove(post._id, readToken("admin")), {
            success: "Post deleted",
            onDone: () => {
              void fetch("/api/revalidate-blog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: post.slug }),
              }).catch(() => undefined);
              router.replace("/admin/blog");
            },
          });
        }}
      />
    </div>
  );
}
