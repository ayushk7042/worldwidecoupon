"use client";

import Link from "next/link";
import { use } from "react";
import { PageHeader } from "@/components/admin/AdminShell";
import { StatusPill } from "@/components/admin/DataTable";
import { useAdminData } from "@/components/admin/hooks";
import { StoreForm } from "@/components/admin/StoreForm";
import { Skeleton, Stat } from "@/components/ui/primitives";
import { stores } from "@/lib/endpoints";
import { formatCount, timeAgo } from "@/lib/format";

export default function EditStorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading } = useAdminData((token) => stores.get(id, { token }), [id]);

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
        title="Store not found"
        subtitle="It may have been deleted."
        back={{ href: "/admin/stores", label: "Stores" }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={data.name}
        subtitle={`Updated ${timeAgo(data.updatedAt)}`}
        back={{ href: "/admin/stores", label: "Stores" }}
        action={<StatusPill status={data.status} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Live offers" value={formatCount(data.activeCouponCount)} hint={`${formatCount(data.couponCount)} in total`} />
        <Stat label="Codes / deals" value={`${formatCount(data.codeCount)} / ${formatCount(data.dealCount)}`} />
        <Stat label="Views" value={formatCount(data.views)} />
        <Stat label="Clicks" value={formatCount(data.clicks)} />
      </div>

      <p className="mb-4 text-sm text-body">
        <Link href={`/admin/coupons?store=${data._id}`} className="font-semibold text-brand-600 hover:underline">
          Manage this store&apos;s offers →
        </Link>
      </p>

      <StoreForm store={data} />
    </>
  );
}
