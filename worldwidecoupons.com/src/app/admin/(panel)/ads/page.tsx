"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { StatusPill } from "@/components/admin/DataTable";
import { FormSection, ImagePicker, MultiSelect } from "@/components/admin/fields";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/primitives";
import { ads as adsApi, categories as categoriesApi, stores as storesApi } from "@/lib/endpoints";
import { classNames, formatCount } from "@/lib/format";
import { readToken } from "@/lib/session";
import { AD_DEVICES, AD_POSITIONS, type AdDevice, type AdPosition, type Advertisement, type ImageRef } from "@/lib/types";

/** Where each slot actually sits, so the person buying it knows what they get. */
const POSITION_NOTES: Record<AdPosition, string> = {
  "home-hero": "Beside the homepage hero — the most valuable slot on the site.",
  "home-top": "Full-width banner directly under the homepage hero.",
  "home-infeed": "Between the offer cards in the homepage feed.",
  "home-mid": "Halfway down the homepage, between sections.",
  "home-bottom": "Above the homepage footer.",
  sidebar: "Right column on the coupon and store pages.",
  "sidebar-sticky": "Right column, stays in view while scrolling.",
  "store-top": "Banner at the top of every store page.",
  "store-inline": "Between the offers on a store page.",
  "store-bottom": "Below the offer list on a store page.",
  "coupon-top": "Full-width banner at the top of the offer page, under the hero.",
  "coupon-inline": "Inside the offer detail page, under the reveal button.",
  "category-top": "Banner at the top of every category page.",
  "category-infeed": "Between the cards on a category page.",
  footer: "Above the site footer, every page.",
  "mobile-sticky-bottom": "Sticky strip pinned to the bottom on phones.",
};

export default function AdminAdsPage() {
  const [position, setPosition] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [editing, setEditing] = useState<Advertisement | "new" | null>(null);
  const [deleting, setDeleting] = useState<Advertisement | null>(null);

  const query = useMemo(
    () => ({ ...(position ? { position } : {}), ...(status ? { status } : {}) }),
    [position, status]
  );

  const list = useAdminData((token) => adsApi.list(query, token), [query]);
  const { busy, run } = useAction();

  const byPosition = useMemo(() => {
    const map = new Map<string, Advertisement[]>();
    (list.data ?? []).forEach((ad) => {
      map.set(ad.position, [...(map.get(ad.position) ?? []), ad]);
    });
    return map;
  }, [list.data]);

  const positions = position ? [position as AdPosition] : AD_POSITIONS;

  return (
    <>
      <PageHeader
        title="Advertisements"
        subtitle={`${formatCount(list.data?.length ?? 0)} creatives across ${AD_POSITIONS.length} slots`}
        action={<Button onClick={() => setEditing("new")}>New advertisement</Button>}
      />

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <Select
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          options={[
            { value: "", label: "Every position" },
            ...AD_POSITIONS.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
          ]}
        />
      </div>

      {list.loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="space-y-4">
          {positions.map((slot) => {
            const rows = byPosition.get(slot) ?? [];

            return (
              <section
                key={slot}
                className="surface overflow-hidden rounded-2xl border border-[var(--border-subtle)]"
              >
                <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border-subtle)] surface-sunken px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="font-bold">{slot}</h2>
                    <p className="text-xs text-faint">{POSITION_NOTES[slot]}</p>
                  </div>
                  <span
                    className={classNames(
                      "ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                      rows.length ? "bg-success-50 text-success-700 dark:bg-success-700/15" : "text-faint"
                    )}
                  >
                    {rows.length ? `${rows.length} booked` : "Unsold"}
                  </span>
                </header>

                {rows.length ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {rows.map((ad) => {
                      const ctr = ad.impressions ? (ad.clicks / ad.impressions) * 100 : 0;

                      return (
                        <div key={ad._id} className="flex flex-wrap items-center gap-3 p-4">
                          <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white text-xs text-faint">
                            {ad.type === "image" && ad.image?.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ad.image.url} alt="" className="size-full object-contain" />
                            ) : (
                              "script"
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setEditing(ad)}
                              className="block truncate text-left font-semibold hover:text-brand-600"
                            >
                              {ad.name}
                            </button>
                            <span className="text-xs text-faint">
                              {ad.devices.join(", ") || "all devices"} · priority {ad.priority}
                            </span>
                          </div>

                          <div className="text-right text-xs text-faint">
                            <div className="tabular-nums">{formatCount(ad.impressions)} views</div>
                            <div className="tabular-nums">
                              {formatCount(ad.clicks)} clicks · {ctr.toFixed(2)}% CTR
                            </div>
                          </div>

                          <StatusPill status={ad.status} />

                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () =>
                                    adsApi.update(
                                      ad._id,
                                      { status: ad.status === "active" ? "paused" : "active" },
                                      readToken("admin")
                                    ),
                                  { success: "Status changed", onDone: list.reload }
                                )
                              }
                            >
                              {ad.status === "active" ? "Pause" : "Resume"}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditing(ad)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleting(ad)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4">
                    <p className="text-sm text-faint">Nothing booked here yet.</p>
                    <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
                      Fill this slot
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <AdModal
        open={editing !== null}
        ad={editing === "new" ? undefined : (editing ?? undefined)}
        defaultPosition={(position || "home-top") as AdPosition}
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
        title={`Delete ${deleting?.name ?? "this advertisement"}?`}
        body="The slot goes back to empty straight away. This cannot be undone."
        onConfirm={() => {
          if (!deleting) return;
          void run(() => adsApi.remove(deleting._id, readToken("admin")), {
            success: "Advertisement deleted",
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

interface AdFormState {
  name: string;
  position: AdPosition;
  type: "image" | "script";
  image: ImageRef | null;
  scriptCode: string;
  targetUrl: string;
  openInNewTab: boolean;
  categories: string[];
  stores: string[];
  devices: AdDevice[];
  priority: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

const dateValue = (input?: string | null) => (input ? input.slice(0, 10) : "");

function AdModal({
  open,
  ad,
  defaultPosition,
  onClose,
  onSaved,
}: {
  open: boolean;
  ad?: Advertisement;
  defaultPosition: AdPosition;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { busy, run } = useAction();
  const categoryList = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));
  const storeList = useAdminData((token) =>
    storesApi.list({ limit: 300, sort: "name", status: "all" }, { token })
  );

  const blank: AdFormState = useMemo(
    () => ({
      name: "",
      position: defaultPosition,
      type: "image",
      image: null,
      scriptCode: "",
      targetUrl: "",
      openInNewTab: true,
      categories: [],
      stores: [],
      devices: [...AD_DEVICES],
      priority: "0",
      startsAt: "",
      endsAt: "",
      status: "active",
    }),
    [defaultPosition]
  );

  const [form, setForm] = useState<AdFormState>(blank);

  useEffect(() => {
    if (!open) return;
    setForm(
      ad
        ? {
            name: ad.name,
            position: ad.position,
            type: ad.type,
            image: ad.image ?? null,
            scriptCode: ad.scriptCode ?? "",
            targetUrl: ad.targetUrl ?? "",
            openInNewTab: ad.openInNewTab,
            categories: ad.categories ?? [],
            stores: ad.stores ?? [],
            devices: ad.devices?.length ? ad.devices : [...AD_DEVICES],
            priority: String(ad.priority ?? 0),
            startsAt: dateValue(ad.startsAt),
            endsAt: dateValue(ad.endsAt),
            status: ad.status,
          }
        : blank
    );
  }, [open, ad, blank]);

  const set = <K extends keyof AdFormState>(key: K, value: AdFormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const save = () => {
    const payload = {
      name: form.name.trim(),
      position: form.position,
      type: form.type,
      image: form.type === "image" ? form.image : null,
      scriptCode: form.type === "script" ? form.scriptCode : undefined,
      targetUrl: form.targetUrl.trim() || undefined,
      openInNewTab: form.openInNewTab,
      categories: form.categories,
      stores: form.stores,
      devices: form.devices,
      priority: Number(form.priority || 0),
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
      status: form.status,
    };

    void run(
      () =>
        ad
          ? adsApi.update(ad._id, payload, readToken("admin"))
          : adsApi.create(payload, readToken("admin")),
      { success: ad ? "Advertisement saved" : "Advertisement created", onDone: onSaved }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={ad ? `Edit ${ad.name}` : "New advertisement"}
      description={POSITION_NOTES[form.position]}
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
          <Input
            label="Internal name"
            required
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Q4 — Acme banner"
          />
          <Select
            label="Position"
            value={form.position}
            onChange={(event) => set("position", event.target.value as AdPosition)}
            options={AD_POSITIONS.map((value) => ({ value, label: value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Creative type"
            value={form.type}
            onChange={(event) => set("type", event.target.value as "image" | "script")}
            options={[
              { value: "image", label: "Image banner" },
              { value: "script", label: "Ad network script" },
            ]}
          />
          <Input
            label="Priority"
            type="number"
            value={form.priority}
            onChange={(event) => set("priority", event.target.value)}
            hint="Higher wins the slot"
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
            options={[
              { value: "active", label: "active" },
              { value: "paused", label: "paused" },
            ]}
          />
        </div>

        {form.type === "image" ? (
          <>
            <ImagePicker label="Banner image" value={form.image} onChange={(value) => set("image", value)} />
            <Input
              label="Click-through URL"
              value={form.targetUrl}
              onChange={(event) => set("targetUrl", event.target.value)}
              placeholder="https://advertiser.com/landing"
              hint="Clicks are counted and then redirected."
            />
            <Toggle
              checked={form.openInNewTab}
              onChange={(value) => set("openInNewTab", value)}
              label="Open in a new tab"
            />
          </>
        ) : (
          <Textarea
            label="Script code"
            value={form.scriptCode}
            onChange={(event) => set("scriptCode", event.target.value)}
            className="min-h-40 font-mono text-xs"
            hint="Pasted verbatim into the slot. Only paste code from a network you trust — it runs on every page that shows this slot."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts"
            type="date"
            value={form.startsAt}
            onChange={(event) => set("startsAt", event.target.value)}
          />
          <Input
            label="Ends"
            type="date"
            value={form.endsAt}
            onChange={(event) => set("endsAt", event.target.value)}
          />
        </div>

        <FormSection title="Targeting" description="Leave a list empty to show everywhere.">
          <MultiSelect
            label="Devices"
            columns={1}
            value={form.devices}
            onChange={(value) => set("devices", value as AdDevice[])}
            options={AD_DEVICES.map((value) => ({ value, label: value }))}
          />

          <MultiSelect
            label="Only in these categories"
            value={form.categories}
            onChange={(value) => set("categories", value)}
            options={(categoryList.data ?? []).map((item) => ({ value: item._id, label: item.name }))}
          />

          <MultiSelect
            label="Only on these stores"
            value={form.stores}
            onChange={(value) => set("stores", value)}
            options={(storeList.data?.items ?? []).map((item) => ({ value: item._id, label: item.name }))}
          />
        </FormSection>
      </div>
    </Modal>
  );
}
