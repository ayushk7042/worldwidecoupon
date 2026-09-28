"use client";

import { use } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { CouponForm } from "@/components/admin/CouponForm";
import { useAdminData } from "@/components/admin/hooks";
import { StatusPill } from "@/components/admin/DataTable";
import { Skeleton, Stat } from "@/components/ui/primitives";
import { coupons } from "@/lib/endpoints";
import { formatCount, timeAgo } from "@/lib/format";

export default function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading } = useAdminData((token) => coupons.get(id, { token }), [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <PageHeader
        title="Offer not found"
        subtitle="It may have been deleted."
        back={{ href: "/admin/coupons", label: "Coupons & deals" }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={data.title}
        subtitle={`Updated ${timeAgo(data.updatedAt)}`}
        back={{ href: "/admin/coupons", label: "Coupons & deals" }}
        action={<StatusPill status={data.status} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Views" value={formatCount(data.views)} />
        <Stat label="Clicks" value={formatCount(data.clicks)} />
        <Stat label="Uses" value={formatCount(data.uses)} />
        <Stat
          label="Worked"
          value={data.successRate == null ? "—" : `${data.successRate}%`}
          hint={`${data.successVotes} yes / ${data.failVotes} no`}
        />
      </div>

      <CouponForm coupon={data} />
    </>
  );
}
