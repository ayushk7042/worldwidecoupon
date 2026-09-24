"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { coupons as couponsApi, categories as categoriesApi, stores as storesApi } from "@/lib/endpoints";
import { COUPON_TYPE_LABELS } from "@/lib/format";
import { readToken } from "@/lib/session";
import {
  COUPON_STATUSES,
  COUPON_TYPES,
  DISCOUNT_TYPES,
  type Coupon,
  type CouponType,
  type ImageRef,
} from "@/lib/types";
import { useAction, useAdminData } from "./hooks";
import { FormSection, ImagePicker, MultiSelect, SaveBar, TagInput } from "./fields";

/** Types where the shopper expects a code to copy. */
const CODE_BEARING: CouponType[] = ["code", "printable"];

interface FormState {
  title: string;
  slug: string;
  description: string;
  terms: string;
  type: CouponType;
  code: string;
  discountType: string;
  discountValue: string;
  discountLabel: string;
  currency: string;
  minimumSpend: string;
  maximumDiscount: string;
  store: string;
  categories: string[];
  tagNames: string[];
  country: string;
  destinationUrl: string;
  landingUrl: string;
  startsAt: string;
  expiresAt: string;
  neverExpires: boolean;
  verified: boolean;
  exclusive: boolean;
  featured: boolean;
  trending: boolean;
  editorsPick: boolean;
  staffPick: boolean;
  priority: string;
  status: string;
  image: ImageRef | null;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: FormState = {
  title: "",
  slug: "",
  description: "",
  terms: "",
  type: "deal",
  code: "",
  discountType: "other",
  discountValue: "",
  discountLabel: "",
  currency: "USD",
  minimumSpend: "",
  maximumDiscount: "",
  store: "",
  categories: [],
  tagNames: [],
  country: "US",
  destinationUrl: "",
  landingUrl: "",
  startsAt: "",
  expiresAt: "",
  neverExpires: true,
  verified: false,
  exclusive: false,
  featured: false,
  trending: false,
  editorsPick: false,
  staffPick: false,
  priority: "0",
  status: "active",
  image: null,
  metaTitle: "",
  metaDescription: "",
};

/** `2026-02-01T00:00:00.000Z` → `2026-02-01`, which is what a date input wants. */
const dateValue = (input?: string | null) => (input ? input.slice(0, 10) : "");

const idOf = (value: unknown): string =>
  typeof value === "string" ? value : ((value as { _id?: string })?._id ?? "");

function toState(coupon: Coupon): FormState {
  return {
    ...EMPTY,
    title: coupon.title ?? "",
    slug: coupon.slug ?? "",
    description: coupon.description ?? "",
    terms: coupon.terms ?? "",
    type: coupon.type,
    code: coupon.code ?? "",
    discountType: coupon.discountType ?? "other",
    discountValue: coupon.discountValue == null ? "" : String(coupon.discountValue),
    discountLabel: coupon.discountLabel ?? "",
    currency: coupon.currency ?? "USD",
    minimumSpend: coupon.minimumSpend == null ? "" : String(coupon.minimumSpend),
    maximumDiscount: coupon.maximumDiscount == null ? "" : String(coupon.maximumDiscount),
    store: idOf(coupon.store),
    categories: (coupon.categories ?? []).map(idOf).filter(Boolean),
    tagNames: coupon.tagNames ?? [],
    country: coupon.country ?? "US",
    destinationUrl: coupon.destinationUrl ?? "",
    landingUrl: coupon.landingUrl ?? "",
    startsAt: dateValue(coupon.startsAt),
    expiresAt: dateValue(coupon.expiresAt),
    neverExpires: coupon.neverExpires,
    verified: coupon.verified,
    exclusive: coupon.exclusive,
    featured: coupon.featured,
    trending: coupon.trending,
    editorsPick: coupon.editorsPick,
    staffPick: coupon.staffPick,
    priority: String(coupon.priority ?? 0),
    status: coupon.status,
    image: coupon.image ?? null,
    metaTitle: coupon.metaTitle ?? "",
    metaDescription: coupon.metaDescription ?? "",
  };
}

/** Drops empty strings so the API keeps its own defaults instead of blanking. */
function toPayload(form: FormState): Record<string, unknown> {
  const number = (value: string) => (value.trim() === "" ? undefined : Number(value));

  return {
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || undefined,
    terms: form.terms.trim() || undefined,
    type: form.type,
    code: CODE_BEARING.includes(form.type) ? form.code.trim() || undefined : undefined,
    discountType: form.discountType,
    discountValue: number(form.discountValue),
    discountLabel: form.discountLabel.trim() || undefined,
    currency: form.currency.trim() || undefined,
    minimumSpend: number(form.minimumSpend),
    maximumDiscount: number(form.maximumDiscount),
    store: form.store,
    categories: form.categories,
    tagNames: form.tagNames,
    country: form.country.trim() || undefined,
    destinationUrl: form.destinationUrl.trim() || undefined,
    landingUrl: form.landingUrl.trim() || undefined,
    startsAt: form.startsAt || undefined,
    expiresAt: form.neverExpires ? undefined : form.expiresAt || undefined,
    neverExpires: form.neverExpires,
    verified: form.verified,
    exclusive: form.exclusive,
    featured: form.featured,
    trending: form.trending,
    editorsPick: form.editorsPick,
    staffPick: form.staffPick,
    priority: number(form.priority) ?? 0,
    status: form.status,
    image: form.image,
    metaTitle: form.metaTitle.trim() || undefined,
    metaDescription: form.metaDescription.trim() || undefined,
  };
}

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter();
  const { busy, run } = useAction();

  const [form, setForm] = useState<FormState>(coupon ? toState(coupon) : EMPTY);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const storeList = useAdminData((token) =>
    storesApi.list({ limit: 300, sort: "name", status: "all" }, { token })
  );
  const categoryList = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  };

  // Picking a store with no link on the offer itself: prefill from the store.
  const selectedStore = useMemo(
    () => storeList.data?.items.find((item) => item._id === form.store) ?? null,
    [storeList.data, form.store]
  );

  useEffect(() => {
    if (!selectedStore || form.destinationUrl || form.landingUrl) return;
    setForm((previous) => ({
      ...previous,
      landingUrl: selectedStore.affiliateUrl ?? selectedStore.websiteUrl ?? "",
    }));
  }, [selectedStore, form.destinationUrl, form.landingUrl]);

  const needsCode = CODE_BEARING.includes(form.type);

  const save = () =>
    void run(
      () =>
        coupon
          ? couponsApi.update(coupon._id, toPayload(form), readToken("admin"))
          : couponsApi.create(toPayload(form), readToken("admin")),
      {
        success: coupon ? "Offer saved" : "Offer created",
        onDone: (saved) => {
          setDirty(false);
          if (!coupon) router.replace(`/admin/coupons/${saved._id}`);
          else router.refresh();
        },
      }
    );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <FormSection title="The offer" description="What the shopper reads on the card.">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="20% off everything at Example Store"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => set("type", event.target.value as CouponType)}
              options={COUPON_TYPES.map((value) => ({ value, label: COUPON_TYPE_LABELS[value] }))}
            />

            <Input
              label="Code"
              value={form.code}
              onChange={(event) => set("code", event.target.value.toUpperCase())}
              disabled={!needsCode}
              required={needsCode}
              placeholder={needsCode ? "SAVE20" : "Not used for this type"}
              hint={needsCode ? "Shown only after the shopper clicks reveal." : undefined}
            />
          </div>

          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="What the deal covers, in a sentence or two."
          />

          <Textarea
            label="Terms"
            value={form.terms}
            onChange={(event) => set("terms", event.target.value)}
            placeholder="Exclusions, minimum spend, one use per customer…"
          />
        </FormSection>

        <FormSection title="Discount" description="Drives the badge on the card.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Kind"
              value={form.discountType}
              onChange={(event) => set("discountType", event.target.value)}
              options={DISCOUNT_TYPES.map((value) => ({ value, label: value }))}
            />
            <Input
              label="Value"
              type="number"
              min={0}
              value={form.discountValue}
              onChange={(event) => set("discountValue", event.target.value)}
              hint="20 for 20% or $20"
            />
            <Input
              label="Badge override"
              value={form.discountLabel}
              onChange={(event) => set("discountLabel", event.target.value)}
              placeholder="e.g. Free shipping"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Currency"
              value={form.currency}
              onChange={(event) => set("currency", event.target.value.toUpperCase())}
              maxLength={4}
            />
            <Input
              label="Minimum spend"
              type="number"
              min={0}
              value={form.minimumSpend}
              onChange={(event) => set("minimumSpend", event.target.value)}
            />
            <Input
              label="Maximum discount"
              type="number"
              min={0}
              value={form.maximumDiscount}
              onChange={(event) => set("maximumDiscount", event.target.value)}
            />
          </div>
        </FormSection>

        <FormSection
          title="Where it sends the shopper"
          description="Destination wins; otherwise the landing link, then the store's affiliate link."
        >
          <Input
            label="Destination URL"
            value={form.destinationUrl}
            onChange={(event) => set("destinationUrl", event.target.value)}
            placeholder="https://example.com/sale"
          />
          <Input
            label="Landing URL"
            value={form.landingUrl}
            onChange={(event) => set("landingUrl", event.target.value)}
            placeholder="https://track.affiliate.com/…"
          />
        </FormSection>

        <FormSection title="Search engines" description="Leave blank to use the title and description.">
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
            options={COUPON_STATUSES.map((value) => ({ value, label: value }))}
          />

          <Select
            label="Store"
            required
            value={form.store}
            onChange={(event) => set("store", event.target.value)}
            options={[
              { value: "", label: "Choose a store…" },
              ...(storeList.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
            ]}
          />

          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="Generated from the title"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Country"
              value={form.country}
              onChange={(event) => set("country", event.target.value.toUpperCase())}
              maxLength={4}
            />
            <Input
              label="Priority"
              type="number"
              value={form.priority}
              onChange={(event) => set("priority", event.target.value)}
              hint="Higher sorts first"
            />
          </div>
        </FormSection>

        <FormSection title="Dates">
          <Toggle
            checked={form.neverExpires}
            onChange={(value) => set("neverExpires", value)}
            label="Never expires"
            hint="Imported offers default to this — the export carried no end dates."
          />

          <Input
            label="Starts"
            type="date"
            value={form.startsAt}
            onChange={(event) => set("startsAt", event.target.value)}
          />

          <Input
            label="Expires"
            type="date"
            value={form.expiresAt}
            onChange={(event) => set("expiresAt", event.target.value)}
            disabled={form.neverExpires}
          />
        </FormSection>

        <FormSection title="Placement">
          <div className="space-y-3">
            <Toggle checked={form.verified} onChange={(value) => set("verified", value)} label="Verified" />
            <Toggle checked={form.featured} onChange={(value) => set("featured", value)} label="Featured" />
            <Toggle checked={form.trending} onChange={(value) => set("trending", value)} label="Trending" />
            <Toggle checked={form.exclusive} onChange={(value) => set("exclusive", value)} label="Exclusive" />
            <Toggle checked={form.editorsPick} onChange={(value) => set("editorsPick", value)} label="Editor's pick" />
            <Toggle checked={form.staffPick} onChange={(value) => set("staffPick", value)} label="Staff pick" />
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

          <TagInput
            label="Tags"
            value={form.tagNames}
            onChange={(value) => set("tagNames", value)}
            hint="Free text — tags are created on save."
          />

          <ImagePicker
            label="Offer image (shown on the homepage and the All offers list)"
            hint="One picture used everywhere this offer is shown big: the homepage rails, the All offers list and this offer's own page. Best: 1600 × 720 px (20:9), a wide product photo — or a transparent PNG/WebP of just the product, up to 1200 × 1200. It is shown whole (never cropped) and faded into the card, so no border or frame needed."
            value={form.image}
            onChange={(value) => set("image", value)}
            folder="coupons"
          />
        </FormSection>

        {coupon ? (
          <FormSection title="Danger zone">
            <p className="text-sm text-body">
              Deleting removes this offer from the site immediately.
            </p>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete this offer
            </Button>
          </FormSection>
        ) : null}
      </div>

      <div className="lg:col-span-3">
        <SaveBar saving={busy} dirty={dirty} onSave={save}>
          <ButtonLink variant="ghost" href="/admin/coupons">
            ← Back to the list
          </ButtonLink>
          {coupon ? (
            <ButtonLink variant="secondary" href={`/coupon/${coupon.slug}`} target="_blank">
              View on the site
            </ButtonLink>
          ) : null}
        </SaveBar>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        loading={busy}
        title="Delete this offer?"
        body="It disappears from the site right away and cannot be restored."
        confirmLabel="Delete for good"
        onConfirm={() => {
          if (!coupon) return;
          void run(() => couponsApi.remove(coupon._id, readToken("admin")), {
            success: "Offer deleted",
            onDone: () => router.replace("/admin/coupons"),
          });
        }}
      />
    </div>
  );
}
