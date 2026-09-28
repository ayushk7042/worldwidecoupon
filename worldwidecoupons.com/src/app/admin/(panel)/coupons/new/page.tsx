"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { CouponForm } from "@/components/admin/CouponForm";

export default function NewCouponPage() {
  return (
    <>
      <PageHeader
        title="New offer"
        subtitle="Codes need a code; everything else just needs a link."
        back={{ href: "/admin/coupons", label: "Coupons & deals" }}
      />
      <CouponForm />
    </>
  );
}
