"use client";

import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/Toast";
import { apiBase } from "@/lib/api";
import { categories as categoriesApi, importer, stores as storesApi, type PartnerSheetResult } from "@/lib/endpoints";
import { classNames } from "@/lib/format";
import { readToken } from "@/lib/session";

const dateLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Shanghai" }) : "—";

/**
 * Partner coupon sheets, in three steps: pick the category, drop the .xlsx,
 * preview, import. The sheet's own landing-page links are never used — every
 * offer goes to the store's own affiliate link.
 */
export function PartnerSheetImport({ onImported }: { onImported?: () => void }) {
  const toast = useToast();
  const { busy, run } = useAction();

  const categories = useAdminData((token) => categoriesApi.list({ status: "all" }, { token }));
  const storeList = useAdminData((token) => storesApi.list({ limit: 200, sort: "name" }, { token }));

  const [category, setCategory] = useState("");
  const [store, setStore] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PartnerSheetResult | null>(null);
  const [result, setResult] = useState<PartnerSheetResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = (chosen: File | null) => {
    setFile(chosen);
    setPreview(null);
    setResult(null);
  };

  const ready = Boolean(category && file);

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${apiBase()}/import/partner-sheet/template`, {
        headers: { Authorization: `Bearer ${readToken("admin") ?? ""}` },
        credentials: "include",
      });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "partner-coupon-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the template");
    }
  };

  const options = { category, store: store || undefined };

  const shown = result ?? preview;

  return (
    <section className="surface mb-6 rounded-3xl border border-[var(--border-subtle)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-[var(--shadow-glow)]">
          <FileSpreadsheet aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-extrabold">Partner coupon sheet</h2>
          <p className="text-sm text-body">
            The monthly code sheet from a store (Dept · Coupon code · Device · Discount · Valid date · Code quantity…).
            Choose the category first, then upload — every code becomes a live coupon.
          </p>
        </div>
        <Button variant="secondary" onClick={downloadTemplate} className="!rounded-full">
          <Download aria-hidden className="size-4" />
          Download template
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Select
          label="1 · Category"
          hint="Every coupon in the sheet is filed here."
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPreview(null);
          }}
          options={[
            { value: "", label: "Choose a category…" },
            ...(categories.data ?? []).map((item) => ({ value: item._id, label: item.name })),
          ]}
        />
        <Select
          label="Store (optional)"
          hint="Leave on Auto and it is found from the sheet's landing-page links."
          value={store}
          onChange={(event) => {
            setStore(event.target.value);
            setPreview(null);
          }}
          options={[
            { value: "", label: "Auto — detect from the sheet" },
            ...(storeList.data?.items ?? []).map((item) => ({ value: item._id, label: item.name })),
          ]}
        />
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          pick(event.dataTransfer.files?.[0] ?? null);
        }}
        className={classNames(
          "mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragging ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30" : "border-[var(--border-strong)] bg-[var(--surface-sunken)]/40"
        )}
      >
        <Upload aria-hidden className="size-7 text-brand-600" />
        <p className="mt-2 font-bold">{file ? file.name : "2 · Drop the .xlsx sheet here"}</p>
        <p className="mt-0.5 text-xs text-faint">{file ? `${(file.size / 1024).toFixed(1)} KB` : "or"}</p>
        <input ref={input} type="file" accept=".xlsx" hidden onChange={(event) => pick(event.target.files?.[0] ?? null)} />
        <Button variant="secondary" size="sm" className="mt-2 !rounded-full" onClick={() => input.current?.click()}>
          {file ? "Choose another file" : "Choose a file"}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={!ready}
          loading={busy && !result}
          className="!rounded-full"
          onClick={() =>
            file &&
            void run(() => importer.partnerSheet(file, options, true, readToken("admin")), {
              success: "Sheet read — nothing saved yet",
              onDone: setPreview,
            })
          }
        >
          3 · Preview
        </Button>
        <Button
          disabled={!ready || !preview}
          loading={busy && Boolean(preview)}
          className="!rounded-full"
          onClick={() =>
            file &&
            void run(() => importer.partnerSheet(file, options, false, readToken("admin")), {
              success: "Coupons imported",
              onDone: (value) => {
                setResult(value);
                void fetch("/api/revalidate-home", { method: "POST" }).catch(() => undefined);
                onImported?.();
              },
            })
          }
        >
          4 · Import coupons
        </Button>
        {!category ? <span className="text-xs font-semibold text-warn-600">Pick a category first.</span> : null}
      </div>

      {shown ? (
        <div className="mt-5 space-y-4 border-t border-[var(--border-subtle)] pt-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={classNames("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold", result ? "bg-success-50 text-success-700" : "bg-brand-100 text-brand-700")}>
              {result ? <CheckCircle2 aria-hidden className="size-3.5" /> : null}
              {result ? "Imported" : "Preview"}
            </span>
            <span className="text-body">
              into <strong>{shown.category?.name}</strong> · store <strong>{shown.store?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Rows", value: shown.totalRows },
              { label: result ? "Created" : "Will create", value: shown.created },
              { label: result ? "Updated" : "Will update", value: shown.updated },
              { label: "Skipped", value: shown.skipped },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[var(--border-subtle)] px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{stat.label}</p>
                <p className="font-display text-2xl font-extrabold text-brand-600">{stat.value}</p>
              </div>
            ))}
          </div>

          {shown.issues.length ? (
            <ul className="space-y-1 rounded-2xl bg-warn-50 p-3 text-sm dark:bg-warn-500/10">
              {shown.issues.slice(0, 20).map((issue, index) => (
                <li key={index} className="flex gap-2">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
                  <span>
                    Row {issue.row}
                    {issue.field ? ` · ${issue.field}` : ""}: {issue.message}
                    {issue.value ? ` (“${issue.value}”)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-[var(--surface-sunken)] text-[11px] uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">For</th>
                  <th className="px-3 py-2">Valid from (UTC+8)</th>
                  <th className="px-3 py-2">Valid to</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {shown.sample.map((item) => (
                  <tr key={item.code}>
                    <td className="px-3 py-2 font-mono font-bold">{item.code}</td>
                    <td className="px-3 py-2">{item.discount}</td>
                    <td className="px-3 py-2">{item.audience}</td>
                    <td className="px-3 py-2">{dateLabel(item.validFrom)}</td>
                    <td className="px-3 py-2">{dateLabel(item.validTo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
