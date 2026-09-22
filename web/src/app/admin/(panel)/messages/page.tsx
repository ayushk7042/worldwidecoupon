"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { DataTable, Pager, StatusPill, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { contact } from "@/lib/endpoints";
import { formatDateTime, timeAgo } from "@/lib/format";
import { readToken } from "@/lib/session";
import { CONTACT_TOPICS, type ContactMessage } from "@/lib/types";

const STATUSES = ["new", "replied", "closed", "spam"] as const;

function MessagesScreen() {
  const params = useSearchParams();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [topic, setTopic] = useState("");
  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState<ContactMessage | null>(null);

  const query = useMemo(
    () => ({ page, limit: 20, ...(status ? { status } : {}), ...(topic ? { topic } : {}) }),
    [page, status, topic]
  );

  const list = useAdminData((token) => contact.list(query, token), [query]);
  const { busy, run } = useAction();

  const columns: Column<ContactMessage>[] = [
    {
      key: "from",
      header: "From",
      render: (row) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setOpen(row)}
            className="block truncate text-left font-semibold hover:text-brand-600"
          >
            {row.subject || row.message.slice(0, 60)}
          </button>
          <span className="truncate text-xs text-faint">
            {row.name} · {row.email}
          </span>
        </div>
      ),
    },
    {
      key: "topic",
      header: "Topic",
      width: "9rem",
      render: (row) => <span className="text-xs font-semibold text-body">{row.topic}</span>,
    },
    {
      key: "about",
      header: "About",
      width: "12rem",
      render: (row) =>
        row.coupon ? (
          <Link href={`/admin/coupons/${row.coupon._id}`} className="truncate text-xs text-brand-600 hover:underline">
            {row.coupon.title}
          </Link>
        ) : row.store ? (
          <Link href={`/admin/stores/${row.store._id}`} className="truncate text-xs text-brand-600 hover:underline">
            {row.store.name}
          </Link>
        ) : (
          <span className="text-xs text-faint">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "7rem",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "when",
      header: "Received",
      width: "8rem",
      render: (row) => <span className="text-xs text-faint">{timeAgo(row.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "9rem",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setOpen(row)}>
            Open
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
      <PageHeader title="Messages" subtitle="Everything sent through the contact form." />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Any status" },
            ...STATUSES.map((value) => ({ value, label: value })),
          ]}
        />
        <Select
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            setPage(1);
          }}
          options={[
            { value: "", label: "Any topic" },
            ...CONTACT_TOPICS.map((value) => ({ value, label: value })),
          ]}
        />
      </div>

      <DataTable
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.loading}
        empty={<p className="text-sm text-body">Nothing in the inbox.</p>}
      />

      <Pager page={page} pages={list.data?.pagination.pages ?? 1} onChange={setPage} />

      <MessageModal
        message={open}
        onClose={() => setOpen(null)}
        onChanged={async () => {
          await list.reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        loading={busy}
        title="Delete this message?"
        body="It is removed from the inbox permanently."
        onConfirm={() => {
          if (!deleting) return;
          void run(() => contact.remove(deleting._id, readToken("admin")), {
            success: "Message deleted",
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

function MessageModal({
  message,
  onClose,
  onChanged,
}: {
  message: ContactMessage | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { busy, run } = useAction();
  const [reply, setReply] = useState("");

  if (!message) return null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={message.subject || `${message.topic} enquiry`}
      description={`${message.name} · ${message.email} · ${formatDateTime(message.createdAt)}`}
      footer={
        <>
          {(["closed", "spam"] as const).map((value) => (
            <Button
              key={value}
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() => contact.setStatus(message._id, value, readToken("admin")), {
                  success: `Marked ${value}`,
                  onDone: async () => {
                    await onChanged();
                    onClose();
                  },
                })
              }
            >
              Mark {value}
            </Button>
          ))}

          <Button
            loading={busy}
            disabled={!reply.trim()}
            onClick={() =>
              void run(() => contact.reply(message._id, reply.trim(), readToken("admin")), {
                success: "Reply sent",
                onDone: async () => {
                  setReply("");
                  await onChanged();
                  onClose();
                },
              })
            }
          >
            Send reply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl surface-sunken p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {message.message}
        </div>

        {message.coupon ? (
          <p className="text-sm text-body">
            About offer:{" "}
            <Link href={`/admin/coupons/${message.coupon._id}`} className="font-semibold text-brand-600 hover:underline">
              {message.coupon.title}
            </Link>
          </p>
        ) : null}

        {message.store ? (
          <p className="text-sm text-body">
            About store:{" "}
            <Link href={`/admin/stores/${message.store._id}`} className="font-semibold text-brand-600 hover:underline">
              {message.store.name}
            </Link>
          </p>
        ) : null}

        {message.reply?.message ? (
          <div className="rounded-xl border border-success-500/30 bg-success-50 p-4 text-sm dark:bg-success-700/10">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-success-700">
              Replied {message.reply.repliedAt ? timeAgo(message.reply.repliedAt) : ""}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{message.reply.message}</p>
          </div>
        ) : null}

        <Textarea
          label="Your reply"
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          className="min-h-32"
          hint="Sent to the address above and saved against the message."
        />
      </div>
    </Modal>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <MessagesScreen />
    </Suspense>
  );
}
