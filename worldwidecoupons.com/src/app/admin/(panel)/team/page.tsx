"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { PageHeader } from "@/components/admin/AdminShell";
import { DataTable, StatusPill, type Column } from "@/components/admin/DataTable";
import { useAction, useAdminData } from "@/components/admin/hooks";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/primitives";
import { auth } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { readToken } from "@/lib/session";
import { ADMIN_PERMISSIONS, type AdminPermission, type AdminUser } from "@/lib/types";

const PERMISSION_LABELS: Record<AdminPermission, string> = {
  canPublish: "Publish and edit offers",
  canDelete: "Delete records",
  canManageStores: "Manage stores",
  canManageUsers: "Manage the team",
  canImport: "Run sheet imports",
};

const idOf = (user: AdminUser) => user._id ?? user.id ?? "";

export default function AdminTeamPage() {
  const { admin } = useAdmin();
  const list = useAdminData((token) => auth.listAdmins(token));
  const { busy, run } = useAction();

  const [editing, setEditing] = useState<AdminUser | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  const rows = (list.data ?? []).map((user) => ({ ...user, _id: idOf(user) }));

  const columns: Column<AdminUser & { _id: string }>[] = [
    {
      key: "name",
      header: "Person",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
            {row.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setEditing(row)}
              className="block truncate text-left font-semibold hover:text-brand-600"
            >
              {row.name}
              {idOf(row) === idOf(admin ?? ({} as AdminUser)) ? (
                <span className="ml-1.5 text-xs font-normal text-faint">(you)</span>
              ) : null}
            </button>
            <span className="truncate text-xs text-faint">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "7rem",
      render: (row) => <span className="text-xs font-semibold text-body">{row.role}</span>,
    },
    {
      key: "permissions",
      header: "Can",
      render: (row) => (
        <span className="text-xs text-faint">
          {row.role === "superadmin"
            ? "Everything"
            : ADMIN_PERMISSIONS.filter((permission) => row.permissions?.[permission])
                .map((permission) => PERMISSION_LABELS[permission])
                .join(", ") || "Read only"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "7rem",
      render: (row) => <StatusPill status={row.status ?? "active"} />,
    },
    {
      key: "seen",
      header: "Last signed in",
      width: "11rem",
      render: (row) => (
        <span className="text-xs text-faint">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "9rem",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
            Edit
          </Button>
          {idOf(row) !== idOf(admin ?? ({} as AdminUser)) ? (
            <Button size="sm" variant="ghost" onClick={() => setDeleting(row)}>
              Remove
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Who can sign in, and what they are allowed to touch."
        action={<Button onClick={() => setEditing("new")}>Invite someone</Button>}
      />

      <DataTable rows={rows} columns={columns} loading={list.loading} />

      <ChangePasswordCard />

      <TeamModal
        open={editing !== null}
        user={editing === "new" ? undefined : (editing ?? undefined)}
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
        title={`Remove ${deleting?.name ?? "this person"}?`}
        body="They lose access immediately. Anything they published stays."
        confirmLabel="Remove access"
        onConfirm={() => {
          if (!deleting) return;
          void run(() => auth.removeAdmin(idOf(deleting), readToken("admin")), {
            success: "Access removed",
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

function ChangePasswordCard() {
  const { busy, run } = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  return (
    <Card className="mt-8 max-w-lg">
      <h2 className="text-base font-bold">Your password</h2>
      <p className="mt-0.5 text-sm text-body">Changing it signs out nothing else — sessions stay valid.</p>

      <div className="mt-4 space-y-4">
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          hint="At least 8 characters."
        />
        <Button
          loading={busy}
          disabled={!current || next.length < 8}
          onClick={() =>
            void run(() => auth.changePassword(current, next, readToken("admin")), {
              success: "Password changed",
              onDone: () => {
                setCurrent("");
                setNext("");
              },
            })
          }
        >
          Change password
        </Button>
      </div>
    </Card>
  );
}

function TeamModal({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user?: AdminUser;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { busy, run } = useAction();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [status, setStatus] = useState("active");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole(user?.role ?? "editor");
    setStatus(user?.status ?? "active");
    setPermissions({ ...(user?.permissions ?? {}) });
  }, [open, user]);

  const save = () => {
    if (user) {
      const payload = { name, email, role, status, permissions };
      void run(() => auth.updateAdmin(idOf(user), payload, readToken("admin")), {
        success: "Saved",
        onDone: onSaved,
      });
      return;
    }

    void run(
      () => auth.createAdmin({ name, email, password, role, permissions }, readToken("admin")),
      { success: "Invite created", onDone: onSaved }
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Edit ${user.name}` : "Invite someone"}
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
        <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />

        {user ? null : (
          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters. Share it with them over something private, and ask them to change it."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            options={[
              { value: "superadmin", label: "Superadmin — everything" },
              { value: "editor", label: "Editor — what you tick below" },
              { value: "viewer", label: "Viewer — read only" },
            ]}
          />

          {user ? (
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={[
                { value: "active", label: "active" },
                { value: "suspended", label: "suspended" },
              ]}
            />
          ) : null}
        </div>

        {role === "editor" ? (
          <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] p-4">
            {ADMIN_PERMISSIONS.map((permission) => (
              <Checkbox
                key={permission}
                checked={Boolean(permissions[permission])}
                onChange={(checked) =>
                  setPermissions((previous) => ({ ...previous, [permission]: checked }))
                }
                label={PERMISSION_LABELS[permission]}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
