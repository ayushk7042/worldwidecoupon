"use client";

import type { ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminShell } from "@/components/admin/AdminShell";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdmin();

  // `AdminProvider` sends signed-out visitors to the login page; until that
  // happens there is nothing here worth painting.
  if (loading || !admin) {
    return (
      <div className="flex min-h-dvh items-center justify-center surface-muted">
        <span className="size-8 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
