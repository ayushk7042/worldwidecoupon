"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { DataTable, Pager, StatusPill, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Card, Stat } from "@/components/ui/primitives";
import { importer } from "@/lib/endpoints";
import { classNames, formatDateTime } from "@/lib/format";
import { readToken } from "@/lib/session";
import type { ImportJob, ImportResult } from "@/lib/types";

const ACCEPTED = ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);
  const [page, setPage] = useState(1);
  const [inspecting, setInspecting] = useState<ImportJob | null>(null);
  const [inspectingIssues, setInspectingIssues] = useState<ImportJob | null>(null);
  const [rollingBack, setRollingBack] = useState<ImportJob | null>(null);

  const input = useRef<HTMLInputElement>(null);
  const { busy, run } = useAction();

  const jobs = useAdminData((token) => importer.jobs({ page, limit: 10 }, token), [page]);

  /**
   * The list endpoint drops the issue report to keep the payload small, so the
   * details view refetches the one job it is showing.
   */
  const inspect = (job: ImportJob) => {
    setInspecting(job);
    setInspectingIssues(null);
    void importer
      .job(job._id, readToken("admin"))
      .then(setInspectingIssues)
      .catch(() => undefined);
  };

  const pick = (chosen: File | null) => {
    setFile(chosen);
    setPreview(null);
    setResult(null);
  };

  const runPreview = () => {
    if (!file) return;
    void run(() => importer.preview(file, readToken("admin")), {
      success: "Sheet parsed — nothing written yet",
      onDone: setPreview,
    });
  };

  const runImport = () => {
    if (!file) return;
    void run(() => importer.run(file, mode, readToken("admin")), {
      success: "Import finished",
      onDone: async (outcome) => {
        setResult(outcome);
        setConfirmRun(false);
        await jobs.reload();
      },
    });
  };

  const columns: Column<ImportJob>[] = [
    {
      key: "file",
      header: "File",
      render: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => inspect(row)}
            className="block truncate text-left font-semibold hover:text-brand-600"
          >
            {row.fileName ?? row.batchId}
          </button>
          <span className="text-xs text-faint">
            {row.mode} · {row.fileType} · {row.createdByAdmin?.name ?? "system"}
          </span>
        </div>
      ),
    },
    {
      key: "rows",
      header: "Rows",
      width: "12rem",
      render: (row) => (
        <span className="text-xs tabular-nums text-body">
          {row.createdCount} new · {row.updatedCount} updated · {row.skippedCount} skipped
        </span>
      ),
    },
    {
      key: "issues",
      header: "Issues",
      width: "6rem",
      render: (row) => (
        <span className={classNames("text-xs tabular-nums", row.errorCount ? "text-danger-600" : "text-faint")}>
          {row.errorCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "8rem",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "when",
      header: "Finished",
      width: "11rem",
      render: (row) => (
        <span className="text-xs text-faint">{formatDateTime(row.finishedAt ?? row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "10rem",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => inspect(row)}>
            Details
          </Button>
          {row.status === "completed" ? (
            <Button size="sm" variant="ghost" onClick={() => setRollingBack(row)}>
              Roll back
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sheet import"
        subtitle="Drop the WordPress export straight in. Preview first, then commit."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition",
              dragging ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30" : "border-[var(--border-strong)] surface"
            )}
          >
            <span aria-hidden className="text-4xl">
              📥
            </span>
            <p className="mt-3 font-bold">Drop a CSV or Excel file here</p>
            <p className="mt-1 text-sm text-body">
              Columns are matched by name — coupon title, code, store, category, link, image.
            </p>

            <input
              ref={input}
              type="file"
              accept={ACCEPTED}
              hidden
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
            />

            <Button className="mt-4" variant="secondary" onClick={() => input.current?.click()}>
              Choose a file
            </Button>

            {file ? (
              <p className="mt-3 text-sm font-semibold">
                {file.name}{" "}
                <span className="font-normal text-faint">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </p>
            ) : null}
          </div>

          {file ? (
            <Card className="mt-4">
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label="Mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as "upsert" | "replace")}
                  className="w-48"
                  options={[
                    { value: "upsert", label: "Upsert — add and update" },
                    { value: "replace", label: "Replace — wipe first" },
                  ]}
                />

                <Button variant="secondary" loading={busy} onClick={runPreview}>
                  Preview
                </Button>

                <Button disabled={busy} onClick={() => setConfirmRun(true)}>
                  Run import
                </Button>

                <Button variant="ghost" onClick={() => pick(null)}>
                  Clear
                </Button>
              </div>

              {mode === "replace" ? (
                <p className="mt-3 rounded-xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600 dark:bg-danger-500/10">
                  <strong>Replace mode deletes every existing coupon, store and category before importing.</strong>{" "}
                  Anything not present in this file is gone permanently. Use upsert unless you are rebuilding the
                  catalogue from scratch.
                </p>
              ) : null}
            </Card>
          ) : null}

          {preview ? <ResultCard title="Preview — nothing was written" result={preview} /> : null}
          {result ? <ResultCard title="Import finished" result={result} tone="success" /> : null}
        </div>

        <Card>
          <h2 className="text-base font-bold">How it maps</h2>
          <ul className="mt-3 space-y-2 text-sm text-body">
            <li>
              <strong>Store</strong> comes from the store column, or from the link&apos;s domain when it is missing.
            </li>
            <li>
              <strong>Type</strong> is inferred: a usable code makes it a code offer, otherwise it is a deal.
            </li>
            <li>
              <strong>Discount</strong> is read out of the title when there is no discount column.
            </li>
            <li>
              <strong>Categories</strong> are created on the fly and attached to both the offer and its store.
            </li>
            <li>
              <strong>Expiry</strong> defaults to never — guessing dates would kill live offers.
            </li>
          </ul>

          <p className="mt-4 text-xs text-faint">
            Every run is recorded below and can be rolled back, which deletes exactly what that run created.
          </p>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Import history</h2>

      <DataTable
        rows={jobs.data?.items ?? []}
        columns={columns}
        loading={jobs.loading}
        empty={<p className="text-sm text-body">No imports yet.</p>}
      />

      <Pager page={page} pages={jobs.data?.pagination.pages ?? 1} onChange={setPage} />

      <ConfirmDialog
        open={confirmRun}
        onClose={() => setConfirmRun(false)}
        loading={busy}
        tone={mode === "replace" ? "danger" : "primary"}
        title={mode === "replace" ? "Wipe the catalogue and import?" : "Run this import?"}
        body={
          mode === "replace"
            ? "Every coupon, store and category currently in the database will be deleted before this file is imported. This cannot be undone."
            : "New rows are added and matching rows are updated. The run can be rolled back afterwards."
        }
        confirmLabel={mode === "replace" ? "Wipe and import" : "Import"}
        onConfirm={runImport}
      />

      <ConfirmDialog
        open={Boolean(rollingBack)}
        onClose={() => setRollingBack(null)}
        loading={busy}
        title="Roll this import back?"
        body="Everything that run created is deleted — coupons, stores and categories. Records it only updated keep their new values."
        confirmLabel="Roll back"
        onConfirm={() => {
          if (!rollingBack) return;
          void run(() => importer.rollback(rollingBack._id, readToken("admin")), {
            success: "Import rolled back",
            onDone: async () => {
              setRollingBack(null);
              await jobs.reload();
            },
          });
        }}
      />

      <Modal
        open={Boolean(inspecting)}
        onClose={() => setInspecting(null)}
        size="lg"
        title={inspecting?.fileName ?? "Import details"}
        description={inspecting ? `Batch ${inspecting.batchId}` : undefined}
      >
        {inspecting ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Rows" value={inspecting.totalRows} />
              <Stat label="Created" value={inspecting.createdCount} />
              <Stat label="Updated" value={inspecting.updatedCount} />
              <Stat label="Skipped" value={inspecting.skippedCount} />
            </div>

            <p className="text-sm text-body">
              {inspecting.storesCreated} stores and {inspecting.categoriesCreated} categories were created by this run.
            </p>

            {(inspectingIssues ?? inspecting).issues?.length ? (
              <div>
                <h3 className="mb-2 text-sm font-bold">
                  Issues ({(inspectingIssues ?? inspecting).issues?.length ?? 0})
                </h3>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
                  <table className="w-full text-xs">
                    <tbody>
                      {((inspectingIssues ?? inspecting).issues ?? []).map((issue, index) => (
                        <tr key={index} className="border-b border-[var(--border-subtle)] last:border-0">
                          <td className="px-3 py-2 tabular-nums text-faint">Row {issue.row}</td>
                          <td className="px-3 py-2 font-medium">{issue.field ?? "—"}</td>
                          <td className="px-3 py-2 text-body">{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-faint">
                {inspectingIssues || !inspecting.errorCount
                  ? "No issues were recorded."
                  : "Loading the issue report…"}
              </p>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function ResultCard({
  title,
  result,
  tone = "neutral",
}: {
  title: string;
  result: ImportResult;
  tone?: "neutral" | "success";
}) {
  return (
    <Card
      className={classNames(
        "mt-4",
        tone === "success" ? "border-success-500/40" : undefined
      )}
    >
      <h2 className="text-base font-bold">{title}</h2>
      <p className="mt-0.5 text-xs text-faint">
        Batch {result.batchId} · {(result.durationMs / 1000).toFixed(1)}s
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Rows" value={result.totalRows} />
        <Stat label="Created" value={result.created} />
        <Stat label="Updated" value={result.updated} />
        <Stat label="Skipped" value={result.skipped} />
        <Stat
          label="Issues"
          value={result.issues.length}
          tone={result.issues.length ? "danger" : "neutral"}
        />
      </div>

      <p className="mt-3 text-sm text-body">
        {result.storesCreated} new stores · {result.categoriesCreated} new categories
      </p>

      {result.issues.length ? (
        <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-xs">
            <tbody>
              {result.issues.slice(0, 200).map((issue, index) => (
                <tr key={index} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-3 py-2 tabular-nums text-faint">Row {issue.row}</td>
                  <td className="px-3 py-2 font-medium">{issue.field ?? "—"}</td>
                  <td className="px-3 py-2 text-body">{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}
