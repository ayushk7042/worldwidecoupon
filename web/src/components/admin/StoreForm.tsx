"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { categories as categoriesApi, stores as storesApi } from "@/lib/endpoints";
import { readToken } from "@/lib/session";
import type { ImageRef, Store, StoreFaq, StoreHighlight } from "@/lib/types";
import { FormSection, ImagePicker, MultiSelect, PairList, SaveBar, StringList } from "./fields";
import { useAction, useAdminData } from "./hooks";

interface FormState {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  about: string;
  websiteUrl: string;
  affiliateUrl: string;
  trackingParams: string;
  brandColor: string;
  logo: ImageRef | null;
  banner: ImageRef | null;
  categories: string[];
  primaryCategory: string;
  country: string;
  currency: string;
  featured: boolean;
  popular: boolean;
  trending: boolean;
  verified: boolean;
  exclusive: boolean;
  priority: string;
  status: string;
  highlights: StoreHighlight[];
  faqs: StoreFaq[];
  howToRedeem: string[];
  averageDiscount: string;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  about: "",
  websiteUrl: "",
  affiliateUrl: "",
  trackingParams: "",
  brandColor: "",
  logo: null,
  banner: null,
  categories: [],
  primaryCategory: "",
  country: "US",
  currency: "USD",
  featured: false,
  popular: false,
  trending: false,
  verified: false,
  exclusive: false,
  priority: "0",
  status: "active",
  highlights: [],
  faqs: [],
  howToRedeem: [],
  averageDiscount: "",
  metaTitle: "",
  metaDescription: "",
};

const idOf = (value: unknown): string =>
  typeof value === "string" ? value : ((value as { _id?: string })?._id ?? "");

function toState(store: Store): FormState {
  return {
    ...EMPTY,
    name: store.name ?? "",
    slug: store.slug ?? "",
    tagline: store.tagline ?? "",
    description: store.description ?? "",
    about: store.about ?? "",
    websiteUrl: store.websiteUrl ?? "",
    affiliateUrl: store.affiliateUrl ?? "",
    trackingParams: store.trackingParams ?? "",
    brandColor: store.brandColor ?? "",
    logo: store.logo ?? null,
    banner: store.banner ?? null,
    categories: (store.categories ?? []).map(idOf).filter(Boolean),
    primaryCategory: idOf(store.primaryCategory),
    country: store.country ?? "US",
    currency: store.currency ?? "USD",
    featured: store.featured,
    popular: store.popular,
    trending: store.trending,
    verified: store.verified,
    exclusive: store.exclusive,
    priority: String(store.priority ?? 0),
    status: store.status,
    highlights: store.highlights ?? [],
    faqs: store.faqs ?? [],
    howToRedeem: store.howToRedeem ?? [],
    averageDiscount: store.averageDiscount ?? "",
    metaTitle: store.metaTitle ?? "",
    metaDescription: store.metaDescription ?? "",
  };
}

function toPayload(form: FormState): Record<string, unknown> {
  const text = (value: string) => value.trim() || undefined;

  return {
    name: form.name.trim(),
    slug: text(form.slug),
    tagline: text(form.tagline),
    description: text(form.description),
    about: text(form.about),
    websiteUrl: text(form.websiteUrl),
    affiliateUrl: text(form.affiliateUrl),
    trackingParams: text(form.trackingParams),
    brandColor: text(form.brandColor),
    logo: form.logo,
    banner: form.banner,
    categories: form.categories,
    primaryCategory: form.primaryCategory || null,
    country: text(form.country),
    currency: text(form.currency),
    featured: form.featured,
    popular: form.popular,
    trending: form.trending,
    verified: form.verified,
    exclusive: form.exclusive,
    priority: Number(form.priority || 0),
    status: form.status,
    // Rows left blank in the editor are noise, not data.
    highlights: form.highlights.filter((row) => row.label.trim()),
    faqs: form.faqs.filter((row) => row.question.trim()),
    howToRedeem: form.howToRedeem.map((step) => step.trim()).filter(Boolean),
    averageDiscount: text(form.averageDiscount),
    metaTitle: text(form.metaTitle),
    metaDescription: text(form.metaDescription),
  };
}

export function StoreForm({ store }: { store?: Store }) {
  const router = useRouter();
  const { busy, run } = useAction();

  const [form, setForm] = useState<FormState>(store ? toState(store) : EMPTY);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoryList = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  };

  const save = () =>
    void run(
      () =>
        store
          ? storesApi.update(store._id, toPayload(form), readToken("admin"))
          : storesApi.create(toPayload(form), readToken("admin")),
      {
        success: store ? "Store saved" : "Store created",
        onDone: (saved) => {
          setDirty(false);
          if (!store) router.replace(`/admin/stores/${saved._id}`);
          else router.refresh();
        },
      }
    );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <FormSection title="The brand">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
          />

          <Input
            label="Tagline"
            value={form.tagline}
            onChange={(event) => set("tagline", event.target.value)}
            placeholder="Outdoor gear for every season"
          />

          <Textarea
            label="Short description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            hint="Two lines under the store name."
          />

          <Textarea
            label="About"
            value={form.about}
            onChange={(event) => set("about", event.target.value)}
            className="min-h-48"
            hint="The long block at the bottom of the store page. Plain paragraphs."
          />
        </FormSection>

        <FormSection
          title="Links"
          description="The affiliate link is used first; the website link is the fallback."
        >
          <Input
            label="Website URL"
            value={form.websiteUrl}
            onChange={(event) => set("websiteUrl", event.target.value)}
            placeholder="https://example.com"
          />
          <Input
            label="Affiliate URL"
            value={form.affiliateUrl}
            onChange={(event) => set("affiliateUrl", event.target.value)}
            placeholder="https://track.network.com/click?id=…"
          />
          <Input
            label="Tracking parameters"
            value={form.trackingParams}
            onChange={(event) => set("trackingParams", event.target.value)}
            placeholder="utm_source=worldwidecoupons&utm_medium=affiliate"
            hint="Appended to every outbound link for this store."
          />
        </FormSection>

        <FormSection title="Shopper help" description="Shown on the store page and marked up for Google.">
          <StringList
            label="How to redeem"
            value={form.howToRedeem}
            onChange={(value) => set("howToRedeem", value)}
            placeholder="Copy the code and paste it at checkout"
          />

          <PairList<StoreHighlight>
            label="Highlights"
            hint="Small facts beside the logo — free shipping, student discount, and so on."
            value={form.highlights}
            onChange={(value) => set("highlights", value)}
            blank={{ label: "", value: "" }}
            fields={[
              { key: "label", placeholder: "Free shipping" },
              { key: "value", placeholder: "On orders over $50" },
            ]}
          />

          <PairList<StoreFaq>
            label="FAQs"
            hint="Rendered as FAQ structured data."
            value={form.faqs}
            onChange={(value) => set("faqs", value)}
            blank={{ question: "", answer: "" }}
            multilineSecond
            fields={[
              { key: "question", placeholder: "Does this store price match?" },
              { key: "answer", placeholder: "Yes, within 14 days of purchase…" },
            ]}
          />
        </FormSection>

        <FormSection title="Search engines">
          <Input
            label="Meta title"
            value={form.metaTitle}
            onChange={(event) => set("metaTitle", event.target.value)}
            maxLength={180}
            hint={`${form.metaTitle.length}/180`}
          />
          <Textarea
            label="Meta description"
            value={form.metaDescription}
            onChange={(event) => set("metaDescription", event.target.value)}
            maxLength={400}
            hint={`${form.metaDescription.length}/400`}
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
              { value: "active", label: "active" },
              { value: "inactive", label: "inactive" },
            ]}
          />

          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="Generated from the name"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => set("country", event.target.value.toUpperCase())}
              maxLength={4}
            />
            <Input
              label="Currency"
              value={form.currency}
              onChange={(event) => set("currency", event.target.value.toUpperCase())}
              maxLength={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(event) => set("priority", event.target.value)}
            />
            <Input
              label="Average discount"
              value={form.averageDiscount}
              onChange={(event) => set("averageDiscount", event.target.value)}
              placeholder="20% off"
            />
          </div>
        </FormSection>

        <FormSection title="Placement">
          <div className="space-y-3">
            <Toggle checked={form.featured} onChange={(value) => set("featured", value)} label="Featured" />
            <Toggle checked={form.popular} onChange={(value) => set("popular", value)} label="Popular" />
            <Toggle checked={form.trending} onChange={(value) => set("trending", value)} label="Trending" />
            <Toggle checked={form.verified} onChange={(value) => set("verified", value)} label="Verified" />
            <Toggle checked={form.exclusive} onChange={(value) => set("exclusive", value)} label="Has exclusives" />
          </div>
        </FormSection>

        <FormSection title="Filing">
          <MultiSelect
            label="Categories"
            columns={1}
            value={form.categories}
            onChange={(value) => set("categories", value)}
            options={(categoryList.data ?? []).map((item) => ({ value: item._id, label: item.name }))}
          />

          <Select
            label="Primary category"
            value={form.primaryCategory}
            onChange={(event) => set("primaryCategory", event.target.value)}
            options={[
              { value: "", label: "None" },
              ...(categoryList.data ?? []).map((item) => ({ value: item._id, label: item.name })),
            ]}
          />
        </FormSection>

        <FormSection title="Artwork">
          <ImagePicker label="Logo" value={form.logo} onChange={(value) => set("logo", value)} />
          <ImagePicker label="Banner" value={form.banner} onChange={(value) => set("banner", value)} />
          <Input
            label="Brand colour"
            value={form.brandColor}
            onChange={(event) => set("brandColor", event.target.value)}
            placeholder="#1d4ed8"
          />
        </FormSection>

        {store ? (
          <FormSection title="Danger zone">
            <p className="text-sm text-body">
              Deleting a store also deletes every offer attached to it.
            </p>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete this store
            </Button>
          </FormSection>
        ) : null}
      </div>

      <div className="lg:col-span-3">
        <SaveBar saving={busy} dirty={dirty} onSave={save}>
          <ButtonLink variant="ghost" href="/admin/stores">
            ← Back to the list
          </ButtonLink>
          {store ? (
            <>
              <ButtonLink variant="secondary" href={`/store/${store.slug}`} target="_blank">
                View on the site
              </ButtonLink>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(() => storesApi.refresh(store._id, readToken("admin")), {
                    success: "Counters recalculated",
                    onDone: () => router.refresh(),
                  })
                }
              >
                Recount offers
              </Button>
            </>
          ) : null}
        </SaveBar>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={busy}
        title="Delete this store?"
        body="Every coupon and deal belonging to this store is deleted with it. This cannot be undone."
        confirmLabel="Delete store and offers"
        onConfirm={() => {
          if (!store) return;
          void run(() => storesApi.remove(store._id, readToken("admin")), {
            success: "Store deleted",
            onDone: () => router.replace("/admin/stores"),
          });
        }}
      />
    </div>
  );
}
