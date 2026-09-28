"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { StoreForm } from "@/components/admin/StoreForm";

export default function NewStorePage() {
  return (
    <>
      <PageHeader
        title="New store"
        subtitle="The affiliate link and tracking parameters drive every outbound click."
        back={{ href: "/admin/stores", label: "Stores" }}
      />
      <StoreForm />
    </>
  );
}
